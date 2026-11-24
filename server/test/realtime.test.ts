import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { io, type Socket } from 'socket.io-client';
import { Room, type Who } from '../src/realtime/room.ts';
import { attachRealtime } from '../src/realtime/server.ts';
import type { Backend } from '../src/types.ts';

const who = (nick: string | null, over: Partial<Who> = {}): Who => ({ userId: nick, nick, look: null, homes: [], isModerator: false, ...over });

describe('Room', () => {
  test('harakat tekshiriladi', () => {
    const r = new Room();
    r.join('a', who('ali'));
    expect(r.move('a', [1.234, 2, 0.5, 1, 3], 1000)).toBe(true);
    expect(r.move('a', [1, 2, 0, 1, 3], 1010)).toBe(false); // juda tez
    for (const bad of [null, 'x', [NaN, 0, 0, 0, 0], [5000, 0, 0, 0, 0], [0, 0, 0, 99, 0], [0, 0, 0, 14, 0], ['1', 0, 0, 0, 0], [1]]) expect(r.move('a', bad, 5000)).toBe(false);
    expect(r.move('yoq', [0, 0, 0, 0, 0], 9000)).toBe(false);
  });
  test('faqat yaqinlar, ko‘pi bilan 30', () => {
    const r = new Room();
    r.join('me', who('me'));
    for (let i = 0; i < 50; i++) { r.join(`p${i}`, who(null)); r.move(`p${i}`, [i, 30, 0, 0, 1], 1000); }
    r.join('far', who(null));
    r.move('far', [900, 900, 0, 0, 1], 1000);
    const ids = r.snapshot('me').map((s) => s[0]);
    expect(ids).toHaveLength(30);
    expect(ids).not.toContain('far');
    expect(ids[0]).toBe('p0');
    expect(r.snapshot('yoq')).toEqual([]);
    expect(r.profile('far')).toMatchObject({ nick: null });
    expect(r.profile('zz')).toBeNull();
  });
  test('tepadan qarayotgan ko‘rinmaydi, mashinadagi ko‘rinadi', () => {
    const r = new Room();
    r.join('me', who('me'));
    r.join('osmon', who('o'));
    r.join('haydovchi', who('h'));
    r.move('osmon', [1, 30, 0, 6, 1], 1000);
    r.move('haydovchi', [2, 30, 0, 12, 1], 1000);
    expect(r.snapshot('me').map((s) => [s[0], s[4]])).toEqual([['haydovchi', 12]]);
    expect(r.online().map((p) => p.nick)).toEqual(['me', 'o', 'h']);
  });
  test('chat: kirgan, filtr, havola, kanal', () => {
    const r = new Room();
    r.join('a', who('ali', { homes: [3] }));
    r.join('g', who(null));
    r.join('x', who('tgsiz', { canWrite: false }));
    const say = (id: string, text: unknown, channel: unknown = 0): unknown => r.chat(id, { channel, text }, 10_000);
    expect(say('g', 'salom')).toEqual({ ok: false, code: 'not_signed_in' });
    expect(say('x', 'salom')).toEqual({ ok: false, code: 'telegram_required' });
    expect(say('a', 'suka')).toEqual({ ok: false, code: 'banned_word' });
    for (const link of ['kir www.x.uz', 'https://a.b', 't.me/x', 'reklama.uz ga kir', 'menga @kanalbot yoz', 'sayt . com', 'bit.ly/abc', 'youtu.be/abc', 'discord.gg/x', 'mysite.kz', 'example.tv', 'tg://resolve?domain=x', '@mening_kanalim', 'yangi.sayt/kirish']) expect(say('a', link), link).toEqual({ ok: false, code: 'no_links' });
    for (const bad of [['  ', 0], ['x'.repeat(201), 0], ['salom', 13], ['salom', -1], ['salom', 1.5], ['salom', '0'], [5, 0]]) expect(say('a', bad[0], bad[1])).toEqual({ ok: false, code: 'bad_format' });
    expect(r.chat('a', 'salom', 1)).toEqual({ ok: false, code: 'bad_format' });
    expect(say('a', ' Salom   shahar. Yaxshimisiz? ')).toMatchObject({ ok: true, message: { channel: 0, nick: 'ali', text: 'Salom shahar. Yaxshimisiz?' } });
    for (const fine of ['Salom. Top uy qaysi', 'Rahmat. Online bormisiz', 'Narxi 2.5 million', 'a. b. c.']) expect(say('a', fine), fine).toMatchObject({ ok: true });
    expect(say('a', 'mahalladoshlar', 3)).toMatchObject({ ok: true, message: { channel: 3 } });
    expect(say('a', 'begona', 4)).toEqual({ ok: false, code: 'not_resident' });
    expect(JSON.stringify(r.chatLog.messages())).not.toContain('userId');
    expect(r.chatLog.messages()).toHaveLength(6);
    expect(r.chatLog.messages()[0]!.author).toMatch(/^[0-9a-f]{10}$/);
  });
  test('nik va uy o‘zgarsa joyida yangilanadi', () => {
    const r = new Room();
    r.join('a', who('al***'));
    r.move('a', [5, 6, 0, 1, 2], 1000);
    r.update('a', who('ali', { homes: [2] }));
    expect(r.online()).toMatchObject([{ nick: 'ali', district: 2, x: 5, z: 6 }]);
    expect(r.chat('a', { channel: 2, text: 'salom' }, 1000)).toMatchObject({ ok: true });
    r.update('yoq', who('x'));
    expect(r.size).toBe(1);
  });
  test('chat: vaqt cheklovi yo‘q; sekin rejim faqat yoqilganda; bot oqimi to‘xtaydi', () => {
    const r = new Room();
    r.join('a', who('ali'));
    for (let i = 0; i < 5; i++) expect(r.chat('a', { channel: 0, text: `x${i}` }, 10_000 + i)).toMatchObject({ ok: true });
    r.chatLog.slowSeconds = 10;
    expect(r.chat('a', { channel: 0, text: 'tez' }, 11_000)).toEqual({ ok: false, code: 'rate_limited' });
    expect(r.chat('a', { channel: 0, text: 'kech' }, 25_000)).toMatchObject({ ok: true });
    r.chatLog.slowSeconds = 0;
    r.join('bot', who('bot'));
    const results = Array.from({ length: 20 }, (_, i) => r.chat('bot', { channel: 0, text: `b${i}` }, 40_000 + i).ok);
    expect(results.filter(Boolean)).toHaveLength(12);
    expect(r.chatLog.messages().length).toBeLessThanOrEqual(30);
  });
  test('bir xil nikli ikki odam ajraladi; shikoyatda haqiqiy muallif', () => {
    const r = new Room();
    r.join('a', { ...who('ya***'), userId: 'u-1' });
    r.join('b', { ...who('ya***'), userId: 'u-2' });
    const [x, y] = [r.chat('a', { channel: 0, text: 'bir' }, 1), r.chat('b', { channel: 0, text: 'ikki' }, 2)];
    expect(x.ok && y.ok && x.message.author !== y.message.author).toBe(true);
    expect(new Set(r.online().map((p) => p.author)).size).toBe(2);
    expect(r.chatLog.forget('u-2')).toHaveLength(1);
    expect(r.chatLog.messages().map((m) => m.text)).toEqual(['bir']);
    r.join('g', who(null));
    expect(r.reported('b', x.ok ? x.message.id : '')).toMatchObject({ userId: 'u-1', text: 'bir' });
    expect(r.reported('g', x.ok ? x.message.id : '')).toBeNull();
    expect(r.reported('b', 5)).toBeNull();
  });
  test('moderator xabarni o‘chiradi, boshqasi o‘chirolmaydi', () => {
    const r = new Room();
    r.join('a', who('ali'));
    r.join('m', who('mod', { isModerator: true }));
    const sent = r.chat('a', { channel: 0, text: 'yomon gap' }, 10_000);
    const id = sent.ok ? sent.message.id : '';
    expect(r.removeMessage('a', id)).toBeNull();
    expect(r.removeMessage('m', 'yoq')).toBeNull();
    expect(r.removeMessage('m', 5)).toBeNull();
    expect(r.removeMessage('m', id)).toMatchObject({ userId: 'ali' });
    expect(r.chatLog.messages()).toEqual([]);
    expect(r.chat('m', { channel: 7, text: 'moderator har joyda yozadi' }, 11_000)).toMatchObject({ ok: true });
  });
});

