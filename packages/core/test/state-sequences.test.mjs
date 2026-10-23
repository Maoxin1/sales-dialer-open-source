import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { SQLiteStore } from '../src/sqlite-store.mjs';
import { SimulationEngine, key, unresolved } from '../src/simulation-engine.mjs';
import { FakeDialAdapter } from '../test-support/fake-dial-adapter.mjs';
import { fixture, SALES, NOW } from '../test-support/simulation-fixture.mjs';

const SEED=0x00C0FFEE;
function random(seed) { let x=seed;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return x>>>0;}; }
function sequence(rng) {
  const ops=[{type:'trigger',target:1,outcome:'UNKNOWN'},{type:'restart'},{type:'replay'},
    {type:'reconcile'},{type:'retry',target:1},{type:'trigger',target:1,outcome:'SUBMITTED'},
    {type:'reconcile'},{type:'pause'},{type:'resume'}];
  const kinds=['trigger','qualify','retime','pause','resume','restart','reconcile','retry','old-trigger','advance','write-fault','handoff-fault','replay'];
  while(ops.length<50) {
    const pick=rng();ops.push({type:pick%37===0?'refuse':kinds[pick%kinds.length],target:rng()%3+1,
      outcome:['SUBMITTED','UNKNOWN','BUSY'][rng()%3],qualification:rng()%2?'CONFIRMED':'UNKNOWN',deltaMs:rng()%3000});
  }
  return ops;
}
async function replay(ops) {
  const dir=mkdtempSync(join(tmpdir(),'sales-dialer-sequence-'));const path=join(dir,'state.db');
  let store=new SQLiteStore(path);const f=fixture({store});let engine=f.engine;const clock=f.clock;
  const requests=[];let initial;
  try {
    for(let n=2;n<=3;n++) {
      engine.importContacts({actorId:SALES,rows:[{raw:`SYNTHETIC-TARGET-${n}`,qualification:'CONFIRMED',source:'SYNTHETIC-ATTESTATION'}]});
      engine.createTask({actorId:SALES,taskId:`SYNTHETIC-TASK-${n}`,targetKey:`SYNTHETIC-TARGET-${n}`,assignedSalesId:SALES,plannedAt:NOW});
    }
    initial=store.read();
    for(const [index,op] of ops.entries()) {
      const before=store.read(),taskId=`SYNTHETIC-TASK-${op.target??1}`,targetKey=`SYNTHETIC-TARGET-${op.target??1}`;
      const task=before.tasks[taskId];
      const req=f.request({taskId,planVersion:task.planVersion,intentId:`SYNTHETIC-SEQUENCE-I-${index}`,trigger:'manual_now'});
      const pending=Object.values(before.attempts).find(unresolved);
      if(op.type==='trigger'||op.type==='handoff-fault') {
        const grant=engine.authorize(req);
        if(grant.decision==='ALLOW') {
          const adapter=new FakeDialAdapter({outcomes:[op.outcome??'UNKNOWN']});
          if(op.type==='handoff-fault')engine.fault=p=>{if(p==='after-handoff-commit')throw new Error('SYNTHETIC_CRASH');};
          try { await engine.consume({actorId:SALES,attemptId:grant.attemptId},adapter); }
          catch(error){assert.equal(error.message,'SYNTHETIC_CRASH');}
          finally{engine.fault=()=>{};requests.push(...adapter.requests);}
        }
      }else if(op.type==='qualify')engine.setQualification({actorId:SALES,targetKey,qualification:op.qualification,source:'SYNTHETIC-UPDATE'});
      else if(op.type==='refuse')engine.refuse({actorId:SALES,targetKey});
      else if(op.type==='retime')engine.retime({actorId:SALES,taskId,plannedAt:clock.nowMs()});
      else if(op.type==='pause')engine.pause({actorId:SALES});
      else if(op.type==='resume')engine.resume({actorId:SALES});
      else if(op.type==='restart') {store.close();store=new SQLiteStore(path);engine=new SimulationEngine({store,clock});engine.recover();}
      else if(op.type==='reconcile'&&pending)engine.reconcile({actorId:SALES,attemptId:pending.attemptId,noActiveCall:true,result:'UNKNOWN'});
      else if(op.type==='retry')engine.retry({actorId:SALES,taskId,plannedAt:clock.nowMs()});
      else if(op.type==='old-trigger') {const r=engine.authorize({...req,planVersion:0});assert.equal(r.decision,'DENY');}
      else if(op.type==='advance')clock.advance(op.deltaMs);
      else if(op.type==='write-fault') {
        engine.fault=p=>{if(p==='after-outbox')throw new Error('SYNTHETIC_WRITE_FAILURE');};
        try{engine.authorize(req);}catch(error){assert.equal(error.message,'SYNTHETIC_WRITE_FAILURE');}
        finally{engine.fault=()=>{};}
        assert.deepEqual(store.read(),before,'I-CALL-006 failed transaction cannot leak authorization');
      }else if(op.type==='replay') {
        for(const a of Object.values(before.attempts).filter(a=>a.handoffAt!==null)) {
          const adapter=new FakeDialAdapter();assert.equal((await engine.consume({actorId:SALES,attemptId:a.attemptId},adapter)).decision,'DENY');
          assert.equal(adapter.requests.length,0,'I-CALL-004 no replay after possible handoff');
        }
      }
      const after=store.read(),attempts=Object.values(after.attempts);
      for(const e of after.events.filter(e=>e.kind==='AUTHORIZED')) {
        const a=after.attempts[e.attemptId];
        assert.ok(!after.events.some(r=>r.kind==='REFUSED'&&r.targetKey===a.targetKey&&r.tenantId===a.tenantId&&r.sequence<e.sequence),'I-CALL-001 refusal precedes no new grant');
      }
      const newAttempts=attempts.filter(a=>!before.attempts[a.attemptId]);
      for(const a of newAttempts) {
        assert.equal(a.planVersion,before.tasks[a.taskId].planVersion,'I-CALL-002 latest plan');
        assert.equal(before.contacts[key(a.tenantId,a.targetKey)].qualification,'CONFIRMED');
        assert.equal(before.sellers[key(a.tenantId,a.salesId)].paused,false);
        assert.equal(a.salesId,before.tasks[a.taskId].assignedSalesId,'I-CALL-005 assigned actor');
        assert.ok(before.actors[a.salesId].permissions.includes('trigger'));
        assert.ok(a.authorizedAt>=NOW&&a.authorizedAt<NOW+9*3600000,'I-CALL-005 window');
      }
      assert.equal(new Set(attempts.map(a=>key(a.tenantId,a.intentId))).size,attempts.length,'I-CALL-003 unique intent');
      assert.equal(new Set(attempts.map(a=>JSON.stringify([a.tenantId,a.taskId,a.cycle]))).size,attempts.length,'I-CALL-003 unique cycle');
      assert.ok(attempts.filter(unresolved).length<=1,'single seller occupancy');
      assert.equal(new Set(requests.map(r=>r.attemptId)).size,requests.length,'I-CALL-004 no repeated request');
      assert.ok(requests.every(r=>r.mode==='simulation'&&r.targetKey.startsWith('SYNTHETIC-')),'I-CALL-007 only synthetic transport');
      for(const a of Object.values(before.attempts).filter(a=>a.hadUnknown))assert.equal(after.attempts[a.attemptId].hadUnknown,true,'unknown history must survive');
    }
    return {initial,requests:requests.length,attempts:Object.keys(store.read().attempts).length};
  }catch(error){error.initial=initial;throw error;}
  finally{store.close();rmSync(dir,{recursive:true,force:true});}
}

