import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { SQLiteStore } from '../src/sqlite-store.mjs';
import { FakeDialAdapter } from '../test-support/fake-dial-adapter.mjs';
import { fixture, SALES, NOW } from '../test-support/simulation-fixture.mjs';

test('T-CALL-085 50 synthetic targets, 200 explicit attempts and 10 duplicates run through persistent task loop; 201 is allowed',async t=>{
  const dir=mkdtempSync(join(tmpdir(),'sales-dialer-capacity-'));const store=new SQLiteStore(join(dir,'sim.db'));
  t.after(()=>{store.close();rmSync(dir,{recursive:true,force:true});});
  const f=fixture({store});const start=performance.now(),memoryBefore=process.memoryUsage().rss;
  const outcomes=Array.from({length:201},(_,i)=>i%20===0?'UNKNOWN':i%10===0?'BUSY':'SUBMITTED');
  const adapter=new FakeDialAdapter({outcomes});
  const imported=f.engine.importContacts({actorId:SALES,rows:Array.from({length:50},(_,i)=>({raw:`SYNTHETIC-TARGET-${i+1}`,qualification:'CONFIRMED',source:'SYNTHETIC-BATCH-ATTESTATION'}))});
  assert.equal(imported.rows.filter(r=>r.status==='IMPORTED').length,49);
  for(let i=2;i<=50;i++)assert.equal(f.engine.createTask({actorId:SALES,taskId:`SYNTHETIC-TASK-${i}`,targetKey:`SYNTHETIC-TARGET-${i}`,assignedSalesId:SALES,plannedAt:NOW}).decision,'OK');
  let duplicates=0;
  for(let i=0;i<200;i++) {
    const taskId=`SYNTHETIC-TASK-${i%50+1}`;
    if(i>=50)assert.equal(f.engine.retry({actorId:SALES,taskId,plannedAt:f.clock.nowMs()}).decision,'OK');
    const task=store.read().tasks[taskId];
    const req=f.request({taskId,planVersion:task.planVersion,intentId:`SYNTHETIC-CAPACITY-${i}`,trigger:i<50?'scheduled':'manual_now'});
    const grant=f.engine.authorize(req);assert.equal(grant.decision,'ALLOW',JSON.stringify(grant));
    if(i%20===0){assert.equal(f.engine.authorize(req).reason,'DUPLICATE');duplicates++;}
    const result=await f.engine.consume({actorId:SALES,attemptId:grant.attemptId},adapter);
    if(result.apiSubmission==='SUBMITTED'&&i%2===0)f.engine.observe({actorId:SALES,eventId:`SYNTHETIC-O-${i}`,attemptId:grant.attemptId,kind:'OUTGOING_CONFIRMED',binding:'MATCHED',source:'SIMULATED_DEVICE'});
    if(result.status!=='FINISHED')assert.equal(f.engine.reconcile({actorId:SALES,attemptId:grant.attemptId,noActiveCall:true,result:result.status==='SUBMITTED'?'NO_ANSWER':'UNKNOWN'}).decision,'OK');
    f.clock.advance(1);
  }
  const metrics=f.engine.metrics({actorId:SALES});
  assert.deepEqual([metrics.U,metrics.G,metrics.Q,metrics.O,metrics.C,metrics.everUnknown,metrics.unknownPending],[50,200,180,80,0,10,0]);
  assert.equal(adapter.requests.length,200);assert.equal(duplicates,10);
  const report={targets:50,attempts:200,duplicateDeliveries:duplicates,metrics,elapsedMs:performance.now()-start,rssBefore:memoryBefore,rssAfter:process.memoryUsage().rss,unexpectedErrors:0,realPhoneAdapterConnected:false};
  const taskId='SYNTHETIC-TASK-1';f.engine.retry({actorId:SALES,taskId,plannedAt:f.clock.nowMs()});
  const grant=f.engine.authorize(f.request({taskId,planVersion:store.read().tasks[taskId].planVersion,intentId:'SYNTHETIC-CAPACITY-201',trigger:'manual_now'}));
  assert.equal(grant.decision,'ALLOW');await f.engine.consume({actorId:SALES,attemptId:grant.attemptId},adapter);
  assert.equal(f.engine.metrics({actorId:SALES}).G,201);report.explicitAttempt201Allowed=true;
  if(process.env.DIALER_EVIDENCE_DIR)writeFileSync(join(process.env.DIALER_EVIDENCE_DIR,'capacity.json'),JSON.stringify(report,null,2));
  t.diagnostic(JSON.stringify(report));
});
