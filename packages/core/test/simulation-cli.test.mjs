import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SALES, TARGET, TASK, NOW } from '../test-support/simulation-fixture.mjs';
const cli=fileURLToPath(new URL('../src/simulation-cli.mjs',import.meta.url));
function run(args=[],commands=[]) {
  const result=spawnSync(process.execPath,[cli,...args],{encoding:'utf8',input:commands.map(c=>typeof c==='string'?c:JSON.stringify(c)).join('\n')+'\n'});
  return {...result,lines:result.stdout.trim().split('\n').filter(Boolean).map(s=>JSON.parse(s))};
}
function db(t) { const dir=mkdtempSync(join(tmpdir(),'sales-dialer-cli-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));return join(dir,'sim.db'); }
const setup=[{op:'import',rows:[{raw:TARGET,qualification:'CONFIRMED',source:'SYNTHETIC-ATTESTATION'}]},
  {op:'task',taskId:TASK,targetKey:TARGET,assignedSalesId:SALES,plannedAt:NOW}];
test('T-CALL-081 CLI persists import/task/trigger/unknown, status and recovery across processes',t=>{
  const path=db(t);const result=run(['--db',path],[...setup,{op:'trigger',taskId:TASK,intentId:'SYNTHETIC-CLI-I-1',outcome:'UNKNOWN'},{op:'status'},{op:'quit'}]);
  assert.equal(result.status,0,result.stderr);
  assert.equal(result.lines.length,5,'one structured response per command including quit');
  assert.equal(result.lines[2].status,'RECONCILE_REQUIRED');
  assert.equal(result.lines[3].metrics.G,1);assert.equal(result.lines[3].metrics.C,0);
  const reopened=run(['--db',path],[{op:'recover'},{op:'status'}]);
  assert.equal(reopened.status,0,reopened.stderr);assert.equal(reopened.lines[1].metrics.unknownPending,1);
  assert.equal(reopened.lines[1].snapshot.attempts.length,1);
});
test('T-CALL-082 CLI pause/resume/replan/tick boundaries and manual next stay operable',t=>{
  const result=run(['--db',db(t)],[...setup,{op:'pause'},{op:'trigger',taskId:TASK,intentId:'SYNTHETIC-CLI-I-1'},
    {op:'resume'},{op:'plan',taskId:TASK,plannedAt:NOW+1000},{op:'advance',ms:1000},
    {op:'tick',taskId:TASK,planVersion:3,policyVersion:1,intentId:'SYNTHETIC-CLI-I-2',outcome:'BUSY'}, {op:'status'}]);
  assert.equal(result.status,0,result.stderr);assert.equal(result.lines.length,9,'all commands must produce a response');assert.equal(result.lines[3].reason,'PAUSED');
  assert.equal(result.lines[7].status,'FINISHED');assert.equal(result.lines[8].metrics.G,1);
});
test('T-CALL-083 CLI malformed JSON continues with error, unsupported fields rejected, real mode stops before work',t=>{
  const result=run(['--db',db(t)],['{bad',{op:'status',phone:'SYNTHETIC-FORBIDDEN-FIELD'},{op:'status'}]);
  assert.equal(result.status,2);assert.equal(result.lines[0].reason,'INVALID_JSON');assert.equal(result.lines[1].reason,'UNSUPPORTED_FIELDS');
  assert.equal(result.lines[2].metrics.G,0);
  const real=run(['--mode','real']);assert.equal(real.status,2);assert.equal(real.lines[0].reason,'REAL_ADAPTER_UNAVAILABLE');
});
test('T-CALL-084 built-in demo completes two synthetic tasks and preserves source boundaries',()=>{
  const result=run(['--demo']);assert.equal(result.status,0,result.stderr);
  const last=result.lines.at(-1);assert.ok(last.metrics,'demo must return metrics from the implemented task loop');assert.equal(last.metrics.G,2);assert.equal(last.metrics.Q,1);assert.equal(last.metrics.unknownPending,1);
  assert.equal(last.metrics.C,0);assert.equal(last.realPhoneAdapterConnected,false);
});
