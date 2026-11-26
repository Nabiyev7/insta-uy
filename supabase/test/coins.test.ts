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
const coinsOf = async (uid: string): Promise<number> => (await sql('select coins from profiles where user_id = $1', [uid]))[0]!.coins as number;
const user = async (coins = 0): Promise<{ uid: string; nick: string; tg: number }> => {
  const uid = randomUUID();
  const tg = 950_000 + ++n;
  const nick = `tanga_${n}`;
  await svc('svc_profile_create', { p_user: uid, p_login: `tanga${n}`, p_ref: null, p_telegram: tg, p_instagram: nick });
  await sql('update profiles set coins = $2 where user_id = $1', [uid, coins]);
  return { uid, nick, tg };
};
const withHouse = async (coins = 0): Promise<{ uid: string; nick: string; tg: number }> => {
  const u = await user(coins);
  const plot = (await sql("select id from plots p where district_id = 1 and not exists (select 1 from plot_state s where s.plot_id = p.id) order by id limit 1"))[0]!.id as string;
  await sql("insert into plot_state (plot_id, status, owner, instagram) values ($1, 'owned', $2, $3)", [plot, u.uid, u.nick]);
  return u;
};
const fails = async (p: Promise<unknown>, code: string): Promise<void> => { await expect(p).rejects.toThrow(code); };

beforeAll(async () => { db = await openDb(); });

describe('tanga: topish', () => {
  test('topshiriqlar yo‘q', async () => {
    expect(await sql("select 1 from pg_proc where proname in ('my_quests', 'my_quest_claim')")).toHaveLength(0);
  });
  test('kunlik: 100, 7-kuni +300, bir kun o‘tkazilsa seriya noldan', async () => {
    const { uid } = await user();
    const day = async (): Promise<Row> => as<Row>(uid, 'my_daily');
    const back = (days: number): Promise<Row[]> => sql(`update profiles set last_daily = current_date - ${days} where user_id = $1`, [uid]);
    const gains: number[] = [];
    for (let i = 0; i < 8; i++) {
      if (i > 0) await back(1);
      gains.push((await day()).gain as number);
    }
    expect(gains).toEqual([100, 100, 100, 100, 100, 100, 400, 100]);
    await fails(day(), 'already_claimed');
    await back(1); await day();
    await back(2);
    expect(await day()).toMatchObject({ gain: 100, streak: 1 });
  });
  test('kanalga obuna: 300, bir marta', async () => {
    const { uid, tg } = await user();
    expect(await svc('svc_channel_target', { p_user: uid })).toBe(tg);
    expect(await svc('svc_channel_bonus', { p_telegram: tg })).toMatchObject({ state: 'paid', gain: 300, coins: 300 });
    expect(await svc('svc_channel_bonus', { p_telegram: tg })).toMatchObject({ state: 'done' });
    expect(await coinsOf(uid)).toBe(300);
  });
  test('do‘st taklifi: 500, do‘st uy olganda', async () => {
    const host = await user();
    const ref = (await sql('select ref_code from profiles where user_id = $1', [host.uid]))[0]!.ref_code as string;
    const guest = randomUUID();
    await svc('svc_profile_create', { p_user: guest, p_login: `mehmon${++n}`, p_ref: ref, p_telegram: 960_000 + n, p_instagram: `mehmon_${n}` });
    const plot = (await sql("select id from plots p where district_id = 1 and type = 'hovli' and not exists (select 1 from plot_state s where s.plot_id = p.id) order by id limit 1"))[0]!.id as string;
    await as(guest, 'my_claim', { p_plot: plot });
    expect(await coinsOf(host.uid)).toBe(500);
  });
  test('6f: xazina ovi o‘chiq (sukut) — rad; yoqilsa hozirgidek', async () => {
    const { uid } = await withHouse(0);
    await fails(as(uid, 'my_treasure', { p_x: 0, p_z: 0 }), 'forbidden');
    await db.query("update settings set value = 'true' where key = 'treasure_enabled'");
    expect(await as<Row>(uid, 'my_treasure', { p_x: 0, p_z: 0 })).toMatchObject({ state: 'hunt' });
  });
  test('xazina: 50 tanga, kuniga 3 ta, har biri boshqa joyda', async () => {
    const { uid } = await user();
    for (let i = 1; i <= 3; i++) {
      const hunt = await as<Row>(uid, 'my_treasure', { p_x: 1999, p_z: 1999 });
      expect(hunt).toMatchObject({ state: 'hunt', n: i });
      const spot = (await sql('select x, z from treasures where day = current_date and n = $1', [i]))[0]!;
      expect(await as(uid, 'my_treasure', { p_x: Number(spot.x), p_z: Number(spot.z) })).toMatchObject({ state: 'found', n: i, left: 3 - i });
    }
    expect(await as(uid, 'my_treasure', { p_x: 0, p_z: 0 })).toEqual({ state: 'done' });
    expect(await coinsOf(uid)).toBe(150);
  });
});

