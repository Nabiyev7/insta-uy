/** 15-qadam (5): admin — Bezaklar bo'limining sof hisoblari. */
import { describe, expect, test } from 'vitest';
import { NO_FILTER, levelHint, tashkentIso, tashkentLocal, visibleRows, type DecorRow } from '../src/decor.ts';

const row = (id: string, over: Partial<DecorRow> = {}): DecorRow => ({
  id, slot: 'yard', model_id: id, name_uz: id, name_ru: id, price_uzs: 0, price_coins: 100, stock: null, sold: 0, min_level: 2, level_auto: true, season_from: null, season_to: null,
  set_id: null, is_new: false, is_active: true, is_archived: false, is_premium: false, tint: null, sort: 0, discount: null, ...over,
});
const ROWS = [row('a', { price_coins: 300, sold: 5, min_level: 3 }), row('b', { slot: 'car', price_coins: 50, min_level: 4 }), row('eski', { is_archived: true, is_active: false }),
  row('prem', { is_premium: true }), row('yashirin', { is_active: false })];

describe('ro‘yxat', () => {
  test('tablar: Bezaklar (arxiv va premiumsiz), Premium, Arxiv', () => {
    expect(visibleRows(ROWS, 'decor', NO_FILTER).map((r) => r.id)).toEqual(['a', 'b', 'yashirin']);
    expect(visibleRows(ROWS, 'premium', NO_FILTER).map((r) => r.id)).toEqual(['prem']);
    expect(visibleRows(ROWS, 'archive', NO_FILTER).map((r) => r.id)).toEqual(['eski']);
  });
  test('qidiruv, kategoriya, level, holat va tartib', () => {
    expect(visibleRows(ROWS, 'decor', { ...NO_FILTER, slot: 'car' }).map((r) => r.id)).toEqual(['b']);
    expect(visibleRows(ROWS, 'decor', { ...NO_FILTER, level: '3' }).map((r) => r.id)).toEqual(['a']);
    expect(visibleRows(ROWS, 'decor', { ...NO_FILTER, state: 'off' }).map((r) => r.id)).toEqual(['yashirin']);
    expect(visibleRows(ROWS, 'decor', { ...NO_FILTER, q: 'YASH' }).map((r) => r.id)).toEqual(['yashirin']);
    expect(visibleRows(ROWS, 'decor', { ...NO_FILTER, sort: 'price' }).map((r) => r.id)).toEqual(['b', 'yashirin', 'a']);
    expect(visibleRows(ROWS, 'decor', { ...NO_FILTER, sort: 'sold' })[0]!.id).toBe('a');
  });
});

describe('yangi tovar', () => {
  test('level taklifi narxdan va nuqtalardan (server qoidasi bilan bir xil)', () => {
    expect(levelHint(40, 'x', 'tree')).toBe(1);
    expect(levelHint(300, 'x', 'tree')).toBe(3);
    expect(levelHint(40, 'x', 'roof')).toBe(4);
    expect(levelHint(40, 'lux_x', 'yard')).toBe(5);
    expect(levelHint(900, 'sign_nick', 'sign')).toBe(1);
  });
  test('Toshkent vaqti (UTC+5) → ISO va qaytib', () => {
    expect(tashkentIso('2026-12-01T10:00')).toBe('2026-12-01T05:00:00.000Z');
    expect(tashkentLocal(0, Date.parse('2026-12-01T05:00:00Z'))).toBe('2026-12-01T10:00');
  });
});
