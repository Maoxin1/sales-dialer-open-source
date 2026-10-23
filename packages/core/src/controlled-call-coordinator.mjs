import {checkControlledCallContract,validControlledCallPermit} from './controlled-call-contract.mjs';
import {SimulationEngine,key,syntheticId} from './simulation-engine.mjs';
import {TrialBudget} from './trial-budget.mjs';
import {ControlledCallPort} from '../test-support/controlled-call-port.mjs';
const closed=r=>({...r,realCallsEnabled:false,callAuthorization:'DENY'}),deny=reason=>closed({decision:'DENY',reason});
const stage=s=>({read:()=>structuredClone(s),transaction:fn=>{const r=fn(s);if(r?.then)throw Error('ASYNC_TRANSACTION_FORBIDDEN');return r;}});
const canonical=p=>JSON.stringify(Object.keys(p).sort().map(k=>[k,p[k]]));
/** Trusted local test coordinator. One existing TrialBudget ledger is authoritative.
 * No HTTP registration, real numbers, real transport or automatic retries. */
export class ControlledCallCoordinator {
 #store;#clock;#readDevice;#port;#fault;#permitId;
 constructor({store,clock,permit,readDevice,port,fault=()=>{}}){
  if(!validControlledCallPermit(permit)||!(port instanceof ControlledCallPort)||typeof readDevice!=='function')throw Error('INVALID_CONTROLLED_CALL_CONFIG');
  this.#store=store;this.#clock=clock;this.#readDevice=readDevice;this.#port=port;this.#fault=fault;this.#permitId=permit.permitId;
  store.transaction(s=>{
   s.controlledCallPermits??={};const old=s.controlledCallPermits[permit.permitId];
   if(old&&canonical(old)!==canonical(permit))throw Error('PERMIT_CONFLICT');
   const budget=new TrialBudget({store:stage(s),now:()=>clock.nowMs()});
   const r=budget.register({roundId:permit.permitId,tenantId:permit.tenantId,salesId:permit.salesId,deviceId:'SYNTHETIC-DEVICE-'+permit.deviceKey.toUpperCase(),accountId:'SYNTHETIC-SIM-'+permit.accountKey.toUpperCase(),targets:[permit.targetKey],notBefore:permit.notBefore,expiresAt:permit.expiresAt,maxAttempts:permit.maxAttempts,source:'SIMULATION_FIXTURE'});
   if(!['REGISTERED','EXISTS'].includes(r.code))throw Error('PERMIT_CONFLICT');
   s.controlledCallPermits[permit.permitId]=structuredClone(permit);
  });
 }
 #engine(store=this.#store){return new SimulationEngine({store,clock:this.#clock});}
 async submit(request){
  if(!request||Object.keys(request).sort().join()!=='actorId,attemptId,permitId'||!Object.values(request).every(syntheticId)||request.permitId!==this.#permitId)return deny('INVALID_REQUEST');
  const req=structuredClone(request);let device;
  try{device=structuredClone(await this.#readDevice());}catch{return deny('DEVICE_UNAVAILABLE');}
  const prepared=this.#store.transaction(state=>{
   const s=structuredClone(state),store=stage(s),engine=this.#engine(store),a=s.attempts[req.attemptId];
   const actor=engine.actor(s,req.actorId,'trigger',a);
   if(!a||!actor||a.salesId!==req.actorId)return deny('FORBIDDEN');
   if(a.status!=='AUTHORIZED'||a.trialTicketId||a.controlledCall)return deny('ALREADY_CONSUMED');
   const task=s.tasks[a.taskId],valid=engine.check(s,actor,task,a,true);
   if(valid.decision==='DENY')return closed(valid);
   const permit=s.controlledCallPermits[req.permitId],round=s.trialBudget.rounds.find(r=>r.config.roundId===req.permitId),now=this.#clock.nowMs();
   const used=round.used,last=s.trialBudget.lastObservedAt;
   const budget=new TrialBudget({store,now:()=>now}),held=budget.reserve({roundId:req.permitId,tenantId:a.tenantId,salesId:a.salesId,deviceId:'SYNTHETIC-DEVICE-'+permit.deviceKey.toUpperCase(),accountId:'SYNTHETIC-SIM-'+permit.accountKey.toUpperCase(),targetKey:a.targetKey,intentId:a.intentId,taskId:a.taskId,cycle:a.cycle});
   // Persist observed time on rejection without leaking staged quota or ticket.
   const reject=reason=>{state.trialBudget.lastObservedAt=Math.max(state.trialBudget.lastObservedAt,s.trialBudget.lastObservedAt);return deny(reason);};
   if(held.code!=='RESERVED')return reject(held.code);
   const contact=s.contacts[key(a.tenantId,a.targetKey)],seller=s.sellers[key(a.tenantId,a.salesId)];
   const input={permit:{...permit,revoked:permit.revoked||round.revoked},now,context:{tenantId:a.tenantId,salesId:a.salesId,targetKey:a.targetKey,
    deviceKey:device?.deviceKey,installationKey:device?.installationKey,accountKey:device?.accountKey,
    attemptId:a.attemptId,ticketId:held.ticketId,intentId:a.intentId,taskId:a.taskId,cycle:a.cycle,
    planVersion:a.planVersion,currentPlanVersion:task.planVersion,policyVersion:a.policyVersion,currentPolicyVersion:s.policy.version,
    qualificationRevision:a.qualificationRevision,currentQualificationRevision:contact.revision,qualification:contact.qualification,doNotContact:contact.doNotContact,
    paused:seller.paused,occupiedBy:seller.occupiedBy,attemptStatus:a.status,ticketState:'HELD_UNKNOWN',phoneInCall:device?.inCall,
    permissionsGranted:device?.permissionsGranted,accountEnabled:device?.accountEnabled,observedAt:device?.observedAt,usedAttempts:used,lastObservedAt:last}};
   const checked=checkControlledCallContract(input);if(checked.decision!=='READY_FOR_ADAPTER')return reject(checked.reason);
   a.trialTicketId=held.ticketId;a.trialRoundId=req.permitId;a.trialExpiresAt=permit.expiresAt;
   a.controlledCall={permitId:req.permitId,handoff:checked.handoff};a.status='HANDOFF_UNKNOWN';a.handoffAt=now;a.outbox='TAKEN';task.status='HANDOFF_UNKNOWN';
   engine.audit(s,actor,'CONTROLLED_CALL_CLAIMED',{attemptId:a.attemptId,taskId:a.taskId,permitId:req.permitId,ticketId:held.ticketId});
   this.#fault('before-claim-commit');Object.assign(state,s);return {decision:'OK',input};
  });
  if(prepared.decision==='DENY')return prepared;
  this.#fault('after-claim-commit');let r;
  try{r=await this.#port.submit(prepared.input);}catch{r=null;}
  this.#fault('after-port-return');
  const receipt=r?.decision==='OK'&&r.source==='TEST_DOUBLE'&&r.attemptId===req.attemptId&&r.actualPhoneApiCalls===0&&r.realCallsEnabled===false&&r.callAuthorization==='DENY'
   &&['SUBMITTED','NOT_SUBMITTED','UNKNOWN'].includes(r.apiSubmission)?{source:'TEST_DOUBLE',apiSubmission:r.apiSubmission,actualPhoneApiCalls:0}:{source:'TEST_DOUBLE',apiSubmission:'UNKNOWN',actualPhoneApiCalls:0};
  return this.#store.transaction(s=>{
   const a=s.attempts[req.attemptId],engine=this.#engine(stage(s));a.controlledCall.receipt=receipt;
   a.apiSubmission=receipt.apiSubmission==='NOT_SUBMITTED'?'DEFINITELY_NOT_SUBMITTED':receipt.apiSubmission;
   if(a.status!=='FINISHED'){
    if(receipt.apiSubmission==='NOT_SUBMITTED')engine.finish(s,a);
    else{a.status='RECONCILE_REQUIRED';s.tasks[a.taskId].status=a.status;if(receipt.apiSubmission==='UNKNOWN')a.hadUnknown=true;}
   }
   engine.audit(s,s.actors[req.actorId],'CONTROLLED_CALL_RECEIPT',{attemptId:a.attemptId,taskId:a.taskId,status:receipt.apiSubmission});
   this.#fault('before-receipt-commit');return closed({decision:'OK',attemptId:a.attemptId,status:a.status,apiSubmission:a.apiSubmission});
  });
 }
 recover(){return closed(this.#engine().recover());}
 reconcile(req){return this.#store.transaction(state=>{
  const s=structuredClone(state),store=stage(s),engine=this.#engine(store),a=s.attempts[req?.attemptId];
  if(!a?.controlledCall||a.controlledCall.permitId!==this.#permitId||req.permitId!==this.#permitId||a.salesId!==req.actorId||!engine.actor(s,req.actorId,'reconcile',a))return deny('FORBIDDEN');
  if(req.noActiveCall!==true||!['UNKNOWN','NO_ANSWER','BUSY','REJECTED','COMPLETED','FAILED'].includes(req.result))return deny('ACTIVE_CALL_NOT_CLEARED');
  if(a.status!=='FINISHED'){const r=engine.reconcile(req);if(r.decision!=='OK')return closed(r);}
  const r=new TrialBudget({store,now:()=>this.#clock.nowMs()}).reconcile({tenantId:a.tenantId,salesId:a.salesId,ticketId:a.trialTicketId,noActiveCall:true,outcome:'SIMULATED_FINISHED'});
  if(!['RECONCILED','ALREADY_RECONCILED'].includes(r.code))return deny(r.code);
  Object.assign(state,s);return closed({decision:'OK'});
 });}
}
