import { randomUUID } from 'node:crypto';
import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, test } from 'vitest';
import { openDb, rpc } from '../../server/dev/db.ts';

let db: PGlite;
let n = 0;
type Row = Record<string, unknown>;
const as = <T = unknown>(uid: string, fn: string, args: Row = {}): Promise<T> => rpc(db, 'authenticated', uid, fn, args) as Promise<T>;
const svc = <T = unknown>(fn: string, args: Row = {}): Promise<T> => rpc(db, 'service_role', null, fn, args) as Promise<T>;
const sql = async (q: string, p: unknown[] = []): Promise<Row[]> => (await db.query<Row>(q, p)).rows;
const flag = (key: string, v: unknown): Promise<Row[]> => sql('update settings set value = $2 where key = $1', [key, JSON.stringify(v)]);
const user = async (): Promise<{ uid: string; tg: number }> => {
  const uid = randomUUID();
  const tg = 970_000 + ++n;
  await svc('svc_profile_create', { p_user: uid, p_login: `premium${n}`, p_ref: null, p_telegram: tg, p_instagram: `premium_${n}` });
  return { uid, tg };
};
const freePlot = async (type = 'hovli'): Promise<string> =>
  (await sql("select id from plots p where type = $1 and district_id in (select id from districts where is_open) and not exists (select 1 from plot_state s where s.plot_id = p.id) order by id limit 1", [type]))[0]!.id as string;
const pay = async (order: string, amount: number, provider = 'card'): Promise<Row> => svc<Row>('svc_payment', { p_provider: provider, p_external: `x${++n}`, p_amount: amount, p_order: order });
const coinsOf = async (uid: string): Promise<number> => (await sql('select coins from profiles where user_id = $1', [uid]))[0]!.coins as number;

beforeAll(async () => { db = await openDb(); });

describe('to‘lov o‘chiq', () => {
  test('payments_enabled=false: buyurtma ham, Stars ham yo‘q', async () => {
    const { uid, tg } = await user();
    await expect(as(uid, 'my_order', { p_kind: 'coins', p_payload: { pack: 1 } })).rejects.toThrow('payments_off');
    await expect(svc('svc_stars_order', { p_telegram: tg, p_kind: 'coins', p_payload: { pack: 1 } })).rejects.toThrow('payments_off');
  });
});

