import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,rmSync,writeFileSync} from 'node:fs';import {join,resolve,sep} from 'node:path';
import {EnterpriseService} from '../src/service.mjs';
import {checkLivePermit,permitSecret,readLivePermit} from '../src/live-permit.mjs';
import {createEnterpriseServer} from '../src/server.mjs';
const root=resolve('.local/operator-batch-tests'),password='Generated-Batch-Password-2026',key=Buffer.alloc(32,81),MON=Date.parse('2026-10-19T01:00:00Z');
function fixture(t,count=2,mode='LIVE'){
 mkdirSync(root,{recursive:true});const dir=mkdtempSync(join(root,'case-'));let now=MON,inject=()=>{};
 const options={path:join(dir,'enterprise.db'),key,clock:()=>now,fault:p=>inject(p)};let s=new EnterpriseService(options);
 const tenant=s.bootstrap({company:'GENERATED OPERATOR BATCH',username:'admin',password,mode});
 const admin=s.login({tenantId:tenant.tenantId,username:'admin',password}).token;
 s.command(admin,{op:'createSales',username:'sales',password});
 const login=()=>s.login({tenantId:tenant.tenantId,username:'sales',password}).token;let token=login();
 const cmd=(op,data={},who=token)=>s.command(who,{op,...data});
 for(let offset=0;offset<count;offset+=200)cmd('import',{rows:Array.from({length:Math.min(200,count-offset)},(_,i)=>'1990000'+String(offset+i).padStart(4,'0')),source:'GENERATED_ONLY',qualification:'CONFIRMED'});
 cmd('bindDevice',{deviceId:'GENERATED-DEVICE',accountKey:'a'.repeat(64)});
 const contacts=[];let cursor=0;do{const p=cmd('listContacts',{cursor,limit:200,query:'',filter:'ALL'});contacts.push(...p.contacts);cursor=p.nextCursor;}while(cursor!==null);
 const plan=()=>cmd('prepareQueue',{requestId:'GENERATED-'+Math.random(),targetIds:contacts.map(c=>c.id),expectedContacts:Object.fromEntries(contacts.map(c=>[c.id,c.revision])),startAt:now,expectedVersion:cmd('status').queueVersion});let q=plan();
 const confirm=(data={})=>cmd('confirmBatch',{queueId:q.id,expectedVersion:cmd('status').queue.version,deviceId:'GENERATED-DEVICE',confirmed:true,...data});
 const claim=()=>cmd('claim',{queueId:q.id,expectedVersion:cmd('status').queue.version,deviceId:'GENERATED-DEVICE',idle:true});
 t.after(()=>{s.close();if(!resolve(dir).startsWith(root+sep))throw Error('UNSAFE_CLEANUP');rmSync(dir,{recursive:true,force:true});});
 return {cmd,confirm,claim,contacts,admin,login,plan,get token(){return token;},get q(){return q;},set q(v){q=v;},get now(){return now;},set now(v){now=v;},get s(){return s;},fault:f=>inject=f,reopen(){s.close();s=new EnterpriseService(options);},renewToken(){token=login();}};
}
test('T821 explicit current sales confirmation issues signed same-day target-bound batch, never by login or plan',t=>{
 const f=fixture(t);assert.equal(f.cmd('status').operatorBatch,null);
 assert.throws(()=>f.confirm({confirmed:false}),/BATCH_CONFIRMATION_REQUIRED/);
 const {permit:p}=f.confirm();assert.equal(p.schema,3);assert.equal(p.purpose,'OPERATOR_BATCH');assert.equal(p.maxAttempts,2);assert.deepEqual(p.targetIds,f.contacts.map(c=>c.id));assert.equal(p.notAfter,Date.parse('2026-10-19T10:00:00Z')-1);
 assert.ok(checkLivePermit(p,permitSecret(key),{actor:{mode:'LIVE',tenant:p.tenantId,id:p.ownerId},queue:{id:p.queueId},contact:{id:p.targetIds[0]},device:{device_id:p.deviceId,account_key:p.accountKey},now:f.now}));
 const context={actor:{mode:'LIVE',tenant:p.tenantId,id:p.ownerId},queue:{id:p.queueId},contact:{id:p.targetIds[0]},device:{device_id:p.deviceId,account_key:p.accountKey},now:f.now};
 assert.equal(checkLivePermit(p,permitSecret(key),{...context,now:p.notAfter+1}),false);
 for(const changed of [{...p,maxAttempts:3},{...p,targetIds:p.targetIds.slice(1)},{...p,notAfter:p.notAfter+86400000},{...p,purpose:'CONTROLLED_LIVE_VALIDATION'}])assert.equal(checkLivePermit(changed,permitSecret(key),context),false);
 assert.equal(f.confirm().permit.id,p.id);assert.equal(f.cmd('status').metrics.authorizedAttempts,0);
});
test('T822 batch permits each queued target once, preserves UNKNOWN, 30 seconds and duplicate result behavior',t=>{
 const f=fixture(t);f.confirm();const one=f.claim();assert.equal(one.source,'ANDROID_SYSTEM');assert.throws(()=>f.claim(),/PENDING_RECONCILIATION/);
 f.cmd('result',{attemptId:one.attempt.id,expectedRevision:1,result:'NO_ANSWER',idle:true});assert.throws(()=>f.claim(),/NOT_DUE/);f.now+=30000;const two=f.claim();assert.notEqual(one.target.id,two.target.id);assert.throws(()=>f.claim(),/PENDING_RECONCILIATION/);
 f.cmd('result',{attemptId:two.attempt.id,expectedRevision:1,result:'UNKNOWN',idle:true});assert.equal(f.cmd('status').operatorBatch,null);f.reopen();assert.equal(f.cmd('status').metrics.pending,1);assert.equal(f.cmd('status').metrics.authorizedAttempts,2);
});
test('T823 pause, rearrange, new plan, session exit and server recovery invalidate prior batch without resetting uses',t=>{
 for(const action of ['pause','rearrange','plan','logout','recovery']){
  const f=fixture(t);const p=f.confirm().permit;
  if(action==='pause')f.cmd('pause',{queueId:f.q.id,expectedVersion:f.cmd('status').queue.version});
  if(action==='rearrange')f.cmd('rearrange',{queueId:f.q.id,expectedVersion:f.cmd('status').queue.version,startAt:f.now});
  if(action==='plan')f.q=f.plan();if(action==='logout'){f.cmd('logout');f.renewToken();}if(action==='recovery')f.reopen();
  assert.equal(f.cmd('status').operatorBatch,null,action);assert.equal(f.cmd('status').metrics.authorizedAttempts,0);if(f.cmd('status').queue.state==='RUNNING')assert.throws(()=>f.claim(),/LIVE_CALLS_DISABLED/);
 }
});
test('T824 eligibility, expired time, other session and changed device cannot reuse an operator batch',t=>{
 for(const action of ['withdraw','refuse','expiry','session','device']){
  const f=fixture(t);if(action==='expiry'){f.now=Date.parse('2026-10-19T09:59:00Z');f.renewToken();f.cmd('rearrange',{queueId:f.q.id,expectedVersion:f.cmd('status').queue.version,startAt:f.now});}f.confirm();
  if(action==='refuse')f.cmd('refuse',{targetId:f.contacts[0].id,expectedRevision:1});
  if(action==='withdraw')f.cmd('qualify',{targetId:f.contacts[0].id,expectedRevision:1,qualification:'WITHDRAWN'});
  if(action==='expiry')f.now=Date.parse('2026-10-19T10:00:00Z');
  if(action==='session')f.renewToken();
  if(action==='device')f.cmd('bindDevice',{deviceId:'GENERATED-OTHER',accountKey:'b'.repeat(64)});
  assert.throws(()=>f.claim(),/CONTACT_NOT_QUALIFIED|DO_NOT_CONTACT|STALE_CONTACT|EXPIRED|LIVE_CALLS_DISABLED|OUTSIDE_WINDOW|QUEUE_STOPPED|DEVICE_MISMATCH/);assert.equal(f.cmd('status').metrics.authorizedAttempts,0);
 }
});
test('T825 confirmation refuses rehearsal, stale versions, foreign device and admins; admin disable revokes sales access',t=>{
 const f=fixture(t);assert.throws(()=>f.confirm({expectedVersion:0}),/STALE_QUEUE/);assert.throws(()=>f.confirm({deviceId:'FOREIGN'}),/DEVICE_MISMATCH/);
 assert.throws(()=>f.cmd('confirmBatch',{queueId:f.q.id,expectedVersion:f.q.version,deviceId:'GENERATED-DEVICE',confirmed:true},f.admin),/FORBIDDEN/);
 const sales=f.cmd('status').actor.userId;f.confirm();f.cmd('disableUser',{userId:sales},f.admin);assert.throws(()=>f.claim(),/AUTH_REQUIRED/);
 const rehearsal=fixture(t,2,'REHEARSAL');assert.throws(()=>rehearsal.confirm(),/LIVE_MODE_REQUIRED/);
});
test('T826 201 generated contacts are not a 200 daily cap; signed batch remains one authorization per item',t=>{
 const f=fixture(t,201),p=f.confirm().permit;assert.equal(p.maxAttempts,201);for(let i=0;i<201;i++){const a=f.claim();f.cmd('result',{attemptId:a.attempt.id,expectedRevision:1,result:'NO_ANSWER',idle:true});f.now+=30000;}const s=f.cmd('status');assert.equal(s.metrics.authorizedAttempts,201);assert.equal(s.queue.state,'FINISHED');assert.equal(s.operatorBatch,null);
});
test('T827 lost confirmation response is idempotent; lost claim response never replays after reopen',t=>{
 const f=fixture(t);const confirmation={queueId:f.q.id,expectedVersion:f.q.version,deviceId:'GENERATED-DEVICE',confirmed:true};let once=true;f.fault(p=>{if(p==='AFTER_COMMIT'&&once){once=false;throw Error('GENERATED_RECEIPT_LOSS');}});assert.throws(()=>f.cmd('confirmBatch',confirmation),/GENERATED_RECEIPT_LOSS/);f.fault(()=>{});const id=f.confirm().permit.id;assert.equal(f.confirm().permit.id,id);
 const version=f.cmd('status').queue.version;once=true;f.fault(p=>{if(p==='AFTER_COMMIT'&&once){once=false;throw Error('GENERATED_RECEIPT_LOSS');}});assert.throws(()=>f.cmd('claim',{queueId:f.q.id,expectedVersion:version,deviceId:'GENERATED-DEVICE',idle:true}),/GENERATED_RECEIPT_LOSS/);f.fault(()=>{});f.reopen();assert.equal(f.cmd('status').metrics.pending,1);assert.equal(f.cmd('status').metrics.authorizedAttempts,1);assert.equal(f.cmd('status').operatorBatch,null);assert.throws(()=>f.claim(),/PENDING_RECONCILIATION/);
});
test('T829 concurrent HTTP confirmations share one grant; pause versus claim never authorizes two or clears UNKNOWN',async t=>{
 const f=fixture(t),app=await createEnterpriseServer({service:f.s});t.after(()=>app.close());
 const post=async body=>(await(await fetch(app.url+'/api/command',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+f.token},body:JSON.stringify(body)})).json());
 const confirmation={op:'confirmBatch',queueId:f.q.id,expectedVersion:f.q.version,deviceId:'GENERATED-DEVICE',confirmed:true};
 const permits=await Promise.all([post(confirmation),post(confirmation)]);assert.ok(permits.every(p=>p.ok));assert.equal(permits[0].data.permit.id,permits[1].data.permit.id);
 await Promise.all([post({op:'pause',queueId:f.q.id,expectedVersion:f.q.version}),post({op:'claim',queueId:f.q.id,expectedVersion:f.q.version,deviceId:'GENERATED-DEVICE',idle:true})]);
 let s=f.cmd('status');if(s.queue.state==='WAITING'){f.cmd('pause',{queueId:f.q.id,expectedVersion:s.queue.version});s=f.cmd('status');}assert.ok(s.metrics.authorizedAttempts<=1);assert.equal(s.metrics.pending,s.metrics.authorizedAttempts);assert.equal(s.operatorBatch,null);assert.equal(s.queue.state,'STOPPED');
});
test('T831 operator confirmation rejects tomorrow and already expired plans rather than implicitly moving their time',t=>{
 const next=fixture(t);next.cmd('rearrange',{queueId:next.q.id,expectedVersion:next.q.version,startAt:MON+86400000});assert.throws(()=>next.confirm(),/INVALID_START_TIME/);assert.equal(next.cmd('status').operatorBatch,null);
 const late=fixture(t);late.now+=30001;assert.throws(()=>late.confirm(),/EXPIRED/);assert.equal(late.cmd('status').metrics.authorizedAttempts,0);
});
test('T832 engineering file path never accepts a copied operator batch to bypass persistent revocation',t=>{
 const f=fixture(t),p=f.confirm().permit,folder=mkdtempSync(join(root,'engineering-'));t.after(()=>rmSync(folder,{recursive:true,force:true}));const path=join(folder,'copied.json');writeFileSync(path,JSON.stringify(p));assert.equal(readLivePermit(path,permitSecret(key),{actor:{mode:'LIVE',tenant:p.tenantId,id:p.ownerId},queue:{id:p.queueId},contact:{id:p.targetIds[0]},device:{device_id:p.deviceId,account_key:p.accountKey},now:f.now}),false);
});
