import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryStore } from '../src/memory-store.mjs';
import { SimulationSession } from '../src/simulation-session.mjs';
import { fixture, NOW } from '../test-support/simulation-fixture.mjs';

for (const command of [{op:'time',atEpochMs:NOW+1000},{op:'advance',ms:1000}]) {
  test(`T-CALL-095 ${command.op}: failed persistence must not change the active clock`,async()=>{
    const store=new MemoryStore();const session=new SimulationSession(store);
    const before=store.read();const transaction=store.transaction.bind(store);
    store.transaction=()=>{throw new Error('INJECTED_COMMIT_FAILURE');};
    const result=await session.execute(command);
    assert.equal(session.clock.nowMs(),NOW,'clock must remain at committed time');
    assert.deepEqual(store.read(),before);
    assert.deepEqual(result,{decision:'DENY',reason:'SIMULATION_TIME_SAVE_FAILED'});
    store.transaction=transaction;
    assert.equal((await session.execute(command)).decision,'OK');
    assert.equal(session.clock.nowMs(),NOW+1000);
    assert.equal(new SimulationSession(store).clock.nowMs(),NOW+1000);
  });
}
test('T-CALL-095 invalid time leaves memory and persistence unchanged',async()=>{
  const store=new MemoryStore();const session=new SimulationSession(store);const before=store.read();
  assert.equal((await session.execute({op:'advance',ms:'1000'})).reason,'INVALID_SIMULATION_TIME');
  assert.equal(session.clock.nowMs(),NOW);assert.deepEqual(store.read(),before);
});
test('T-CALL-096 simulationOnly must be explicit boolean true',()=>{
  for(const value of ['false','true',1,{},null,false]) {
    const f=fixture();f.store.transaction(s=>{s.policy.simulationOnly=value;});
    assert.equal(f.engine.authorize(f.request()).reason,'POLICY_GAP');
    assert.equal(Object.keys(f.store.read().attempts).length,0);
  }
});
