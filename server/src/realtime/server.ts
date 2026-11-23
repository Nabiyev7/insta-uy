/** Socket.io qatlami. Alohida Node xosti (bepul tarif) yoki lokal dev server ichida ishlaydi. */
import type { Server as HttpServer } from 'node:http';
import { Server, type Socket } from 'socket.io';
import type { Backend } from '../types.ts';
import { Room } from './room.ts';

const TICK_MS = 125;
const MAX_PLAYERS = 1500;
/** Mobil operator NAT'i ortida ko'p odam bo'lishi mumkin, shuning uchun keng. */
const MAX_PER_IP = 80;

interface Identity { readonly userId: string | null; readonly nick: string | null; readonly look: unknown }
const GUEST: Identity = { userId: null, nick: null, look: null };

/** Oxirgi qiymat — eng yaqin proksi qo'shgani; boshidagilarni mijoz soxtalashtirishi mumkin. */
const ipOf = (socket: Socket): string => {
  const forwarded = socket.handshake.headers['x-forwarded-for'];
  return [forwarded ?? ''].flat().join(',').split(',').at(-1)?.trim() || socket.handshake.address;
};
const isLocalSocket = (socket: Socket): boolean => !socket.handshake.headers['x-forwarded-for'] && /^(::1|::ffff:127\.|127\.)/.test(socket.handshake.address);

const identify = async (db: Backend, token: unknown): Promise<Identity | null> => {
  if (typeof token !== 'string' || token === '') return GUEST;
  const user = await db.userByJwt(token);
  if (!user) return GUEST;
  const p = await db.rpc<{ instagram: string | null; login: string; is_banned: boolean; avatar: unknown } | null>('svc_user', { p_id: user.id });
  if (!p || p.is_banned) return null;
  return { userId: user.id, nick: p.instagram ?? `${p.login.slice(0, 2)}***`, look: p.avatar };
};

export const attachRealtime = (http: HttpServer, db: Backend, origins: readonly string[], onError: (e: unknown) => void): (() => void) => {
  const io = new Server(http, { cors: { origin: [...origins] }, maxHttpBufferSize: 4096, transports: ['websocket', 'polling'] });
  const room = new Room();
  /** Har ulanish kimlarning profilini allaqachon olgan. */
  const known = new Map<string, Set<string>>();
  const perIp = new Map<string, number>();

  io.use((socket, next) => {
    if (room.size >= MAX_PLAYERS || (!isLocalSocket(socket) && (perIp.get(ipOf(socket)) ?? 0) >= MAX_PER_IP)) return next(new Error('full'));
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
    const ip = ipOf(socket);
    perIp.set(ip, (perIp.get(ip) ?? 0) + 1);
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
      const left = (perIp.get(ip) ?? 1) - 1;
      if (left > 0) perIp.set(ip, left);
      else perIp.delete(ip);
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
