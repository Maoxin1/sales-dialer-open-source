export function emptyState() {
  return { schema: 1, sequence: 0, actors: {}, contacts: {}, tasks: {}, attempts: {}, sellers: {}, events: [], observations: [], policy: null };
}

/** Transactional in-memory substitute. Deliberately does not claim durability. */
export class MemoryStore {
  #state = emptyState();
  transaction(fn) {
    const draft = structuredClone(this.#state);
    const result = fn(draft);
    if (result?.then) throw new Error('ASYNC_TRANSACTION_FORBIDDEN');
    this.#state = draft;
    return structuredClone(result);
  }
  read() { return structuredClone(this.#state); }
  close() {}
}