test('T-CALL-090 fixed seed 32 x 50 state sequences check I-CALL-001 through 007 with bounded failure shrinking',async t=>{
  const rng=random(SEED),sequences=Array.from({length:32},()=>sequence(rng));let totalRequests=0,totalAttempts=0;
  for(const [index,ops] of sequences.entries()) {
    try {const r=await replay(ops);totalRequests+=r.requests;totalAttempts+=r.attempts;}
    catch(error) {
      let minimal=ops,tries=0;
      for(let size=Math.max(1,Math.floor(minimal.length/2));size>=1&&tries<200;size=Math.floor(size/2)) {
        for(let start=0;start<minimal.length&&tries<200;) {
          const candidate=[...minimal.slice(0,start),...minimal.slice(start+size)];tries++;
          try{await replay(candidate);start+=size;}catch(e){if(e.code===error.code&&e.message===error.message)minimal=candidate;else start+=size;}
        }
      }
      const output=process.env.DIALER_EVIDENCE_DIR??resolve('evidence/state-sequence-failure-'+Date.now());mkdirSync(output,{recursive:true});
      const hash=createHash('sha256').update(readFileSync(new URL('../src/simulation-engine.mjs',import.meta.url))).digest('hex');
      writeFileSync(join(output,'state-sequence-failure.json'),JSON.stringify({seed:SEED,index,initial:error.initial,operations:ops,shrunkOperations:minimal,shrinkReplays:tries,bound:200,minimality:'bounded deletion reduction; not global minimum',engineSha256:hash,error:error.stack},null,2));
      throw error;
    }
  }
  const report={seed:SEED,sequences:32,operations:1600,totalRequests,totalAttempts,realPhoneAdapterConnected:false,failures:0};
  if(process.env.DIALER_EVIDENCE_DIR)writeFileSync(join(process.env.DIALER_EVIDENCE_DIR,'state-sequences.json'),JSON.stringify({...report,sequencesInput:sequences},null,2));
  t.diagnostic(JSON.stringify(report));
});
