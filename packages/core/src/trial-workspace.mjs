import { fixture,NOW,TENANT,SALES,TARGET,TASK } from '../test-support/simulation-fixture.mjs';
import { FakeClock } from '../test-support/fake-clock.mjs';
import { TrialBudget } from './trial-budget.mjs';
import { PhoneCapabilities } from './phone-capabilities.mjs';
import { ControlledTrial } from './controlled-trial.mjs';
const mapping={deviceKey:'a'.repeat(64),accountKey:'b'.repeat(64),deviceId:'SYNTHETIC-WEB-DEVICE',accountId:'SYNTHETIC-WEB-SIM'};
const roundId='SYNTHETIC-WEB-ROUND';
const denied=reason=>({decision:'DENY',reason,realCallsEnabled:false});
/** Isolated persistent, one-use demonstration. No API for creating/resetting quota. */
export class TrialWorkspace {
 constructor(store){
  this.store=store;this.clock=new FakeClock(NOW);
  if(!Object.keys(store.read().actors).length){
   fixture({store,clock:this.clock});
   new TrialBudget({store,now:()=>NOW}).register({roundId,tenantId:TENANT,salesId:SALES,deviceId:mapping.deviceId,accountId:mapping.accountId,targets:[TARGET],notBefore:NOW,expiresAt:NOW+60000,maxAttempts:1,source:'SIMULATION_FIXTURE'});
   store.transaction(s=>{s.trialWeb={schema:1};});
  }
  if(store.read().trialWeb?.schema!==1)throw Error('TRIAL_STORE_MISMATCH');
  this.phone=new PhoneCapabilities({now:()=>NOW,read:async()=>({schemaVersion:1,source:'ANDROID_READ_ONLY',deviceKey:mapping.deviceKey,observedAt:NOW,deviceObservedAt:NOW,permissions:{callPhone:true,readPhoneState:true,readPhoneNumbers:true},accountsStatus:'KNOWN',accounts:[{key:mapping.accountKey,label:'演练卡（模拟）',enabled:true}],inCall:false,exactAlarm:true,backgroundRestricted:false,ignoringBatteryOptimizations:true,realCallsEnabled:false})});
  this.service=new ControlledTrial({store,clock:this.clock,phone:this.phone,mapping,outcomes:['UNKNOWN']});this.service.recover();
 }
 status(){const s=this.store.read(),round=s.trialBudget.rounds.find(r=>r.config.roundId===roundId);return {mode:'SIMULATION_ONLY',clock:NOW,clockMode:'FROZEN_FIXTURE',roundId,target:TARGET,used:round.used,limit:round.config.maxAttempts,remaining:round.config.maxAttempts-round.used,expiresAt:round.config.expiresAt,selected:!!this.phone.status().selectedAccount,attempt:Object.values(s.attempts).find(a=>a.trialTicketId)??null,realCallsEnabled:false,callAuthorization:'DENY'};}
 async execute(c){
  const allowed={status:['op'],select:['op'],submit:['op'],reconcile:['op','noActiveCall']};
  if(!c||!allowed[c.op]||Object.keys(c).length!==allowed[c.op].length||Object.keys(c).some(k=>!allowed[c.op].includes(k)))return denied('UNSUPPORTED_FIELDS');
  if(c.op==='status')return this.status();
  if(c.op==='select'){await this.phone.refresh();return this.phone.select(mapping.accountKey);}
  if(c.op==='submit')return this.service.submit({actorId:SALES,taskId:TASK,planVersion:1,policyVersion:1,intentId:'SYNTHETIC-WEB-INTENT',trigger:'manual_now',roundId});
  const a=this.status().attempt;if(!a)return denied('NO_ATTEMPT');
  return this.service.reconcile({actorId:SALES,attemptId:a.attemptId,noActiveCall:c.noActiveCall,result:'UNKNOWN'});
 }
 close(){this.store.close();}
}
