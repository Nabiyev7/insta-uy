/** 6d (TUZATISH-2): premium tovar faqat pulga; admin — faqat egasi (Telegram ID); kelish manbai; bo'sh shahar hisoblagichi. */
import { randomUUID } from 'node:crypto';
import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { openDb, rpc } from '../../server/dev/db.ts';

let db: PGlite;
let n = 0;
type Row = Record<string, unknown>;
const as = <T = unknown>(uid: string, fn: string, args: Row = {}): Promise<T> => rpc(db, 'authenticated', uid, fn, args) as Promise<T>;
const anon = <T = unknown>(fn: string, args: Row = {}): Promise<T> => rpc(db, 'anon', null, fn, args) as Promise<T>;
const svc = <T = unknown>(fn: string, args: Row = {}): Promise<T> => rpc(db, 'service_role', null, fn, args) as Promise<T>;
const sql = async (q: string, p: unknown[] = []): Promise<Row[]> => (await db.query<Row>(q, p)).rows;
const tgOf = (uid: string): Promise<number> => sql('select telegram_id from profiles where user_id = $1', [uid]).then((r) => Number(r[0]!.telegram_id));
const user = async (role = 'user', coins = 100_000): Promise<string> => {
  const uid = randomUUID();
  await svc('svc_profile_create', { p_user: uid, p_login: `t2_${++n}`, p_ref: null, p_telegram: 770_000 + n, p_instagram: `t2_nik_${n}` });
  await sql('update profiles set role = $2, coins = $3 where user_id = $1', [uid, role, coins]);
  return uid;
};
const freeHovli = async (): Promise<string> => (await sql("select id from plots p where type = 'hovli' and district_id = 1 and not exists (select 1 from plot_state s where s.plot_id = p.id) order by id limit 1"))[0]!.id as string;

beforeAll(async () => {
  db = await openDb(); await db.query("update settings set value = 'true' where key = 'payments_card'"); await db.query("update settings set value = '\"card\"' where key = 'payment_provider'"); /* karta yo'li kodda qoladi (13-qadamdan o'chiq) — eski qoidalar sinovi */
  await sql("update settings set value = 'true' where key = 'payments_enabled'");
});
beforeEach(async () => { await sql('delete from private.owner'); });

describe('premium tovar', () => {
  test('tangaga olinmaydi (yakka va to‘plamda); katalogda belgisi; pulga — level cheklovisiz', async () => {
    const owner = await user('admin');
    await as(owner, 'admin_decor_save', { p: { id: 'lux_superkar', is_premium: true } });
    const row = (await anon<readonly Row[]>('api_catalog')).find((c) => c.id === 'lux_superkar');
    expect(row?.premium).toBe(true);
    const u = await user();
    await as(u, 'my_claim', { p_plot: await freeHovli(), p_instagram: `t2_nik_${n}` });
    await expect(as(u, 'my_buy_decor_coins', { p_id: 'lux_superkar' })).rejects.toThrow('not_for_sale');
    await sql("update decor_catalog set set_id = 'premium_toplam' where id = 'lux_superkar'");
    await expect(as(u, 'my_buy_set_coins', { p_set: 'premium_toplam' })).rejects.toThrow('not_for_sale');
    await sql("update decor_catalog set set_id = null where id = 'lux_superkar'");
    // 1-level uy egasi pulga buyurtma bera oladi (level_low yo'q).
    const o = await as<Row>(u, 'my_order', { p_kind: 'decor', p_payload: { id: 'lux_superkar' } });
    expect(o.id).toBeTruthy();
    // Oddiy tovar tangaga o'z qoidasi bilan: lyuks 1-levelda yopiq.
    await expect(as(u, 'my_buy_decor_coins', { p_id: 'lux_pavilyon' })).rejects.toThrow('level_low');
    await as(owner, 'admin_decor_save', { p: { id: 'lux_superkar', is_premium: false } });
  });
  test('admin sinov rejimi: 1-level uyga lyuks bezak (sotib olish va qo‘yish)', async () => {
    const owner = await user('admin');
    const plot = await freeHovli();
    await as(owner, 'my_claim', { p_plot: plot });
    await as(owner, 'my_buy_decor_coins', { p_id: 'lux_pavilyon' });
    await as(owner, 'my_place_decor', { p_plot: plot, p_places: { old_hovli_chap: 'lux_pavilyon' } });
    expect((await sql('select tier, places from plot_state where plot_id = $1', [plot]))[0]).toMatchObject({ tier: 1, places: { old_hovli_chap: 'lux_pavilyon' } });
  });
});

