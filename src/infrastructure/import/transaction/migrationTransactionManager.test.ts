import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createStorageSnapshot, restoreStorageSnapshot } from './migrationSnapshot.ts';

const store: Record<string, string> = {};
const mockStorage = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
};

describe('migrationSnapshot rollback', () => {
  const testKey = 'clientflow_clients';

  beforeEach(() => {
    Object.assign(globalThis, { localStorage: mockStorage });
    localStorage.setItem(testKey, JSON.stringify([{ id: '1', name: 'Before' }]));
  });

  afterEach(() => {
    delete store[testKey];
  });

  it('creates and restores storage snapshot on rollback', () => {
    const snapshot = createStorageSnapshot();
    localStorage.setItem(testKey, JSON.stringify([{ id: '2', name: 'After' }]));
    assert.match(localStorage.getItem(testKey)!, /After/);
    restoreStorageSnapshot(snapshot);
    assert.match(localStorage.getItem(testKey)!, /Before/);
  });
});
