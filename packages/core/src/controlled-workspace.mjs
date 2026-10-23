import {LocalControlledCallCoordinator} from './local-controlled-call-coordinator.mjs';
import {AdbControlledCallTransport} from './adb-controlled-call-transport.mjs';
import {SimulationEngine} from './simulation-engine.mjs';
import {fixture,NOW,SALES,TENANT,TARGET} from '../test-support/simulation-fixture.mjs';
import {FakeClock} from '../test-support/fake-clock.mjs';
const exact=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).sort().join()===keys.slice().sort().join();
/** Trusted actor/permit injected at startup. Browser cannot authorize calls or choose identity. */
export class ControlledWorkspace {
 #store;#service;#actor;#permit;#mode;#dispose;#closed=false;
 constructor({store,service,actorId,permitId,mode='LOCAL_CONTROLLED',dispose=()=>{}}){
  if(!(service instanceof LocalControlledCallCoordinator)||!['LOCAL_CONTROLLED','RECORDING_DEMO'].includes(mode))throw Error('INVALID_CONTROLLED_WORKSPACE');
  this.#store=store;this.#service=service;this.#actor=actorId;this.#permit=permitId;this.#mode=mode;this.#dispose=dispose;
 }
 #attempts(s){const engine=new SimulationEngine({store:this.#store,clock:{nowMs:()=>Date.now()}});return Object.values(s.attempts).filter(a=>a.salesId===this.#actor&&a.localControlledCall?.permitId===this.#permit&&engine.actor(s,this.#actor,'read',a));}
 status(){const s=this.#store.read(),actor=s.actors[this.#actor],permit=s.localControlledPermits?.[this.#permit];
  if(!actor||!actor.permissions.includes('read')||permit?.tenantId!==actor.tenantId||permit.salesId!==this.#actor)return {decision:'DENY',reason:'FORBIDDEN'};
  const round=s.trialBudget.rounds.find(r=>r.config.roundId===this.#permit);
  return {decision:'OK',mode:this.#mode,realCallsEnabled:false,sendAvailable:false,sendReason:'OPERATOR_SEND_NOT_ENABLED',permitId:this.#permit,
   binding:{device:permit.deviceKey.slice(-8),installation:permit.installationKey.slice(-8),account:permit.accountKey.slice(-8)},
   used:round.used,limit:round.config.maxAttempts,remaining:Math.max(0,round.config.maxAttempts-round.used),expiresAt:round.config.expiresAt,
   attempts:this.#attempts(s).map(a=>({attemptId:a.attemptId,taskId:a.taskId,targetKey:a.targetKey,status:a.status,apiSubmission:a.apiSubmission??'UNKNOWN',outgoingConfirmed:null,connectedConfirmed:null,
    pendingReason:a.status==='FINISHED'?null:'NATIVE_AND_HOST_RECONCILIATION_REQUIRED',manualResult:a.manualResults.at(-1)?.result??null,nativeReconciled:a.localControlledCall.nativeReconciled===true}))};
 }
 async execute(c){const allowed={status:['op'],refresh:['op','attemptId'],reconcile:['op','attemptId','noActiveCall','result']};
  if(!allowed[c?.op]||!exact(c,allowed[c.op]))return {decision:'DENY',reason:'UNSUPPORTED_FIELDS'};
  if(c.op==='status')return this.status();
  if(!this.#attempts(this.#store.read()).some(a=>a.attemptId===c.attemptId))return {decision:'DENY',reason:'FORBIDDEN'};
  const req={actorId:this.#actor,attemptId:c.attemptId,permitId:this.#permit};
  return c.op==='refresh'?this.#service.refresh(req):this.#service.reconcile({...req,noActiveCall:c.noActiveCall,result:c.result});
 }
 close(){if(this.#closed)return;this.#closed=true;this.#dispose();this.#store.close();}
}
class RecordingUsb extends AdbControlledCallTransport {
 async run(){throw Error('DEMO_DEVICE_ACCESS_DISABLED');}
 async readControlledDevice(){const b=this.binding();return {deviceKey:b.deviceKey,installationKey:b.installationKey,accountKey:b.accountKey,observedAt:NOW,inCall:false,permissionsGranted:true,accountEnabled:true};}
 async submit(){return {apiSubmission:'UNKNOWN'};}
 async readReceipt(){return {apiSubmission:'UNKNOWN'};}
 async reconcile(){return {nativeReconciled:true,hostReconciled:false};}
}
/** A separate persistent example, never the user's live trial or an actual local permit file. */
export async function createControlledDemo({store,journalPath}){
 const permit={mode:'LOCAL_CONTROLLED_CALL',approvalRef:'CONTROLLED-SYNTHETIC-WEB',token:'c'.repeat(64),notBefore:NOW,expiresAt:NOW+60000,permitId:'SYNTHETIC-OPERATOR-DEMO',tenantId:TENANT,salesId:SALES,targetKey:TARGET,installationKey:'a'.repeat(64),accountKey:'b'.repeat(64)};
 const clock=new FakeClock(NOW),fresh=Object.keys(store.read().actors).length===0;
 if(fresh){fixture({store,clock});store.transaction(s=>{s.policy.controlledPermitId=permit.permitId;s.controlledWorkspace={schema:1,mode:'RECORDING_DEMO'};});}
 if(store.read().controlledWorkspace?.mode!=='RECORDING_DEMO')throw Error('DEMO_STORE_MISMATCH');
 const port=new RecordingUsb({adbPath:'DEMO-DISABLED',serial:'SYNTHETIC-DEMO',journalPath,permit,expectedApkHash:'d'.repeat(64),hostDeviceKey:'e'.repeat(64)});
 try{
  const service=new LocalControlledCallCoordinator({store,clock,permit:{...port.binding(),maxAttempts:1},port});service.recover();
  if(fresh){const engine=new SimulationEngine({store,clock});const task=Object.values(store.read().tasks)[0];const grant=engine.authorize({actorId:SALES,taskId:task.taskId,planVersion:1,policyVersion:1,intentId:'SYNTHETIC-OPERATOR-INTENT',trigger:'manual_now'});if(grant.decision!=='ALLOW')throw Error('DEMO_GRANT_FAILED');await service.submit({actorId:SALES,attemptId:grant.attemptId,permitId:permit.permitId});}
  return new ControlledWorkspace({store,service,actorId:SALES,permitId:permit.permitId,mode:'RECORDING_DEMO',dispose:()=>port.close()});
 }catch(e){port.close();throw e;}
}