describe('premium (to‘lov yoqilgan)', () => {
  beforeAll(async () => { await flag('payments_enabled', true); });

  test('tanga paketi: narx serverda, to‘langach tanga + bonus', async () => {
    const { uid } = await user();
    expect(await as(uid, 'my_quote', { p_kind: 'coins', p_payload: { pack: 2 } })).toBe(25000);
    await expect(as(uid, 'my_quote', { p_kind: 'coins', p_payload: { pack: 9 } })).rejects.toThrow('not_found');
    const o = await as<Row>(uid, 'my_order', { p_kind: 'coins', p_payload: { pack: 2 } });
    const before = await coinsOf(uid);
    expect(await pay(o.id as string, o.amount as number)).toMatchObject({ result: 'paid' });
    expect(await coinsOf(uid)).toBe(before + 3300);
  });

  test('Stars: bot buyurtmasi yulduzda, tekshiruv va to‘lov', async () => {
    const { uid, tg } = await user();
    const o = await svc<Row>('svc_stars_order', { p_telegram: tg, p_kind: 'coins', p_payload: { pack: 1 } });
    expect(o).toMatchObject({ stars: 50, title: '1000 tanga' });
    expect(await svc('svc_stars_check', { p_order: o.id, p_telegram: tg, p_stars: 50 })).toBe(true);
    expect(await svc('svc_stars_check', { p_order: o.id, p_telegram: tg, p_stars: 49 })).toBe(false);
    expect(await svc('svc_stars_check', { p_order: o.id, p_telegram: tg + 1, p_stars: 50 })).toBe(false);
    // Ikki kishi bir xil yulduz summasi bilan bir vaqtda buyurtma bera oladi.
    const other = await user();
    await svc('svc_stars_order', { p_telegram: other.tg, p_kind: 'coins', p_payload: { pack: 1 } });
    const before = await coinsOf(uid);
    expect(await pay(o.id as string, 50, 'stars')).toMatchObject({ result: 'paid' });
    expect(await coinsOf(uid)).toBe(before + 1000);
  });

  test('premium uy: darhol tanlangan level, bir nechta; villa qimmatroq', async () => {
    const { uid } = await user();
    expect(await as(uid, 'my_quote', { p_kind: 'plot', p_payload: { plot: await freePlot(), tier: 3 } })).toBe(30000);
    expect(await as(uid, 'my_quote', { p_kind: 'plot', p_payload: { plot: await freePlot(), tier: 5 } })).toBe(60000);
    await expect(as(uid, 'my_quote', { p_kind: 'plot', p_payload: { plot: await freePlot(), tier: 6 } })).rejects.toThrow('bad_format');
    for (const tier of [5, 3]) {
      const plot = await freePlot();
      const o = await as<Row>(uid, 'my_order', { p_kind: 'plot', p_payload: { plot, tier } });
      await pay(o.id as string, o.amount as number);
      expect((await sql('select tier, status, is_free from plot_state where plot_id = $1', [plot]))[0]).toEqual({ tier, status: 'owned', is_free: false });
    }
    const villa = (await sql("select id from plots p where type = 'villa' and district_id in (select id from districts where is_open) and not exists (select 1 from plot_state s where s.plot_id = p.id) limit 1"))[0];
    if (villa) await expect(as(uid, 'my_quote', { p_kind: 'plot', p_payload: { plot: villa.id, tier: 3 } })).resolves.toBeGreaterThanOrEqual(70000);
  });

  test('pulga olingan bezak 1-level uyda: pulli nuqtaga qo‘yiladi, tangaga olingani — yo‘q', async () => {
    const { uid } = await user();
    const plot = await freePlot();
    await as(uid, 'my_claim', { p_plot: plot });
    expect(await as(uid, 'my_quote', { p_kind: 'decor', p_payload: { id: 'avto_sedan' } })).toBe(20000);
    const o = await as<Row>(uid, 'my_order', { p_kind: 'decor', p_payload: { id: 'avto_sedan' } });
    await pay(o.id as string, o.amount as number);
    expect(await as(uid, 'my_paid_decor')).toEqual({ avto_sedan: 1 });
    await as(uid, 'my_place_decor', { p_plot: plot, p_places: { garaj_oldi: 'avto_sedan' } });
    // Tangaga olingan nusxa 1-level uyga qo'yilmaydi.
    await sql("update owned_decor set qty = qty + 1 where user_id = $1 and decor_id = 'avto_sedan'", [uid]);
    await expect(as(uid, 'my_place_decor', { p_plot: plot, p_places: { garaj_oldi: 'avto_sedan', burchak_1: 'daraxt_olma' } })).rejects.toThrow();
    // Pulli nuqtasi bo'lmagan joyga (darvoza) — yo'q.
    await sql("insert into owned_decor (user_id, decor_id, qty, paid) values ($1, 'gate_carved', 1, 1)", [uid]);
    await expect(as(uid, 'my_place_decor', { p_plot: plot, p_places: { garaj_oldi: 'avto_sedan', gate: 'gate_carved' } })).rejects.toThrow('level_low');
  });

  test('salyut: tanga yoki pulga, navbat bilan, so‘z filtri', async () => {
    const { uid } = await user();
    await sql('update profiles set coins = 5000 where user_id = $1', [uid]);
    await expect(as(uid, 'my_salute_coins', { p_text: 'https://reklama.uz' })).rejects.toThrow('no_links');
    const r = await as<Row>(uid, 'my_salute_coins', { p_text: 'Tug‘ilgan kuning bilan!' });
    expect(r.coins).toBe(3000);
    expect(await svc('api_salute')).toMatchObject({ text: 'Tug‘ilgan kuning bilan!' });
    const o = await as<Row>(uid, 'my_order', { p_kind: 'salute', p_payload: { text: 'Ikkinchi salyut' } });
    await pay(o.id as string, o.amount as number);
    expect((await sql('select count(*)::int n from salutes where starts_at > now()'))[0]!.n).toBeGreaterThanOrEqual(1);
  });

  test('qaytarish: faqat admin; tanga paketi qaytarilsa tanga olinadi', async () => {
    const { uid } = await user();
    const admin = await user();
    await sql("update profiles set role = 'admin' where user_id = $1", [admin.uid]);
    const o = await as<Row>(uid, 'my_order', { p_kind: 'coins', p_payload: { pack: 1 } });
    await pay(o.id as string, o.amount as number);
    const payment = (await sql('select id from payments where order_id = $1', [o.id]))[0]!.id as number;
    await expect(svc('svc_refund_target', { p_user: uid, p_payment: payment })).rejects.toThrow('forbidden');
    expect(await svc('svc_refund_target', { p_user: admin.uid, p_payment: payment })).toMatchObject({ provider: 'card' });
    const before = await coinsOf(uid);
    await as(admin.uid, 'admin_payment', { p_id: payment, p_action: 'refunded' });
    expect(await coinsOf(uid)).toBe(before - 1000);
    expect((await sql('select status from orders where id = $1', [o.id]))[0]!.status).toBe('refunded');
    await expect(as(admin.uid, 'admin_payment', { p_id: payment, p_action: 'refunded' })).rejects.toThrow('already_claimed');
  });
});
