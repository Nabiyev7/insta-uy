/** 13-qadam (A): ochilish sozlamalari — faqat Stars, karta o'chiq, kichik paketlar yo'q. */
import { randomUUID } from 'node:crypto';
import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, test } from 'vitest';
import { openDb, rpc } from '../../server/dev/db.ts';

let db: PGlite;
let n = 0;
type Row = Record<string, unknown>;
const as = <T = unknown>(uid: string, fn: string, args: Row = {}): Promise<T> => rpc(db, 'authenticated', uid, fn, args) as Promise<T>;
const svc = <T = unknown>(fn: string, args: Row = {}): Promise<T> => rpc(db, 'service_role', null, fn, args) as Promise<T>;
const user = async (): Promise<{ uid: string; tg: number }> => {
  const uid = randomUUID();
  const tg = 880_000 + ++n;
  await svc('svc_profile_create', { p_user: uid, p_login: `och_${n}`, p_ref: null, p_telegram: tg, p_instagram: `och_nik_${n}` });
  return { uid, tg };
};

beforeAll(async () => { db = await openDb(); });

describe('ochilish: to‘lov — faqat Stars', () => {
  test('sozlamalar: payments_enabled, payments_stars yoqiq; payments_card o‘chiq; 3 ta paket (15-qadam: 50 / 100 / 200 ⭐)', async () => {
    const rows = (await db.query<Row>("select key, value from settings where key in ('payments_enabled','payments_stars','payments_card','premium')")).rows;
    const v = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    expect([v.payments_enabled, v.payments_stars, v.payments_card]).toEqual([true, true, false]);
    const packs = (v.premium as { packs: { coins: number; bonus: number; stars: number }[] }).packs;
    expect(packs.map((p) => [p.coins + p.bonus, p.stars])).toEqual([[5000, 50], [12000, 100], [28000, 200]]);
  });
  test('karta buyurtmasi rad (card_off); Stars buyurtmasi ishlaydi; Stars o‘chirilsa — rad', async () => {
    const { uid, tg } = await user();
    await expect(as(uid, 'my_order', { p_kind: 'coins', p_payload: { pack: 1 } })).rejects.toThrow('card_off');
    expect(await svc<Row>('svc_stars_order', { p_telegram: tg, p_kind: 'coins', p_payload: { pack: 1 } })).toMatchObject({ stars: 50 });
    await db.query("update settings set value = 'false' where key = 'payments_stars'");
    await expect(svc('svc_stars_order', { p_telegram: tg, p_kind: 'coins', p_payload: { pack: 2 } })).rejects.toThrow('payments_off');
    await db.query("update settings set value = 'true' where key = 'payments_stars'");
  });
});

describe('kuzatuv', () => {
  test('mijoz xatolari: yoziladi, kunlik chegara, admin oxirgisini ko‘radi, oddiy odam ko‘rmaydi', async () => {
    expect(await svc('svc_log_error', { p_message: 'TypeError: x is undefined', p_place: '/?panel=dokon', p_ua: 'Chrome' })).toBe(true);
    await db.query("update settings set value = '1' where key = 'client_errors_per_day'");
    expect(await svc('svc_log_error', { p_message: 'ikkinchisi' })).toBe(false);
    await db.query("update settings set value = '2000' where key = 'client_errors_per_day'");
    const admin = await user();
    await db.query("update profiles set role = 'admin' where user_id = $1", [admin.uid]);
    const list = await as<readonly Row[]>(admin.uid, 'admin_errors');
    expect(list[0]).toMatchObject({ message: 'TypeError: x is undefined', place: '/?panel=dokon' });
    const plain = await user();
    await expect(as(plain.uid, 'admin_errors')).rejects.toThrow('forbidden');
  });
  test('/stat: baza hajmi MB va bepul tarifga nisbatan %', async () => {
    const owner = await user();
    await db.query("update profiles set role = 'admin' where user_id = $1", [owner.uid]);
    const s = await svc<Row>('svc_bot_stat', { p_telegram: owner.tg });
    expect(typeof s.db_mb).toBe('number');
    expect(s.db_pct).toBeGreaterThanOrEqual(0);
  });
});

describe('ochilish kuni', () => {
  test('bot manbai: start=from_bio — akkaunt ochilganda profilga yoziladi; noto‘g‘ri belgi yozilmaydi', async () => {
    await svc('svc_bot_source', { p_telegram: 990_001, p_source: 'bio' });
    await svc('svc_bot_source', { p_telegram: 990_002, p_source: '<x>' });
    const uid = randomUUID();
    await svc('svc_profile_create', { p_user: uid, p_login: 'manba_odam', p_ref: null, p_telegram: 990_001, p_instagram: 'manba_nik' });
    await svc('svc_bot_source', { p_telegram: 990_001, p_source: null });
    expect((await db.query('select source from profiles where user_id = $1', [uid])).rows).toEqual([{ source: 'bio' }]);
    expect((await db.query('select source from tg_sessions where telegram_id = 990002')).rows).toEqual([]);
  });
  test('tuman: ochiqlaridagi bepul joylarning 80% i band — keyingisi o‘zi ochiladi va egasiga xabar; kam bo‘lsa — yo‘q', async () => {
    const owner = await user();
    await svc('svc_set_owner', { p_telegram: owner.tg });
    const isOpen = async (id: number): Promise<boolean> => ((await db.query<{ o: boolean }>('select is_open o from districts where id = $1', [id])).rows[0]!.o);
    await db.query('select private.auto_open_district()');
    expect(await isOpen(2)).toBe(false);
    // 1-tumandagi hovlilarning 80% ini egallaymiz (to'g'ridan-to'g'ri — sinov).
    await db.query(`insert into plot_state (plot_id, status, owner, instagram, is_free)
      select p.id, 'owned', $1, null, false from plots p where p.district_id = 1 and p.type = 'hovli' and not exists (select 1 from plot_state s where s.plot_id = p.id)
      order by p.id limit (select ceil(count(*) * 0.8)::int from plots where district_id = 1 and type = 'hovli')`, [owner.uid]);
    expect((await db.query<{ id: number }>('select private.auto_open_district() id')).rows[0]!.id).toBe(2);
    expect(await isOpen(2)).toBe(true);
    expect((await db.query('select text from tg_outbox where chat = $1', [owner.tg])).rows[0]).toMatchObject({ text: expect.stringContaining('Yangi tuman') });
  });
});

