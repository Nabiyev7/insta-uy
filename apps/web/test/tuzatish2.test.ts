import { describe, expect, test, vi } from 'vitest';
import type { Plot } from '../../../packages/shared/src/index.ts';
import { NEWS_GAP_MS, WAITING_MAX, countLine, newNeighbourNick, waitingPlots } from '../src/logic/lively.ts';

vi.mock('../src/app/api.ts', () => ({ rpc: vi.fn() }));
const { analyticsTag, parseSource } = await import('../src/app/analytics.ts');

const plot = (id: string, x: number, z: number, districtId = 1, type: Plot['type'] = 'hovli'): Plot => ({ id, x, z, districtId, type } as unknown as Plot);

describe('bo‘sh shahar', () => {
  test('markazga eng yaqin bo‘sh joylar: ochiq tuman, bepul tur, olinmagan; ko‘pi bilan 20', () => {
    const plots = [plot('A', 300, 0), plot('B', 10, 0), plot('C', 20, 0, 2), plot('D', 30, 0, 1, 'villa'), plot('E', 40, 0), ...Array.from({ length: 30 }, (_, i) => plot(`F${i}`, 500 + i, 0))];
    const list = waitingPlots(plots, new Set(['E']), new Set([1]));
    expect(list.slice(0, 2).map((p) => p.id)).toEqual(['B', 'A']);
    expect(list).toHaveLength(WAITING_MAX);
    expect(list.some((p) => ['C', 'D', 'E'].includes(p.id))).toBe(false);
  });
  test('hisoblagich: 0 bo‘lsa — "Birinchilardan bo‘ling!"', () => {
    const words = { today: 'Bugun {n} kishi uy oldi · jami {m}', first: 'Birinchilardan bo‘ling!' };
    expect(countLine({ today: 0, total: 0 }, words)).toBe('Birinchilardan bo‘ling!');
    expect(countLine(undefined, words)).toBe('Birinchilardan bo‘ling!');
    expect(countLine({ today: 3, total: 12 }, words)).toBe('Bugun 3 kishi uy oldi · jami 12');
  });
  test('"@nik hozirgina uy oldi": yangi va o‘zimniki emas; daqiqasiga ko‘pi bilan 1', () => {
    const before = new Map([['A', { nick: 'eski' }]]);
    const after = new Map([['A', { nick: 'eski' }], ['M', { nick: 'men' }], ['B', { nick: 'yangi' }]]);
    expect(newNeighbourNick(before, after, new Set(['M']), 0, NEWS_GAP_MS + 1)).toBe('yangi');
    expect(newNeighbourNick(before, after, new Set(['M']), 1000, 1000 + NEWS_GAP_MS - 1)).toBeNull();
    expect(newNeighbourNick(null, after, new Set(), 0, NEWS_GAP_MS + 1)).toBeNull();
    expect(newNeighbourNick(new Map(), new Map([['B', { nick: 'birinchi' }]]), new Set(), 0, NEWS_GAP_MS + 1)).toBe('birinchi');
  });
});

describe('analitika', () => {
  test('token bo‘lmasa yoki noto‘g‘ri bo‘lsa skript qo‘shilmaydi', () => {
    expect(analyticsTag(undefined)).toBeNull();
    expect(analyticsTag('')).toBeNull();
    expect(analyticsTag('"><script>')).toBeNull();
    expect(analyticsTag('abc123def456')).toEqual({ src: 'https://static.cloudflareinsights.com/beacon.min.js', beacon: '{"token":"abc123def456"}' });
  });
  test('kelish manbai: ?from=bio, ?from=reels', () => {
    expect(parseSource('bio')).toBe('bio');
    expect(parseSource('Reels')).toBe('reels');
    expect(parseSource(null)).toBeNull();
    expect(parseSource('x y')).toBeNull();
  });
});
