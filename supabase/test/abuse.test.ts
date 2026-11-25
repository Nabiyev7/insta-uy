/** Xavfsizlik ko'rigida topilgan suiiste'mollar — qaytmasligi uchun. */
import { randomUUID } from 'node:crypto';
import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, test } from 'vitest';
import { openDb, rpc } from '../../server/dev/db.ts';

let db: PGlite;
let n = 0;
type Row = Record<string, unknown>;
const as = (uid: string, fn: string, args: Row = {}): Promise<unknown> => rpc(db, 'authenticated', uid, fn, args);
const anon = (fn: string, args: Row = {}): Promise<unknown> => rpc(db, 'anon', null, fn, args);
const svc = (fn: string, args: Row = {}): Promise<unknown> => rpc(db, 'service_role', null, fn, args);
const sql = async (q: string, p: unknown[] = []): Promise<Row[]> => (await db.query<Row>(q, p)).rows;
const user = async (role = 'user', perms: string[] = [], ref: string | null = null): Promise<string> => {
  const id = randomUUID();
  await svc('svc_profile_create', { p_user: id, p_login: `maxfiy_login${++n}`, p_ref: ref, p_telegram: 900_000 + n });
  await sql('update profiles set role = $2, perms = $3 where user_id = $1', [id, role, perms]);
  return id;
};
const freePlot = async (): Promise<string> => (await sql("select id from plots p where district_id = 1 and not exists (select 1 from plot_state s where s.plot_id = p.id) order by id limit 1"))[0]!.id as string;
const claim = async (uid: string, nick: string): Promise<string> => {
  const plot = await freePlot();
  await as(uid, 'my_claim', { p_plot: plot, p_instagram: nick });
  return plot;
};
let admin = '';
beforeAll(async () => {
  db = await openDb();
  await db.query("update settings set value = 'true' where key = 'premium_house_enabled'");
  admin = await user('admin');
  await sql("update settings set value = 'true' where key = 'payments_enabled'");
});

test('xazina: NULL koordinata tanga bermaydi', async () => {
  const u = await user();
  await expect(as(u, 'my_treasure', { p_x: null, p_z: null })).rejects.toThrow('bad_format');
  await expect(as(u, 'my_treasure', { p_x: 1, p_z: null })).rejects.toThrow('bad_format');
});

describe('nik egaligi', () => {
  test('sovg‘ada begona nik olinmaydi, nik tasdig‘i yo‘q', async () => {
    const [a, b, c] = [await user(), await user(), await user()];
    await claim(c, 'mashhur_nik');
    const plot = await claim(a, 'egasi_a');
    expect(await anon('api_plot', { p_plot: plot })).toMatchObject({ status: 'owned', instagram: 'egasi_a' });
    void b;
    await expect(as(admin, 'admin_plot', { p_plot: plot, p_action: 'approve' })).rejects.toThrow('bad_format');
  });
  test('pullik uyda begona nik rad etiladi; to‘lov orasida band bo‘lsa uy niksiz beriladi', async () => {
    const [a, b] = [await user(), await user()];
    await claim(a, 'birinchi_n');
    await expect(as(b, 'my_order', { p_kind: 'plot', p_payload: { plot: await freePlot(), instagram: 'birinchi_n' } })).rejects.toThrow('nick_taken');
    const plot = await freePlot();
    const o = (await as(b, 'my_order', { p_kind: 'plot', p_payload: { plot, instagram: 'poyga_n' } })) as { amount: number };
    await claim(await user(), 'poyga_n');
    expect(await svc('svc_payment', { p_provider: 'card', p_external: 'race', p_amount: o.amount })).toMatchObject({ result: 'paid' });
    expect(await anon('api_plot', { p_plot: plot })).toMatchObject({ status: 'owned', instagram: null });
  });
});

