import {ControlledCallPort} from '../test-support/controlled-call-port.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {checkControlledCallContract} from '../src/controlled-call-contract.mjs';
import {controlledCallFixture as fixture,CALL_NOW} from '../test-support/controlled-call-fixture.mjs';
test('T-CALL-209 exact explicit permit yields a bounded handoff description, never real authorization',()=>{
 const f=fixture(),before=structuredClone(f),r=checkControlledCallContract(f);assert.equal(r.decision,'READY_FOR_ADAPTER');assert.equal(r.realCallsEnabled,false);assert.equal(r.callAuthorization,'DENY');assert.equal(r.handoff.permitId,f.permit.permitId);assert.equal(r.handoff.ticketId,f.context.ticketId);assert.equal(r.handoff.expiresAt,f.permit.expiresAt);assert.deepEqual(f,before);
});
for(const field of ['tenantId','salesId','deviceKey','installationKey','accountKey','targetKey'])test('T-CALL-210 mismatched '+field+' denied',()=>{const f=fixture();f.context[field]=field.endsWith('Key')&&field!=='targetKey'?'f'.repeat(64):'SYNTHETIC-OTHER';assert.equal(checkControlledCallContract(f).reason,'PERMIT_SCOPE_MISMATCH');});
for(const [name,change,reason] of [
 ['missing approval',f=>f.permit.approvalRef='', 'INVALID_CONTRACT'],
 ['extra phone number',f=>f.permit.phoneNumber='SYNTHETIC-NOT-A-NUMBER','INVALID_CONTRACT'],
 ['not begun',f=>f.now--,'TIME_BLOCKED'],['expired',f=>f.now+=60000,'TIME_BLOCKED'],
 ['rollback',f=>f.context.lastObservedAt++,'TIME_BLOCKED'],['revoked',f=>f.permit.revoked=true,'PERMIT_REVOKED'],
 ['exhausted',f=>f.context.usedAttempts=1,'PERMIT_EXHAUSTED'],
 ['old plan',f=>f.context.currentPlanVersion++,'STALE_BUSINESS_VERSION'],
 ['old policy',f=>f.context.currentPolicyVersion++,'STALE_BUSINESS_VERSION'],
 ['changed qualification',f=>f.context.currentQualificationRevision++,'STALE_BUSINESS_VERSION'],
 ['refused',f=>f.context.doNotContact=true,'CONTACT_BLOCKED'],['unknown qualification',f=>f.context.qualification='UNKNOWN','CONTACT_BLOCKED'],
 ['paused',f=>f.context.paused=true,'BUSINESS_BLOCKED'],['foreign occupancy',f=>f.context.occupiedBy='SYNTHETIC-OTHER','BUSINESS_BLOCKED'],
 ['unknown handoff',f=>f.context.attemptStatus='RECONCILE_REQUIRED','BUSINESS_BLOCKED'],['closed ticket',f=>f.context.ticketState='RECONCILED','BUSINESS_BLOCKED'],
 ['busy',f=>f.context.phoneInCall=true,'DEVICE_BLOCKED'],['unknown call',f=>f.context.phoneInCall=null,'DEVICE_BLOCKED'],
 ['permission',f=>f.context.permissionsGranted=false,'DEVICE_BLOCKED'],['disabled SIM',f=>f.context.accountEnabled=false,'DEVICE_BLOCKED'],
 ['stale observation',f=>f.context.observedAt-=10001,'DEVICE_OBSERVATION_EXPIRED'],['future observation',f=>f.context.observedAt++,'DEVICE_OBSERVATION_EXPIRED']
])test('T-CALL-211 '+name,()=>{const f=fixture();change(f);assert.equal(checkControlledCallContract(f).reason,reason);});
test('T-CALL-212 adopted calendar remains mandatory even with a matching permit',()=>{
 for(const instant of ['2026-10-15T00:59:59Z','2026-10-15T10:00:00Z','2026-10-17T01:00:00Z']){const f=fixture(),n=Date.parse(instant);f.now=n;f.permit.notBefore=n;f.permit.expiresAt=n+60000;f.context.observedAt=n;f.context.lastObservedAt=n;assert.equal(checkControlledCallContract(f).reason,'WINDOW_CLOSED');}
});
test('T-CALL-212 permit lifetime cannot extend short handoff TTL',()=>{const f=fixture();f.permit.expiresAt=CALL_NOW+300000;assert.equal(checkControlledCallContract(f).handoff.expiresAt,CALL_NOW+60000);});

for(const outcome of ['SUBMITTED','NOT_SUBMITTED','LOST_RECEIPT'])test('T-CALL-213 '+outcome+' never implies outgoing, connected or real permission',()=>{
 const port=new ControlledCallPort({outcome}),r=port.submit(fixture());assert.equal(port.requests.length,1);assert.equal(r.apiSubmission,outcome==='LOST_RECEIPT'?'UNKNOWN':outcome);assert.equal(r.actualPhoneApiCalls,0);assert.equal(r.outgoingConfirmed,null);assert.equal(r.connectedConfirmed,null);assert.equal(r.manualResult,null);assert.equal(r.callAuthorization,'DENY');
 if(outcome!=='NOT_SUBMITTED')assert.equal(r.state,'RECONCILE_REQUIRED');
});
test('T-CALL-213 revoked permission never reaches recording port',()=>{const f=fixture(),p=new ControlledCallPort();f.permit.revoked=true;assert.equal(p.submit(f).decision,'DENY');assert.equal(p.requests.length,0);});
for(const value of [null,{},[],{permit:{}},undefined])test('T-CALL-214 invalid envelope fails closed',()=>assert.equal(checkControlledCallContract(value).reason,'INVALID_CONTRACT'));
test('T-CALL-214 invented real approval and mutated handoff cannot enable real call',()=>{const f=fixture();f.permit.source='USER_APPROVED';assert.equal(checkControlledCallContract(f).decision,'DENY');const g=fixture(),r=checkControlledCallContract(g);r.handoff.accountKey='f'.repeat(64);assert.equal(g.context.accountKey,'c'.repeat(64));});
