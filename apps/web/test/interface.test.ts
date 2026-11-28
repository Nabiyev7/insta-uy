import { readFileSync } from 'node:fs';
import { existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { BADGES, DECOR, plotAddress, type Plot } from '../../../packages/shared/src/index.ts';
import { nextCard, type CardInput } from '../src/logic/cards.ts';
import type { CatalogRow, SetRow } from '../src/logic/decorCatalog.ts';
import { findAddress } from '../src/logic/search.ts';
import { goodState, premiumTabs, shopTabs } from '../src/logic/shopTabs.ts';

const row = (id: string, over: Partial<CatalogRow> = {}): CatalogRow => {
  const d = DECOR.find((x) => x.id === id)!;
  return { id, slot: d.slot, model: d.model, uz: d.uz, ru: d.ru, uzs: d.priceUzs, coins: d.priceCoins, left: d.stock, spots: d.spots, min: d.minLevel, from: null, to: null, set: null, isNew: false, tint: null, onSale: d.isActive, active: d.isActive, ...over };
};

describe('pastdagi karta', () => {
  const base: CardInput = { isCity: true, isGuest: false, hasHouse: true, isDailyReady: true, hasCheer: true, hasTreasure: true, hasFresh: true };
  test('ustuvorlik: tabrik → kunlik bonus → xazina → yangi bezak', () => {
    expect(nextCard(base)).toBe('cheer');
    expect(nextCard({ ...base, hasCheer: false })).toBe('daily');
    expect(nextCard({ ...base, hasCheer: false, isDailyReady: false })).toBe('treasure');
    expect(nextCard({ ...base, hasCheer: false, isDailyReady: false, hasTreasure: false })).toBe('fresh');
    expect(nextCard({ ...base, hasCheer: false, isDailyReady: false, hasTreasure: false, hasFresh: false })).toBeNull();
  });
  test('mehmon va uysiz odamga — bepul uy', () => {
    expect(nextCard({ ...base, isGuest: true })).toBe('free');
    expect(nextCard({ ...base, hasCheer: false, hasHouse: false })).toBe('free');
  });
  test('piyoda va mashinada faqat hozirgi voqea', () => {
    expect(nextCard({ ...base, isCity: false })).toBe('cheer');
    expect(nextCard({ ...base, isCity: false, hasCheer: false })).toBe('treasure');
    expect(nextCard({ ...base, isCity: false, hasCheer: false, hasTreasure: false })).toBeNull();
    expect(nextCard({ ...base, isCity: false, isGuest: true })).toBeNull();
  });
});

describe('do‘kon tablari', () => {
  const all = DECOR.map((d) => row(d.id));
  const sets: readonly SetRow[] = [{ id: 'a', uz: 'A', ru: 'A', discount: 20, coins: 1, items: ['dam_mangal', 'gul_zor'] }, { id: 'b', uz: 'B', ru: 'B', discount: 20, coins: 1, items: ['water_pool'] }, { id: 'c', uz: 'C', ru: 'C', discount: 20, coins: 1, items: [] }];
  const ids = (tab: string, list = all): readonly string[] => shopTabs(list, sets).find((t) => t.tab === tab)?.rows.map((c) => c.id) ?? [];
  test('har tovar kamida bitta bo‘limda, bo‘limlar tartibi', () => {
    const tabs = shopTabs([...all.slice(1), row('fence_wood', { isNew: true })], sets);
    expect(tabs.map((t) => t.tab)).toEqual(['new', 'yard', 'garden', 'car', 'luxe', 'pet', 'set', 'special']);
    const shown = new Set(tabs.flatMap((t) => t.rows.map((c) => c.id)));
    for (const c of all.filter((x) => x.onSale)) expect(shown.has(c.id), c.id).toBe(true);
  });
  test('bo‘sh bo‘lim ko‘rsatilmaydi, sotuvdagisi yo‘q to‘plam ham', () => {
    expect(shopTabs(all, sets).some((t) => t.tab === 'new')).toBe(false);
    expect(shopTabs([], sets)).toEqual([]);
    expect(shopTabs(all, sets).find((t) => t.tab === 'set')?.sets.map((s) => s.id)).toEqual(['a']);
  });
  test('gulzor — bog‘da, lyuks — o‘z bo‘limida ham, "Lyuks" da ham', () => {
    expect(ids('garden')).toEqual(expect.arrayContaining(['gul_zor', 'gul_kamar', 'daraxt_olma', 'lux_daraxt']));
    expect(ids('yard')).not.toContain('gul_zor');
    expect(ids('yard')).toEqual(expect.arrayContaining(['dam_basseyn', 'dam_mangal', 'suv_hovuz', 'lux_pavilyon']));
    expect(ids('luxe')).toEqual(expect.arrayContaining(['lux_pavilyon', 'lux_superkar', 'lux_daraxt']));
    expect(ids('luxe')).not.toContain('gate_gold');
    expect(ids('luxe')).not.toContain('dam_basseyn');
    expect(ids('car')).toEqual(expect.arrayContaining(['avto_sedan', 'lux_limuzin']));
    expect(ids('yard')).toEqual(expect.arrayContaining(['fence_wood', 'gate_wood', 'path_stone', 'sign_nick', 'light_lamps', 'roof_solar']));
  });
  test('mavsumi tugagani va sotuvdan olingani do‘konda ko‘rinmaydi (admin panelda bor)', () => {
    const list = [row('light_hayit', { from: '2026-05-10', to: '2026-05-31', onSale: false, active: true }), row('light_lamps'), row('water_pool')];
    expect(ids('yard', list)).toEqual(['light_lamps']);
    expect(ids('special', list)).toEqual([]);
    expect(shopTabs(list, []).flatMap((t) => t.rows.map((c) => c.id))).not.toContain('water_pool');
  });
  test('premium tovar: tanga do‘konida yo‘q, Premium bo‘limida; 4 tab doim; level qulfi yo‘q', () => {
    const list = [row('dam_basseyn', { premium: true }), row('avto_sedan', { premium: true }), row('gul_zor')];
    expect(shopTabs(list, sets).flatMap((t) => t.rows.map((c) => c.id))).toEqual(['gul_zor']);
    expect(shopTabs(list, sets).find((t) => t.tab === 'set')).toBeUndefined();
    const p = premiumTabs(list);
    expect(p.map((t) => t.tab)).toEqual(['houses', 'decor', 'cars', 'packs']);
    expect(p.map((t) => t.rows.map((c) => c.id))).toEqual([[], ['dam_basseyn'], ['avto_sedan'], []]);
    expect(goodState(row('dam_basseyn', { premium: true }), 1)).toBe('free');
  });
  test('admin sinov rejimida level qulfi yo‘q', () => {
    expect(goodState(row('lux_pavilyon'), 1, true)).toBe('free');
    expect(goodState(row('lux_pavilyon'), 1, false)).toBe('locked');
  });
  test('kartochka holati', () => {
    expect(goodState(row('dam_basseyn'), 5)).toBe('free');
    expect(goodState(row('dam_basseyn'), 4)).toBe('locked');
    expect(goodState(row('lux_jip'), 4)).toBe('locked');
    expect(goodState(row('lux_jip'), 5)).toBe('free');
    expect(goodState(row('special_peacock', { left: 0 }), 10)).toBe('soldOut');
    expect(goodState(row('light_hayit', { onSale: false }), 10)).toBe('seasonOver');
  });
});

describe('manzil qidiruvi', () => {
  const plots = [[1, 5], [1, 15], [12, 5]].map(([street, number], i): Plot => ({ id: `P${i}`, type: 'hovli', districtId: 1, streetId: street!, number: number!, unit: 0, x: 0, z: 0, w: 24, d: 34, rot: 0, value: 1, building: null } as unknown as Plot));
  const find = (q: string): readonly string[] => findAddress(q, plots, (p) => plotAddress(p, p.streetId === 12 ? 'Chinor' : undefined, 'uz')).map((p) => p.id);
  test('ko‘cha va uy raqami, nom; son to‘liq mos', () => {
    expect(find('1-ko‘cha 5')).toEqual(['P0']);
    expect(find('Chinor')).toEqual(['P2']);
    expect(find('chinor 5')).toEqual(['P2']);
    expect(find('15')).toEqual(['P1']);
    expect(find('a')).toEqual([]);
    expect(find('')).toEqual([]);
  });
});

describe('interfeys fayllari', () => {
  const src = fileURLToPath(new URL('../src', import.meta.url));
  const files = readdirSync(src, { recursive: true, encoding: 'utf8' }).filter((f) => /\.(tsx?|css)$/.test(f));
  test('emoji yo‘q — hamma belgi bitta to‘plamdan', () => {
    // Yagona istisno: app/shareText.ts — boshqa ilovalarga ketadigan ulashish xabari (egasining matni), saytda ko'rinmaydi.
    const isShareText = (f: string): boolean => f.replace(/\\/g, '/') === 'app/shareText.ts';
    for (const f of files.filter((x) => !isShareText(x))) expect(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]/u.exec(readFileSync(`${src}/${f}`, 'utf8'))?.[0], f).toBeUndefined();
    // U faylda interfeys yo'q (faqat matn funksiyalari).
    expect(readFileSync(`${src}/app/shareText.ts`, 'utf8')).not.toMatch(/useT|className|React/);
    for (const b of Object.values(BADGES)) expect(Object.keys(b)).toEqual(['uz', 'ru']);
  });
  test('har bezak modelining 3D rasmi bor', () => {
    for (const d of DECOR) expect(existsSync(fileURLToPath(new URL(`../public/assets/decor/${d.model}.webp`, import.meta.url))), d.model).toBe(true);
  });
});
