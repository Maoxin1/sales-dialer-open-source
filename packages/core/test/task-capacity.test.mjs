import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { SQLiteStore } from '../src/sqlite-store.mjs';
import { SimulationEngine } from '../src/simulation-engine.mjs';
import { FakeDialAdapter } from '../test-support/fake-dial-adapter.mjs';
import { fixture, SALES, NOW } from '../test-support/simulation-fixture.mjs';

test('T-CALL-097 200 persisted tasks, 50 targets, explicit queue progression and reopen',async t=>{
  const dir=mkdtempSync(join(tmpdir(),'sales-dialer-task-capacity-'));const db=join(dir,'sim.db');
  let store=new SQLiteStore(db);t.after(()=>{store.close();rmSync(dir,{recursive:true,force:true});});
  const f=fixture({store});let engine=f.engine;const start=performance.now(),rssBefore=process.memoryUsage().rss;
  engine.importContacts({actorId:SALES,rows:Array.from({length:50},(_,i)=>({raw:`SYNTHETIC-TARGET-${i+1}`,qualification:'CONFIRMED',source:'SYNTHETIC-CAPACITY-ATTESTATION'}))});
  for(let i=2;i<=200;i++)assert.equal(engine.createTask({actorId:SALES,taskId:`SYNTHETIC-TASK-${i}`,targetKey:`SYNTHETIC-TARGET-${(i-1)%50+1}`,assignedSalesId:SALES,plannedAt:NOW}).decision,'OK');
  assert.equal(Object.keys(store.read().tasks).length,200);
  assert.equal(Object.keys(store.read().attempts).length,0,'import/plan must not authorize');
  const adapter=new FakeDialAdapter({outcomes:Array.from({length:200},(_,i)=>i%20===0?'UNKNOWN':i%10===0?'BUSY':'SUBMITTED')});
  let duplicateDeliveries=0;
  for(let i=0;i<200;i++) {
    const req=f.request({taskId:`SYNTHETIC-TASK-${i+1}`,intentId:`SYNTHETIC-TASK-INTENT-${i}`,trigger:i%2?'manual_now':'scheduled'});
    const grant=engine.authorize(req);assert.equal(grant.decision,'ALLOW',JSON.stringify(grant));
    if(i%20===0){assert.equal(engine.authorize(req).reason,'DUPLICATE');duplicateDeliveries++;}
    const result=await engine.consume({actorId:SALES,attemptId:grant.attemptId},adapter);
    if(result.apiSubmission==='SUBMITTED') {
      for(const kind of ['OUTGOING_CONFIRMED',...(i%4===0?['CONNECTED_CONFIRMED']:[])])
        assert.equal(engine.observe({actorId:SALES,eventId:`SYNTHETIC-EVENT-${i}-${kind.replaceAll('_','-')}`,attemptId:grant.attemptId,kind,binding:'MATCHED',source:'SIMULATED_DEVICE'}).decision,'OK');
    }
    if(result.status!=='FINISHED')assert.equal(engine.reconcile({actorId:SALES,attemptId:grant.attemptId,noActiveCall:true,result:result.status==='SUBMITTED'?'COMPLETED':'UNKNOWN'}).decision,'OK');
    f.clock.advance(1);
    if(i===99){store.close();store=new SQLiteStore(db);engine=new SimulationEngine({store,clock:f.clock});engine.recover();assert.equal(adapter.requests.length,100);}
  }
  const metrics=engine.metrics({actorId:SALES});
  assert.deepEqual([metrics.U,metrics.G,metrics.Q,metrics.O,metrics.C,metrics.everUnknown,metrics.unknownPending],[50,200,180,180,40,10,0]);
  assert.equal(adapter.requests.length,200);assert.equal(duplicateDeliveries,10);
  assert.equal(Object.values(store.read().tasks).filter(x=>x.status==='FINISHED').length,200);
  engine.recover();assert.equal(adapter.requests.length,200,'recovery cannot issue a request');
  const report={taskCount:200,distinctSyntheticTargets:50,attempts:200,duplicateDeliveries,metrics,adapterRequests:adapter.requests.length,
    explicitManualSimulationResults:190,unexpectedErrors:0,elapsedMs:performance.now()-start,rssBefore,rssAfter:process.memoryUsage().rss,
    actualPhoneCalls:0,actualConnections:0,humanOperationSeconds:null,actualCarrierFees:null,realPhoneAdapterConnected:false,
    note:'All O/C are injected simulation observations; durations are local test runtime, not human effort or call duration.'};
  if(process.env.DIALER_EVIDENCE_DIR)writeFileSync(join(process.env.DIALER_EVIDENCE_DIR,'task-capacity.json'),JSON.stringify(report,null,2));
  t.diagnostic(JSON.stringify(report));
});
