/** 15-qadam (4): do'kondagi chegirma bo'limi va qolgan vaqt. */
import { describe, expect, test } from 'vitest';
import type { CatalogRow } from '../src/logic/decorCatalog.ts';
import { isOnSale, timeLeft } from '../src/logic/sale.ts';
import { shopTabs } from '../src/logic/shopTabs.ts';

const W = { day: 'kun', hour: 'soat', min: 'daqiqa' };
const row = (id: string, over: Partial<CatalogRow> = {}): CatalogRow => ({ id, slot: 'yard', model: id, uz: id, ru: id, uzs: 0, coins: 100, left: null, spots: ['left'], min: 1, from: null, to: null, set: null, isNew: false, tint: null, onSale: true, active: true, ...over });

describe('chegirma', () => {
  test('qolgan vaqt: "2 kun 5 soat", "3 soat 10 daqiqa", "7 daqiqa"', () => {
    const now = Date.parse('2026-11-27T10:00:00Z');
    const at = (mins: number): string => new Date(now + mins * 60_000).toISOString();
    expect(timeLeft(at(2 * 1440 + 5 * 60 + 20), now, W)).toBe('2 kun 5 soat');
    expect(timeLeft(at(3 * 60 + 10), now, W)).toBe('3 soat 10 daqiqa');
    expect(timeLeft(at(7), now, W)).toBe('7 daqiqa');
    expect(timeLeft(at(-5), now, W)).toBe('1 daqiqa');
  });
  test('"Chegirmalar" tabi birinchi va faqat chegirma bor bo‘lsa; tugagani hisobga olinmaydi', () => {
    const later = new Date(Date.now() + 3_600_000).toISOString();
    const past = new Date(Date.now() - 60_000).toISOString();
    expect(shopTabs([row('a'), row('b', { isNew: true })], []).map((t) => t.tab)).not.toContain('sale');
    const tabs = shopTabs([row('a', { sale: 30, saleEnds: later, oldCoins: 150 }), row('b', { isNew: true, sale: 20, saleEnds: past })], []);
    expect(tabs[0]).toMatchObject({ tab: 'sale' });
    expect(tabs[0]!.rows.map((r) => r.id)).toEqual(['a']);
    expect(isOnSale({ sale: 10, saleEnds: past })).toBe(false);
  });
});
