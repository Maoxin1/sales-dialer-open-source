import test from 'node:test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { TrialBudget } from '../src/trial-budget.mjs';
import { MemoryStore } from '../src/memory-store.mjs';
import { SQLiteStore } from '../src/sqlite-store.mjs';
export const round={roundId:'SYNTHETIC-ROUND',tenantId:'SYNTHETIC-TENANT',salesId:'SYNTHETIC-SALES',deviceId:'SYNTHETIC-DEVICE',accountId:'SYNTHETIC-SIM',targets:['SYNTHETIC-TARGET'],notBefore:1000,expiresAt:2000,maxAttempts:2,source:'SIMULATION_FIXTURE'};
const req=(i=1)=>({roundId:round.roundId,tenantId:round.tenantId,salesId:round.salesId,deviceId:round.deviceId,accountId:round.accountId,targetKey:round.targets[0],intentId:'SYNTHETIC-INTENT-'+i,taskId:'SYNTHETIC-TASK-'+i,cycle:1});
function fixture(store=new MemoryStore()){let now=1000; const gate=new TrialBudget({store,now:()=>now});gate.register(round);return {gate,store,time:n=>now=n};}
function finish(gate,ticketId){return gate.reconcile({tenantId:round.tenantId,salesId:round.salesId,ticketId,noActiveCall:true,outcome:'SIMULATED_FINISHED'});}

test('T-CALL-151 immutable synthetic round, no real authorization',()=>{const {gate}=fixture();assert.equal(gate.register(round).code,'EXISTS');assert.equal(gate.register({...round,maxAttempts:3}).code,'ROUND_CONFLICT');assert.throws(()=>gate.register({...round,roundId:'real-phone'}),/INVALID/);assert.throws(()=>gate.register({...round,targets:['13000000000']}),/INVALID/);const r=gate.reserve(req());assert.equal(r.code,'RESERVED');assert.equal(r.realCallsEnabled,false);assert.equal(r.callAuthorization,'DENY');});
test('T-CALL-152 wrong tenant/seller/device/account/target deny without spending',()=>{for(const key of ['tenantId','salesId','deviceId','accountId','targetKey']){const {gate}=fixture();assert.equal(gate.reserve({...req(),[key]:'SYNTHETIC-OTHER'}).code,'SCOPE_MISMATCH');assert.equal(gate.status().rounds[0].used,0);}});
test('T-CALL-153 limits survive duplicate registration and completion',()=>{const {gate}=fixture();for(let i=1;i<=2;i++){const r=gate.reserve(req(i));assert.equal(r.code,'RESERVED');assert.equal(finish(gate,r.ticketId).code,'RECONCILED');}assert.equal(gate.register(round).code,'EXISTS');assert.equal(gate.reserve(req(3)).code,'BUDGET_EXHAUSTED');assert.equal(gate.status().rounds[0].used,2);});
test('T-CALL-154 expiry, not-before, rollback and revoke block new reservations',()=>{for(const at of [999,2000]){const f=fixture();f.time(at);assert.equal(f.gate.reserve(req()).code,'TIME_BLOCKED');}const f=fixture();f.time(1500);const a=f.gate.reserve(req());finish(f.gate,a.ticketId);f.time(1400);assert.equal(f.gate.reserve(req(2)).code,'TIME_BLOCKED');f.time(1600);assert.equal(f.gate.revoke({roundId:round.roundId,tenantId:round.tenantId,salesId:round.salesId}).code,'REVOKED');assert.equal(f.gate.reserve(req(2)).code,'REVOKED');});
test('T-CALL-155 duplicate intent/task-cycle never consumes twice, including new round',()=>{const {gate}=fixture();const a=gate.reserve(req());assert.equal(gate.reserve(req()).code,'DUPLICATE');finish(gate,a.ticketId);assert.equal(gate.reserve({...req(2),taskId:req().taskId}).code,'DUPLICATE');gate.register({...round,roundId:'SYNTHETIC-ROUND-2'});assert.equal(gate.reserve({...req(),roundId:'SYNTHETIC-ROUND-2'}).code,'DUPLICATE');assert.equal(gate.status().rounds[0].used,1);});
test('T-CALL-156 held/unknown remains occupied; explicit scoped reconciliation only',()=>{const {gate}=fixture();const a=gate.reserve(req());assert.equal(gate.reserve(req(2)).code,'OCCUPIED');assert.equal(gate.reconcile({tenantId:'SYNTHETIC-OTHER',salesId:round.salesId,ticketId:a.ticketId,noActiveCall:true,outcome:'SIMULATED_FINISHED'}).code,'SCOPE_MISMATCH');assert.equal(gate.reconcile({tenantId:round.tenantId,salesId:round.salesId,ticketId:a.ticketId,noActiveCall:false,outcome:'SIMULATED_FINISHED'}).code,'RECONCILIATION_REQUIRED');assert.equal(gate.reserve(req(2)).code,'OCCUPIED');finish(gate,a.ticketId);assert.equal(gate.reserve(req(2)).code,'RESERVED');});
test('T-CALL-157 SQLite reopen and competing connections retain unknown occupation and budget',()=>{const dir=mkdtempSync(join(tmpdir(),'trial-budget-'));let a,b;try{a=new SQLiteStore(join(dir,'test.db'));const f=fixture(a);const r=f.gate.reserve(req());a.close();a=new SQLiteStore(join(dir,'test.db'));b=new SQLiteStore(join(dir,'test.db'));const g=new TrialBudget({store:a,now:()=>1100});const h=new TrialBudget({store:b,now:()=>1100});assert.equal(h.reserve(req()).code,'DUPLICATE');assert.equal(h.reserve(req(2)).code,'OCCUPIED');finish(g,r.ticketId);assert.equal(h.reserve(req(2)).code,'RESERVED');assert.equal(g.reserve(req(2)).code,'DUPLICATE');assert.equal(g.status().rounds[0].used,2);}finally{a?.close();b?.close();rmSync(dir,{recursive:true,force:true});}});
test('T-CALL-158 same device cannot be occupied by another seller or round',()=>{const {gate}=fixture();gate.reserve(req());gate.register({...round,roundId:'SYNTHETIC-ROUND-2',salesId:'SYNTHETIC-SALES-2'});assert.equal(gate.reserve({...req(2),roundId:'SYNTHETIC-ROUND-2',salesId:'SYNTHETIC-SALES-2'}).code,'OCCUPIED');});

