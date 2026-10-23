function validTime(value) {
  return typeof value === 'number' && Number.isSafeInteger(value)
    && Math.abs(value) <= 8_640_000_000_000_000;
}

/** Synthetic UTC clock: callers must pass nowMs() explicitly to pure rules. */
export class FakeClock {
  #atEpochMs;

  constructor(atEpochMs) {
    this.set(atEpochMs);
  }

  nowMs() {
    return this.#atEpochMs;
  }

  set(atEpochMs) {
    if (!validTime(atEpochMs)) throw new TypeError('FAKE_CLOCK_INVALID_TIME');
    this.#atEpochMs = atEpochMs;
    return this.#atEpochMs;
  }

  advance(deltaMs) {
    if (!Number.isSafeInteger(deltaMs)) throw new TypeError('FAKE_CLOCK_INVALID_DELTA');
    return this.set(this.#atEpochMs + deltaMs);
  }
}
