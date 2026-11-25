import { beforeAll, describe, expect, test, vi } from 'vitest';

type Intro = typeof import('../src/app/intro.ts');
type Runtime = typeof import('../src/app/runtime.ts');
let intro: Intro;
let runtime: Runtime;
const target = new EventTarget();

beforeAll(async () => {
  // Brauzer muhiti: do'kon va sessiya xotirasi uchun soddalashtirilgan o'rinbosarlar.
  const memory = new Map<string, string>();
  const storage = { getItem: (k: string) => memory.get(k) ?? null, setItem: (k: string, v: string) => { memory.set(k, v); }, removeItem: (k: string) => { memory.delete(k); } };
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: () => undefined, removeEventListener: () => undefined }));
  vi.stubGlobal('localStorage', storage);
  vi.stubGlobal('sessionStorage', storage);
  vi.stubGlobal('navigator', { onLine: true, userAgent: 'test', hardwareConcurrency: 4, webdriver: false });
  vi.stubGlobal('document', { documentElement: { dataset: {} }, addEventListener: () => undefined });
  vi.stubGlobal('window', globalThis);
  vi.stubGlobal('location', { search: '', origin: 'http://x', host: 'x', pathname: '/' });
  vi.stubGlobal('addEventListener', target.addEventListener.bind(target));
  vi.stubGlobal('removeEventListener', target.removeEventListener.bind(target));
  runtime = await import('../src/app/runtime.ts');
  intro = await import('../src/app/intro.ts');
});

describe('kirish animatsiyasi', () => {
  test('baland nuqtadan uchadi; ekranga tegilsa darhol to‘xtaydi; sessiyada bir marta', () => {
    const before = runtime.city.view;
    intro.playIntro(null);
    expect(runtime.city.flight).not.toBeNull();
    expect(runtime.city.view.height).toBeGreaterThan(before.height);
    target.dispatchEvent(new Event('pointerdown'));
    expect(runtime.city.flight).toBeNull();
    expect(runtime.city.view).toEqual(before);
    intro.playIntro(null);
    expect(runtime.city.flight).toBeNull();
  });
});