describe('admin — faqat egasi', () => {
  test('egasi yozilgach: boshqa Telegramdagi admin roli olib tashlanadi va admin_* rad; yangisini admin qilib bo‘lmaydi', async () => {
    const owner = await user();
    const other = await user('admin');
    await svc('svc_set_owner', { p_telegram: await tgOf(owner) });
    expect((await sql('select role from profiles where user_id = $1', [owner]))[0]!.role).toBe('admin');
    expect((await sql('select role from profiles where user_id = $1', [other]))[0]!.role).toBe('user');
    await expect(as(other, 'admin_stats')).rejects.toThrow('forbidden');
    await expect(sql("update profiles set role = 'admin' where user_id = $1", [other])).rejects.toThrow('forbidden');
    expect(await as<Row>(owner, 'admin_stats')).toHaveProperty('users');
    expect(await svc('svc_is_owner_tg', { p_telegram: await tgOf(owner) })).toBe(true);
    expect(await svc('svc_is_owner_tg', { p_telegram: await tgOf(other) })).toBe(false);
    // Profilda: egasiga owner, boshqaga — admin izi yo'q.
    expect(await as<Row>(owner, 'my_profile')).toMatchObject({ owner: true, role: 'admin' });
    expect(await as<Row>(other, 'my_profile')).toMatchObject({ owner: false, role: 'user', perms: [] });
  });
  test('moderator roli ishlatilmaydi (sozlama o‘chiq) — admin_* rad, profilda ko‘rinmaydi', async () => {
    const m = await user('moderator');
    await sql("update profiles set perms = '{reports,users}' where user_id = $1", [m]);
    await expect(as(m, 'admin_users', { p_q: '' })).rejects.toThrow('forbidden');
    expect(await as<Row>(m, 'my_profile')).toMatchObject({ role: 'user', perms: [] });
  });
  test('sinov rejimi faqat egasida', async () => {
    const owner = await user();
    const other = await user('admin');
    await svc('svc_set_owner', { p_telegram: await tgOf(owner) });
    expect((await as<Row>(owner, 'my_profile')).test_mode).toBe(true);
    expect((await as<Row>(other, 'my_profile')).test_mode).toBe(false);
  });
});

describe('qayerdan keldi va hisoblagich', () => {
  test('manba bir marta, faqat yangi akkauntga; admin 7 kunlik ro‘yxatni ko‘radi', async () => {
    const u = await user();
    await as(u, 'my_source', { p_source: 'BIO' });
    await as(u, 'my_source', { p_source: 'reels' });
    await as(u, 'my_source', { p_source: '<script>' });
    expect((await sql('select source from profiles where user_id = $1', [u]))[0]!.source).toBe('bio');
    const old = await user();
    await sql("update profiles set created_at = now() - interval '3 days' where user_id = $1", [old]);
    await as(old, 'my_source', { p_source: 'reels' });
    expect((await sql('select source from profiles where user_id = $1', [old]))[0]!.source).toBeNull();
    const owner = await user('admin');
    const list = await as<readonly Row[]>(owner, 'admin_sources');
    expect(list.find((r) => r.source === 'bio')?.users).toBeGreaterThanOrEqual(1);
    await expect(as(u, 'admin_sources')).rejects.toThrow('forbidden');
  });
  test('api_boot: bugun va jami uylar (sinov uylari hisoblanmaydi), sozlama ochiq', async () => {
    const before = (await anon<Row>('api_boot')).houses as { today: number; total: number };
    const u = await user();
    await as(u, 'my_claim', { p_plot: await freeHovli(), p_instagram: `t2_nik_${n}` });
    const owner = await user('admin');
    await as(owner, 'my_claim', { p_plot: await freeHovli() });
    const boot = await anon<Row>('api_boot');
    expect(boot.houses).toEqual({ today: before.today + 1, total: before.total + 1 });
    expect((boot.settings as Row).lively_start).toBe(true);
  });
});
