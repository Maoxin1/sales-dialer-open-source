import { DatabaseSync } from 'node:sqlite';
import { emptyState } from './memory-store.mjs';

/** Single-host simulation store, serialized BEGIN IMMEDIATE transactions.
 * State and relational safety indexes are committed together. Whole-state writes
 * favor inspectability over scale; this is not a production database selection.
 */
export class SQLiteStore {
  #db;
  constructor(path) {
    this.#db = new DatabaseSync(path);
    this.#db.exec(`PRAGMA busy_timeout=10000; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;
      CREATE TABLE IF NOT EXISTS simulation_state(id INTEGER PRIMARY KEY CHECK(id=1), data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS attempt_index(
        id TEXT PRIMARY KEY, tenant TEXT NOT NULL, intent TEXT NOT NULL, task TEXT NOT NULL,
        cycle INTEGER NOT NULL, seller TEXT NOT NULL, active INTEGER NOT NULL,
        UNIQUE(tenant,intent), UNIQUE(tenant,task,cycle));
      CREATE UNIQUE INDEX IF NOT EXISTS one_active_seller ON attempt_index(tenant,seller) WHERE active=1;
      CREATE TABLE IF NOT EXISTS audit_index(sequence INTEGER PRIMARY KEY, tenant TEXT NOT NULL, data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS outbox_index(attempt TEXT PRIMARY KEY, status TEXT NOT NULL);`);
    this.#db.prepare('INSERT OR IGNORE INTO simulation_state(id,data) VALUES(1,?)').run(JSON.stringify(emptyState()));
    if (this.read().schema !== 1) { this.close(); throw new Error('UNSUPPORTED_SIMULATION_SCHEMA'); }
  }
  read() { return JSON.parse(this.#db.prepare('SELECT data FROM simulation_state WHERE id=1').get().data); }
  transaction(fn) {
    this.#db.exec('BEGIN IMMEDIATE');
    try {
      const draft=this.read(), result=fn(draft);
      if(result?.then)throw new Error('ASYNC_TRANSACTION_FORBIDDEN');
      this.#db.exec('DELETE FROM attempt_index; DELETE FROM audit_index; DELETE FROM outbox_index;');
      const insert=this.#db.prepare('INSERT INTO attempt_index VALUES(?,?,?,?,?,?,?)');
      const outbox=this.#db.prepare('INSERT INTO outbox_index VALUES(?,?)');
      for(const a of Object.values(draft.attempts)) {
        const active=['AUTHORIZED','HANDOFF_UNKNOWN','SUBMITTED','RECONCILE_REQUIRED'].includes(a.status)?1:0;
        insert.run(a.attemptId,a.tenantId,a.intentId,a.taskId,a.cycle,a.salesId,active);
        outbox.run(a.attemptId,a.outbox);
      }
      const audit=this.#db.prepare('INSERT INTO audit_index VALUES(?,?,?)');
      for(const e of draft.events)audit.run(e.sequence,e.tenantId,JSON.stringify(e));
      this.#db.prepare('UPDATE simulation_state SET data=? WHERE id=1').run(JSON.stringify(draft));
      this.#db.exec('COMMIT'); return structuredClone(result);
    } catch(error) { this.#db.exec('ROLLBACK'); throw error; }
  }
  close() { if(this.#db){this.#db.close();this.#db=null;} }
}
