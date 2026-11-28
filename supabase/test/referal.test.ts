/** 19-qadam (5): do'st taklifi — har do'st +500, bosqich bonuslari (3/10/25/50) bir marta, bezak sovg'asi yo'q. */
import { randomUUID } from 'node:crypto';
import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, test } from 'vitest';
import { openDb, rpc } from '../../server/dev/db.ts';

let db: PGlite;
let n = 0;
type Row = Record<string, unknown>;
const svc = <T = unknown>(fn: string, args: Row = {}): Promise<T> => rpc(db, 'service_role', null, fn, args) as Promise<T>;
const sql = async (q: string, p: unknown[] = []): Promise<Row[]> => (await db.query<Row>(q, p)).rows;
const person = async (): Promise<{ uid: string; tg: number }> => {
  const uid = randomUUID();
  const tg = 640_000 + ++n;
  await svc('svc_profile_create', { p_user: uid, p_login: `taklif${n}`, p_ref: null, p_telegram: tg, p_instagram: `taklif_${n}` });
  return { uid, tg };
};
const coins = async (uid: string): Promise<number> => (await sql('select coins from profiles where user_id = $1', [uid]))[0]!.coins as number;

beforeAll(async () => { db = await openDb(); });

describe('do‘st taklifi — tanga', () => {
  test('sozlamalar: bezak sovg‘asi o‘chiq, bosqichlar 3/10/25/50 → 2 000 / 6 000 / 15 000 / 40 000', async () => {
    const s = Object.fromEntries((await sql("select key, value from settings where key in ('referral_gifts_enabled','coins')")).map((r) => [r.key, r.value])) as Record<string, Row>;
    expect(s.referral_gifts_enabled).toBe(false);
    expect(s.coins!.referralSteps).toEqual({ 3: 2000, 10: 6000, 25: 15000, 50: 40000 });
    expect(s.coins!.referral).toBe(500);
  });
  test('50 do‘st: har biriga +500 va 4 bosqich bonusi bir martadan; bezak berilmaydi; bot ma‘lumotida bosqichlar', async () => {
    const host = await person();
    const before = await coins(host.uid);
    for (let i = 0; i < 50; i++) {
      const g = await person();
      await sql('update profiles set referred_by = $1 where user_id = $2', [host.uid, g.uid]);
      await sql('select private.pay_referral($1)', [g.uid]);
      // Qayta chaqirilsa ham ikkinchi marta to'lanmaydi.
      await sql('select private.pay_referral($1)', [g.uid]);
    }
    expect(await coins(host.uid) - before).toBe(50 * 500 + 2000 + 6000 + 15000 + 40000);
    expect(await sql("select reason, count(*)::int n from coin_ledger where user_id = $1 and reason like 'ref_step:%' group by reason order by reason", [host.uid]))
      .toEqual([{ reason: 'ref_step:10', n: 1 }, { reason: 'ref_step:25', n: 1 }, { reason: 'ref_step:3', n: 1 }, { reason: 'ref_step:50', n: 1 }]);
    expect(await sql('select decor_id from owned_decor where user_id = $1', [host.uid])).toEqual([]);
    expect((await sql("select data from notifications where user_id = $1 and kind = 'ref_step' order by id", [host.uid])).map((r) => r.data)).toEqual([
      { friends: 3, coins: 2000 }, { friends: 10, coins: 6000 }, { friends: 25, coins: 15000 }, { friends: 50, coins: 40000 }]);
    const inv = await svc<Row>('svc_bot_invite', { p_telegram: host.tg });
    expect(inv).toMatchObject({ invited: 50, perFriend: 500, gifts: [] });
    expect(inv.steps).toEqual([{ at: 3, coins: 2000 }, { at: 10, coins: 6000 }, { at: 25, coins: 15000 }, { at: 50, coins: 40000 }]);
  });
  test('2 do‘st — bosqich bonusi yo‘q; bayroqcha yoqilsa eski bezak sovg‘asi ishlaydi (kod qolgan)', async () => {
    const host = await person();
    for (let i = 0; i < 2; i++) {
      const g = await person();
      await sql('update profiles set referred_by = $1 where user_id = $2', [host.uid, g.uid]);
      await sql('select private.pay_referral($1)', [g.uid]);
    }
    expect(await sql("select count(*)::int n from coin_ledger where user_id = $1 and reason like 'ref_step:%'", [host.uid])).toEqual([{ n: 0 }]);
    await sql("update settings set value = 'true' where key = 'referral_gifts_enabled'");
    const g = await person();
    await sql('update profiles set referred_by = $1 where user_id = $2', [host.uid, g.uid]);
    await sql('select private.pay_referral($1)', [g.uid]);
    expect(await sql('select decor_id from owned_decor where user_id = $1', [host.uid])).toEqual([{ decor_id: 'dam_besedka' }]);
    await sql("update settings set value = 'false' where key = 'referral_gifts_enabled'");
  });
});
