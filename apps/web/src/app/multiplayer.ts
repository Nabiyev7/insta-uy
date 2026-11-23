import type { Socket } from 'socket.io-client';
import { sanitizeAvatar } from '../../../../packages/shared/src/index.ts';
import { REALTIME_URL, supabase } from './api.ts';
import { errorText } from './i18n.ts';
import { player, remotes } from './runtime.ts';
import { getApp, setApp, setting, toast, type ChatLine } from './store.ts';

let socket: Socket | null = null;
let timer: ReturnType<typeof setInterval> | undefined;
let token: string | null | undefined;

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
  if (!setting('multiplayer_enabled', true) || (socket && next === token)) return;
  token = next;
  disconnectMultiplayer();
  const { io } = await import('socket.io-client');
  socket = io(REALTIME_URL, { auth: { token: next }, transports: ['websocket'], reconnectionDelayMax: 30_000 });
  socket.on('who', (list: readonly Who[]) => {
    for (const w of list) {
      profiles.set(w.id, w);
      const r = remotes.get(w.id);
      if (r) Object.assign(r, { nick: w.nick, look: sanitizeAvatar(w.look) });
    }
  });
  socket.on('snap', onSnapshot);
  socket.on('chat', (m: ChatLine) => setApp((s) => ({ chat: [...s.chat.slice(-30), m] })));
  socket.on('chat_error', (code: string) => toast(errorText(new Error(code), getApp().lang), true));
  socket.on('disconnect', () => {
    remotes.clear();
    setApp({ online: 0 });
  });
  timer = setInterval(() => {
    if (socket?.connected) socket.volatile.emit('move', [player.x, player.z, Math.atan2(Math.sin(player.yaw), Math.cos(player.yaw)), player.anim, getApp().district]);
  }, 125);
};
export const disconnectMultiplayer = (): void => {
  clearInterval(timer);
  socket?.disconnect();
  socket = null;
  remotes.clear();
};
export const sendChat = (text: string): void => { socket?.emit('chat', text); };
