/** Socket.io qatlami. Alohida Node xosti (bepul tarif) yoki lokal dev server ichida ishlaydi. */
import type { Server as HttpServer } from 'node:http';
import { Server, type Socket } from 'socket.io';
import type { Backend } from '../types.ts';
import { authorKey } from './chat.ts';
import { Room, type Who } from './room.ts';

const TICK_MS = 125;
const MAX_PLAYERS = 1500;
/** Mobil operator NAT'i ortida ko'p odam bo'lishi mumkin, shuning uchun keng. */
const MAX_PER_IP = 80;

const GUEST: Who = { userId: null, nick: null, look: null };
const CONFIG_MS = 30_000;
const REFRESH_GAP_MS = 2000;
const RECHECK_MS = 15_000;

interface PlayerRow { readonly instagram: string | null; readonly login: string; readonly is_banned: boolean; readonly avatar: unknown; readonly homes?: readonly number[]; readonly is_moderator?: boolean; readonly can_write?: boolean }

/** Oxirgi qiymat — eng yaqin proksi qo'shgani; boshidagilarni mijoz soxtalashtirishi mumkin. */
const ipOf = (socket: Socket): string => {
  const forwarded = socket.handshake.headers['x-forwarded-for'];
  return [forwarded ?? ''].flat().join(',').split(',').at(-1)?.trim() || socket.handshake.address;
};
const isLocalSocket = (socket: Socket): boolean => !socket.handshake.headers['x-forwarded-for'] && /^(::1|::ffff:127\.|127\.)/.test(socket.handshake.address);

const identify = async (db: Backend, token: unknown): Promise<Who | null> => {
  if (typeof token !== 'string' || token === '') return GUEST;
  const user = await db.userByJwt(token);
  if (!user) return GUEST;
  const p = await db.rpc<PlayerRow | null>('svc_player', { p_id: user.id });
  if (!p || p.is_banned) return null;
  return { userId: user.id, nick: p.instagram ?? `${p.login.slice(0, 2)}***`, look: p.avatar, homes: p.homes ?? [], isModerator: p.is_moderator ?? false, canWrite: p.can_write ?? true };
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
    const who = socket.data.who as Who;
    if (who.userId) for (const old of room.sessionsOf(who.userId)) io.sockets.sockets.get(old)?.disconnect(true);
    const ip = ipOf(socket);
    perIp.set(ip, (perIp.get(ip) ?? 0) + 1);
    room.join(socket.id, who);
    known.set(socket.id, new Set());
    socket.on('move', (data: unknown) => room.move(socket.id, data, Date.now()));
    socket.emit('chat_history', room.chatLog.messages());
    if (who.userId) socket.emit('me', authorKey(who.userId));
    let checkedAt = Date.now();
    /** Bloklangan yoki roli olingan odam ulanib turgan bo'lsa ham huquqi yo'qoladi. */
    const recheck = async (): Promise<boolean> => {
      if (Date.now() - checkedAt < RECHECK_MS) return true;
      checkedAt = Date.now();
      const next = await identify(db, socket.handshake.auth.token);
      if (!next) { socket.disconnect(true); return false; }
      room.update(socket.id, next);
      return true;
    };
    const guarded = (fn: () => void): void => {
      recheck().then((isOk) => { if (isOk) fn(); }, (error: unknown) => {
        onError(error);
        socket.emit('chat_error', 'server_error');
      });
    };
    socket.on('chat', (data: unknown) => guarded(() => {
      const r = room.chat(socket.id, data, Date.now());
      if (r.ok) io.emit('chat', r.message);
      else socket.emit('chat_error', r.code);
    }));
    socket.on('chat_report', (messageId: unknown) => {
      const m = room.reported(socket.id, messageId);
      if (!m || !who.userId) return;
      db.rpc('svc_chat_report', { p_reporter: who.userId, p_user: m.userId, p_text: m.text }).then(() => socket.emit('chat_reported'), (error: unknown) => socket.emit('chat_error', error instanceof Error ? error.message : 'server_error'));
    });
    let refreshedAt = 0;
    socket.on('refresh', () => {
      if (Date.now() - refreshedAt < REFRESH_GAP_MS) return;
      refreshedAt = Date.now();
      identify(db, socket.handshake.auth.token).then((next) => {
        if (!next) { socket.disconnect(true); return; }
        room.update(socket.id, next);
        for (const set of known.values()) set.delete(socket.id); // boshqalarga yangi nik qayta yuboriladi
      }, onError);
    });
    socket.on('online', (reply: unknown) => { if (typeof reply === 'function') reply(room.online()); });
    const moderate = (messageId: unknown, isBan: boolean): void => {
      const removed = room.removeMessage(socket.id, messageId);
      if (!removed) { socket.emit('chat_error', 'forbidden'); return; }
      io.emit('chat_deleted', removed.id);
      if (!isBan || !who.userId) return;
      db.rpc('svc_chat_ban', { p_moderator: who.userId, p_user: removed.userId }).then(
        () => { for (const id of room.sessionsOf(removed.userId)) io.sockets.sockets.get(id)?.disconnect(true); },
        (error: unknown) => {
          onError(error);
          socket.emit('chat_error', 'forbidden');
        },
      );
    };
    socket.on('chat_delete', (id: unknown) => guarded(() => moderate(id, false)));
    socket.on('chat_ban', (id: unknown) => guarded(() => moderate(id, true)));
    socket.on('disconnect', () => {
      room.leave(socket.id);
      const left = (perIp.get(ip) ?? 1) - 1;
      if (left > 0) perIp.set(ip, left);
      else perIp.delete(ip);
      known.delete(socket.id);
      for (const set of known.values()) set.delete(socket.id);
    });
  });

  const loadConfig = (): void => {
    db.rpc<{ slow?: number } | null>('svc_chat_config').then((c) => { room.chatLog.slowSeconds = Math.max(0, Number(c?.slow) || 0); }, onError);
  };
  loadConfig();
  const configTimer = setInterval(loadConfig, CONFIG_MS);

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
    clearInterval(configTimer);
    void io.close();
  };
};
