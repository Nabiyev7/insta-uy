import type { Socket } from 'socket.io-client';
import { sanitizeAvatar } from '../../../../packages/shared/src/index.ts';
import { REALTIME_URL, supabase } from './api.ts';
import { errorText, translate } from './i18n.ts';
import { ANIM_AWAY } from '../logic/drive.ts';
import { city, here, player, remotes, session } from './runtime.ts';
import { getApp, setApp, setting, toast, useApp, type ChatLine } from './store.ts';
import { addMessages, dropMessage } from './chat.ts';

let socket: Socket | null = null;
let timer: ReturnType<typeof setInterval> | undefined;
let token: string | null | undefined;
let generation = 0;

interface Who { readonly id: string; readonly nick: string | null; readonly look: unknown }
type Snap = readonly [string, number, number, number, number];
const profiles = new Map<string, Who>();

const onSnapshot = (list: readonly Snap[], online: number): void => {
  const seen = new Set(list.map((s) => s[0]));
  for (const id of remotes.keys()) if (!seen.has(id)) remotes.delete(id);
  for (const [id, x, z, yaw, anim] of list) {
    const who = profiles.get(id);
    const known = remotes.get(id);
    if (known) Object.assign(known, { tx: x, tz: z, tyaw: yaw, anim });
    else remotes.set(id, { id, nick: who?.nick ?? null, look: sanitizeAvatar(who?.look), x, z, yaw, tx: x, tz: z, tyaw: yaw, anim });
  }
  if (getApp().online !== online) setApp({ online });
};

/** Ulanish ixtiyoriy: server bo'lmasa shahar yakka rejimda ishlayveradi. */
export const connectMultiplayer = async (): Promise<void> => {
  const { data } = await supabase.auth.getSession();
  const next = data.session?.access_token ?? null;
  if (!setting('multiplayer_enabled', true) || (generation > 0 && next === token)) return;
  token = next;
  disconnectMultiplayer();
  generation += 1;
  const mine = generation;
  const { io } = await import('socket.io-client');
  if (mine !== generation) return; // yangiroq chaqiruv boshlangan
  socket = io(REALTIME_URL, { auth: { token: next }, transports: ['websocket'], reconnectionDelayMax: 30_000 });
  socket.on('who', (list: readonly Who[]) => {
    for (const w of list) {
      profiles.set(w.id, w);
      const r = remotes.get(w.id);
      if (r) Object.assign(r, { nick: w.nick, look: sanitizeAvatar(w.look) });
    }
  });
  socket.on('snap', onSnapshot);
  socket.on('chat', (m: ChatLine) => addMessages([m], true));
  socket.on('chat_history', (list: readonly ChatLine[]) => addMessages(list, false));
  socket.on('chat_deleted', dropMessage);
  socket.on('me', (myAuthor: string) => setApp({ myAuthor }));
  socket.on('chat_reported', () => toast(translate('sent', getApp().lang)));
  socket.on('chat_error', (code: string) => toast(errorText(new Error(code), getApp().lang), true));
  socket.on('disconnect', () => {
    remotes.clear();
    profiles.clear();
    setApp({ online: 0 });
  });
  timer = setInterval(() => {
    if (!socket?.connected) return;
    const at = here();
    const yaw = session.mode === 'city' ? city.view.yaw : player.yaw;
    socket.volatile.emit('move', [at.x, at.z, Math.atan2(Math.sin(yaw), Math.cos(yaw)), session.mode === 'city' ? ANIM_AWAY : player.anim, getApp().district]);
  }, 125);
};
/** Nik yoki uylar o'zgarsa server (nik, mahalla chati huquqi) yangilansin. */
const identityOf = (): string => { const p = getApp().profile; return p ? `${p.instagram}|${p.plots.filter((x) => x.status === 'owned').map((x) => x.plot).join()}` : ''; };
let identity = '';
useApp.subscribe(() => {
  const next = identityOf();
  if (next === identity) return;
  const isFirst = identity === '';
  identity = next;
  if (!isFirst && next) socket?.emit('refresh');
});

export const disconnectMultiplayer = (): void => {
  clearInterval(timer);
  socket?.disconnect();
  socket = null;
  remotes.clear();
};
export const sendChat = (channel: number, text: string): void => { socket?.emit('chat', { channel, text }); };
export const reportMessage = (id: string): void => { socket?.emit('chat_report', id); };
/** Akkaunt o'chirilganda chatdagi xabarlar ham o'chadi. */
export const forgetMe = (): void => { socket?.emit('forget_me'); };
export interface OnlinePerson { readonly author: string; readonly nick: string; readonly district: number; readonly x: number; readonly z: number }
/** Hozir saytdagilar. Server javob bermasa bo'sh ro'yxat. */
export const loadOnline = (): Promise<readonly OnlinePerson[]> => new Promise((resolve) => {
  if (!socket?.connected) { resolve([]); return; }
  socket.timeout(4000).emit('online', (error: Error | null, list: readonly OnlinePerson[]) => resolve(error ? [] : list));
});
/** Moderator: xabarni o'chirish yoki muallifni bloklash. */
export const moderateMessage = (id: string, isBan: boolean): void => { socket?.emit(isBan ? 'chat_ban' : 'chat_delete', id); };
