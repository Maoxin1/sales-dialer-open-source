import test from 'node:test';
import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SQLiteStore } from '../src/sqlite-store.mjs';
import { SimulationEngine } from '../src/simulation-engine.mjs';
import { FakeDialAdapter } from '../test-support/fake-dial-adapter.mjs';
import { fixture, SALES, TARGET } from '../test-support/simulation-fixture.mjs';

function prepare(t) {
  const dir=mkdtempSync(join(tmpdir(),'sales-dialer-process-'));const path=join(dir,'simulation.db'),requestsPath=join(dir,'requests.jsonl');
  const store=new SQLiteStore(path);const f=fixture({store});
  t.after(()=>{store.close();rmSync(dir,{recursive:true,force:true});});
  return {...f,path,requestsPath};
}
function worker(t,options) {
  const child=fork(new URL('../test-support/process-worker.mjs',import.meta.url),[JSON.stringify(options)],{silent:true});
  let stdout='',stderr='';child.stdout.on('data',b=>{stdout+=b;});child.stderr.on('data',b=>{stderr+=b;});
  t.after(()=>{if(child.exitCode===null)child.kill();});
  const ready=new Promise((resolve,reject)=>{child.once('message',resolve);child.once('error',reject);child.once('exit',code=>{if(code!==0)reject(new Error(`worker exited before ready: ${code} ${stderr}`));});});
  const done=new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',(code,signal)=>resolve({code,signal,stdout,stderr}));});
  return {ready,done,start:()=>child.send({go:true})};
}
test('T-CALL-072 two independent processes race manual/timer: one grant, one occupant',async t=>{
  const f=prepare(t);
  const workers=['scheduled','manual_now'].map((trigger,i)=>worker(t,{path:f.path,trigger,intentId:`SYNTHETIC-I-${i}`}));
  await Promise.all(workers.map(w=>w.ready));workers.forEach(w=>w.start());const results=await Promise.all(workers.map(w=>w.done));
  assert.ok(results.every(r=>r.code===0),JSON.stringify(results));
  assert.equal(results.filter(r=>JSON.parse(r.stdout).decision==='ALLOW').length,1);
  assert.equal(Object.keys(f.store.read().attempts).length,1);
});
test('T-CALL-073 refusal and authorization serialize; committed refusal forbids subsequent authorization/consumption',async t=>{
  const f=prepare(t);const workers=['refuse','authorize'].map(action=>worker(t,{path:f.path,action}));
  await Promise.all(workers.map(w=>w.ready));workers.forEach(w=>w.start());const results=await Promise.all(workers.map(w=>w.done));
  assert.ok(results.every(r=>r.code===0),JSON.stringify(results));
  const state=f.store.read(),refusal=state.events.find(e=>e.kind==='REFUSED');
  assert.ok(refusal);
  assert.ok(state.events.filter(e=>e.kind==='AUTHORIZED').every(e=>e.sequence<refusal.sequence));
  assert.equal(f.engine.authorize(f.request()).reason,'DO_NOT_CONTACT');
  const adapter=new FakeDialAdapter();for(const a of Object.values(state.attempts))await f.engine.consume({actorId:SALES,attemptId:a.attemptId},adapter);
  assert.equal(adapter.requests.length,0);
});
for(const point of ['after-attempt','after-authorization-commit','after-handoff-commit','after-adapter-return','before-receipt-commit']) {
  test(`T-CALL-074 process exit at ${point} preserves safe recovery boundary`,async t=>{
    const f=prepare(t);const isConsumption=point.includes('handoff')||point.includes('adapter')||point.includes('receipt');
    const grant=isConsumption?f.engine.authorize(f.request()):null;
    const w=worker(t,{path:f.path,requestsPath:f.requestsPath,action:isConsumption?'consume':'authorize',attemptId:grant?.attemptId,crash:point});
    await w.ready;w.start();const result=await w.done;assert.equal(result.code,77,result.stderr);
    const reopened=new SQLiteStore(f.path);t.after(()=>reopened.close());
    const engine=new SimulationEngine({store:reopened,clock:f.clock});engine.recover();
    const state=reopened.read();
    const calls=existsSync(f.requestsPath)?readFileSync(f.requestsPath,'utf8').trim().split('\n').filter(Boolean).length:0;
    const replacement=new FakeDialAdapter();
    if(point==='after-attempt')assert.equal(Object.keys(state.attempts).length,0);
    else {
      const a=Object.values(state.attempts)[0];
      assert.equal(a.status,point==='after-authorization-commit'?'AUTHORIZED':'RECONCILE_REQUIRED');
      if(isConsumption){assert.equal((await engine.consume({actorId:SALES,attemptId:a.attemptId},replacement)).reason,'ALREADY_CONSUMED');assert.equal(a.hadUnknown,true);}
    }
    assert.equal(replacement.requests.length,0);
    assert.equal(calls,['after-adapter-return','before-receipt-commit'].includes(point)?1:0);
    t.diagnostic(JSON.stringify({point,childExit:result.code,recordedSyntheticRequests:calls,replayRequests:0}));
    reopened.close();
  });
}
test('T-CALL-075 database constraints reject duplicate intent/cycle and simultaneous active seller even bypassing service',t=>{
  const f=prepare(t);f.engine.authorize(f.request());const before=f.store.read();
  for(const edit of [a=>a, a=>({...a,intentId:'SYNTHETIC-OTHER'}), a=>({...a,intentId:'SYNTHETIC-OTHER',cycle:2})]) {
    assert.throws(()=>f.store.transaction(s=>{const a=edit(Object.values(s.attempts)[0]);s.attempts['SYNTHETIC-DUPLICATE']={...a,attemptId:'SYNTHETIC-DUPLICATE'};}),/UNIQUE/);
    assert.deepEqual(f.store.read(),before);
  }
});
test('T-CALL-091 two process consumers share a persisted handoff marker and submit only once',async t=>{
  const f=prepare(t);const g=f.engine.authorize(f.request());
  const workers=Array.from({length:2},()=>worker(t,{path:f.path,requestsPath:f.requestsPath,action:'consume',attemptId:g.attemptId}));
  await Promise.all(workers.map(w=>w.ready));workers.forEach(w=>w.start());const results=await Promise.all(workers.map(w=>w.done));
  assert.ok(results.every(r=>r.code===0),JSON.stringify(results));
  assert.equal(readFileSync(f.requestsPath,'utf8').trim().split('\n').length,1);
  assert.equal(results.filter(r=>JSON.parse(r.stdout).status==='SUBMITTED').length,1);
  assert.equal(results.filter(r=>JSON.parse(r.stdout).reason==='ALREADY_CONSUMED').length,1);
});
