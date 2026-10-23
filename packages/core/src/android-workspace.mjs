import { randomUUID } from 'node:crypto';
import { SimulationEngine } from './simulation-engine.mjs';
import { SELF_SERVICE_CAPABILITIES } from './simulation-session.mjs';
const uid=kind=>'SYNTHETIC-'+kind+'-'+randomUUID().toUpperCase();
const fields={status:[],bind:[],phoneRefresh:[],phoneSelect:['accountKey'],create:['targetKey'],send:['taskId','intentId'],schedule:['taskId','plannedAt'],reconcile:['attemptId','noActiveCall'],pause:[],resume:[],plan:['taskId'],refuse:['targetKey']};
/** Independent persistent workspace using wall time. Virtual simulator state is never reused. */
export class AndroidWorkspace {
 #tail=Promise.resolve();
 #timer=null; #timerBusy=false; #closed=false;
 constructor({store,binding,now=()=>Date.now(),phone=null}){
  this.phone=phone;
  this.store=store;this.binding=binding;this.now=now;
  this.engine=new SimulationEngine({store,clock:{nowMs:now}});
  if(!Object.keys(store.read().actors).length){
   const actorId=uid('SALES'),tenantId=uid('TENANT');
   this.engine.configureFixture({actors:[{actorId,tenantId,permissions:SELF_SERVICE_CAPABILITIES}],policy:{simulationOnly:true,version:1,calendar:'weekdays',lateToleranceMs:60000,pauseScope:'seller',order:'explicit-selection'}});
   store.transaction(s=>{s.androidWorkspace={actorId};});
  }
  const identity=store.read().androidWorkspace;if(!identity)throw Error('DEDICATED_ANDROID_STORE_REQUIRED');
  this.actorId=identity.actorId;this.engine.recover();
  store.transaction(s=>{
   s.androidWorkspace.schedules??=[];
   for(const p of s.androidWorkspace.schedules)if(['PENDING','DISPATCHING'].includes(p.status)){
    p.status='NEEDS_REPLAN';p.reason='SERVICE_RESTARTED';p.finishedAt=this.now();
   }
  });
  // This is the synthetic channel's availability, not a measured telephone IDLE state.
  this.engine.observeDevice({actorId:this.actorId,state:'IDLE'});
 }
 status(){return {decision:'OK',mode:'simulation',clock:'wall',now:this.now(),binding:this.binding.status(),
  phoneCapabilities:this.phone?.status()??{realCallsEnabled:false,callAuthorization:'DENY',reason:'PHONE_PROBE_NOT_CONFIGURED'},
  schedules:this.store.read().androidWorkspace.schedules,dispatchToleranceMs:1000,schedulerRunning:this.#timer!==null,
  snapshot:this.engine.snapshot({actorId:this.actorId}),metrics:this.engine.metrics({actorId:this.actorId}),realPhoneAdapterConnected:false};}
 #enqueue(fn){if(this.#closed)return Promise.resolve({decision:'DENY',reason:'WORKSPACE_CLOSED'});const pending=this.#tail.then(fn);this.#tail=pending.catch(()=>{});return pending;}
 execute(command){return this.#enqueue(()=>this.#execute(command));}
 runDue(){return this.#enqueue(()=>this.#runDue());}
 startScheduler(){
  if(this.#closed||this.#timer)return;
  this.#timer=setInterval(()=>{
   if(this.#timerBusy)return;this.#timerBusy=true;
   this.runDue().catch(()=>{this.stopScheduler();}).finally(()=>{this.#timerBusy=false;});
  },250);this.#timer.unref();
 }
 stopScheduler(){if(this.#timer)clearInterval(this.#timer);this.#timer=null;}
 #finish(id,status,details={}){this.store.transaction(s=>{const p=s.androidWorkspace.schedules.find(p=>p.id===id);if(p){p.status=status;p.finishedAt=this.now();Object.assign(p,details);}});}
 #invalidate(taskId,reason){this.store.transaction(s=>{for(const p of s.androidWorkspace.schedules)if(p.status==='PENDING'&&(!taskId||p.taskId===taskId)){p.status='CANCELLED';p.reason=reason;p.finishedAt=this.now();}});}
 async #runDue(){
  const due=this.store.read().androidWorkspace.schedules.filter(p=>p.status==='PENDING'&&p.plannedAt<=this.now());
  for(const p of due){
   // Durable claim before async transport: a restart never replays this record.
   this.store.transaction(s=>{const item=s.androidWorkspace.schedules.find(x=>x.id===p.id);item.status='DISPATCHING';item.claimedAt=this.now();});
   try{
    if(this.now()>p.deadline)throw Error('SCHEDULE_EXPIRED');
    const b=await this.binding.verify();if(b.deviceId!==p.deviceId)throw Error('SCHEDULE_BINDING_CHANGED');
    const adapter=this.binding.adapter();
    if(this.now()>p.deadline)throw Error('SCHEDULE_EXPIRED');
    const grant=this.engine.authorize({actorId:this.actorId,taskId:p.taskId,intentId:p.id,planVersion:p.planVersion,policyVersion:p.policyVersion,trigger:'scheduled'});
    if(grant.decision!=='ALLOW'){this.#finish(p.id,'BLOCKED',{reason:grant.reason});continue;}
    const result=await this.engine.consumeAndroid({actorId:this.actorId,attemptId:grant.attemptId},adapter);
    this.#finish(p.id,result.apiSubmission==='SUBMITTED'?'COMPLETED':'BLOCKED',{attemptId:grant.attemptId,result});
   }catch(e){this.#finish(p.id,'BLOCKED',{reason:e.message});}
  }
  return {decision:'OK',processed:due.length};
 }
 async #execute(c){
  if(!c||typeof c!=='object'||!Object.hasOwn(fields,c.op)||Object.keys(c).some(k=>k!=='op'&&!fields[c.op].includes(k)))return {decision:'DENY',reason:'UNSUPPORTED_ANDROID_COMMAND'};
  const actorId=this.actorId;
  try{
   switch(c.op){
    case 'status':return this.status();
    case 'bind':return {decision:'OK',binding:await this.binding.bind()};
    case 'phoneRefresh':if(!this.phone)return {decision:'DENY',reason:'PHONE_PROBE_NOT_CONFIGURED'};return {decision:'OK',phoneCapabilities:await this.phone.refresh()};
    case 'phoneSelect':if(!this.phone)return {decision:'DENY',reason:'PHONE_PROBE_NOT_CONFIGURED'};await this.phone.refresh();return this.phone.select(c.accountKey);
    case 'schedule':{
     if(!Number.isSafeInteger(c.plannedAt)||c.plannedAt<=this.now())return {decision:'DENY',reason:'FUTURE_PLAN_REQUIRED'};
     const b=await this.binding.verify();
     if(c.plannedAt<=this.now()||c.plannedAt>=b.expiresAt)return {decision:'DENY',reason:'PLAN_OUTSIDE_BINDING_LEASE'};
     const changed=this.engine.retime({actorId,taskId:c.taskId,plannedAt:c.plannedAt});if(changed.decision!=='OK')return changed;
     const task=this.store.read().tasks[c.taskId],id=uid('SCHEDULE');
     this.store.transaction(s=>{
      for(const p of s.androidWorkspace.schedules)if(p.taskId===c.taskId&&p.status==='PENDING'){p.status='CANCELLED';p.reason='REPLACED';p.finishedAt=this.now();}
      s.androidWorkspace.schedules.push({id,taskId:c.taskId,planVersion:task.planVersion,policyVersion:task.policyVersion,deviceId:b.deviceId,plannedAt:c.plannedAt,deadline:c.plannedAt+1000,status:'PENDING',createdAt:this.now()});
     });
     return {decision:'OK',scheduleId:id,plannedAt:c.plannedAt};
    }
    case 'create':{
     if(typeof c.targetKey!=='string'||!/^SYNTHETIC-[A-Z0-9-]{1,100}$/.test(c.targetKey))return {decision:'DENY',reason:'SYNTHETIC_TARGET_REQUIRED'};
     const imported=this.engine.importContacts({actorId,rows:[{raw:c.targetKey,qualification:'CONFIRMED',source:'SYNTHETIC-ANDROID-WEB'}]});
     if(imported.decision!=='OK')return imported;
     return this.engine.createTask({actorId,taskId:uid('TASK'),targetKey:c.targetKey,assignedSalesId:actorId,plannedAt:this.now()});
    }
    case 'send':{
     await this.binding.verify();
     const adapter=this.binding.adapter();
     const task=this.engine.snapshot({actorId}).tasks.find(t=>t.taskId===c.taskId);
     if(!task)return {decision:'DENY',reason:'TASK_NOT_FOUND'};
     const grant=this.engine.authorize({actorId,taskId:c.taskId,intentId:c.intentId,planVersion:task.planVersion,policyVersion:this.store.read().policy.version,trigger:'manual_now'});
     if(grant.decision!=='ALLOW')return grant;
     this.#invalidate(c.taskId,'MANUAL_TRIGGERED');
     return await this.engine.consumeAndroid({actorId,attemptId:grant.attemptId},adapter);
    }
    case 'reconcile':return this.engine.reconcile({actorId,attemptId:c.attemptId,noActiveCall:c.noActiveCall,result:'UNKNOWN'});
    case 'pause':{const r=this.engine.pause({actorId});if(r.decision==='OK')this.#invalidate(null,'PAUSED');return r;}
    case 'resume':return this.engine.resume({actorId});
    case 'plan':{const r=this.engine.retime({actorId,taskId:c.taskId,plannedAt:this.now()});if(r.decision==='OK')this.#invalidate(c.taskId,'REPLANNED');return r;}
    case 'refuse':return this.engine.refuse({actorId,targetKey:c.targetKey});
   }
  }catch(e){return {decision:'DENY',reason:e.message};}
 }
 async close(){this.#closed=true;this.stopScheduler();await this.#tail;this.store.close();}
}
