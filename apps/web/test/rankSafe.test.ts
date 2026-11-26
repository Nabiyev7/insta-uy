/** 6e, 2-band: eski server javobida maydon yo'q bo'lsa ham Reyting oynasi chiziladi (yiqilmaydi). */
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { beforeAll, describe, expect, test, vi } from 'vitest';
import { listOf } from '../src/logic/safe.ts';

const answers: Record<string, unknown> = {};
vi.mock('../src/ui/kit.tsx', async (original) => ({
  ...(await original<typeof import('../src/ui/kit.tsx')>()),
  useLoad: (_fn: unknown, key: string) => ({ data: answers[key], hasError: false, isLoading: false, reload: () => undefined }),
}));

let RankPanel: typeof import('../src/ui/SocialPanels.tsx').RankPanel;
beforeAll(async () => {
  const memory = new Map<string, string>();
  const storage = { getItem: (k: string) => memory.get(k) ?? null, setItem: (k: string, v: string) => { memory.set(k, v); }, removeItem: (k: string) => { memory.delete(k); } };
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: () => undefined, removeEventListener: () => undefined }));
  vi.stubGlobal('localStorage', storage);
  vi.stubGlobal('sessionStorage', storage);
  vi.stubGlobal('navigator', { onLine: true, userAgent: 'test', hardwareConcurrency: 4, webdriver: false });
  vi.stubGlobal('document', { documentElement: { dataset: {} }, addEventListener: () => undefined });
  vi.stubGlobal('window', globalThis);
  vi.stubGlobal('location', { search: '', origin: 'http://x', host: 'x', pathname: '/', hash: '' });
  vi.stubGlobal('addEventListener', () => undefined);
  ({ RankPanel } = await import('../src/ui/SocialPanels.tsx'));
});

describe('Reyting oynasi himoyali', () => {
  test('popular, houses, inviters yo‘q (eski server) — oyna chiziladi', () => {
    answers.rank = { districts: [] };
    answers.yards = {};
    const html = renderToString(createElement(RankPanel));
    expect(html).toContain('Reyting');
  });
  test('maydonlar null yoki noto‘g‘ri turda bo‘lsa ham', () => {
    answers.rank = { popular: null, houses: 'x', districts: undefined, inviters: {} };
    answers.yards = { winners: null };
    expect(() => renderToString(createElement(RankPanel))).not.toThrow();
  });
  test('listOf: faqat massiv o‘tadi', () => {
    expect(listOf([1, 2])).toEqual([1, 2]);
    expect(listOf(undefined)).toEqual([]);
    expect(listOf(null)).toEqual([]);
    expect(listOf({ length: 2 })).toEqual([]);
  });
});
