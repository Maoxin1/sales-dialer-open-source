const OUTCOMES = new Set(['SUBMITTED', 'DEFINITELY_NOT_SUBMITTED', 'UNKNOWN', 'BUSY']);
const FIELDS = new Set(['mode', 'attemptId', 'intentId', 'salesId', 'targetKey']);
const SYNTHETIC_ID = /^SYNTHETIC-[A-Z0-9-]+$/;

/**
 * In-memory phone substitute. No transport, OS phone API or callback is accepted.
 * It records EVERY request; authorization/deduplication must be tested in the SUT.
 * UNKNOWN simulates system acceptance with a lost receipt, never a real phone call.
 */
export class FakeDialAdapter {
  #outcomes;
  #requests = [];

  constructor({ outcomes = ['SUBMITTED'] } = {}) {
    if (!Array.isArray(outcomes) || outcomes.some(value => !OUTCOMES.has(value))) {
      throw new TypeError('FAKE_DIAL_INVALID_OUTCOME');
    }
    this.#outcomes = [...outcomes];
  }

  get requests() {
    return structuredClone(this.#requests);
  }

  async submit(grant) {
    if (!grant || typeof grant !== 'object' || grant.mode !== 'simulation'
      || Object.keys(grant).some(field => !FIELDS.has(field))
      || ['attemptId', 'intentId', 'salesId', 'targetKey']
        .some(field => typeof grant[field] !== 'string' || !SYNTHETIC_ID.test(grant[field]))) {
      throw new TypeError('SYNTHETIC_SIMULATION_ONLY');
    }
    const status = this.#outcomes.shift() ?? 'SUBMITTED';
    this.#requests.push({
      ...structuredClone(grant), sequence: this.#requests.length + 1,
      outcome: status, simulatedSystemAccepted: status === 'SUBMITTED' || status === 'UNKNOWN',
    });
    return { attemptId: grant.attemptId, status, source: 'SIMULATION' };
  }
}
