import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SQLiteStore } from './sqlite-store.mjs';
import { TrialBudget } from './trial-budget.mjs';
// Entirely synthetic, temporary isolated database; no device or phone transport.
const dir=mkdtempSync(join(tmpdir(),'dialer-trial-demo-'));
let store=new SQLiteStore(join(dir,'demo.db'));
try {
 const round={roundId:'SYNTHETIC-DEMO',tenantId:'SYNTHETIC-TENANT',salesId:'SYNTHETIC-SALES',deviceId:'SYNTHETIC-DEVICE',accountId:'SYNTHETIC-SIM',targets:['SYNTHETIC-TARGET'],notBefore:1000,expiresAt:2000,maxAttempts:1,source:'SIMULATION_FIXTURE'};
 let gate=new TrialBudget({store,now:()=>1000});gate.register(round);
 const request={roundId:round.roundId,tenantId:round.tenantId,salesId:round.salesId,deviceId:round.deviceId,accountId:round.accountId,targetKey:round.targets[0],intentId:'SYNTHETIC-INTENT',taskId:'SYNTHETIC-TASK',cycle:1};
 const first=gate.reserve(request);assert.equal(first.code,'RESERVED');
 assert.equal(gate.reserve(request).code,'DUPLICATE');
 store.close();store=new SQLiteStore(join(dir,'demo.db'));gate=new TrialBudget({store,now:()=>1100});
 const next={...request,intentId:'SYNTHETIC-NEXT',taskId:'SYNTHETIC-NEXT'};
 assert.equal(gate.reserve(next).code,'OCCUPIED');
 gate.reconcile({tenantId:round.tenantId,salesId:round.salesId,ticketId:first.ticketId,noActiveCall:true,outcome:'SIMULATED_FINISHED'});
 assert.equal(gate.reserve(next).code,'BUDGET_EXHAUSTED');
 console.log(JSON.stringify({mode:'SIMULATION_ONLY',checks:['reserve','duplicate','reopen-occupied','reconcile','budget-exhausted'],actualPhoneApiCalls:0,callAuthorization:'DENY',status:gate.status()},null,2));
} finally {store.close();rmSync(dir,{recursive:true,force:true});}
