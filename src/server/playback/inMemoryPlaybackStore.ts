type StoredValue = {
  value: string;
  expiresAt: number;
};

type StoredCounter = {
  value: number;
  expiresAt: number | null;
};

export class InMemoryPlaybackStore {
  private readonly values = new Map<string, StoredValue>();
  private readonly counters = new Map<string, StoredCounter>();

  constructor(private readonly now: () => number = () => Date.now()) {}

  get(key: string) {
    const entry = this.values.get(key);

    if (!entry) {
      return null;
    }

    if (entry.expiresAt <= this.now()) {
      this.values.delete(key);
      return null;
    }

    return entry.value;
  }

  setex(key: string, ttlSeconds: number, value: string) {
    this.values.set(key, {
      value,
      expiresAt: this.now() + ttlSeconds * 1000,
    });
  }

  expire(key: string, ttlSeconds: number) {
    const entry = this.values.get(key);

    if (entry) {
      entry.expiresAt = this.now() + ttlSeconds * 1000;
    }

    const counter = this.getCounterEntry(key);

    if (counter) {
      counter.expiresAt = this.now() + ttlSeconds * 1000;
    }
  }

  del(...keys: string[]) {
    for (const key of keys) {
      this.values.delete(key);
      this.counters.delete(key);
    }
  }

  incr(key: string) {
    const counter = this.getCounterEntry(key);
    const nextValue = (counter?.value ?? 0) + 1;

    this.counters.set(key, {
      value: nextValue,
      expiresAt: counter?.expiresAt ?? null,
    });

    return nextValue;
  }

  getCounter(key: string) {
    return this.getCounterEntry(key)?.value ?? 0;
  }

  clear() {
    this.values.clear();
    this.counters.clear();
  }

  private getCounterEntry(key: string) {
    const counter = this.counters.get(key);

    if (!counter) {
      return null;
    }

    if (counter.expiresAt !== null && counter.expiresAt <= this.now()) {
      this.counters.delete(key);
      return null;
    }

    return counter;
  }
}