test('T-CALL-159 two processes racing one SQLite budget produce only one held ticket',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'trial-race-')),path=join(dir,'race.db');const store=new SQLiteStore(path);fixture(store);store.close();
 try {
  const code=`import { SQLiteStore } from ${JSON.stringify(new URL('../src/sqlite-store.mjs',import.meta.url).href)};import { TrialBudget } from ${JSON.stringify(new URL('../src/trial-budget.mjs',import.meta.url).href)};const s=new SQLiteStore(process.argv[1]);const g=new TrialBudget({store:s,now:()=>1000});console.log(JSON.stringify(g.reserve(JSON.parse(process.argv[2]))));s.close();`;
  const outputs=await Promise.all([1,2].map(i=>promisify(execFile)(process.execPath,['--input-type=module','-e',code,path,JSON.stringify(req(i))],{windowsHide:true})));
  assert.deepEqual(outputs.map(o=>JSON.parse(o.stdout).code).sort(),['OCCUPIED','RESERVED']);
  const reopened=new SQLiteStore(path);try {const status=new TrialBudget({store:reopened}).status();assert.equal(status.rounds[0].used,1);assert.equal(status.tickets.length,1);}finally{reopened.close();}
 } finally {rmSync(dir,{recursive:true,force:true});}
});
test('T-CALL-160 revocation preserves held ticket; reconciliation never refunds even not-sent',()=>{
 const {gate}=fixture();const a=gate.reserve(req());gate.revoke({roundId:round.roundId,tenantId:round.tenantId,salesId:round.salesId});
 assert.equal(gate.status().tickets[0].state,'HELD_UNKNOWN');assert.equal(gate.register(round).code,'EXISTS');assert.equal(gate.reserve(req(2)).code,'REVOKED');
 assert.equal(gate.reconcile({tenantId:round.tenantId,salesId:round.salesId,ticketId:a.ticketId,noActiveCall:true,outcome:'SIMULATED_NOT_SENT'}).code,'RECONCILED');assert.equal(gate.status().rounds[0].used,1);
});

test('T-CALL-161 observed expiry cannot become valid again after wall-clock rollback',()=>{const f=fixture();f.time(2000);assert.equal(f.gate.reserve(req()).code,'TIME_BLOCKED');f.time(1500);assert.equal(f.gate.reserve(req()).code,'TIME_BLOCKED');assert.equal(f.gate.status().rounds[0].used,0);});