describe('tanga fermasi', () => {
  test('taklif mukofoti uy olinganda darhol, bir marta', async () => {
    const inviter = await user();
    const ref = (await sql('select ref_code from profiles where user_id = $1', [inviter]))[0]!.ref_code as string;
    const guest = await user('user', [], ref);
    expect(await as(inviter, 'my_profile')).toMatchObject({ coins: 0, invited: 0 });
    const plot = await claim(guest, 'mehmon_x');
    expect(await as(inviter, 'my_profile')).toMatchObject({ coins: 500, invited: 1 });
    await as(admin, 'admin_plot', { p_plot: plot, p_action: 'release' });
    await claim(guest, 'mehmon_x');
    expect(await as(inviter, 'my_profile')).toMatchObject({ coins: 500 });
  });
  test('kanal bonusi bitta Telegram uchun bir marta (akkaunt o‘chirib qayta ochilsa ham)', async () => {
    const [a, b] = [await user(), await user()];
    await sql('update profiles set telegram_id = 4242 where user_id = $1', [a]);
    expect(await svc('svc_channel_bonus', { p_telegram: 4242 })).toMatchObject({ state: 'paid' });
    await svc('svc_delete_account', { p_user: a });
    await sql('update profiles set telegram_id = 4242 where user_id = $1', [b]);
    expect(await svc('svc_channel_bonus', { p_telegram: 4242 })).toMatchObject({ state: 'done' });
  });
});

test('moderator pul va mulk amallarini bajara olmaydi', async () => {
  const m = await user('moderator', ['orders', 'plots', 'settings']);
  const u = await user();
  const o = (await as(u, 'my_order', { p_kind: 'decor', p_payload: { id: 'sign_nick' } })) as { id: string };
  await expect(as(m, 'admin_order', { p_id: o.id, p_action: 'paid' })).rejects.toThrow('forbidden');
  await svc('svc_payment', { p_provider: 'card', p_external: 'orphan', p_amount: 4321 });
  const pay = (await sql("select id from payments where external_id = 'orphan'"))[0]!.id;
  await expect(as(m, 'admin_payment', { p_id: pay, p_action: 'link', p_order: o.id })).rejects.toThrow('forbidden');
  const plot = await claim(u, 'mod_sinov');
  const login = (await sql('select login from profiles where user_id = $1', [m]))[0]!.login;
  await expect(as(m, 'admin_plot', { p_plot: plot, p_action: 'assign', p_data: { login, instagram: 'mod_nik' } })).rejects.toThrow('forbidden');
  await expect(as(m, 'admin_catalog', { p_id: 'tree_anor', p_uzs: 0 })).rejects.toThrow('forbidden');
  expect(((await as(m, 'admin_catalog')) as Row[]).length).toBeGreaterThan(5);
  await expect(as(m, 'admin_plot', { p_plot: plot, p_action: 'tier', p_data: { tier: 5 } })).rejects.toThrow('forbidden');
  await as(m, 'admin_plot', { p_plot: plot, p_action: 'clear_bio' });
});

test('login nomi ochiq ko‘rinmaydi', async () => {
  const u = await user();
  await sql('update profiles set coins = 500 where user_id = $1', [u]);
  await as(u, 'my_contribute', { p_project: 3, p_amount: 500 });
  for (const fn of ['api_boot', 'api_rankings', 'api_elections']) expect(JSON.stringify(await anon(fn))).not.toContain('maxfiy_login');
});

test('yorliqsiz buyurtma rad etiladi; bittadan ortiq uy band qilinmaydi', async () => {
  const u = await user();
  const plot = await claim(u, 'yorliq_n');
  await expect(as(u, 'my_order', { p_kind: 'label', p_payload: { plot } })).rejects.toThrow('bad_format');
  await as(u, 'my_order', { p_kind: 'plot', p_payload: { plot: await freePlot(), instagram: 'yorliq_n' } });
  await expect(as(u, 'my_order', { p_kind: 'plot', p_payload: { plot: await freePlot(), instagram: 'yorliq_n' } })).rejects.toThrow('too_many_orders');
});
