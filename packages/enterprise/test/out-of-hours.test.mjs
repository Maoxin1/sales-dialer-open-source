import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,rmSync} from 'node:fs';import {join} from 'node:path';
import {EnterpriseService} from '../src/service.mjs';
import {permitSecret,signLivePermit,checkLivePermit} from '../src/live-permit.mjs';
import {validateLiveRequest} from '../src/live-validation-preparation.mjs';
const now=Date.parse('2026-10-18T16:30:00Z'),key=permitSecret(Buffer.alloc(32,49));
const request={authorizationId:'GENERATED-AFTER-HOURS',receiver:'19900009601',maxAttempts:2,confirmedAt:now,recipientConsentsNow:true,operatorConfirmsNow:true};
test('T801 explicit bounded after-hours consent only; default and false remain denied',()=>{
 assert.throws(()=>validateLiveRequest(request,now),/OUTSIDE_ACCEPTED_WORKING_WINDOW/);
 assert.doesNotThrow(()=>validateLiveRequest({...request,allowOutOfHours:true},now));
 assert.throws(()=>validateLiveRequest({...request,allowOutOfHours:false},now));
 assert.throws(()=>validateLiveRequest({...request,allowOutOfHours:true,recipientConsentsNow:false},now));
});
test('T802 signed exception binds exact preparation, queue, target and time; changing flag invalidates signature',()=>{
 const input={schema:2,id:'CONTROLLED-'+'e'.repeat(64),purpose:'CONTROLLED_LIVE_VALIDATION',tenantId:'TENANT-A',ownerId:'USER-A',queueId:'QUEUE-00000000-0000-0000-0000-000000000001',deviceId:'DEVICE-A',accountKey:'a'.repeat(64),targetIds:['CONTACT-A'],notBefore:now,notAfter:now+600000,maxAttempts:2,allowOutOfHours:true,requestId:'CONTROLLED-REQUEST'};
 const p=signLivePermit(input,key),c={actor:{tenant:'TENANT-A',id:'USER-A',mode:'LIVE'},queue:{id:p.queueId},contact:{id:'CONTACT-A'},device:{device_id:'DEVICE-A',account_key:'a'.repeat(64)},now};
 assert.ok(checkLivePermit(p,key,c));assert.ok(checkLivePermit(p,key,{...c,queue:{preparingRequestId:p.requestId}}));
 assert.equal(checkLivePermit(p,key,{...c,queue:{preparingRequestId:'OTHER'}}),false);
 assert.equal(checkLivePermit({...p,allowOutOfHours:false},key,c),false);
 assert.equal(checkLivePermit(p,key,{...c,now:now+600001}),false);
});
test('T803 SQLite after-hours preparation and claim require matching signed exception; no grant still denies',t=>{
 const base=new URL('../../../.local/enterprise-tests/',import.meta.url);mkdirSync(base,{recursive:true});const dir=mkdtempSync(join(base.pathname.replace(/^\/(\w:)/,'$1'),'afterhours-'));let grant=null,clock=now;
 const service=new EnterpriseService({path:join(dir,'test.db'),key:Buffer.alloc(32,50),clock:()=>clock,liveGrant:c=>checkLivePermit(grant,key,c)});t.after(()=>{service.close();rmSync(dir,{recursive:true,force:true});});
 const pass='Generated-Afterhours-2026',b=service.bootstrap({company:'GENERATED NO PHONE',username:'admin',password:pass,mode:'LIVE'}),admin=service.login({tenantId:b.tenantId,username:'admin',password:pass});service.command(admin.token,{op:'createSales',username:'sales',password:pass});const login=service.login({tenantId:b.tenantId,username:'sales',password:pass}),cmd=(op,data={})=>service.command(login.token,{op,...data});
 cmd('import',{rows:['19900009601'],source:'GENERATED_NO_PHONE',qualification:'CONFIRMED'});cmd('bindDevice',{deviceId:'DEVICE-A',accountKey:'a'.repeat(64)});const s=cmd('status'),contact=s.contacts[0],params={requestId:'CONTROLLED-TEST-REQUEST',targetIds:[contact.id],expectedContacts:{[contact.id]:contact.revision},startAt:now+15000,expectedVersion:s.queueVersion};
 assert.throws(()=>cmd('prepareQueue',params),/INVALID_QUEUE/);
 grant=signLivePermit({schema:2,id:'CONTROLLED-'+'d'.repeat(64),purpose:'CONTROLLED_LIVE_VALIDATION',tenantId:b.tenantId,ownerId:login.actor.userId,queueId:'QUEUE-00000000-0000-0000-0000-000000000002',deviceId:'DEVICE-A',accountKey:'a'.repeat(64),targetIds:[contact.id],notBefore:now,notAfter:now+600000,maxAttempts:2,allowOutOfHours:true,requestId:params.requestId},key);
 const q=cmd('prepareQueue',params);assert.equal(q.id,grant.queueId);clock+=15000;
 const claim=cmd('claim',{queueId:q.id,expectedVersion:q.version,deviceId:'DEVICE-A',idle:true});assert.equal(claim.permitId,grant.id);assert.equal(cmd('status').metrics.pending,1);
 assert.throws(()=>cmd('claim',{queueId:q.id,expectedVersion:q.version,deviceId:'DEVICE-A',idle:true}),/PENDING_RECONCILIATION/);
 cmd('result',{attemptId:claim.attempt.id,expectedRevision:claim.attempt.revision,result:'NO_ANSWER',idle:true});
 const again=index=>{clock+=30000;const state=cmd('status'),requestId='CONTROLLED-REQUEST-'+index;grant=signLivePermit({...grant,queueId:'QUEUE-00000000-0000-0000-0000-'+String(index).padStart(12,'0'),requestId},key);return cmd('prepareQueue',{...params,requestId,startAt:clock,expectedVersion:state.queueVersion});};
 const secondQueue=again(3),second=cmd('claim',{queueId:secondQueue.id,expectedVersion:secondQueue.version,deviceId:'DEVICE-A',idle:true});cmd('result',{attemptId:second.attempt.id,expectedRevision:second.attempt.revision,result:'NO_ANSWER',idle:true});
 const thirdQueue=again(4);assert.throws(()=>cmd('claim',{queueId:thirdQueue.id,expectedVersion:thirdQueue.version,deviceId:'DEVICE-A',idle:true}),/LIVE_CALLS_DISABLED/);assert.equal(cmd('status').metrics.authorizedAttempts,2);
 const revokedQueue=again(5);grant=null;assert.throws(()=>cmd('claim',{queueId:revokedQueue.id,expectedVersion:revokedQueue.version,deviceId:'DEVICE-A',idle:true}),/OUTSIDE_WINDOW/);assert.equal(cmd('status').metrics.authorizedAttempts,2);
});
