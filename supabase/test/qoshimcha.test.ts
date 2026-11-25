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
const user = async (nick?: string): Promise<{ uid: string; tg: number; nick: string }> => {
  const uid = randomUUID();
  const tg = 995_000 + ++n;
  const name = nick ?? `qoshimcha_${n}`;
  await svc('svc_profile_create', { p_user: uid, p_login: `q${n}`, p_ref: null, p_telegram: tg, p_instagram: name });
  return { uid, tg, nick: name };
};
const claim = async (uid: string, where = "district_id = 1"): Promise<string> => {
  const plot = (await sql(`select id from plots p where type = 'hovli' and ${where} and not exists (select 1 from plot_state s where s.plot_id = p.id) order by id limit 1`))[0]!.id as string;
  await as(uid, 'my_claim', { p_plot: plot });
  return plot;
};
const outboxTo = async (tg: number): Promise<Row[]> => sql('select text from tg_outbox where chat = $1 order by id', [tg]);

beforeAll(async () => { db = await openDb(); });

describe('nik nizosi', () => {
  const setup = async (): Promise<{ owner: Awaited<ReturnType<typeof user>>; claimant: number; admin: string; id: number; plot: string }> => {
    const owner = await user();
    const plot = await claim(owner.uid);
    const claimant = 996_000 + ++n;
    const id = await svc<number>('svc_dispute_open', { p_telegram: claimant, p_nick: `@${owner.nick}` });
    const admin = (await user()).uid;
    await sql("update profiles set role = 'admin' where user_id = $1", [admin]);
    return { owner, claimant, admin, id, plot };
  };
  test('to‘liq yo‘l: ariza → dalil → egasiga yuborish → da‘vogar haq: nik o‘tadi, uy/tanga egasida qoladi', async () => {
    const { owner, claimant, admin, id, plot } = await setup();
    await expect(svc('svc_dispute_open', { p_telegram: claimant + 1, p_nick: owner.nick })).rejects.toThrow('already_claimed');
    expect(await svc('svc_dispute_proof', { p_id: id, p_telegram: claimant, p_file: 'rasm_1' })).toBe('claimant');
    await as(admin, 'admin_dispute', { p_id: id, p_action: 'send' });
    expect((await outboxTo(owner.tg))[0]!.text).toContain('7 kun');
    expect(await svc('svc_dispute_proof', { p_id: id, p_telegram: owner.tg, p_file: 'rasm_2' })).toBe('owner');
    const coins = (await sql('select coins from profiles where user_id = $1', [owner.uid]))[0]!.coins;
    await as(admin, 'admin_dispute', { p_id: id, p_action: 'grant' });
    expect((await sql('select instagram, coins from profiles where user_id = $1', [owner.uid]))[0]).toEqual({ instagram: null, coins });
    expect((await sql('select owner, instagram from plot_state where plot_id = $1', [plot]))[0]).toEqual({ owner: owner.uid, instagram: null });
    expect(await svc('svc_nick_check', { p_nick: owner.nick })).toBe(owner.nick);
    expect((await outboxTo(claimant)).at(-1)!.text).toContain('/start');
    // Eski egasi yangi nik yozadi — uy ustida yangi nik.
    expect(await svc('svc_renick', { p_telegram: owner.tg, p_nick: 'yangi_nikim' })).toBe('yangi_nikim');
    expect((await sql('select instagram from plot_state where plot_id = $1', [plot]))[0]!.instagram).toBe('yangi_nikim');
  });
  test('egasi "beraman" dedi — nik darhol o‘tadi', async () => {
    const { owner, admin, id } = await setup();
    await as(admin, 'admin_dispute', { p_id: id, p_action: 'send' });
    await svc('svc_dispute_give', { p_id: id, p_telegram: owner.tg });
    expect((await sql('select status, owner_gave from nick_disputes where id = $1', [id]))[0]).toEqual({ status: 'granted', owner_gave: true });
  });
  test('7 kun javobsiz — avtomatik da‘vogarga', async () => {
    const { admin, id } = await setup();
    await as(admin, 'admin_dispute', { p_id: id, p_action: 'send' });
    await sql("update nick_disputes set sent_at = now() - interval '8 days' where id = $1", [id]);
    await svc('svc_tick');
    expect((await sql('select status from nick_disputes where id = $1', [id]))[0]!.status).toBe('granted');
  });
  test('rad etildi — nik egasida qoladi, da‘vogarga xabar', async () => {
    const { owner, claimant, admin, id } = await setup();
    await as(admin, 'admin_dispute', { p_id: id, p_action: 'reject' });
    expect((await sql('select instagram from profiles where user_id = $1', [owner.uid]))[0]!.instagram).toBe(owner.nick);
    expect((await outboxTo(claimant)).at(-1)!.text).toContain('rad etildi');
    await expect(as(owner.uid, 'admin_dispute', { p_id: id, p_action: 'grant' })).rejects.toThrow();
  });
});

