/** Socket.io qatlami. Alohida Node xosti (bepul tarif) yoki lokal dev server ichida ishlaydi. */
import type { Server as HttpServer } from 'node:http';
import { Server, type Socket } from 'socket.io';
import type { Backend } from '../types.ts';
import { Room } from './room.ts';

const TICK_MS = 125;
const MAX_PLAYERS = 1500;

interface Identity { readonly userId: string | null; readonly nick: string | null; readonly look: unknown }
const GUEST: Identity = { userId: null, nick: null, look: null };

const identify = async (db: Backend, token: unknown): Promise<Identity | null> => {
  if (typeof token !== 'string' || token === '') return GUEST;
  const user = await db.userByJwt(token);
  if (!user) return GUEST;
  const p = await db.rpc<{ instagram: string | null; login: string; is_banned: boolean; avatar: unknown } | null>('svc_user', { p_id: user.id });
  if (!p || p.is_banned) return null;
  return { userId: user.id, nick: p.instagram ?? p.login, look: p.avatar };
};

export const attachRealtime = (http: HttpServer, db: Backend, origins: readonly string[], onError: (e: unknown) => void): (() => void) => {
  const io = new Server(http, { cors: { origin: [...origins] }, maxHttpBufferSize: 4096, transports: ['websocket', 'polling'] });
  const room = new Room();
  /** Har ulanish kimlarning profilini allaqachon olgan. */
  const known = new Map<string, Set<string>>();

  io.use((socket, next) => {
    if (room.size >= MAX_PLAYERS) return next(new Error('full'));
    identify(db, socket.handshake.auth.token).then(
      (who) => {
        if (!who) return next(new Error('banned'));
        socket.data.who = who;
        return next();
      },
      (error: unknown) => {
        onError(error);
        next(new Error('server_error'));
      },
    );
  });

  io.on('connection', (socket: Socket) => {
    const who = socket.data.who as Identity;
    if (who.userId) for (const old of room.sessionsOf(who.userId)) io.sockets.sockets.get(old)?.disconnect(true);
    room.join(socket.id, who);
    known.set(socket.id, new Set());
    socket.on('move', (data: unknown) => room.move(socket.id, data, Date.now()));
    socket.on('chat', (text: unknown) => {
      const r = room.chat(socket.id, text, Date.now());
      if (!r.ok) { socket.emit('chat_error', r.code); return; }
      for (const id of r.to) io.to(id).emit('chat', r.message);
    });
    socket.on('disconnect', () => {
      room.leave(socket.id);
      known.delete(socket.id);
      for (const set of known.values()) set.delete(socket.id);
    });
  });

  const timer = setInterval(() => {
    for (const [id, seen] of known) {
      const snap = room.snapshot(id);
      const fresh = snap.map((s) => s[0]).filter((p) => !seen.has(p));
      if (fresh.length > 0) {
        io.to(id).emit('who', fresh.map((p) => room.profile(p)).filter(Boolean));
        for (const p of fresh) seen.add(p);
      }
      io.to(id).volatile.emit('snap', snap, room.size);
    }
  }, TICK_MS);

  return () => {
    clearInterval(timer);
    void io.close();
  };
};
