/** Ko'p o'yinchi holati: tarmoqsiz, sinab bo'ladigan mantiq. */
import { hasBannedWord } from '../../../packages/shared/src/wordfilter.ts';
import { sanitizeAvatar, type AvatarLook } from '../../../packages/shared/src/catalog.ts';

export interface Player {
  readonly id: string;
  readonly userId: string | null;
  readonly nick: string | null;
  readonly look: AvatarLook;
  x: number;
  z: number;
  yaw: number;
  anim: number;
  district: number;
  lastChat: number;
  lastMove: number;
}
export type Snapshot = readonly [id: string, x: number, z: number, yaw: number, anim: number];
export interface ChatMessage { readonly id: string; readonly nick: string; readonly text: string; readonly at: number }
export type ChatResult = { readonly ok: true; readonly message: ChatMessage; readonly to: readonly string[] } | { readonly ok: false; readonly code: string };

const BOUND = 1200;
const VIEW_RADIUS = 140;
const MAX_VISIBLE = 30;
const CHAT_GAP_MS = 2500;
const CHAT_MAX = 200;
const MOVE_GAP_MS = 60;
const MAX_ANIM = 5;

const isFiniteIn = (v: unknown, limit: number): v is number => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= limit;
const round = (v: number): number => Math.round(v * 100) / 100;

export class Room {
  private readonly players = new Map<string, Player>();

  get size(): number {
    return this.players.size;
  }

  join(id: string, who: { readonly userId: string | null; readonly nick: string | null; readonly look: unknown }): Player {
    const player: Player = { id, userId: who.userId, nick: who.nick, look: sanitizeAvatar(who.look), x: 0, z: 30, yaw: 0, anim: 0, district: 0, lastChat: 0, lastMove: 0 };
    this.players.set(id, player);
    return player;
  }

  leave(id: string): void {
    this.players.delete(id);
  }

  /** Bir akkauntning eski ulanishi (ikkinchi oyna) — yopiladi. */
  sessionsOf(userId: string): string[] {
    return [...this.players.values()].filter((p) => p.userId === userId).map((p) => p.id);
  }

  move(id: string, data: unknown, now: number): boolean {
    const p = this.players.get(id);
    if (!p || !Array.isArray(data) || now - p.lastMove < MOVE_GAP_MS) return false;
    const [x, z, yaw, anim, district] = data as unknown[];
    if (!isFiniteIn(x, BOUND) || !isFiniteIn(z, BOUND) || !isFiniteIn(yaw, 10) || !isFiniteIn(anim, MAX_ANIM) || !isFiniteIn(district, 12)) return false;
    p.x = round(x);
    p.z = round(z);
    p.yaw = round(yaw);
    p.anim = Math.max(0, Math.trunc(anim));
    p.district = Math.max(0, Math.trunc(district));
    p.lastMove = now;
    return true;
  }

  /** Eng yaqin 30 kishi. */
  nearby(id: string): Player[] {
    const me = this.players.get(id);
    if (!me) return [];
    return [...this.players.values()]
      .filter((p) => p.id !== id)
      .map((p) => ({ p, d: Math.hypot(p.x - me.x, p.z - me.z) }))
      .filter(({ d }) => d < VIEW_RADIUS)
      .sort((a, b) => a.d - b.d)
      .slice(0, MAX_VISIBLE)
      .map(({ p }) => p);
  }

  snapshot(id: string): Snapshot[] {
    return this.nearby(id).map((p): Snapshot => [p.id, p.x, p.z, p.yaw, p.anim]);
  }

  profile(id: string): { readonly id: string; readonly nick: string | null; readonly look: AvatarLook } | null {
    const p = this.players.get(id);
    return p ? { id: p.id, nick: p.nick, look: p.look } : null;
  }

  /** Mahalla chati: faqat kirganlar, filtr, chastota, faqat shu tumandagilar ko'radi. */
  chat(id: string, raw: unknown, now: number): ChatResult {
    const p = this.players.get(id);
    if (!p?.nick) return { ok: false, code: 'not_signed_in' };
    const text = typeof raw === 'string' ? raw.trim().replace(/\s+/g, ' ') : '';
    if (text === '' || text.length > CHAT_MAX) return { ok: false, code: 'bad_format' };
    if (now - p.lastChat < CHAT_GAP_MS) return { ok: false, code: 'rate_limited' };
    if (hasBannedWord(text)) return { ok: false, code: 'banned_word' };
    if (/(https?:\/\/|www\.|t\.me\/)/i.test(text)) return { ok: false, code: 'no_links' };
    p.lastChat = now;
    const to = [...this.players.values()].filter((q) => q.district === p.district).map((q) => q.id);
    return { ok: true, message: { id: `${now}-${p.id}`, nick: p.nick, text, at: now }, to };
  }
}
