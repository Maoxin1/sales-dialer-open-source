import { NativeGuardAdapter } from './native-guard-adapter.mjs';
import { SimulationEngine } from './simulation-engine.mjs';
import { SELF_SERVICE_CAPABILITIES } from './simulation-session.mjs';
import { PhoneCapabilities } from './phone-capabilities.mjs';
import { ControlledTrial } from './controlled-trial.mjs';
import { TrialBudget } from './trial-budget.mjs';
const SALES='SYNTHETIC-OBSERVED-SALES',TENANT='SYNTHETIC-OBSERVED-TENANT',TARGET='SYNTHETIC-OBSERVED-TARGET',TASK='SYNTHETIC-OBSERVED-TASK',ROUND='SYNTHETIC-OBSERVED-ROUND';
const deny=reason=>({decision:'DENY',reason,realCallsEnabled:false,callAuthorization:'DENY'});
/** Real read-only observations; simulated business target and internal fake output or typed native dry-run.
 * Requires a dedicated store. No dial transport is accepted. */
export class ObservedTrial {
 #store;#phone;#now;#engine;#service=null;#tail=Promise.resolve();#guardFactory;
 constructor({store,phone,now=Date.now,guardFactory}){
  if(!(phone instanceof PhoneCapabilities))throw Error('PHONE_MODEL_REQUIRED');
  if(guardFactory&&(['identity','create'].some(k=>typeof guardFactory[k]!=='function')))throw Error('INVALID_GUARD_FACTORY');
  this.#guardFactory=guardFactory;this.#store=store;this.#phone=phone;this.#now=now;
  this.#engine=new SimulationEngine({store,clock:{nowMs:now}});
  if(!Object.keys(store.read().actors).length){
   this.#engine.configureFixture({actors:[{actorId:SALES,tenantId:TENANT,permissions:SELF_SERVICE_CAPABILITIES}],policy:{simulationOnly:true,version:1,calendar:'weekdays',lateToleranceMs:60000,pauseScope:'seller',order:'explicit-selection'}});
   store.transaction(s=>{s.observedTrial={schema:1,mapping:null};});
   this.#engine.importContacts({actorId:SALES,rows:[{raw:TARGET,qualification:'CONFIRMED',source:'SYNTHETIC-OBSERVED-FIXTURE'}]});
   this.#engine.observeDevice({actorId:SALES,state:'IDLE'});
  }
  if(store.read().observedTrial?.schema!==1)throw Error('DEDICATED_OBSERVED_STORE_REQUIRED');
  const mapping=store.read().observedTrial.mapping;
  if(mapping){this.#service=this.#make(mapping);this.#service.recover();}
 }
 #make(mapping){
  const saved=this.#store.read().observedTrial;
  let guard;
  if(saved.nativeDeviceKey&&this.#guardFactory){
   guard=this.#guardFactory.create(mapping,saved.nativeDeviceKey);
   if(!(guard instanceof NativeGuardAdapter)||guard.describe().deviceKey!==saved.nativeDeviceKey)throw Error('INVALID_GUARD_FACTORY');
  }
  return new ControlledTrial({store:this.#store,clock:{nowMs:this.#now},phone:this.#phone,mapping,outcomes:['UNKNOWN'],guard});
 }
 #mode(){const saved=this.#store.read().observedTrial;return saved.mapping?(saved.nativeDeviceKey?'native':'fake'):(this.#guardFactory?'native':'fake');}
 #availability(){
  const mode=this.#mode();
  if(mode==='native'&&!this.#guardFactory)return 'NATIVE_GUARD_UNAVAILABLE';
  if(mode==='fake'&&this.#guardFactory)return 'OUTPUT_MODE_CHANGED';
  return null;
 }
 #queue(fn){const r=this.#tail.then(fn);this.#tail=r.catch(()=>{});return r;}
 execute(c){
  const fields={status:[],refresh:[],bind:['accountKey'],submit:[],reconcile:['noActiveCall']};
  if(!c||!Object.hasOwn(fields,c.op)||Object.keys(c).length!==fields[c.op].length+1||Object.keys(c).some(k=>k!=='op'&&!fields[c.op].includes(k)))return Promise.resolve(deny('UNSUPPORTED_FIELDS'));
  if(c.op==='bind')return this.bind(c.accountKey);
  if(c.op==='submit')return this.submit();
  if(c.op==='reconcile')return this.reconcile(c.noActiveCall);
  return this.#queue(async()=>{if(c.op==='refresh'){try{await this.#phone.refresh();}catch{return deny('PHONE_UNAVAILABLE');}}return {decision:'OK',...this.status()};});
 }
 async close(){await this.#tail;this.#store.close();}
 bind(accountKey){return this.#queue(async()=>{
  try{
   const unavailable=this.#availability();if(unavailable){this.#phone.select('');return deny(unavailable);}
   const state=await this.#phone.refresh(),account=state.snapshot?.accounts.find(a=>a.key===accountKey&&a.enabled);
   if(!account)return deny('ACCOUNT_NOT_AVAILABLE');
   const mapping={deviceKey:state.snapshot.deviceKey,accountKey,deviceId:'SYNTHETIC-DEVICE-'+state.snapshot.deviceKey.toUpperCase(),accountId:'SYNTHETIC-SIM-'+accountKey.toUpperCase()};
   const saved=this.#store.read().observedTrial.mapping;
   if(saved&&JSON.stringify(saved)!==JSON.stringify(mapping)){this.#phone.select('');return deny('ROUND_BINDING_CHANGED');}
   const old=this.#store.read().trialBudget?.rounds.find(r=>r.config.roundId===ROUND);
   if(old&&(this.#now()<old.config.notBefore||this.#now()>=old.config.expiresAt)){this.#phone.select('');return deny('ROUND_EXPIRED');}
   let nativeDeviceKey;
   if(this.#guardFactory){
    nativeDeviceKey=await this.#guardFactory.identity(mapping);
    if(!/^[a-f0-9]{64}$/.test(nativeDeviceKey))throw Error('INVALID_NATIVE_IDENTITY');
    const previous=this.#store.read().observedTrial.nativeDeviceKey;
    if(previous&&previous!==nativeDeviceKey){this.#phone.select('');return deny('NATIVE_INSTALLATION_CHANGED');}
   }
   const selected=this.#phone.select(accountKey);if(selected.decision!=='OK')return selected;
   if(!saved){
    const created=this.#store.transaction(s=>{
     const transactionStore={transaction:fn=>fn(s)};
     const engine=new SimulationEngine({store:transactionStore,clock:{nowMs:this.#now}});
     const task=engine.createTask({actorId:SALES,taskId:TASK,targetKey:TARGET,assignedSalesId:SALES,plannedAt:this.#now()});if(task.decision!=='OK')return task;
     const start=this.#now();
     new TrialBudget({store:transactionStore,now:this.#now}).register({roundId:ROUND,tenantId:TENANT,salesId:SALES,deviceId:mapping.deviceId,accountId:mapping.accountId,targets:[TARGET],notBefore:start,expiresAt:start+300000,maxAttempts:1,source:'SIMULATION_FIXTURE'});
     s.observedTrial.mapping=mapping;if(nativeDeviceKey)s.observedTrial.nativeDeviceKey=nativeDeviceKey;return {decision:'OK'};
    });
    if(created.decision!=='OK')return created;
    this.#service=this.#make(mapping);
   }
   return {decision:'OK',...this.status()};
  }catch{this.#phone.select('');return deny('PHONE_UNAVAILABLE');}
 });}
 submit(){return this.#queue(async()=>{
  const unavailable=this.#availability();if(unavailable)return deny(unavailable);
  if(!this.#service)return deny('OBSERVED_BINDING_REQUIRED');
  const saved=this.#store.read().observedTrial;
  if(saved.nativeDeviceKey){
   try{if(await this.#guardFactory.identity(saved.mapping)!==saved.nativeDeviceKey){this.#phone.select('');return deny('NATIVE_INSTALLATION_CHANGED');}}
   catch{this.#phone.select('');return deny('PHONE_UNAVAILABLE');}
  }
  return this.#service.submit({actorId:SALES,taskId:TASK,planVersion:1,policyVersion:1,intentId:'SYNTHETIC-OBSERVED-INTENT',trigger:'manual_now',roundId:ROUND});
 });}
 reconcile(noActiveCall){return this.#queue(()=>{const a=this.status().attempt;return a?this.#service.reconcile({actorId:SALES,attemptId:a.attemptId,noActiveCall,result:'UNKNOWN'}):deny('NO_ATTEMPT');});}
 status(){const s=this.#store.read(),r=s.trialBudget?.rounds.find(r=>r.config.roundId===ROUND);return {mode:this.#mode()==='native'?'OBSERVED_DEVICE_NATIVE_GUARD':'OBSERVED_DEVICE_FAKE_OUTPUT',guardAvailable:!this.#availability(),now:this.#now(),expired:!!r&&this.#now()>=r.config.expiresAt,realCallsEnabled:false,callAuthorization:'DENY',phone:this.#phone.status(),expiresAt:r?.config.expiresAt??null,used:r?.used??0,remaining:r?1-r.used:0,attempt:Object.values(s.attempts)[0]??null,requests:this.#service?.requests??[]};}
}