describe('eslatma, qo‘shni, loyiha, murojaat', () => {
  test('kechki eslatma: kuniga 1 ta, faqat bonus olinmagan bo‘lsa, /stop bo‘lsa yo‘q', async () => {
    const a = await user();
    await claim(a.uid);
    const b = await user();
    await claim(b.uid);
    await sql('update profiles set wants_news = false where user_id = $1', [b.uid]);
    await sql("update settings set value = '0' where key = 'reminder_hour'");
    await sql('update profiles set last_daily = current_date - 1, streak = 5 where user_id = $1', [a.uid]);
    await svc('svc_tick');
    await svc('svc_tick');
    const got = await outboxTo(a.tg);
    expect(got.filter((r) => String(r.text).includes('Seriya 5'))).toHaveLength(1);
    expect(await outboxTo(b.tg)).toEqual([]);
  });
  test('yangi qo‘shni: 60 m atrofdagi egalarga, kuniga ko‘pi bilan 3 ta', async () => {
    const host = await user();
    const home = await claim(host.uid, "district_id = 1");
    const [hx, hz] = Object.values((await sql('select x, z from plots where id = $1', [home]))[0]!).map(Number);
    const near = await sql('select id from plots p where type = \'hovli\' and (p.x - $1) ^ 2 + (p.z - $2) ^ 2 <= 3600 and not exists (select 1 from plot_state s where s.plot_id = p.id) order by id limit 4', [hx, hz]);
    for (const r of near) { const u = await user(); await as(u.uid, 'my_claim', { p_plot: r.id }); }
    const got = await sql("select count(*)::int n from notifications where user_id = $1 and kind = 'new_neighbour'", [host.uid]);
    expect(got[0]!.n).toBe(Math.min(3, near.length));
  });
  test('loyiha to‘lganda: hammaga va kanalga xabar, eng ko‘p qo‘shgan 3 kishi', async () => {
    const [a, b] = [await user(), await user()];
    await sql('update profiles set coins = 100000 where user_id = any($1)', [[a.uid, b.uid]]);
    const p = (await sql("select id, goal, raised from projects where status = 'open' order by id limit 1"))[0]!;
    await as(a.uid, 'my_contribute', { p_project: p.id, p_amount: 10 });
    await as(b.uid, 'my_contribute', { p_project: p.id, p_amount: Number(p.goal) });
    expect((await sql('select status from projects where id = $1', [p.id]))[0]!.status).toBe('done');
    expect((await sql("select count(*)::int n from broadcasts where target = 'channel' and text like '%loyihasi tayyor%'"))[0]!.n).toBe(1);
    const proj = ((await svc<Row[]>('api_projects')).find((x) => x.id === p.id))!;
    expect((proj.top as Row[])[0]).toMatchObject({ nick: b.nick });
  });
  test('murojaat: 2 daqiqa ichida bittaga yig‘iladi, kuniga 5 ta, admin javobi', async () => {
    const u = await user();
    const first = await svc<Row>('svc_support_message', { p_telegram: u.tg, p_text: 'Uyim qani?' });
    const second = await svc<Row>('svc_support_message', { p_telegram: u.tg, p_text: '', p_photo: 'rasm_1' });
    expect(second.ticket).toBe(first.ticket);
    expect(second.is_new).toBe(false);
    await svc('svc_support_admin_msg', { p_message: first.message, p_admin_msg: 777 });
    expect(await svc('svc_support_reply', { p_admin_msg: 777, p_ticket: null, p_text: 'Mana', p_photo: null })).toEqual({ chat: u.tg, ticket: first.ticket });
    for (let i = 0; i < 4; i++) { await sql("update support_tickets set updated_at = now() - interval '5 minutes'"); await svc('svc_support_message', { p_telegram: u.tg, p_text: `${i}` }); }
    await sql("update support_tickets set updated_at = now() - interval '5 minutes'");
    await expect(svc('svc_support_message', { p_telegram: u.tg, p_text: 'oltinchi' })).rejects.toThrow('rate_limited');
  });
});
