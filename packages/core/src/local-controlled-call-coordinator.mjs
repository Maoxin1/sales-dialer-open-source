import {AdbControlledCallTransport} from './adb-controlled-call-transport.mjs';
import {SimulationEngine,key,syntheticId} from './simulation-engine.mjs';
import {TrialBudget} from './trial-budget.mjs';
import {encodeNativeCallCommand} from './native-call-protocol.mjs';
const exact=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).sort().join()===keys.slice().sort().join();
const canonical=p=>JSON.stringify(Object.keys(p).sort().map(k=>[k,p[k]]));
const stage=s=>({read:()=>structuredClone(s),transaction:fn=>{const r=fn(s);if(r?.then)throw Error('ASYNC_TRANSACTION_FORBIDDEN');return r;}});
const deny=reason=>({decision:'DENY',reason});
const weekdays=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Shanghai',weekday:'short'});
/** Explicit developer-controlled trial. Does not authorize production customer calling.
 * No automatic conversion of simulation permits or policy; no HTTP/automatic scheduler wiring. */
export class LocalControlledCallCoordinator {
 #store;#clock;#permit;#port;#fault;
 constructor({store,clock,permit,port,fault=()=>{}}){
  if(!(port instanceof AdbControlledCallTransport))throw Error('EXPLICIT_CONTROLLED_PORT_REQUIRED');
  const binding=port.binding();
  if(!exact(permit,[...Object.keys(binding),'maxAttempts'])||permit.mode!=='LOCAL_CONTROLLED_CALL'||!Number.isSafeInteger(permit.maxAttempts)||permit.maxAttempts<1)throw Error('INVALID_LOCAL_PERMIT');
  if(Object.keys(binding).some(k=>binding[k]!==permit[k]))throw Error('PORT_BINDING_MISMATCH');
  this.#store=store;this.#clock=clock;this.#permit=structuredClone(permit);this.#port=port;this.#fault=fault;
  store.transaction(s=>{
   s.localControlledPermits??={};const old=s.localControlledPermits[permit.permitId];
   if(old&&canonical(old)!==canonical(permit))throw Error('PERMIT_CONFLICT');
   const budget=new TrialBudget({store:stage(s),now:()=>clock.nowMs()});
   const r=budget.register({roundId:permit.permitId,tenantId:permit.tenantId,salesId:permit.salesId,deviceId:'SYNTHETIC-DEVICE-'+permit.deviceKey.toUpperCase(),accountId:'SYNTHETIC-SIM-'+permit.accountKey.toUpperCase(),targets:[permit.targetKey],notBefore:permit.notBefore,expiresAt:permit.expiresAt,maxAttempts:permit.maxAttempts,source:'LOCAL_CONTROLLED_CALL'});
   if(!['REGISTERED','EXISTS'].includes(r.code))throw Error('PERMIT_CONFLICT');s.localControlledPermits[permit.permitId]=structuredClone(permit);
  });
 }
 #engine(store=this.#store){return new SimulationEngine({store,clock:this.#clock});}
 #valid(req,extra=[]){return exact(req,['actorId','attemptId','permitId',...extra])&&['actorId','attemptId','permitId'].every(k=>syntheticId(req[k]))&&req.permitId===this.#permit.permitId;}
 #owned(s,req,capability){const a=s.attempts[req.attemptId];return a&&a.salesId===req.actorId&&a.tenantId===this.#permit.tenantId&&this.#engine(stage(s)).actor(s,req.actorId,capability,a)?a:null;}
 async submit(request){
  if(!this.#valid(request))return deny('INVALID_REQUEST');const req=structuredClone(request);let device;
  try{device=structuredClone(await this.#port.readControlledDevice());}catch{return deny('DEVICE_UNAVAILABLE');}
  const ready=this.#store.transaction(state=>{
   const s=structuredClone(state),store=stage(s),engine=this.#engine(store),a=this.#owned(s,req,'trigger'),p=this.#permit,now=this.#clock.nowMs();
   if(!a)return deny('FORBIDDEN');if(a.status!=='AUTHORIZED'||a.trialTicketId||a.controlledCall||a.localControlledCall)return deny('ALREADY_CONSUMED');
   if(s.policy.controlledPermitId!==p.permitId)return deny('EXPLICIT_POLICY_BINDING_REQUIRED');
   const task=s.tasks[a.taskId],valid=engine.check(s,s.actors[req.actorId],task,a,true);if(valid.decision==='DENY')return valid;
   const contact=s.contacts[key(a.tenantId,a.targetKey)];
   if(contact.revision!==a.qualificationRevision||a.targetKey!==p.targetKey||a.salesId!==p.salesId||['Sat','Sun'].includes(weekdays.format(now)))return deny('BUSINESS_SCOPE_CHANGED');
   const last=state.trialBudget.lastObservedAt;
   if(!Number.isSafeInteger(now)||now<last)return deny('TIME_BLOCKED');
   state.trialBudget.lastObservedAt=now;s.trialBudget.lastObservedAt=now;
   if(!device||['deviceKey','installationKey','accountKey'].some(k=>device[k]!==p[k])||device.inCall!==false||device.permissionsGranted!==true||device.accountEnabled!==true||!Number.isSafeInteger(device.observedAt)||device.observedAt>now||now-device.observedAt>10000)return deny('DEVICE_BLOCKED');
   const held=new TrialBudget({store,now:()=>now}).reserve({roundId:p.permitId,tenantId:a.tenantId,salesId:a.salesId,deviceId:'SYNTHETIC-DEVICE-'+p.deviceKey.toUpperCase(),accountId:'SYNTHETIC-SIM-'+p.accountKey.toUpperCase(),targetKey:a.targetKey,intentId:a.intentId,taskId:a.taskId,cycle:a.cycle});
   if(held.code!=='RESERVED')return deny(held.code);
   const encoded=encodeNativeCallCommand({schemaVersion:1,mode:'controlled-call',permitId:p.permitId,attemptId:a.attemptId,ticketId:held.ticketId,tenantId:a.tenantId,salesId:a.salesId,targetKey:a.targetKey,installationKey:p.installationKey,accountKey:p.accountKey});
   a.trialTicketId=held.ticketId;a.trialRoundId=p.permitId;a.trialExpiresAt=p.expiresAt;
   a.localControlledCall={permitId:p.permitId,command:encoded.command,digest:encoded.digest,journalPath:p.journalPath};
   a.status='HANDOFF_UNKNOWN';a.outbox='TAKEN';a.handoffAt=now;task.status=a.status;
   engine.audit(s,s.actors[req.actorId],'LOCAL_CONTROLLED_CLAIMED',{attemptId:a.attemptId,ticketId:held.ticketId});
   this.#fault('before-claim-commit');Object.assign(state,s);return {decision:'OK',command:encoded.command};
  });
  if(ready.decision!=='OK')return ready;this.#fault('after-claim-commit');let receipt;
  try{receipt=await this.#port.submit(ready.command);}catch{receipt=null;}
  this.#fault('after-port-return');return this.#saveReceipt(req,receipt);
 }
 #saveReceipt(req,receipt){return this.#store.transaction(s=>{
  const a=this.#owned(s,req,'trigger');if(!a?.localControlledCall)return deny('FORBIDDEN');
  const api=receipt?.apiSubmission==='SUBMITTED'?'SUBMITTED':'UNKNOWN';
  // Keep a positively matched historical API return; later missing reads cannot erase it.
  a.apiSubmission=a.apiSubmission==='SUBMITTED'?'SUBMITTED':api;
  a.localControlledCall.receipt={source:'ANDROID_CONTROLLED_CALL',apiSubmission:a.apiSubmission};
  if(a.status!=='FINISHED'){a.status='RECONCILE_REQUIRED';s.tasks[a.taskId].status=a.status;if(api==='UNKNOWN')a.hadUnknown=true;}
  this.#fault('before-receipt-commit');return {decision:'OK',status:a.status,apiSubmission:a.apiSubmission};
 });}
 #existing(req,capability){const s=this.#store.read(),a=this.#owned(s,req,capability);return a?.localControlledCall?.permitId===this.#permit.permitId?a:null;}
 async refresh(request){
  if(!this.#valid(request))return deny('INVALID_REQUEST');const req=structuredClone(request),a=this.#existing(req,'trigger');if(!a)return deny('FORBIDDEN');
  let receipt;try{receipt=await this.#port.readReceipt(a.localControlledCall.command);}catch{receipt=null;}return this.#saveReceipt(req,receipt);
 }
 recover(){return this.#engine().recover();}
 async reconcile(request){
  if(!this.#valid(request,['noActiveCall','result'])||request.noActiveCall!==true||!['UNKNOWN','NO_ANSWER','BUSY','REJECTED','COMPLETED','FAILED'].includes(request.result))return deny('EXPLICIT_RECONCILIATION_REQUIRED');
  const req=structuredClone(request),a=this.#existing(req,'reconcile');if(!a)return deny('FORBIDDEN');if(a.status==='FINISHED')return {decision:'OK'};
  let native;try{native=await this.#port.reconcile(a.localControlledCall.command,{noActiveCall:true});}catch{native=null;}
  if(native?.nativeReconciled!==true||native.hostReconciled!==false)return deny('NATIVE_RECONCILIATION_REQUIRED');
  this.#fault('after-native-reconcile');
  return this.#store.transaction(state=>{
   const s=structuredClone(state),store=stage(s),current=this.#owned(s,req,'reconcile');
   if(!current?.localControlledCall||current.localControlledCall.digest!==a.localControlledCall.digest)return deny('FORBIDDEN');
   if(current.status==='FINISHED')return {decision:'OK'};
   const held=new TrialBudget({store,now:()=>this.#clock.nowMs()}).reconcile({tenantId:current.tenantId,salesId:current.salesId,ticketId:current.trialTicketId,noActiveCall:true,outcome:'NATIVE_RECONCILED'});
   if(!['RECONCILED','ALREADY_RECONCILED'].includes(held.code))return deny(held.code);
   current.manualResults.push({actorId:req.actorId,atEpochMs:this.#clock.nowMs(),result:req.result,noActiveCall:true,source:'MANUAL_CONTROLLED_TEST'});
   current.localControlledCall.nativeReconciled=true;const engine=this.#engine(store);engine.finish(s,current);
   engine.audit(s,s.actors[req.actorId],'LOCAL_CONTROLLED_RECONCILED',{attemptId:current.attemptId,result:req.result});
   this.#fault('before-reconcile-commit');Object.assign(state,s);return {decision:'OK'};
  });
 }
}
