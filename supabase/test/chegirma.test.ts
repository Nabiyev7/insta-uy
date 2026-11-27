/** 15-qadam (4): chegirmalar — narx serverda, muddat bilan, bir tovarga bitta. */
import { randomUUID } from 'node:crypto';
import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, test } from 'vitest';
import { openDb, rpc } from '../../server/dev/db.ts';

let db: PGlite;
let n = 0;
type Row = Record<string, unknown>;
const as = <T = unknown>(uid: string, fn: string, args: Row = {}): Promise<T> => rpc(db, 'authenticated', uid, fn, args) as Promise<T>;
const anon = <T = unknown>(fn: string): Promise<T> => rpc(db, 'anon', null, fn, {}) as Promise<T>;
const sql = async (q: string, p: unknown[] = []): Promise<Row[]> => (await db.query<Row>(q, p)).rows;
const user = async (role = 'user'): Promise<string> => {
  const uid = randomUUID();
  await rpc(db, 'service_role', null, 'svc_profile_create', { p_user: uid, p_login: `chegirma${++n}`, p_ref: null, p_telegram: 770_000 + n, p_instagram: `chegirma_${n}` });
  await sql('update profiles set role = $2, coins = 10000 where user_id = $1', [uid, role]);
  return uid;
};
const withHouse = async (tier: number): Promise<string> => {
  const uid = await user();
  const plot = (await sql("select id from plots p where district_id = 1 and type = 'hovli' and not exists (select 1 from plot_state s where s.plot_id = p.id) order by id limit 1"))[0]!.id;
  await sql("insert into plot_state (plot_id, status, owner, instagram, tier) values ($1, 'owned', $2, 'x', $3)", [plot, uid, tier]);
  return uid;
};
const coins = async (uid: string): Promise<number> => (await sql('select coins from profiles where user_id = $1', [uid]))[0]!.coins as number;
const iso = (minutes: number): string => new Date(Date.now() + minutes * 60_000).toISOString();
const item = async (id: string): Promise<Row> => (await anon<Row[]>('api_catalog')).find((c) => c.id === id)!;

beforeAll(async () => { db = await openDb(); });

describe('chegirma', () => {
  test('muddat ichida: katalogda yangi narx, eski narx va foiz; xarid serverdagi chegirmali narxda', async () => {
    const admin = await user('admin');
    expect(await as(admin, 'admin_discount_set', { p_ids: ['dam_stol'], p_pct: 30, p_starts: iso(-1), p_ends: iso(60) })).toBe(1);
    expect(await item('dam_stol')).toMatchObject({ coins: 180, oldCoins: 250, sale: 30 });
    const buyer = await withHouse(3);
    await as(buyer, 'my_buy_decor_coins', { p_id: 'dam_stol' });
    expect(await coins(buyer)).toBe(10000 - 180);
  });
  test('muddat tashqarisida (hali boshlanmagan / tugagan) — eski narx', async () => {
    const admin = await user('admin');
    await as(admin, 'admin_discount_set', { p_ids: ['dam_mangal'], p_pct: 50, p_starts: iso(60), p_ends: iso(120) });
    expect(await item('dam_mangal')).toMatchObject({ coins: 200 });
    expect(await item('dam_mangal')).not.toHaveProperty('sale');
    await sql("insert into decor_discounts (decor_id, pct, starts_at, ends_at) values ('dam_besedka', 40, now() - interval '2 hours', now() - interval '1 hour')");
    expect(await item('dam_besedka')).toMatchObject({ coins: 300 });
    const buyer = await withHouse(3);
    await as(buyer, 'my_buy_decor_coins', { p_id: 'dam_mangal' });
    expect(await coins(buyer)).toBe(10000 - 200);
  });
  test('bir tovarga bir vaqtda bitta; noto‘g‘ri foiz va muddat — rad; oddiy odam qo‘ya olmaydi', async () => {
    const admin = await user('admin');
    await as(admin, 'admin_discount_set', { p_ids: ['yard_batut'], p_pct: 20, p_starts: iso(-1), p_ends: iso(60) });
    await expect(as(admin, 'admin_discount_set', { p_ids: ['yard_batut'], p_pct: 10, p_starts: iso(30), p_ends: iso(90) })).rejects.toThrow('discount_overlap');
    await expect(as(admin, 'admin_discount_set', { p_ids: ['pet_dog'], p_pct: 95, p_starts: iso(-1), p_ends: iso(60) })).rejects.toThrow('bad_format');
    await expect(as(admin, 'admin_discount_set', { p_ids: ['pet_dog'], p_pct: 4, p_starts: iso(-1), p_ends: iso(60) })).rejects.toThrow('bad_format');
    await expect(as(admin, 'admin_discount_set', { p_ids: ['pet_dog'], p_pct: 20, p_starts: iso(60), p_ends: iso(30) })).rejects.toThrow('bad_format');
    await expect(as(admin, 'admin_discount_set', { p_ids: ['yoq_tovar'], p_pct: 20, p_starts: iso(-1), p_ends: iso(60) })).rejects.toThrow('not_found');
    await expect(as(await user(), 'admin_discount_set', { p_ids: ['pet_dog'], p_pct: 20, p_starts: iso(-1), p_ends: iso(60) })).rejects.toThrow('forbidden');
    const list = await as<Row[]>(admin, 'admin_discounts');
    const batut = list.find((d) => d.decor === 'yard_batut')!;
    expect(batut).toMatchObject({ pct: 20, state: 'live' });
    await as(admin, 'admin_discount_delete', { p_id: batut.id });
    expect(await item('yard_batut')).not.toHaveProperty('sale');
  });
  test('mijoz narx yubora olmaydi: xarid funksiyasida narx argumenti yo‘q; chegirma jadvali mijozga yopiq', async () => {
    const args = (await sql("select pg_get_function_arguments(oid) a from pg_proc where proname = 'my_buy_decor_coins'"))[0]!.a;
    expect(args).toBe('p_id text');
    await expect(rpc(db, 'anon', null, 'admin_discounts', {})).rejects.toThrow();
  });
});