describe('tanga o‘tkazish', () => {
  test('olib tashlangan (6f): bayroqcha o‘chiq — rad, admin sinov rejimida ham', async () => {
    const [a, d] = [await withHouse(2000), await withHouse(0)];
    await fails(as(a.uid, 'my_send_coins', { p_to: d.nick, p_amount: 10 }), 'forbidden');
    await sql("update profiles set role = 'admin', test_mode = true where user_id = $1", [a.uid]);
    await fails(as(a.uid, 'my_send_coins', { p_to: d.nick, p_amount: 10 }), 'forbidden');
    await sql("update profiles set role = 'user' where user_id = $1", [a.uid]);
    // Quyidagi testlar uchun — kod qolgan, bayroqcha yoqilsa eski qoidalar ishlaydi.
    await sql("update settings set value = 'true' where key = 'coins_transfer_enabled'");
  });
  test('komissiyasiz; kuniga yuborish ≤ 500, qabul ≤ 1 000', async () => {
    const [a, b, c, d] = [await withHouse(2000), await withHouse(2000), await withHouse(2000), await withHouse(0)];
    expect(await as(a.uid, 'my_send_coins', { p_to: `@${d.nick}`, p_amount: 300 })).toMatchObject({ coins: 1700, sent: 300 });
    expect(await coinsOf(d.uid)).toBe(300);
    await fails(as(a.uid, 'my_send_coins', { p_to: d.nick, p_amount: 201 }), 'send_limit');
    await as(a.uid, 'my_send_coins', { p_to: d.nick, p_amount: 200 });
    await as(b.uid, 'my_send_coins', { p_to: d.nick, p_amount: 500 });
    await fails(as(c.uid, 'my_send_coins', { p_to: d.nick, p_amount: 1 }), 'receive_limit');
    expect(await coinsOf(d.uid)).toBe(1000);
    const list = await rpc(db, 'service_role', null, 'admin_coin_transfers', {}).catch(() => null);
    expect(list).toBeNull(); // faqat admin ko'radi
  });
  test('o‘ziga, uysiz yoki tanga yetmasa — yo‘q', async () => {
    const a = await withHouse(100);
    const homeless = await user(100);
    await fails(as(a.uid, 'my_send_coins', { p_to: a.nick, p_amount: 10 }), 'self_transfer');
    await fails(as(a.uid, 'my_send_coins', { p_to: homeless.nick, p_amount: 10 }), 'trade_needs_house');
    await fails(as(homeless.uid, 'my_send_coins', { p_to: a.nick, p_amount: 10 }), 'trade_needs_house');
    const b = await withHouse(0);
    await fails(as(a.uid, 'my_send_coins', { p_to: b.nick, p_amount: 101 }), 'not_enough_coins');
    await fails(as(a.uid, 'my_send_coins', { p_to: 'yoq_odam_xyz', p_amount: 1 }), 'user_not_found');
  });
  test('admin ro‘yxatni ko‘radi', async () => {
    const admin = await user();
    await sql("update profiles set role = 'admin' where user_id = $1", [admin.uid]);
    const list = await as<Row[]>(admin.uid, 'admin_coin_transfers', {});
    expect(list.length).toBeGreaterThanOrEqual(3);
    expect(list[0]).toHaveProperty('amount');
    expect(await as(admin.uid, 'admin_economy')).toHaveProperty('total');
  });
});
