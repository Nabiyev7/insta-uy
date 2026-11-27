/** 14-qadam (1): egasi-admin uchun doimiy huquqlar — "sinov rejimi" yo'q, admin narsalari haqiqiy, daromadga kirmaydi. */
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
  await svc('svc_profile_create', { p_user: uid, p_login: `odam${++n}`, p_ref: null, p_telegram: 990_000 + n, p_instagram: `odam_${n}` });
  await sql('update profiles set role = $2, coins = 100 where user_id = $1', [uid, role]);
  return uid;
};
const plotOf = async (where: string): Promise<string> => (await sql(`select id from plots p where ${where} and not exists (select 1 from plot_state s where s.plot_id = p.id) order by id limit 1`))[0]!.id as string;
const coins = async (uid: string): Promise<number> => (await sql('select coins from profiles where user_id = $1', [uid]))[0]!.coins as number;

beforeAll(async () => { db = await openDb(); await db.query("update settings set value = 'true' where key = 'treasure_enabled'"); });

describe('egasi-admin: hamma narsa doim ochiq, tugmasiz', () => {
  test('profilda "sinov rejimi" yo‘q; yopiq tumanda bepul uy (bitta); tanga yechilmaydi; lyuks 1-level uyga; istalgan level', async () => {
    const admin = await user('admin');
    const me = await as<Row>(admin, 'my_profile');
    expect(me).not.toHaveProperty('test_mode');
    expect(me.owner).toBe(true);
    const closed = await plotOf("type = 'hovli' and district_id in (select id from districts where not is_open)");
    await as(admin, 'my_claim', { p_plot: closed });
    // Ikkinchi bepul uy — yo'q (qo'shimcha uy faqat "Uy berish" orqali).
    await expect(as(admin, 'my_claim', { p_plot: await plotOf("type = 'hovli' and district_id = 1") })).rejects.toThrow('free_used');
    expect(await sql('select is_test, is_free from plot_state where plot_id = $1', [closed])).toEqual([{ is_test: false, is_free: true }]);
    const had = await coins(admin);
    expect(await as(admin, 'my_buy_decor_coins', { p_id: 'lux_superkar' })).toBe(had);
    expect(await coins(admin)).toBe(had);
    expect(await sql('select is_test from owned_decor where user_id = $1', [admin])).toEqual([{ is_test: false }]);
    await as(admin, 'my_place_decor', { p_plot: closed, p_places: { garaj_oldi: 'lux_superkar' } });
    await as(admin, 'my_admin_tier', { p_plot: closed, p_tier: 4 });
    expect((await sql('select tier from plot_state where plot_id = $1', [closed]))[0]!.tier).toBe(4);
    for (let i = 0; i < 15; i++) await as(admin, 'my_treasure', { p_x: 0, p_z: 0 });
  });
  test('admin xaridi (sayt va bot): haqiqiy buyurtma, is_admin, daromadga kirmaydi', async () => {
    const admin = await user('admin');
    await as(admin, 'my_admin_purchase', { p_kind: 'coins', p_payload: { pack: 1 } });
    expect(await coins(admin)).toBeGreaterThan(100);
    await svc('svc_admin_purchase', { p_telegram: 990_000 + n, p_kind: 'decor', p_payload: { id: 'avto_sedan' } });
    expect(await sql("select is_test, is_admin, status from orders where user_id = $1 order by id", [admin])).toEqual([
      { is_test: false, is_admin: true, status: 'paid' }, { is_test: false, is_admin: true, status: 'paid' }]);
    expect(await sql("select count(*)::int n from payments where is_admin and not is_test")).toEqual([{ n: 2 }]);
    expect(((await as<Row>(admin, 'admin_stats')).revenue)).toBe(0);
    expect(await svc('svc_is_owner_admin_tg', { p_telegram: 990_000 + n })).toBe(true);
  });
  test('"Uy berish": bo‘sh joyga, nik bo‘yicha akkauntga (topilmasa — adminga), istalgan level; band joyga — yo‘q', async () => {
    const admin = await user('admin');
    const other = await user();
    const nick = (await sql('select instagram from profiles where user_id = $1', [other]))[0]!.instagram as string;
    const a = await plotOf("type = 'villa'");
    expect(await as<Row>(admin, 'admin_give_house', { p_plot: a, p_nick: `@${nick}`, p_tier: 3 })).toMatchObject({ status: 'owned', nick });
    expect(await sql('select owner, tier, is_free, is_test from plot_state where plot_id = $1', [a])).toEqual([{ owner: other, tier: 3, is_free: false, is_test: false }]);
    await expect(as(admin, 'admin_give_house', { p_plot: a, p_nick: 'boshqa' })).rejects.toThrow('not_free');
    const b = await plotOf("type = 'hovli' and district_id = 1");
    await as(admin, 'admin_give_house', { p_plot: b, p_nick: 'brend_uy', p_tier: 5 });
    expect(await sql('select owner, instagram from plot_state where plot_id = $1', [b])).toEqual([{ owner: admin, instagram: 'brend_uy' }]);
    await expect(as(admin, 'admin_give_house', { p_plot: await plotOf('true'), p_nick: 'x', p_tier: 9 })).rejects.toThrow('bad_format');
  });
  test('oddiy odamda hech narsa o‘zgarmaydi', async () => {
    const plain = await user();
    await expect(as(plain, 'my_admin_purchase', { p_kind: 'coins', p_payload: { pack: 1 } })).rejects.toThrow('forbidden');
    await expect(as(plain, 'my_admin_tier', { p_plot: 'P0001', p_tier: 3 })).rejects.toThrow();
    await expect(as(plain, 'admin_give_house', { p_plot: await plotOf('true'), p_nick: 'x' })).rejects.toThrow('forbidden');
    await expect(svc('svc_admin_purchase', { p_telegram: 1, p_kind: 'coins', p_payload: { pack: 1 } })).rejects.toThrow('forbidden');
    await expect(as(plain, 'my_claim', { p_plot: await plotOf("type = 'villa'") })).rejects.toThrow('paid_only');
    await expect(as(plain, 'my_buy_decor_coins', { p_id: 'dam_stol' })).rejects.toThrow('level_low');
    for (const fn of ['my_test_mode', 'my_test_tier', 'my_test_purchase', 'admin_test_cleanup']) expect(await sql('select count(*)::int n from pg_proc where proname = $1', [fn])).toEqual([{ n: 0 }]);
  });
});
