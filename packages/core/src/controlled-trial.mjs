import { NativeGuardAdapter } from './native-guard-adapter.mjs';
import { SimulationEngine, syntheticId } from './simulation-engine.mjs';
import { TrialBudget } from './trial-budget.mjs';
import { PhoneCapabilities } from './phone-capabilities.mjs';
import { FakeDialAdapter } from '../test-support/fake-dial-adapter.mjs';
const closed = value => ({...value,realCallsEnabled:false,callAuthorization:'DENY'});
const deny = reason => closed({decision:'DENY',reason});
const fields=['actorId','taskId','planVersion','policyVersion','intentId','trigger','roundId'];
// Nested operations act on an isolated draft, then the outer store commits once.
const staged = draft => ({read:()=>structuredClone(draft),transaction:fn=>{
 const value=fn(draft);if(value?.then)throw Error('ASYNC_TRANSACTION_FORBIDDEN');return structuredClone(value);
}});

/** Local simulation coordinator. Owns a phone substitute or a typed native dry-run guard; accepts no
 * generic transport callback or real dial adapter. Mapping is trusted fixture config,
 * NOT an authenticated device binding. Real phone API is unreachable here. */
export class ControlledTrial {
 #store; #clock; #phone; #mapping; #adapter; #fault;
 constructor({store,clock,phone,mapping,outcomes,guard,fault=()=>{}}) {
  if(!(phone instanceof PhoneCapabilities)||!mapping||!['deviceKey','accountKey'].every(k=>/^[a-f0-9]{64}$/.test(mapping[k]))||!['deviceId','accountId'].every(k=>syntheticId(mapping[k])))throw Error('INVALID_TRIAL_FIXTURE');
  if(guard!==undefined&&(!(guard instanceof NativeGuardAdapter)||guard.describe().hostDeviceKey!==mapping.deviceKey||guard.describe().accountKey!==mapping.accountKey))throw Error('GUARD_MAPPING_MISMATCH');
  this.#store=store;this.#clock=clock;this.#phone=phone;this.#mapping=structuredClone(mapping);this.#adapter=guard??new FakeDialAdapter({outcomes});this.#fault=fault;
 }
 get requests(){return this.#adapter.requests;}
 #engine(store=this.#store){return new SimulationEngine({store,clock:this.#clock});}
 #budget(store=this.#store){return new TrialBudget({store,now:()=>this.#clock.nowMs()});}
 #phoneReady(){
  const p=this.#phone.status(),m=this.#mapping;
  return p.prerequisites==='OBSERVED_READY'&&p.snapshot?.deviceKey===m.deviceKey&&p.selectedAccount?.deviceKey===m.deviceKey&&p.selectedAccount?.key===m.accountKey;
 }
 async submit(input){
  if(!input||Object.keys(input).length!==fields.length||Object.keys(input).some(k=>!fields.includes(k))||!['actorId','taskId','intentId','roundId'].every(k=>syntheticId(input[k]))||!['planVersion','policyVersion'].every(k=>Number.isSafeInteger(input[k])&&input[k]>0)||!['scheduled','manual_now'].includes(input.trigger))return deny('INVALID_REQUEST');
  const request=structuredClone(input);
  try{await this.#phone.refresh();}catch{return deny('PHONE_UNAVAILABLE');}
  const prepared=this.#store.transaction(state=>{
   if(!this.#phoneReady())return deny('PHONE_PREREQUISITES_NOT_MET');
   const candidate=structuredClone(state),store=staged(candidate),engine=this.#engine(store);
   const grant=engine.authorize(request);if(grant.decision!=='ALLOW')return closed(grant);
   const a=candidate.attempts[grant.attemptId],m=this.#mapping;
   const hold=this.#budget(store).reserve({roundId:request.roundId,tenantId:a.tenantId,salesId:a.salesId,deviceId:m.deviceId,accountId:m.accountId,targetKey:a.targetKey,intentId:a.intentId,taskId:a.taskId,cycle:a.cycle});
   if(hold.code!=='RESERVED'){
    // Preserve observed time even on a denied budget check; discard the grant.
    state.trialBudget=candidate.trialBudget;
    return deny(hold.code);
   }
   a.trialTicketId=hold.ticketId;
   if(this.#adapter instanceof NativeGuardAdapter)a.guardMapping=structuredClone(this.#mapping);
   a.trialRoundId=request.roundId;a.trialExpiresAt=candidate.trialBudget.rounds.find(r=>r.config.roundId===request.roundId).config.expiresAt;
   Object.assign(state,candidate);
   return closed({decision:'OK',attemptId:a.attemptId,ticketId:hold.ticketId});
  });
  if(prepared.decision==='DENY')return prepared;
  this.#fault('after-joint-commit');
  // consume synchronously persists HANDOFF_UNKNOWN before its first await, and
  // rechecks current business state. No auto compensation or refund on failure.
  const engine=this.#engine(),method=this.#adapter instanceof NativeGuardAdapter?'consumeGuard':'consume';
  const receipt=await engine[method]({actorId:request.actorId,attemptId:prepared.attemptId},this.#adapter);
  return closed({...receipt,attemptId:prepared.attemptId,ticketId:prepared.ticketId});
 }
 recover(){
  return this.#store.transaction(state=>{
   const engine=this.#engine(staged(state));engine.recover();let recovered=0;
   for(const a of Object.values(state.attempts))if(a.trialTicketId&&a.status==='AUTHORIZED'){
    a.status='RECONCILE_REQUIRED';a.hadUnknown=true;state.tasks[a.taskId].status='RECONCILE_REQUIRED';
    engine.audit(state,state.actors[a.salesId],'TRIAL_RECOVERY_REQUIRES_RECONCILIATION',{attemptId:a.attemptId,taskId:a.taskId});recovered++;
   }
   return closed({decision:'OK',recovered});
  });
 }
 reconcile(request){
  return this.#store.transaction(state=>{
   const candidate=structuredClone(state),store=staged(candidate),engine=this.#engine(store),a=candidate.attempts[request?.attemptId];
   if(!a?.trialTicketId||a.salesId!==request.actorId||!engine.actor(candidate,request.actorId,'reconcile',a))return deny('FORBIDDEN');
   if(request.noActiveCall!==true||!['UNKNOWN','NO_ANSWER','BUSY','REJECTED','COMPLETED','FAILED'].includes(request.result))return deny('ACTIVE_CALL_NOT_CLEARED');
   if(a.status!=='FINISHED'&&!(a.status==='CANCELLED'&&a.outbox==='CANCELLED')){
    const reconciled=engine.reconcile(request);if(reconciled.decision!=='OK')return closed(reconciled);
   }
   engine.audit(candidate,candidate.actors[request.actorId],'TRIAL_BUDGET_RECONCILED',{attemptId:a.attemptId,taskId:a.taskId});
   const released=this.#budget(store).reconcile({tenantId:a.tenantId,salesId:a.salesId,ticketId:a.trialTicketId,noActiveCall:request.noActiveCall,outcome:'SIMULATED_FINISHED'});
   if(!['RECONCILED','ALREADY_RECONCILED'].includes(released.code))return deny(released.code);
   Object.assign(state,candidate);return closed({decision:'OK'});
  });
 }
}
