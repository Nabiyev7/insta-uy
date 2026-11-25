import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest';
import type { Plot } from '../../../packages/shared/src/index.ts';
import { BUILD_MS, FLIGHT_MS } from '../src/logic/construction.ts';

type Actions = typeof import('../src/app/actions.ts');
type Store = typeof import('../src/app/store.ts');
let actions: Actions;
let store: Store;
const plot = { id: 'P0001', x: 0, z: 0, w: 24, d: 34, rot: 0, type: 'hovli', districtId: 1 } as unknown as Plot;

beforeAll(async () => {
  // Do'kon (zustand) brauzer muhitini kutadi — sinovda soddalashtirilgan o'rinbosarlar.
  const memory = new Map<string, string>();
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: () => undefined, removeEventListener: () => undefined }));
  vi.stubGlobal('localStorage', { getItem: (k: string) => memory.get(k) ?? null, setItem: (k: string, v: string) => { memory.set(k, v); }, removeItem: (k: string) => { memory.delete(k); } });
  vi.stubGlobal('sessionStorage', { getItem: () => null, setItem: () => undefined, removeItem: () => undefined });
  if (typeof navigator === 'undefined' || !('onLine' in navigator)) vi.stubGlobal('navigator', { onLine: true, userAgent: 'test', hardwareConcurrency: 4 });
  vi.stubGlobal('document', { documentElement: { dataset: {} }, addEventListener: () => undefined });
  vi.stubGlobal('window', globalThis);
  vi.stubGlobal('location', { search: '', origin: 'http://x', host: 'x', pathname: '/' });
  store = await import('../src/app/store.ts');
  actions = await import('../src/app/actions.ts');
});

describe('qurilish tabrigi', () => {
  afterEach(() => { vi.useRealTimers(); });
  test('1 s da Do‘kon ochilsa — 4 s dan keyin ham Do‘kon ochiq, tabrik kartada', () => {
    vi.useFakeTimers();
    actions.startConstruction(plot);
    vi.advanceTimersByTime(1000);
    store.setApp({ panel: { kind: 'shop' } });
    vi.advanceTimersByTime(FLIGHT_MS + BUILD_MS);
    expect(store.getApp().panel).toEqual({ kind: 'shop' });
    expect(store.getApp().cheer).toMatchObject({ plot: 'P0001', isBuilt: true });
    expect(store.getApp().building).toBeNull();
  });
  test('oyna yo‘q bo‘lsa — tabrik oynasi darhol; ikki marta chaqirilsa bitta tabrik', () => {
    vi.useFakeTimers();
    store.setApp({ panel: null, cheer: null });
    actions.startConstruction(plot);
    actions.startConstruction(plot, 2);
    vi.advanceTimersByTime(FLIGHT_MS + BUILD_MS);
    expect(store.getApp().panel).toEqual({ kind: 'congrats', id: 'P0001', tier: 2 });
    store.setApp({ panel: null });
    vi.advanceTimersByTime(FLIGHT_MS + BUILD_MS);
    expect(store.getApp().panel).toBeNull();
  });
});
