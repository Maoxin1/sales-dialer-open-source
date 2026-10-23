import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryStore } from '../src/memory-store.mjs';
import { SimulationSession } from '../src/simulation-session.mjs';
test('T-CALL-104 self-service calendar permits weekdays and stops weekend plans/triggers',async()=>{
  const s=new SimulationSession(new MemoryStore(),{profile:'self-service'});
  await s.execute({op:'import',rows:[{raw:'SYNTHETIC-WEEK-TARGET',qualification:'CONFIRMED',source:'SYNTHETIC-WEEK-SOURCE'}]});
  const task={op:'task',taskId:'SYNTHETIC-WEEK-TASK',targetKey:'SYNTHETIC-WEEK-TARGET',assignedSalesId:'SYNTHETIC-SALES-A',plannedAt:Date.parse('2026-10-17T09:00:00+08:00')};
  assert.equal((await s.execute(task)).reason,'INVALID_PLAN_TIME');
  task.plannedAt=Date.parse('2026-10-19T09:00:00+08:00');assert.equal((await s.execute(task)).decision,'OK');
  await s.execute({op:'time',atEpochMs:Date.parse('2026-10-18T10:00:00+08:00')});
  assert.equal((await s.execute({op:'trigger',taskId:task.taskId,intentId:'SYNTHETIC-WEEK-INTENT'})).reason,'CALENDAR_CLOSED');
  await s.execute({op:'time',atEpochMs:task.plannedAt});
  assert.equal((await s.execute({op:'tick',taskId:task.taskId,planVersion:1,policyVersion:1,intentId:'SYNTHETIC-WEEK-INTENT',outcome:'BUSY'})).decision,'OK');
});
