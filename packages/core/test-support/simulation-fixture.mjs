import { MemoryStore } from '../src/memory-store.mjs';
import { SimulationEngine } from '../src/simulation-engine.mjs';
import { FakeClock } from './fake-clock.mjs';

export const NOW = Date.parse('2026-10-14T01:00:00Z');
export const SALES = 'SYNTHETIC-SALES-A';
export const OTHER = 'SYNTHETIC-SALES-B';
export const TENANT = 'SYNTHETIC-TENANT-A';
export const TARGET = 'SYNTHETIC-TARGET-1';
export const TASK = 'SYNTHETIC-TASK-1';
export const CAPABILITIES = ['read', 'read_all', 'import', 'assign', 'trigger', 'retime', 'refuse', 'qualify', 'pause', 'reconcile', 'observe'];
export const policy = () => ({ simulationOnly: true, version: 1, calendarDates: ['2026-10-14'], lateToleranceMs: 60000, pauseScope: 'seller', order: 'explicit-selection' });
export function fixture({ store = new MemoryStore(), clock = new FakeClock(NOW), engineOptions = {} } = {}) {
  const engine = new SimulationEngine({ store, clock, ...engineOptions });
  engine.configureFixture({ actors: [SALES, OTHER].map(actorId => ({ actorId, tenantId: TENANT, permissions: CAPABILITIES })), policy: policy() });
  engine.importContacts({ actorId: SALES, rows: [{ raw: TARGET, qualification: 'CONFIRMED', source: 'SYNTHETIC-ENTERPRISE-ATTESTATION' }] });
  engine.createTask({ actorId: SALES, taskId: TASK, targetKey: TARGET, assignedSalesId: SALES, plannedAt: NOW });
  engine.observeDevice({ actorId: SALES, state: 'IDLE' });
  const request = (overrides = {}) => ({ actorId: SALES, taskId: TASK, planVersion: 1, policyVersion: 1,
    intentId: 'SYNTHETIC-INTENT-1', trigger: 'scheduled', ...overrides });
  return { engine, store, clock, request };
}
