import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fixture,SALES,TENANT,TARGET,NOW} from '../test-support/simulation-fixture.mjs';
import {controlledCallFixture} from '../test-support/controlled-call-fixture.mjs';
import {ControlledCallPort} from '../test-support/controlled-call-port.mjs';
import {ControlledCallCoordinator} from '../src/controlled-call-coordinator.mjs';
import {SQLiteStore} from '../src/sqlite-store.mjs';
function setup(options={}){
 const f=fixture({store:options.store}),permit={...controlledCallFixture().permit,tenantId:TENANT,salesId:SALES,targetKey:TARGET,notBefore:NOW,expiresAt:NOW+60000};
 const device={deviceKey:permit.deviceKey,installationKey:permit.installationKey,accountKey:permit.accountKey,observedAt:NOW,inCall:false,permissionsGranted:true,accountEnabled:true};
 const grant=f.engine.authorize(f.request());assert.equal(grant.decision,'ALLOW');
 const port=new ControlledCallPort({outcome:options.outcome??'LOST_RECEIPT'}),config={store:f.store,clock:f.clock,permit,readDevice:async()=>structuredClone(device),port,fault:options.fault};
 return {...f,permit,device,port,config,service:new ControlledCallCoordinator(config),req:{actorId:SALES,attemptId:grant.attemptId,permitId:permit.permitId}};
}
test('T-CALL-215 one durable quota and HANDOFF_UNKNOWN before any port call',async()=>{
 let f;f=setup({fault:point=>{if(point==='after-claim-commit'){const s=f.store.read();assert.equal(s.attempts[f.req.attemptId].status,'HANDOFF_UNKNOWN');assert.equal(s.trialBudget.rounds[0].used,1);assert.equal(f.port.requests.length,0);}}});
 const r=await f.service.submit(f.req);assert.equal(r.status,'RECONCILE_REQUIRED');assert.equal(f.port.requests.length,1);const a=f.store.read().attempts[f.req.attemptId];assert.equal(a.controlledCall.handoff.ticketId,a.trialTicketId);assert.equal(a.controlledCall.receipt.apiSubmission,'UNKNOWN');
});
test('T-CALL-216 parallel submissions charge and call once',async()=>{const f=setup();const all=await Promise.all([f.service.submit(f.req),f.service.submit(f.req)]);assert.equal(all.filter(r=>r.decision==='OK').length,1);assert.equal(f.port.requests.length,1);assert.equal(f.store.read().trialBudget.rounds[0].used,1);});
for(const point of ['before-claim-commit','after-claim-commit','after-port-return','before-receipt-commit'])test('T-CALL-217 SQLite crash at '+point,async()=>{
 const dir=mkdtempSync(join(tmpdir(),'call-claim-'));let store=new SQLiteStore(join(dir,'state.db'));
 try{const f=setup({store,fault:p=>{if(p===point)throw Error('CRASH');}});await assert.rejects(f.service.submit(f.req),/CRASH/);
 const sent=f.port.requests.length;assert.equal(sent,point==='after-port-return'||point==='before-receipt-commit'?1:0);
 store.close();store=new SQLiteStore(join(dir,'state.db'));const port=new ControlledCallPort(),next=new ControlledCallCoordinator({...f.config,store,port,fault:undefined});next.recover();
 if(point==='before-claim-commit'){assert.equal(store.read().trialBudget.rounds[0].used,0);assert.equal(store.read().attempts[f.req.attemptId].status,'AUTHORIZED');}
 else{assert.equal(store.read().trialBudget.rounds[0].used,1);assert.equal(store.read().attempts[f.req.attemptId].status,'RECONCILE_REQUIRED');assert.equal((await next.submit(f.req)).decision,'DENY');}
 assert.equal(port.requests.length,0);
 }finally{store.close();rmSync(dir,{recursive:true,force:true});}
});
for(const change of ['pause','refuse','version','permission','account','expiry','revoke'])test('T-CALL-218 latest '+change+' after device read prevents charge and call',async()=>{
 const f=setup();const readDevice=async()=>{if(change==='pause')f.engine.pause({actorId:SALES});if(change==='refuse')f.engine.refuse({actorId:SALES,targetKey:TARGET});if(change==='version')f.engine.retime({actorId:SALES,taskId:f.request().taskId,plannedAt:NOW});if(change==='permission')f.device.permissionsGranted=false;if(change==='account')f.device.accountKey='f'.repeat(64);if(change==='expiry')f.clock.advance(60000);if(change==='revoke')f.store.transaction(s=>s.trialBudget.rounds[0].revoked=true);return f.device;};
 const next=new ControlledCallCoordinator({...f.config,readDevice});assert.equal((await next.submit(f.req)).decision,'DENY');assert.equal(f.port.requests.length,0);assert.equal(f.store.read().trialBudget.rounds[0].used,0);
});
test('T-CALL-219 client overrides and foreign actor denied; manual close never refunds',async()=>{
 const f=setup();assert.equal((await f.service.submit({...f.req,usedAttempts:0})).decision,'DENY');assert.equal((await f.service.submit({...f.req,actorId:'SYNTHETIC-OTHER'})).decision,'DENY');await f.service.submit(f.req);
 assert.equal(f.service.reconcile({...f.req,noActiveCall:false,result:'UNKNOWN'}).decision,'DENY');assert.equal(f.service.reconcile({...f.req,noActiveCall:true,result:'UNKNOWN'}).decision,'OK');assert.equal(f.store.read().trialBudget.rounds[0].used,1);assert.equal(f.store.read().trialBudget.tickets[0].state,'RECONCILED');assert.equal((await f.service.submit(f.req)).decision,'DENY');assert.equal(f.port.requests.length,1);
});
test('T-CALL-220 immutable permit cannot be replaced to extend time or quota',()=>{const f=setup();assert.throws(()=>new ControlledCallCoordinator({...f.config,permit:{...f.permit,maxAttempts:2}}),/PERMIT_CONFLICT/);});

