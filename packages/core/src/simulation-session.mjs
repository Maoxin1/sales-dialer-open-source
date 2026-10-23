import { SimulationEngine, deny } from './simulation-engine.mjs';
import { FakeClock } from '../test-support/fake-clock.mjs';
import { FakeDialAdapter } from '../test-support/fake-dial-adapter.mjs';
import { SALES, OTHER, TENANT, NOW, CAPABILITIES, policy } from '../test-support/simulation-fixture.mjs';

export const commandFields = {
  help:[],status:['taskId'],import:['rows'],task:['taskId','targetKey','assignedSalesId','plannedAt'],
  plan:['taskId','plannedAt'],assign:['taskId','assignedSalesId'],pause:[],resume:[],cancel:['taskId'],
  refuse:['targetKey'],qualify:['targetKey','qualification','source'],device:['state'],
  time:['atEpochMs'],advance:['ms'],trigger:['taskId','intentId','outcome'],
  tick:['taskId','intentId','planVersion','policyVersion','outcome'],next:['taskIds','intentId','outcome'],
  consume:['attemptId','outcome'],observe:['eventId','attemptId','kind','binding','source'],
  reconcile:['attemptId','noActiveCall','result'],retry:['taskId','plannedAt'],recover:[],quit:[],
};
export const SELF_SERVICE_CAPABILITIES=CAPABILITIES.filter(c=>!['read_all','assign'].includes(c)).concat('assign_self');
export class SimulationSession {
  constructor(store,{profile='legacy-fixture'}={}) {
    if(!['legacy-fixture','self-service'].includes(profile))throw new Error('INVALID_SIMULATION_PROFILE');
    this.store=store;const state=store.read();this.clock=new FakeClock(state.simulationNow??NOW);
    this.engine=new SimulationEngine({store,clock:this.clock});
    if(!Object.keys(state.actors).length) {
      const selectedPolicy=policy();
      if(profile==='self-service'){delete selectedPolicy.calendarDates;selectedPolicy.calendar='weekdays';}
      this.engine.configureFixture({actors:[SALES,OTHER].map(actorId=>({actorId,tenantId:TENANT,permissions:profile==='self-service'?SELF_SERVICE_CAPABILITIES:CAPABILITIES})),policy:selectedPolicy});
      this.engine.observeDevice({actorId:SALES,state:'IDLE'});
    }
    if(profile==='self-service'&&Object.values(this.store.read().actors).some(a=>a.permissions.includes('assign')||a.permissions.includes('read_all')))throw new Error('SELF_SERVICE_STORE_REQUIRED');
    this.engine.recover();
  }
  status(taskId) {
    return {decision:'OK',mode:'simulation',now:this.clock.nowMs(),simulationPolicy:this.store.read().policy,
      snapshot:this.engine.snapshot({actorId:SALES,taskId}),metrics:this.engine.metrics({actorId:SALES}),realPhoneAdapterConnected:false};
  }
  async execute(command) {
    if(!command||typeof command!=='object'||Array.isArray(command)||!Object.hasOwn(commandFields,command.op))return deny('UNKNOWN_COMMAND');
    if(Object.keys(command).some(k=>k!=='op'&&!commandFields[command.op].includes(k)))return deny('UNSUPPORTED_FIELDS');
    const {op,...args}=command,engine=this.engine,actorId=SALES;
    if(op==='help')return {decision:'OK',commands:commandFields,note:'LOCAL SYNTHETIC SIMULATION ONLY; tick advances no wall clock; time/advance control the injected clock.'};
    if(op==='status')return this.status(args.taskId);
    if(op==='quit')return {decision:'OK',stopped:true};
    if(op==='time'||op==='advance') {
      let candidate;
      try {
        candidate=new FakeClock(this.clock.nowMs());
        if(op==='time')candidate.set(args.atEpochMs);else candidate.advance(args.ms);
      } catch{return deny('INVALID_SIMULATION_TIME');}
      try {this.store.transaction(s=>{s.simulationNow=candidate.nowMs();});}
      catch{return deny('SIMULATION_TIME_SAVE_FAILED');}
      this.clock.set(candidate.nowMs());
      return {decision:'OK',now:this.clock.nowMs()};
    }
    const methods={import:'importContacts',task:'createTask',plan:'retime',assign:'assign',pause:'pause',resume:'resume',
      cancel:'cancel',refuse:'refuse',qualify:'setQualification',device:'observeDevice',observe:'observe',reconcile:'reconcile',retry:'retry',recover:'recover'};
    if(methods[op])return engine[methods[op]]({actorId,...args});
    let adapter;
    try { adapter=new FakeDialAdapter({outcomes:[args.outcome??'SUBMITTED']}); }
    catch{return deny('INVALID_SIMULATION_OUTCOME');}
    if(op==='consume')return engine.consume({actorId,attemptId:args.attemptId},adapter);
    const snapshot=engine.snapshot({actorId});
    let taskId=args.taskId;
    if(op==='next') {
      if(!Array.isArray(args.taskIds)||!args.taskIds.length)return deny('EXPLICIT_ORDER_REQUIRED');
      taskId=args.taskIds.find(id=>snapshot.tasks.some(t=>t.taskId===id&&t.status==='READY'));
      if(!taskId)return deny('NO_READY_TASK');
    }
    const task=snapshot.tasks.find(t=>t.taskId===taskId);if(!task)return deny('FORBIDDEN');
    const request={actorId,taskId,intentId:args.intentId,
      planVersion:op==='tick'?args.planVersion:task.planVersion,
      policyVersion:op==='tick'?args.policyVersion:task.policyVersion,
      trigger:op==='tick'?'scheduled':'manual_now'};
    const grant=engine.authorize(request);if(grant.decision!=='ALLOW')return grant;
    return engine.consume({actorId,attemptId:grant.attemptId},adapter);
  }
}
