import { NativeGuardAdapter } from './native-guard-adapter.mjs';
import { checkAccess, checkEligibility } from './eligibility.mjs';
import { checkDialWindow } from './dial-window.mjs';
import { FakeDialAdapter } from '../test-support/fake-dial-adapter.mjs';
import { AndroidSandboxAdapter } from './android-sandbox-adapter.mjs';

export const syntheticId = value => typeof value === 'string' && /^SYNTHETIC-[A-Z0-9-]+$/.test(value);
export const key = (tenantId, value) => JSON.stringify([tenantId, value]);
export const deny = reason => ({ decision: 'DENY', reason });
const ok = values => ({ decision: 'OK', ...values });
const day = new Intl.DateTimeFormat('en-CA', { timeZone:'Asia/Shanghai', year:'numeric', month:'2-digit', day:'2-digit' });
const weekday = new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Shanghai',weekday:'short'});
const isWeekday=at=>!['Sat','Sun'].includes(weekday.format(at));
const planAllowed=(s,at)=>checkDialWindow({atEpochMs:at,trigger:'manual_reschedule'}).decision==='WINDOW_OK'&&(s.policy?.calendar!=='weekdays'||isWeekday(at));
const QUALIFICATIONS = new Set(['CONFIRMED','UNKNOWN','INVALID']);
export const unresolved = a => ['AUTHORIZED','HANDOFF_UNKNOWN','SUBMITTED','RECONCILE_REQUIRED'].includes(a.status);

