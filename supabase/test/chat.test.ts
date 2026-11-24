import { randomUUID } from 'node:crypto';
import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, test } from 'vitest';
import { openDb, rpc } from '../../server/dev/db.ts';

let db: PGlite;
let n = 0;
const svc = <T>(fn: string, args: Record<string, unknown> = {}): Promise<T> => rpc(db, 'service_role', null, fn, args) as Promise<T>;
const user = async (role = 'user', perms: readonly string[] = []): Promise<string> => {
  const id = randomUUID();
  await svc('svc_profile_create', { p_user: id, p_login: `chatchi${++n}`, p_ref: null });
  await db.query('update profiles set role = $2, perms = $3 where user_id = $1', [id, role, perms]);
  return id;
};
beforeAll(async () => { db = await openDb(); });

describe('chat bazasi', () => {
  test('o‘yinchi: uyi bor tumanlar va moderatorlik', async () => {
    const u = await user();
    expect(await svc('svc_player', { p_id: u })).toMatchObject({ homes: [], is_moderator: false, is_banned: false });
    await db.query("insert into plot_state (plot_id, status, owner) values ('P0005', 'owned', $1), ('P0450', 'pending', $1)", [u]);
    expect(await svc('svc_player', { p_id: u })).toMatchObject({ homes: [1] });
    expect(await svc('svc_player', { p_id: await user('moderator', ['reports']) })).toMatchObject({ is_moderator: true });
    expect(await svc('svc_player', { p_id: await user('moderator', ['plots']) })).toMatchObject({ is_moderator: false });
    expect(await svc('svc_player', { p_id: randomUUID() })).toBeNull();
  });
  test('sekin rejim sukut bo‘yicha o‘chiq', async () => {
    expect(await svc('svc_chat_config')).toEqual({ slow: 0 });
    await db.query("update settings set value = '15' where key = 'chat_slow_seconds'");
    expect(await svc('svc_chat_config')).toEqual({ slow: 15 });
  });
  test('bloklash: faqat moderator, xodim bloklanmaydi', async () => {
    const [bad, mod, admin, plain] = [await user(), await user('moderator', ['reports']), await user('admin'), await user()];
    await expect(svc('svc_chat_ban', { p_moderator: plain, p_user: bad })).rejects.toThrow('forbidden');
    await expect(svc('svc_chat_ban', { p_moderator: mod, p_user: admin })).rejects.toThrow('forbidden');
    await svc('svc_chat_ban', { p_moderator: mod, p_user: bad });
    expect(await svc('svc_player', { p_id: bad })).toMatchObject({ is_banned: true });
    expect((await db.query("select 1 from audit_log where action = 'chat:ban'")).rows).toHaveLength(1);
  });
  test('shikoyat: adminga haqiqiy login ko‘rinadi, kuniga 10 ta', async () => {
    const [me, bad] = [await user(), await user()];
    await svc('svc_chat_report', { p_reporter: me, p_user: bad, p_text: 'yomon gap' });
    const { rows } = await db.query<{ target_id: string }>("select target_id from reports where target_kind = 'chat' and reason = 'yomon gap'");
    expect(rows[0]!.target_id).toMatch(/^chatchi/);
    for (let i = 0; i < 9; i++) await svc('svc_chat_report', { p_reporter: me, p_user: bad, p_text: `x${i}` });
    await expect(svc('svc_chat_report', { p_reporter: me, p_user: bad, p_text: 'y' })).rejects.toThrow('rate_limited');
  });
  test('foydalanuvchi svc_* ni chaqira olmaydi', async () => {
    const u = await user();
    for (const fn of ['svc_player', 'svc_chat_ban', 'svc_chat_config']) await expect(rpc(db, 'authenticated', u, fn, fn === 'svc_player' ? { p_id: u } : fn === 'svc_chat_ban' ? { p_moderator: u, p_user: u } : {})).rejects.toThrow(/permission denied/);
  });
});
