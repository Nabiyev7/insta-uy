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
const user = async (role = 'user'): Promise<string> => {
  const uid = randomUUID();
  await svc('svc_profile_create', { p_user: uid, p_login: `sinovchi${++n}`, p_ref: null, p_telegram: 990_000 + n, p_instagram: `sinovchi_${n}` });
  await sql('update profiles set role = $2, coins = 100 where user_id = $1', [uid, role]);
  return uid;
};
const plotOf = async (where: string): Promise<string> => (await sql(`select id from plots p where ${where} and not exists (select 1 from plot_state s where s.plot_id = p.id) order by id limit 1`))[0]!.id as string;
const coins = async (uid: string): Promise<number> => (await sql('select coins from profiles where user_id = $1', [uid]))[0]!.coins as number;

beforeAll(async () => { db = await openDb(); });

describe('admin sinov rejimi', () => {
  test('admin: yopiq tuman, villa, bir nechta bepul uy; tanga yechilmaydi; lyuks 1-level uyga; uy istalgan levelga', async () => {
    const admin = await user('admin');
    expect((await as<Row>(admin, 'my_profile')).test_mode).toBe(true);
    const closed = await plotOf("type = 'hovli' and district_id in (select id from districts where not is_open)");
    const villa = await plotOf("type = 'villa'");
    await as(admin, 'my_claim', { p_plot: closed });
    await as(admin, 'my_claim', { p_plot: villa });
    await as(admin, 'my_claim', { p_plot: await plotOf("type = 'hovli' and district_id = 1") });
    expect(await sql('select count(*)::int n from plot_state where owner = $1 and is_test', [admin])).toEqual([{ n: 3 }]);
    expect(await as(admin, 'my_buy_decor_coins', { p_id: 'lux_superkar' })).toBe(100);
    expect(await coins(admin)).toBe(100);
    await as(admin, 'my_place_decor', { p_plot: closed, p_places: { garaj_oldi: 'lux_superkar' } });
    await as(admin, 'my_test_tier', { p_plot: closed, p_tier: 4 });
    expect((await sql('select tier from plot_state where plot_id = $1', [closed]))[0]!.tier).toBe(4);
    for (let i = 0; i < 15; i++) await as(admin, 'my_treasure', { p_x: 0, p_z: 0 });
  });
  test('sinov xaridi: to‘lovsiz, is_test, daromadga kirmaydi; tozalash hammasini o‘chiradi', async () => {
    const admin = await user('admin');
    await as(admin, 'my_test_purchase', { p_kind: 'coins', p_payload: { pack: 5 } });
    expect(await coins(admin)).toBe(100 + 16000);
    await as(admin, 'my_test_purchase', { p_kind: 'decor', p_payload: { id: 'avto_sedan' } });
    expect(await sql("select is_test from orders where user_id = $1", [admin])).toEqual([{ is_test: true }, { is_test: true }]);
    expect(((await as<Row>(admin, 'admin_stats')).revenue)).toBe(0);
    const plot = await plotOf("type = 'hovli' and district_id = 2");
    await as(admin, 'my_claim', { p_plot: plot });
    const r = await as<Row>(admin, 'admin_test_cleanup');
    expect(r.plots).toBeGreaterThanOrEqual(1);
    expect(await sql('select count(*)::int n from plot_state where is_test')).toEqual([{ n: 0 }]);
    expect(await sql('select count(*)::int n from orders where is_test')).toEqual([{ n: 0 }]);
  });
  test('oddiy odamda hech narsa o‘zgarmaydi; admin sinovni o‘chirsa — oddiy qoidalar', async () => {
    const plain = await user();
    await expect(as(plain, 'my_test_purchase', { p_kind: 'coins', p_payload: { pack: 1 } })).rejects.toThrow('forbidden');
    await expect(as(plain, 'my_test_mode', { p_on: true })).rejects.toThrow('forbidden');
    await expect(as(plain, 'my_claim', { p_plot: await plotOf("type = 'villa'") })).rejects.toThrow('paid_only');
    await expect(as(plain, 'my_buy_decor_coins', { p_id: 'gul_zor' })).rejects.toThrow('level_low');
    const admin = await user('admin');
    await as(admin, 'my_test_mode', { p_on: false });
    await expect(as(admin, 'my_claim', { p_plot: await plotOf("type = 'villa'") })).rejects.toThrow('paid_only');
    await expect(as(admin, 'my_test_purchase', { p_kind: 'coins', p_payload: { pack: 1 } })).rejects.toThrow('forbidden');
  });
});