describe('Socket.io', () => {
  const http = createServer();
  let close: () => void;
  let url = '';
  const open: Socket[] = [];
  const db = {
    userByJwt: async (t: string) => (t.startsWith('u') ? { id: t, email: '' } : null),
    rpc: async (fn: string, a: { p_id: string }) => {
      if (fn === 'svc_chat_config') return { slow: 0 };
      if (fn === 'svc_chat_ban' || fn === 'svc_chat_report') return null;
      return { instagram: a.p_id, login: 'l', is_banned: a.p_id === 'uban', avatar: {}, homes: [2], is_moderator: a.p_id === 'umod' };
    },
  } as unknown as Backend;
  const connect = (token: string): Promise<Socket> => new Promise((resolve, reject) => {
    const s = io(url, { auth: { token }, transports: ['websocket'], forceNew: true, reconnection: false });
    open.push(s);
    s.once('connect', () => resolve(s));
    s.once('connect_error', reject);
  });
  beforeAll(async () => {
    close = attachRealtime(http, db, ['*'], () => undefined);
    await new Promise<void>((r) => { http.listen(0, '127.0.0.1', r); });
    url = `http://127.0.0.1:${(http.address() as AddressInfo).port}`;
  });
  afterAll(() => { open.forEach((s) => s.disconnect()); close(); });

  test('bir-birini ko‘radi, chat ishlaydi, banlangan kirolmaydi, ikkinchi oyna birinchisini yopadi', async () => {
    const a = await connect('u1');
    const b = await connect('u2');
    const profiles = new Promise<{ nick: string }[]>((r) => { a.once('who', r); });
    b.emit('move', [1, 30, 0, 0, 1]);
    expect((await profiles)[0]).toMatchObject({ nick: 'u2' });
    const online = await new Promise<{ nick: string }[]>((r) => { a.emit('online', r); });
    expect(online.map((p) => p.nick).sort()).toEqual(['u1', 'u2']);
    a.emit('move', [0, 30, 0, 0, 1]);
    b.emit('move', [1, 30, 0, 0, 1]);
    const heard = new Promise<{ text: string }>((r) => { b.once('chat', r); });
    a.emit('chat', { channel: 0, text: 'Assalomu alaykum' });
    expect((await heard).text).toBe('Assalomu alaykum');
    const err = new Promise<string>((r) => { a.once('chat_error', r); });
    a.emit('chat', { channel: 5, text: 'begona mahalla' });
    expect(await err).toBe('not_resident');
    await expect(connect('uban')).rejects.toThrow('banned');
    const gone = new Promise((r) => { a.once('disconnect', r); });
    await connect('u1');
    await gone;
    const guest = await connect('');
    expect(guest.connected).toBe(true);
  });

  test('moderatsiya: tarix keladi, o‘chirish va bloklash hammaga yetadi', async () => {
    const mod = await connect('umod');
    const bad = await connect('u7');
    const seen = new Promise<{ id: string }>((r) => { mod.once('chat', r); });
    bad.emit('chat', { channel: 0, text: 'yomon xabar' });
    const { id } = await seen;
    const late = io(url, { auth: { token: 'u8' }, transports: ['websocket'], forceNew: true, reconnection: false });
    open.push(late);
    expect((await new Promise<{ id: string }[]>((r) => { late.once('chat_history', r); })).map((m) => m.id)).toContain(id);
    const reported = new Promise((r) => { late.once('chat_reported', () => r(true)); });
    late.emit('chat_report', id);
    expect(await reported).toBe(true);
    const denied = new Promise<string>((r) => { bad.once('chat_error', r); });
    bad.emit('chat_delete', id);
    expect(await denied).toBe('forbidden');
    const deleted = new Promise<string>((r) => { late.once('chat_deleted', r); });
    const kicked = new Promise((r) => { bad.once('disconnect', r); });
    mod.emit('chat_ban', id);
    expect(await deleted).toBe(id);
    await kicked;
  });
});
