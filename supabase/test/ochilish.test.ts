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
  test('sozlamalar: payments_enabled, payments_stars yoqiq; payments_card o‘chiq; 3 ta paket (60 / 125 / 250 ⭐)', async () => {
    const rows = (await db.query<Row>("select key, value from settings where key in ('payments_enabled','payments_stars','payments_card','premium')")).rows;
    const v = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    expect([v.payments_enabled, v.payments_stars, v.payments_card]).toEqual([true, true, false]);
    const packs = (v.premium as { packs: { coins: number; bonus: number; stars: number }[] }).packs;
    expect(packs.map((p) => [p.coins + p.bonus, p.stars])).toEqual([[3000, 60], [7000, 125], [16000, 250]]);
  });
  test('karta buyurtmasi rad (card_off); Stars buyurtmasi ishlaydi; Stars o‘chirilsa — rad', async () => {
    const { uid, tg } = await user();
    await expect(as(uid, 'my_order', { p_kind: 'coins', p_payload: { pack: 1 } })).rejects.toThrow('card_off');
    expect(await svc<Row>('svc_stars_order', { p_telegram: tg, p_kind: 'coins', p_payload: { pack: 1 } })).toMatchObject({ stars: 60 });
    await db.query("update settings set value = 'false' where key = 'payments_stars'");
    await expect(svc('svc_stars_order', { p_telegram: tg, p_kind: 'coins', p_payload: { pack: 2 } })).rejects.toThrow('payments_off');
    await db.query("update settings set value = 'true' where key = 'payments_stars'");
  });
});