test('T-CALL-221 two SQLite connections claim one attempt once',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'claim-concurrent-')),path=join(dir,'state.db');const store=new SQLiteStore(path);let second;
 try{const f=setup({store});second=new SQLiteStore(path);const port=new ControlledCallPort(),other=new ControlledCallCoordinator({...f.config,store:second,port});
 const results=await Promise.all([f.service.submit(f.req),other.submit(f.req)]);assert.equal(results.filter(r=>r.decision==='OK').length,1);assert.equal(f.port.requests.length+port.requests.length,1);assert.equal(store.read().trialBudget.rounds[0].used,1);assert.equal(store.read().trialBudget.tickets.length,1);
 }finally{second?.close();store.close();rmSync(dir,{recursive:true,force:true});}
});
for(const outcome of ['SUBMITTED','NOT_SUBMITTED'])test('T-CALL-222 '+outcome+' retains distinct receipt and permits explicit no-refund closure',async()=>{
 const f=setup({outcome});await f.service.submit(f.req);const a=f.store.read().attempts[f.req.attemptId];assert.equal(a.controlledCall.receipt.apiSubmission,outcome);assert.equal(a.observations.length,0);assert.equal(f.service.reconcile({...f.req,noActiveCall:true,result:'UNKNOWN'}).decision,'OK');assert.equal(f.store.read().trialBudget.rounds[0].used,1);
});
test('T-CALL-222 invalid receipt never invents submission',async()=>{
 class InvalidPort extends ControlledCallPort{submit(input){super.submit(input);return {decision:'OK',source:'TEST_DOUBLE',attemptId:input.context.attemptId,apiSubmission:'SUBMITTED',actualPhoneApiCalls:1,realCallsEnabled:true};}}
 const f=setup(),port=new InvalidPort(),service=new ControlledCallCoordinator({...f.config,port});const r=await service.submit(f.req);assert.equal(r.apiSubmission,'UNKNOWN');assert.equal(r.status,'RECONCILE_REQUIRED');assert.equal(port.requests.length,1);
});
test('T-CALL-223 denied observation persists time high-water but no staged quota',async()=>{
 const f=setup();f.clock.advance(1000);f.device.permissionsGranted=false;assert.equal((await f.service.submit(f.req)).decision,'DENY');assert.equal(f.store.read().trialBudget.rounds[0].used,0);assert.equal(f.store.read().trialBudget.tickets.length,0);assert.equal(f.store.read().trialBudget.lastObservedAt,NOW+1000);
 f.clock.advance(-1000);f.device.permissionsGranted=true;assert.equal((await f.service.submit(f.req)).decision,'DENY');assert.equal(f.port.requests.length,0);
});
