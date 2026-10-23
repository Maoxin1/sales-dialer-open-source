import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {fixture} from '../test-support/timer-process-fixture.mjs';
test('T522 live CLI stop exits zero, archives owner, pauses plans and restart does not resume',async t=>{
 const f=fixture(t),c=f.start();await f.running(c);assert.equal(f.command('stop').value.decision,'STOP_REQUESTED');await f.closed(c);
 const restarted=f.command('start-approved');assert.equal(restarted.status,0);assert.match(restarted.stdout,/PAUSED_OR_PENDING/);assert.equal(f.status().controlled.attempts.length,0);
});
test('T523 second live CLI cannot replace the current owner',async t=>{
 const f=fixture(t),c=f.start(),owner=await f.running(c);assert.equal(f.command('start-approved').status,1);assert.equal(f.command('status').value.runId,owner.runId);f.command('stop');await f.closed(c);
});
test('T524 forced OS termination retains owner and rejects restart without replay',async t=>{
 const f=fixture(t),c=f.start(),owner=await f.running(c);assert.equal(c.kill('SIGKILL'),true);const exit=await c.done;t.diagnostic(JSON.stringify({exit,ownerRetained:true}));assert.ok(exit.signal!==null||exit.code!==0);assert.equal(f.command('status').value.runId,owner.runId);assert.equal(f.command('start-approved').status,1);assert.equal(f.command('stop').value.decision,'STOP_REQUESTED');assert.equal(existsSync(f.owner),true);assert.equal(f.status().controlled.attempts.length,0);assert.equal(existsSync(join(f.local,'offline-port.jsonl')),false);
});
test('T525 live CLI detects changed deployment and stops without submission',async t=>{
 const f=fixture(t),c=f.start();await f.running(c);writeFileSync(join(f.local,'contact-controlled-deployment.json'),JSON.stringify({synthetic:true,revision:2}));await f.closed(c);
});
