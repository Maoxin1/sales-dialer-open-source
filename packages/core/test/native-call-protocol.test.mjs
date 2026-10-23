import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {encodeNativeCallCommand, readNativeCallReceipt} from '../src/native-call-protocol.mjs';
const fixture=()=>({schemaVersion:1,mode:'controlled-call',permitId:'SYNTHETIC-PERMIT',attemptId:'SYNTHETIC-ATTEMPT',ticketId:'SYNTHETIC-TICKET',tenantId:'SYNTHETIC-TENANT',salesId:'SYNTHETIC-SALES',targetKey:'SYNTHETIC-TARGET',installationKey:'a'.repeat(64),accountKey:'b'.repeat(64)});
const receipt=(c,status='API_SUBMITTED')=>({source:'ANDROID_CONTROLLED_CALL',commandDigest:c.digest,attemptId:c.command.attemptId,ticketId:c.command.ticketId,status,outgoingConfirmed:null,connectedConfirmed:null,manualResult:null});
test('T-CALL-229 canonical native command copies and binds every field',()=>{
 const f=fixture(), c=encodeNativeCallCommand(f), reversed=Object.fromEntries(Object.entries(f).reverse());
 assert.equal(encodeNativeCallCommand(reversed).digest,c.digest);
 assert.deepEqual(JSON.parse(Buffer.from(c.encoded,'base64url')),f);
 assert.equal(c.digest,createHash('sha256').update(Buffer.from(c.encoded,'base64url')).digest('hex'));
 f.attemptId='SYNTHETIC-CHANGED';assert.equal(c.command.attemptId,'SYNTHETIC-ATTEMPT');assert.ok(Object.isFrozen(c.command));
 for(const k of ['permitId','attemptId','ticketId','tenantId','salesId','targetKey','installationKey','accountKey']){
  const changed=fixture();changed[k]=k.endsWith('Key')&&k!=='targetKey'?'c'.repeat(64):'SYNTHETIC-OTHER';assert.notEqual(encodeNativeCallCommand(changed).digest,c.digest);
 }
});
for(const [name,mutate] of [
 ['extra number',c=>c.targetNumber='SYNTHETIC-NOT-NUMBER'],['secret',c=>c.permitToken='a'.repeat(64)],
 ['fixture mode',c=>c.mode='contract-test'],['dry run',c=>c.mode='dry-run'],['version',c=>c.schemaVersion='1'],
 ['missing scope',c=>delete c.tenantId],['bad key',c=>c.accountKey='unknown'],['shell text',c=>c.attemptId='X;CALL'],
])test('T-CALL-229 rejects '+name,()=>{const c=fixture();mutate(c);assert.throws(()=>encodeNativeCallCommand(c),/INVALID_NATIVE_COMMAND/);});
test('T-CALL-230 API return is not outgoing, connected or manual evidence',()=>{
 const c=encodeNativeCallCommand(fixture()),r=readNativeCallReceipt(c.command,JSON.stringify(receipt(c)));
 assert.equal(r.apiSubmission,'SUBMITTED');assert.equal(r.requiresReconciliation,true);assert.equal(r.retryAllowed,false);
 assert.equal(r.outgoingConfirmed,null);assert.equal(r.connectedConfirmed,null);assert.equal(r.manualResult,null);
});
for(const [name,mutate] of [
 ['digest',r=>r.commandDigest='f'.repeat(64)],['attempt',r=>r.attemptId='SYNTHETIC-OTHER'],['ticket',r=>r.ticketId='SYNTHETIC-OTHER'],
 ['source',r=>r.source='TEST_DOUBLE'],['fake connected',r=>r.connectedConfirmed=true],['extra field',r=>r.targetNumber='SYNTHETIC'],
 ['missing result',r=>delete r.manualResult],['unsupported status',r=>r.status='SUCCESS'],
])test('T-CALL-231 invalid receipt becomes UNKNOWN: '+name,()=>{
 const c=encodeNativeCallCommand(fixture()),r=receipt(c);mutate(r);const result=readNativeCallReceipt(c.command,JSON.stringify(r));
 assert.equal(result.apiSubmission,'UNKNOWN');assert.equal(result.retryAllowed,false);assert.equal(result.requiresReconciliation,true);
});
for(const raw of [null,'{','x'.repeat(8193),'[]'])test('T-CALL-231 missing malformed oversized receipt '+String(raw).slice(0,8),()=>{
 assert.equal(readNativeCallReceipt(fixture(),raw).apiSubmission,'UNKNOWN');
});
for(const status of ['REJECTED','REQUEST_CONFLICT','PERMIT_CONFLICT','PERMIT_EXHAUSTED','NATIVE_RECONCILIATION_REQUIRED','RECONCILE_REQUIRED','DUPLICATE:API_SUBMITTED','DUPLICATE:HANDOFF_UNKNOWN','DUPLICATE:RECONCILED'])test('T-CALL-232 '+status+' never retries or releases occupancy',()=>{
 const c=encodeNativeCallCommand(fixture()),r=readNativeCallReceipt(c.command,JSON.stringify(receipt(c,status)));
 assert.equal(r.retryAllowed,false);assert.equal(r.requiresReconciliation,true);assert.equal(r.apiSubmission,'UNKNOWN');assert.equal(r.nativeStatus,status);
});
