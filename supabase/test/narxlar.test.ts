/** 15-qadam (TUZATISH-6): narxlar × 0,5, yaxlitlash, to'plam, level, paketlar. Baza va mijoz qoidasi bir xil. */
import { readFileSync } from 'node:fs';
import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, test } from 'vitest';
import { DECOR, TIER_COINS } from '../../packages/shared/src/catalog.ts';
import { halfPrice, levelForPrice, roundPrice } from '../../packages/shared/src/pricing.ts';
import { randomUUID } from 'node:crypto';
import { ANCHORS, DEFAULT_DECOR_SLOTS } from '../../packages/shared/src/anchors.ts';
import { openDb, rpc } from '../../server/dev/db.ts';

let db: PGlite;
type Row = Record<string, unknown>;
const sql = async (q: string, p: unknown[] = []): Promise<Row[]> => (await db.query<Row>(q, p)).rows;
/** Egasi jadvali (docs/chat/TUZATISH-6.md, 6-band): id → [hozir, yangi, level]. */
const TABLE = readFileSync(new URL('../../docs/chat/TUZATISH-6.md', import.meta.url), 'utf8').split('\n')
  .filter((l) => /^\| .* \| `[a-z_]+` \|/.test(l)).map((l) => l.split('|').map((x) => x.trim()))
  .map((c) => ({ id: c[2]!.replace(/`/g, ''), old: Number(c[3]), price: Number(c[4]), level: Number(c[5]) }));

beforeAll(async () => { db = await openDb(); });

describe('yaxlitlash', () => {
  test('1 000 gacha — 10 ga, 1 000–9 999 — 50 ga, 10 000 dan — 500 ga; o‘rtada — juftga (75 → 80, 225 → 220)', () => {
    expect([roundPrice(44), roundPrice(75), roundPrice(225), roundPrice(1234), roundPrice(1275), roundPrice(12_300), roundPrice(12_250)]).toEqual([40, 80, 220, 1250, 1300, 12_500, 12_000]);
  });
  test('baza (`private.round_price`) va mijoz qoidasi bir xil', async () => {
    const xs = [5, 15, 25, 35, 75, 125, 225, 333, 999, 1000, 1025, 1075, 4975, 9999, 10_000, 10_250, 10_750, 33_333];
    const db_ = (await sql(`select x, private.round_price(x) r from unnest($1::numeric[]) x`, [xs])).map((r) => Number(r.r));
    expect(db_).toEqual(xs.map(roundPrice));
  });
});

describe('egasi jadvali', () => {
  test('63 ta tovar: yangi narx = eski × 0,5 (qoida bilan), bazada va katalog standartida shu narx', async () => {
    expect(TABLE.length).toBe(63);
    const db_ = Object.fromEntries((await sql('select id, price_coins from decor_catalog')).map((r) => [r.id, r.price_coins]));
    for (const t of TABLE) {
      expect(halfPrice(t.old), t.id).toBe(t.price);
      expect(db_[t.id], t.id).toBe(t.price);
      expect(DECOR.find((d) => d.id === t.id)?.priceCoins, t.id).toBe(t.price);
    }
  });
  test('jadvalda yo‘q (arxiv) tovarlar ham shu qoida bilan', async () => {
    const rows = await sql('select id, price_coins from decor_catalog where not is_active');
    for (const r of rows) expect(DECOR.find((d) => d.id === r.id)?.priceCoins, r.id as string).toBe(r.price_coins);
    expect(rows.length).toBeGreaterThanOrEqual(13);
  });
  test('yangi tovar uchun level qoidasi (≤75 → 1, ≤150 → 2, ≤325 → 3, ≤725 → 4, undan qimmat va lux_* → 5; nik lavhasi — 1)', () => {
    expect([40, 75, 76, 150, 151, 325, 326, 725, 726].map((c) => levelForPrice(c))).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 5]);
    expect(levelForPrice(10, 'lux_yangi')).toBe(5);
    expect(levelForPrice(500, 'sign_nick')).toBe(1);
  });
});

describe('uy leveli, salyut, to‘plam, paketlar', () => {
  test('kuchaytirish 150 / 500 / 1 000 / 1 750; salyut 1 000 tanga', async () => {
    const s = Object.fromEntries((await sql("select key, value from settings where key in ('coins','premium')")).map((r) => [r.key, r.value])) as Record<string, Row>;
    expect(s.coins!.tier).toEqual({ 2: 150, 3: 500, 4: 1000, 5: 1750 });
    expect(TIER_COINS).toEqual({ 2: 150, 3: 500, 4: 1000, 5: 1750 });
    expect((s.premium!.salute as Row).coins).toBe(1000);
  });
  test('paketlar: 5 000 — 50 ⭐, 12 000 — 100 ⭐ (Ommabop), 28 000 — 200 ⭐ (Eng foydali); Stars ≥ 50', async () => {
    const packs = ((await sql("select value from settings where key = 'premium'"))[0]!.value as { packs: Row[] }).packs;
    expect(packs.map((p) => [Number(p.coins) + Number(p.bonus), p.stars, p.tag ?? null])).toEqual([[5000, 50, null], [12_000, 100, 'popular'], [28_000, 200, 'best']]);
    for (const p of packs) expect(Number(p.stars)).toBeGreaterThanOrEqual(50);
  });
  test('to‘plam narxi — sotuvdagi tarkib yig‘indisidan 20%; arxiv tovar to‘plamda yo‘q', async () => {
    for (const s of await sql("select id, private.set_price(id) v from decor_sets where is_active")) {
      const sum = Number((await sql('select sum(price_coins) s from decor_catalog where set_id = $1 and is_active', [s.id]))[0]!.s);
      expect(s.v, s.id as string).toBe(roundPrice(sum * 0.8));
    }
    expect(await sql('select id from decor_catalog where set_id is not null and not is_active')).toEqual([]);
  });
});

describe('level (2-band) va joylar (3-band)', () => {
  const admin = async (): Promise<string> => {
    const uid = randomUUID();
    await rpc(db, 'service_role', null, 'svc_profile_create', { p_user: uid, p_login: `lv${Date.now()}`, p_ref: null, p_telegram: 880_000 + Math.floor(Math.random() * 9999), p_instagram: null });
    await sql("update profiles set role = 'admin' where user_id = $1", [uid]);
    return uid;
  };
  const as = (uid: string, fn: string, args: Row): Promise<unknown> => rpc(db, 'authenticated', uid, fn, args);
  const row = async (id: string): Promise<Row> => (await sql('select min_level, level_auto, price_coins from decor_catalog where id = $1', [id]))[0]!;

  test('bazada va katalog standartida level — egasi jadvali', async () => {
    const db_ = Object.fromEntries((await sql('select id, min_level from decor_catalog')).map((r) => [r.id, r.min_level]));
    for (const t of TABLE) {
      expect(db_[t.id], t.id).toBe(t.level);
      expect(DECOR.find((d) => d.id === t.id)?.minLevel, t.id).toBe(t.level);
    }
  });
  test('jadval qoidadan farq qilsa — "qo‘lda" (avto emas), aks holda "avto"', async () => {
    expect(await row('tree_chinor')).toMatchObject({ min_level: 1, level_auto: false });
    expect(await row('yard_tandir')).toMatchObject({ min_level: 3, level_auto: false });
    expect(await row('fence_brick')).toMatchObject({ min_level: 2, level_auto: true });
    expect(await row('lux_jip')).toMatchObject({ min_level: 5, level_auto: true });
  });
  test('nuqta istisnosi: nuqtasi pastroq levelda ochilmagan tovar — max(narx, nuqta)', async () => {
    const roof = (await sql("select private.auto_level(40, 'yangi_tom', '{roof}') v"))[0]!.v;
    const corner = (await sql("select private.auto_level(40, 'yangi_daraxt', '{corner}') v"))[0]!.v;
    expect([roof, corner]).toEqual([4, 1]);
    expect(await sql("select id from decor_catalog where level_auto and min_level < private.level_for_price(price_coins, id)")).toEqual([]);
    // Qo'lda qo'yilgan (jadval) levellar ham tovar nuqtasi ochiladigan leveldan past emas.
    expect(await sql("select id from decor_catalog where id <> 'sign_nick' and min_level < private.spot_level(spots)")).toEqual([]);
  });
  test('admin: level qo‘lda — saqlanadi (narx o‘zgarsa ham); "Avtomatik" — narxdan qaytadi; narx o‘zgarsa avto level ham', async () => {
    const a = await admin();
    await as(a, 'admin_decor_save', { p: { id: 'fence_brick', min_level: 5 } });
    expect(await row('fence_brick')).toMatchObject({ min_level: 5, level_auto: false });
    await as(a, 'admin_decor_save', { p: { id: 'fence_brick', price_coins: 40 } });
    expect(await row('fence_brick')).toMatchObject({ min_level: 5, price_coins: 40 });
    await as(a, 'admin_decor_save', { p: { id: 'fence_brick', level_auto: true } });
    expect(await row('fence_brick')).toMatchObject({ min_level: 1, level_auto: true });
    await as(a, 'admin_decor_save', { p: { id: 'fence_brick', price_coins: 130 } });
    expect(await row('fence_brick')).toMatchObject({ min_level: 2, level_auto: true });
    expect(await as(a, 'admin_level_hint', { p_coins: 300, p_id: 'yangi', p_spots: ['corner'] })).toBe(3);
  });
  test('joylar soni 2 / 4 / 6 / 10 / 16; nuqtalar levellari bazada va kodda bir xil', async () => {
    expect((await sql("select value from settings where key = 'decor_slots'"))[0]!.value).toEqual([...DEFAULT_DECOR_SLOTS]);
    const db_ = Object.fromEntries((await sql('select id, min_level from decor_anchors')).map((r) => [r.id, r.min_level]));
    for (const x of ANCHORS) expect(db_[x.id], x.id).toBe(x.minLevel);
  });
});
