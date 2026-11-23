import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { io, type Socket } from 'socket.io-client';
import { Room } from '../src/realtime/room.ts';
import { attachRealtime } from '../src/realtime/server.ts';
import type { Backend } from '../src/types.ts';

const who = (nick: string | null): { userId: string | null; nick: string | null; look: unknown } => ({ userId: nick, nick, look: null });

describe('Room', () => {
  test('harakat tekshiriladi', () => {
    const r = new Room();
    r.join('a', who('ali'));
    expect(r.move('a', [1.234, 2, 0.5, 1, 3], 1000)).toBe(true);
    expect(r.move('a', [1, 2, 0, 1, 3], 1010)).toBe(false); // juda tez
    for (const bad of [null, 'x', [NaN, 0, 0, 0, 0], [5000, 0, 0, 0, 0], [0, 0, 0, 99, 0], ['1', 0, 0, 0, 0], [1]]) expect(r.move('a', bad, 5000)).toBe(false);
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
  test('chat: kirgan, filtr, chastota, tuman', () => {
    const r = new Room();
    r.join('a', who('ali'));
    r.join('b', who('vali'));
    r.join('g', who(null));
    r.move('b', [0, 0, 0, 0, 5], 1000);
    expect(r.chat('g', 'salom', 10_000)).toEqual({ ok: false, code: 'not_signed_in' });
    expect(r.chat('a', 'suka', 10_000)).toEqual({ ok: false, code: 'banned_word' });
    expect(r.chat('a', 'kir www.x.uz', 10_000)).toEqual({ ok: false, code: 'no_links' });
    expect(r.chat('a', '  ', 10_000)).toEqual({ ok: false, code: 'bad_format' });
    const ok = r.chat('a', ' Salom   mahalla ', 10_000);
    expect(ok).toMatchObject({ ok: true, to: ['a', 'g'], message: { nick: 'ali', text: 'Salom mahalla' } });
    expect(r.chat('a', 'yana', 10_500)).toEqual({ ok: false, code: 'rate_limited' });
  });
});

describe('Socket.io', () => {
  const http = createServer();
  let close: () => void;
  let url = '';
  const open: Socket[] = [];
  const db = {
    userByJwt: async (t: string) => (t.startsWith('u') ? { id: t, email: '' } : null),
    rpc: async (_fn: string, a: { p_id: string }) => ({ instagram: a.p_id, login: 'l', is_banned: a.p_id === 'uban', avatar: {} }),
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
    expect((await profiles)[0]).toMatchObject({ nick: 'u2' });
    const heard = new Promise<{ text: string }>((r) => { b.once('chat', r); });
    a.emit('chat', 'Assalomu alaykum');
    expect((await heard).text).toBe('Assalomu alaykum');
    const err = new Promise<string>((r) => { a.once('chat_error', r); });
    a.emit('chat', 'tez');
    expect(await err).toBe('rate_limited');
    await expect(connect('uban')).rejects.toThrow('banned');
    const gone = new Promise((r) => { a.once('disconnect', r); });
    await connect('u1');
    await gone;
    const guest = await connect('');
    expect(guest.connected).toBe(true);
  });
});