/** Local synthetic application service. Actor registry is fixture-auth, not production authentication. */
export class SimulationEngine {
  constructor({store, clock, mode = 'simulation', fault = () => {}}) {
    if (mode !== 'simulation') throw new Error('REAL_ADAPTER_UNAVAILABLE');
    this.store = store; this.clock = clock; this.fault = fault;
  }
  configureFixture({actors, policy}) {
    return this.store.transaction(s => {
      if (Object.keys(s.actors).length) throw new Error('FIXTURE_ALREADY_INITIALIZED');
      for (const a of actors) {
        if (!syntheticId(a.actorId) || !syntheticId(a.tenantId) || !Array.isArray(a.permissions)) throw new Error('SYNTHETIC_FIXTURE_ONLY');
        s.actors[a.actorId] = structuredClone(a);
        s.sellers[key(a.tenantId,a.actorId)] = { paused:false, deviceState:'UNKNOWN', occupiedBy:null };
      }
      s.policy = structuredClone(policy);
    });
  }
  actor(s, actorId, capability, task) {
    const actor = s.actors[actorId];
    return checkAccess(actor, { tenantId:task?.tenantId ?? actor?.tenantId, capability }).decision === 'CONTINUE' ? actor : null;
  }
  canManageContact(s,actor,c) {
    if(!c||c.tenantId!==actor.tenantId)return false;
    return actor.permissions.includes('read_all')
      ||Object.values(s.tasks).some(t=>t.tenantId===actor.tenantId&&t.targetKey===c.targetKey&&t.assignedSalesId===actor.actorId)
      ||(actor.permissions.includes('assign_self')&&c.imports.some(i=>i.actorId===actor.actorId));
  }
  audit(s, actor, kind, details = {}) {
    const e = { sequence:++s.sequence, tenantId:actor.tenantId, actorId:actor.actorId, atEpochMs:this.clock.nowMs(), kind, source:'SIMULATION', ...details };
    s.events.push(e); return e;
  }
  importContacts({actorId, rows}) {
    return this.store.transaction(s => {
      const actor = this.actor(s,actorId,'import'); if (!actor) return deny('FORBIDDEN');
      if (!Array.isArray(rows) || rows.length > 10000) return deny('INVALID_INPUT');
      const results = rows.map(row => {
        if (typeof row?.raw !== 'string' || !row.raw.trim()) return { status:'INVALID' };
        if (Object.keys(row).some(field=>!['raw','qualification','source'].includes(field))) return { status:'UNSUPPORTED' };
        const targetKey = row.raw.trim().toUpperCase();
        if (!syntheticId(targetKey)) return { status:'UNSUPPORTED' };
        if (!QUALIFICATIONS.has(row.qualification) || !syntheticId(row.source)) return { status:'INVALID', targetKey };
        const k = key(actor.tenantId,targetKey), existing = s.contacts[k];
        const imported = {raw:row.raw,qualification:row.qualification,source:row.source,atEpochMs:this.clock.nowMs(),actorId};
        if (existing) {
          existing.imports.push(imported);
          return {status:existing.qualification === row.qualification ? 'DUPLICATE' : 'CONFLICT',targetKey};
        }
        s.contacts[k] = { tenantId:actor.tenantId,targetKey,qualification:row.qualification,qualificationSource:row.source,doNotContact:false,revision:1,imports:[imported] };
        return {status:'IMPORTED',targetKey};
      });
      this.audit(s,actor,'IMPORTED',{accepted:results.filter(r=>r.status==='IMPORTED').length});
      return ok({rows:results});
    });
  }
  createTask({actorId, taskId, targetKey, assignedSalesId, plannedAt}) {
    return this.store.transaction(s => {
      const manager=this.actor(s,actorId,'assign');
      const actor=manager||(assignedSalesId===actorId?this.actor(s,actorId,'assign_self'):null);
      if (!actor) return deny('FORBIDDEN');
      if (!syntheticId(taskId) || !syntheticId(targetKey) || !syntheticId(assignedSalesId)) return deny('INVALID_INPUT');
      if (s.tasks[taskId]) return deny('FORBIDDEN');
      if (!s.contacts[key(actor.tenantId,targetKey)] || s.actors[assignedSalesId]?.tenantId !== actor.tenantId) return deny('FORBIDDEN');
      if(!manager&&!this.canManageContact(s,actor,s.contacts[key(actor.tenantId,targetKey)]))return deny('FORBIDDEN');
      if (!planAllowed(s,plannedAt)) return deny('INVALID_PLAN_TIME');
      s.tasks[taskId] = {taskId,tenantId:actor.tenantId,targetKey,assignedSalesId,plannedAt,planVersion:1,cycle:1,policyVersion:s.policy?.version,status:'READY'};
      this.audit(s,actor,'TASK_CREATED',{taskId,planVersion:1});
      return ok({taskId,planVersion:1});
    });
  }
  check(s, actor, task, req, consuming = false) {
    const contact = s.contacts[key(task.tenantId,task.targetKey)];
    const eligible = checkEligibility({actor,task,contact}); if (eligible.decision !== 'CONTINUE') return eligible;
    if (req.mode !== undefined && req.mode !== 'simulation') return deny('REAL_ADAPTER_UNAVAILABLE');
    if (!['manual_now','scheduled'].includes(req.trigger)) return deny('INVALID_TRIGGER');
    const seller = s.sellers[key(task.tenantId,task.assignedSalesId)];
    if (!seller || seller.paused) return deny('PAUSED');
    if (req.planVersion !== task.planVersion) return deny('STALE_PLAN');
    const p = s.policy;
    if (p?.simulationOnly!==true || !Number.isSafeInteger(p.version) || (p.calendar!==undefined&&p.calendar!=='weekdays') || (p.calendar!=='weekdays'&&!Array.isArray(p.calendarDates))
      || !Number.isSafeInteger(p.lateToleranceMs) || p.lateToleranceMs < 0 || p.pauseScope !== 'seller' || p.order !== 'explicit-selection') return deny('POLICY_GAP');
    if (req.policyVersion !== p.version || task.policyVersion !== p.version) return deny('STALE_POLICY');
    const now = this.clock.nowMs();
    const window = checkDialWindow({atEpochMs:now,trigger:req.trigger});
    if (window.decision !== 'WINDOW_OK') return deny(window.reason);
    if (p.calendar==='weekdays'?!isWeekday(now):!p.calendarDates.includes(day.format(now))) return deny('CALENDAR_CLOSED');
    if (task.status === 'NEEDS_REPLAN') return deny('NEEDS_REPLAN');
    if (task.status === 'CANCELLED') return deny('CANCELLED');
    if (req.trigger === 'scheduled') {
      if (now < task.plannedAt) return deny('NOT_DUE');
      if (now - task.plannedAt > p.lateToleranceMs) return deny('EXPIRED');
    }
    if (seller.deviceState !== 'IDLE') return deny('DEVICE_NOT_IDLE');
    if (consuming && seller.occupiedBy !== req.attemptId) return deny('OCCUPANCY_LOST');
    return {decision:'CONTINUE'};
  }
  authorize(req) {
    return this.store.transaction(s => {
      const task=s.tasks[req.taskId], actor=this.actor(s,req.actorId,'trigger',task);
      if (!task || !actor || task.assignedSalesId !== actor.actorId) return deny('FORBIDDEN');
      if (!syntheticId(req.intentId)) return deny('INVALID_INTENT');
      const valid=this.check(s,actor,task,req); if(valid.decision==='DENY') return valid;
      const previous=Object.values(s.attempts).find(a=>a.tenantId===actor.tenantId && (a.intentId===req.intentId || (a.taskId===task.taskId && a.cycle===task.cycle)));
      if(previous) return deny('DUPLICATE');
      const seller=s.sellers[key(task.tenantId,task.assignedSalesId)];
      if(seller.occupiedBy) return deny('SALES_BUSY');
      if(task.status!=='READY') return deny('TASK_NOT_READY');
      const attemptId=`SYNTHETIC-ATTEMPT-${++s.sequence}`;
      const attempt={attemptId,tenantId:task.tenantId,taskId:task.taskId,targetKey:task.targetKey,salesId:task.assignedSalesId,
        intentId:req.intentId,cycle:task.cycle,planVersion:task.planVersion,policyVersion:task.policyVersion,trigger:req.trigger,
        qualificationRevision:s.contacts[key(task.tenantId,task.targetKey)].revision,authorizedAt:this.clock.nowMs(),
        status:'AUTHORIZED',apiSubmission:null,handoffAt:null,hadUnknown:false,manualResults:[],observations:[]};
      s.attempts[attemptId]=attempt; this.fault('after-attempt');
      seller.occupiedBy=attemptId; task.status='AUTHORIZED'; this.fault('after-occupancy');
      this.audit(s,actor,'AUTHORIZED',{attemptId,taskId:task.taskId,planVersion:task.planVersion}); this.fault('after-audit');
      attempt.outbox='PENDING'; this.fault('after-outbox');
      return {decision:'ALLOW',attemptId};
    });
  }
  setQualification({actorId,targetKey,qualification,source}) {
    return this.store.transaction(s=>{
      const actor=this.actor(s,actorId,'qualify'); if(!actor)return deny('FORBIDDEN');
      const c=s.contacts[key(actor.tenantId,targetKey)]; if(!this.canManageContact(s,actor,c))return deny('FORBIDDEN');
      if(!QUALIFICATIONS.has(qualification)||!syntheticId(source))return deny('INVALID_INPUT');
      c.qualification=qualification; c.qualificationSource=source; c.revision++;
      this.audit(s,actor,'QUALIFICATION_CHANGED',{targetKey,qualification,revision:c.revision}); return ok();
    });
  }
  refuse({actorId,targetKey}) {
    return this.store.transaction(s=>{
      const actor=this.actor(s,actorId,'refuse'); if(!actor)return deny('FORBIDDEN');
      const c=s.contacts[key(actor.tenantId,targetKey)]; if(!this.canManageContact(s,actor,c))return deny('FORBIDDEN');
      c.doNotContact=true; c.revision++;
      this.audit(s,actor,'REFUSED',{targetKey,revision:c.revision}); return ok();
    });
  }
  cancelPending(s,task,actor,reason) {
    for(const a of Object.values(s.attempts)) if(a.taskId===task.taskId && a.status==='AUTHORIZED') {
      a.status='CANCELLED'; a.outbox='CANCELLED'; a.cancelReason=reason;
      const seller=s.sellers[key(a.tenantId,a.salesId)]; if(seller.occupiedBy===a.attemptId)seller.occupiedBy=null;
      this.audit(s,actor,'GRANT_CANCELLED',{attemptId:a.attemptId,taskId:task.taskId,reason});
    }
  }
  changeTask({actorId,taskId},capability,fn) {
    return this.store.transaction(s=>{
      const task=s.tasks[taskId], actor=this.actor(s,actorId,capability,task);
      if(!task||!actor||(capability!=='assign'&&task.assignedSalesId!==actorId))return deny('FORBIDDEN');
      if(task.status==='FINISHED'&&capability!=='trigger')return deny('MANUAL_RETRY_REQUIRED');
      if(Object.values(s.attempts).some(a=>a.taskId===taskId && unresolved(a)&&a.status!=='AUTHORIZED'))return deny('RECONCILE_REQUIRED');
      return fn(s,actor,task);
    });
  }
  retime({actorId,taskId,plannedAt}) {
    return this.changeTask({actorId,taskId},'retime',(s,actor,task)=>{
      if(!planAllowed(s,plannedAt))return deny('INVALID_PLAN_TIME');
      // Completed cycles require an explicit manual retry, never an automatic retime retry.
      if(task.status==='FINISHED')return deny('MANUAL_RETRY_REQUIRED');
      this.cancelPending(s,task,actor,'REPLANNED'); task.planVersion++; task.cycle++;
      task.plannedAt=plannedAt; task.policyVersion=s.policy?.version; task.status='READY';
      this.audit(s,actor,'RETIMED',{taskId,planVersion:task.planVersion,plannedAt});return ok({planVersion:task.planVersion});
    });
  }
  assign({actorId,taskId,assignedSalesId}) {
    return this.changeTask({actorId,taskId},'assign',(s,actor,task)=>{
      if(s.actors[assignedSalesId]?.tenantId!==actor.tenantId)return deny('FORBIDDEN');
      this.cancelPending(s,task,actor,'REASSIGNED'); task.assignedSalesId=assignedSalesId;task.planVersion++;task.cycle++;
      task.status='NEEDS_REPLAN';this.audit(s,actor,'ASSIGNED',{taskId,assignedSalesId,planVersion:task.planVersion});return ok();
    });
  }
  pause({actorId}) {
    return this.store.transaction(s=>{
      const actor=this.actor(s,actorId,'pause');if(!actor)return deny('FORBIDDEN');
      s.sellers[key(actor.tenantId,actorId)].paused=true;
      for(const task of Object.values(s.tasks))if(task.tenantId===actor.tenantId&&task.assignedSalesId===actorId&&['READY','AUTHORIZED','NEEDS_REPLAN'].includes(task.status)) {
        this.cancelPending(s,task,actor,'PAUSED');task.planVersion++;task.cycle++;task.status='NEEDS_REPLAN';
      }
      this.audit(s,actor,'PAUSED');return ok();
    });
  }
  resume({actorId}) {
    return this.store.transaction(s=>{
      const actor=this.actor(s,actorId,'pause');if(!actor)return deny('FORBIDDEN');
      s.sellers[key(actor.tenantId,actorId)].paused=false;
      this.audit(s,actor,'RESUMED_REPLAN_REQUIRED');return ok();
    });
  }
  cancel({actorId,taskId}) {
    return this.changeTask({actorId,taskId},'retime',(s,actor,task)=>{
      this.cancelPending(s,task,actor,'CANCELLED');task.planVersion++;task.status='CANCELLED';
      this.audit(s,actor,'TASK_CANCELLED',{taskId,planVersion:task.planVersion});return ok();
    });
  }
  observeDevice({actorId,state}) {
    return this.store.transaction(s=>{
      const actor=this.actor(s,actorId,'observe');if(!actor)return deny('FORBIDDEN');
      if(!['IDLE','BUSY','UNKNOWN'].includes(state))return deny('INVALID_INPUT');
      s.sellers[key(actor.tenantId,actorId)].deviceState=state;
      this.audit(s,actor,'DEVICE_OBSERVED',{state});return ok();
    });
  }
  snapshot({actorId,taskId} = {}) {
    return this.view(this.store.read(),{actorId,taskId});
  }
  view(s,{actorId,taskId}) {
    const actor=this.actor(s,actorId,'read');if(!actor)return deny('FORBIDDEN');
    const visible=t=>t.tenantId===actor.tenantId&&(actor.permissions.includes('read_all')||t.assignedSalesId===actorId);
    if(taskId && (!s.tasks[taskId]||!visible(s.tasks[taskId])))return deny('FORBIDDEN');
    const tasks=Object.values(s.tasks).filter(t=>visible(t)&&(!taskId||t.taskId===taskId));
    const taskIds=new Set(tasks.map(t=>t.taskId));
    const targetKeys=new Set(tasks.map(t=>t.targetKey)), readAll=actor.permissions.includes('read_all');
    const contacts=Object.values(s.contacts).filter(c=>c.tenantId===actor.tenantId&&(readAll||targetKeys.has(c.targetKey)||(!taskId&&actor.permissions.includes('assign_self')&&c.imports.some(i=>i.actorId===actorId))));
    for(const c of contacts)targetKeys.add(c.targetKey);
    return ok({mode:'simulation',tasks,attempts:Object.values(s.attempts).filter(a=>taskIds.has(a.taskId)),
      contacts:contacts.map(c=>({...c,imports:readAll?c.imports:c.imports.filter(i=>i.actorId===actorId)})),
      events:s.events.filter(e=>e.tenantId===actor.tenantId&&(readAll||(e.taskId?taskIds.has(e.taskId):e.targetKey?targetKeys.has(e.targetKey):e.actorId===actorId))),
      sellers:Object.entries(s.sellers).filter(([k])=>{const [tenant,sales]=JSON.parse(k);return tenant===actor.tenantId&&(readAll||sales===actorId);}).map(([k,v])=>({salesId:JSON.parse(k)[1],...v}))});
  }
  async consumeGuard(req,adapter) {
    if(!(adapter instanceof NativeGuardAdapter))return deny('REAL_ADAPTER_UNAVAILABLE');
    return this.#consume(req,adapter,false,true);
  }
  async consumeAndroid(req,adapter) {
    if(!(adapter instanceof AndroidSandboxAdapter))return deny('REAL_ADAPTER_UNAVAILABLE');
    return this.#consume(req,adapter,true);
  }
  async consume({actorId,attemptId},adapter) {
    if(!(adapter instanceof FakeDialAdapter))return deny('REAL_ADAPTER_UNAVAILABLE');
    return this.#consume({actorId,attemptId},adapter,false);
  }
  async #consume({actorId,attemptId},adapter,android,guard=false) {
    const prepared=this.store.transaction(s=>{
      const a=s.attempts[attemptId],actor=this.actor(s,actorId,'trigger',a);
      if(!a||!actor||a.salesId!==actorId)return deny('FORBIDDEN');
      if(a.status!=='AUTHORIZED')return deny('ALREADY_CONSUMED');
      const task=s.tasks[a.taskId],valid=this.check(s,actor,task,a,true);
      if(valid.decision==='DENY') {
        this.cancelPending(s,task,actor,valid.reason);task.status='NEEDS_REPLAN';return valid;
      }
      if(guard){
        const ticket=s.trialBudget?.tickets.find(t=>t.ticketId===a.trialTicketId);
        const round=s.trialBudget?.rounds.find(r=>r.config.roundId===a.trialRoundId);
        const binding=adapter.describe(),mapping=a.guardMapping,now=this.clock.nowMs();
        const sameAttempt=ticket&&['tenantId','salesId','taskId','targetKey','intentId','cycle'].every(k=>ticket[k]===a[k]);
        const sameDevice=ticket&&mapping&&ticket.deviceId===mapping.deviceId&&ticket.accountId===mapping.accountId
          &&mapping.deviceKey===binding.hostDeviceKey&&mapping.accountKey===binding.accountKey;
        const validRound=round&&!round.revoked&&ticket?.roundId===a.trialRoundId
          &&now>=round.config.notBefore&&now<round.config.expiresAt;
        if(!sameAttempt||!sameDevice||!validRound||ticket.state!=='HELD_UNKNOWN')return deny('GUARD_TICKET_NOT_VALID');
        a.trialExpiresAt=round.config.expiresAt;
        a.nativeGuardCommand=adapter.createCommand({...a,qualificationRevision:s.contacts[key(a.tenantId,a.targetKey)].revision},this.clock.nowMs());
      }
      if(android)a.androidCommand=adapter.createCommand({...a,qualificationRevision:s.contacts[key(a.tenantId,a.targetKey)].revision},this.clock.nowMs());
      a.status='HANDOFF_UNKNOWN';a.handoffAt=this.clock.nowMs();a.outbox='TAKEN';task.status='HANDOFF_UNKNOWN';
      this.audit(s,actor,'HANDOFF_PERSISTED',{attemptId,taskId:a.taskId,planVersion:a.planVersion});
      this.fault('before-handoff-commit');
      return ok({grant:guard?a.nativeGuardCommand:android?a.androidCommand:{mode:'simulation',attemptId,intentId:a.intentId,salesId:a.salesId,targetKey:a.targetKey}});
    });
    if(prepared.decision==='DENY')return prepared;
    this.fault('after-handoff-commit');
    let receipt;
    try { receipt=await adapter.submit(prepared.grant); }
    catch { receipt={attemptId,status:'UNKNOWN',source:'SIMULATION'}; }
    this.fault('after-adapter-return');
    if(receipt?.attemptId!==attemptId||receipt?.source!=='SIMULATION'||!['SUBMITTED','DEFINITELY_NOT_SUBMITTED','BUSY','UNKNOWN'].includes(receipt.status)) receipt={attemptId,status:'UNKNOWN',source:'SIMULATION'};
    return this.store.transaction(s=>{
      const a=s.attempts[attemptId],actor=s.actors[actorId],task=s.tasks[a.taskId];
      // A recovered/late response is evidence; never re-open a manually closed attempt.
      a.apiSubmission=receipt.status;
      if(guard&&receipt.nativeGuardReceipt)a.nativeGuardReceipt=structuredClone(receipt.nativeGuardReceipt);
      if(android&&receipt.androidReceipt)a.androidReceipt=structuredClone(receipt.androidReceipt);
      if(a.status!=='FINISHED') {
        if(receipt.status==='SUBMITTED') { a.status='SUBMITTED';task.status='SUBMITTED'; }
        else if(receipt.status==='UNKNOWN') { a.status='RECONCILE_REQUIRED';a.hadUnknown=true;task.status='RECONCILE_REQUIRED'; }
        else { this.finish(s,a); }
      }
      this.audit(s,actor,'API_RECEIPT',{attemptId,taskId:a.taskId,status:receipt.status});
      this.fault('before-receipt-commit');
      return ok({attemptId,status:a.status,apiSubmission:a.apiSubmission,source:'SIMULATION'});
    });
  }
  finish(s,a) {
    a.status='FINISHED';a.outbox='DONE';s.tasks[a.taskId].status='FINISHED';
    const seller=s.sellers[key(a.tenantId,a.salesId)];if(seller.occupiedBy===a.attemptId)seller.occupiedBy=null;
  }
  recover() {
    return this.store.transaction(s=>{
      let recovered=0;
      for(const a of Object.values(s.attempts))if(a.status==='HANDOFF_UNKNOWN') {
        a.status='RECONCILE_REQUIRED';a.hadUnknown=true;s.tasks[a.taskId].status='RECONCILE_REQUIRED';
        this.audit(s,s.actors[a.salesId],'RECOVERED_UNKNOWN',{attemptId:a.attemptId,taskId:a.taskId});recovered++;
      }
      return ok({recovered});
    });
  }
  reconcile({actorId,attemptId,noActiveCall,result}) {
    return this.store.transaction(s=>{
      const a=s.attempts[attemptId],actor=this.actor(s,actorId,'reconcile',a);
      if(!a||!actor||a.salesId!==actorId)return deny('FORBIDDEN');
      if(a.localControlledCall)return deny('NATIVE_RECONCILIATION_REQUIRED');
      if(!['SUBMITTED','RECONCILE_REQUIRED','HANDOFF_UNKNOWN'].includes(a.status))return deny('NOT_RECONCILABLE');
      if(noActiveCall!==true||!['UNKNOWN','NO_ANSWER','BUSY','REJECTED','COMPLETED','FAILED'].includes(result))return deny('ACTIVE_CALL_NOT_CLEARED');
      if(a.status==='HANDOFF_UNKNOWN')a.hadUnknown=true;
      a.manualResults.push({actorId,atEpochMs:this.clock.nowMs(),result,noActiveCall:true,source:'MANUAL_SIMULATION'});
      this.finish(s,a);this.audit(s,actor,'MANUALLY_RECONCILED',{attemptId,taskId:a.taskId,result});return ok();
    });
  }
  retry({actorId,taskId,plannedAt}) {
    return this.changeTask({actorId,taskId},'trigger',(s,actor,task)=>{
      if(task.status!=='FINISHED')return deny('RECONCILE_REQUIRED');
      const valid=checkEligibility({actor,task,contact:s.contacts[key(task.tenantId,task.targetKey)]});if(valid.decision==='DENY')return valid;
      if(!planAllowed(s,plannedAt))return deny('INVALID_PLAN_TIME');
      task.planVersion++;task.cycle++;task.plannedAt=plannedAt;task.policyVersion=s.policy?.version;task.status='READY';
      this.audit(s,actor,'MANUAL_RETRY_CREATED',{taskId,planVersion:task.planVersion});return ok({planVersion:task.planVersion});
    });
  }
  observe({actorId,eventId,attemptId=null,kind,binding,source}) {
    return this.store.transaction(s=>{
      const actor=this.actor(s,actorId,'observe');if(!actor)return deny('FORBIDDEN');
      const kinds=['OUTGOING_CONFIRMED','CONNECTED_CONFIRMED','OFFHOOK','OPEN_SUCCESS','IDLE','CX_CALL'];
      if(!syntheticId(eventId)||!kinds.includes(kind)||!['MATCHED','UNBOUND'].includes(binding)
        ||!['SIMULATED_DEVICE','SIMULATED_OBSERVATION'].includes(source))return deny('INVALID_EVENT');
      const a=attemptId?s.attempts[attemptId]:null;
      if(attemptId&&(!a||a.tenantId!==actor.tenantId||a.salesId!==actorId))return deny('FORBIDDEN');
      if(a?.localControlledCall)return deny('SIMULATION_OBSERVATION_FORBIDDEN');
      if(binding==='MATCHED'&&(!a||a.handoffAt===null||source!=='SIMULATED_DEVICE'))return deny('UNVERIFIED_BINDING');
      const event={tenantId:actor.tenantId,eventId,actorId,attemptId,kind,binding,source};
      const existing=s.observations.find(e=>e.tenantId===actor.tenantId&&e.eventId===eventId);
      if(existing)return deny(JSON.stringify(existing.event)===JSON.stringify(event)?'DUPLICATE_EVENT':'EVENT_ID_CONFLICT');
      s.observations.push({...event,event,atEpochMs:this.clock.nowMs()});
      if(a)a.observations.push(eventId);
      this.audit(s,actor,'OBSERVATION',{eventId,attemptId,kindObserved:kind,binding,observationSource:source});
      return ok();
    });
  }
  metrics({actorId,date} = {}) {
    const state=this.store.read(),snapshot=this.view(state,{actorId});if(snapshot.decision==='DENY')return snapshot;
    if(date!==undefined&&(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)))return deny('INVALID_DATE');
    const attempts=snapshot.attempts.filter(a=>!a.localControlledCall&&(date===undefined||day.format(a.authorizedAt)===date));
    const ids=new Set(attempts.map(a=>a.attemptId));
    const observations=state.observations.filter(e=>ids.has(e.attemptId)&&e.binding==='MATCHED'&&e.source==='SIMULATED_DEVICE');
    return ok({source:'SIMULATION',metricScope:date?`authorization-cohort:${date}`:'all-authorized-simulation',
      U:new Set(attempts.map(a=>a.targetKey)).size,G:attempts.length,Q:attempts.filter(a=>a.apiSubmission==='SUBMITTED').length,
      O:new Set(observations.filter(e=>e.kind==='OUTGOING_CONFIRMED').map(e=>e.attemptId)).size,
      C:new Set(observations.filter(e=>e.kind==='CONNECTED_CONFIRMED').map(e=>e.attemptId)).size,
      unknownPending:attempts.filter(a=>['HANDOFF_UNKNOWN','RECONCILE_REQUIRED'].includes(a.status)).length,
      everUnknown:attempts.filter(a=>a.hadUnknown).length});
  }
}
