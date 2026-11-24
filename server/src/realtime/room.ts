/** Ko'p o'yinchi holati: tarmoqsiz, sinab bo'ladigan mantiq. */
import { CITY_HALF } from '../../../packages/shared/src/masterplan/geometry.ts';
import { ANIM, MAX_ANIM, sanitizeAvatar, type AvatarLook } from '../../../packages/shared/src/catalog.ts';
import { ChatLog, authorKey, type ChatMessage, type ChatResult } from './chat.ts';

export interface Who {
  readonly userId: string | null;
  readonly nick: string | null;
  readonly look: unknown;
  /** Uyi bor tumanlar: mahalla chatiga shu yerlilar yozadi. */
  readonly homes?: readonly number[];
  readonly isModerator?: boolean;
  readonly canWrite?: boolean;
}
export interface Player extends Who {
  readonly id: string;
  readonly look: AvatarLook;
  x: number;
  z: number;
  yaw: number;
  anim: number;
  district: number;
  lastMove: number;
}
export type Snapshot = readonly [id: string, x: number, z: number, yaw: number, anim: number];
export interface OnlinePerson { readonly author: string; readonly nick: string; readonly district: number; readonly x: number; readonly z: number }

const BOUND = CITY_HALF + 200;
const VIEW_RADIUS = 140;
const MAX_VISIBLE = 30;
const MOVE_GAP_MS = 60;
const ANIM_AWAY = ANIM.away;
const MAX_ONLINE_LIST = 200;

const isFiniteIn = (v: unknown, limit: number): v is number => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= limit;
const round = (v: number): number => Math.round(v * 100) / 100;

export class Room {
  private readonly players = new Map<string, Player>();
  readonly chatLog = new ChatLog();

  get size(): number {
    return this.players.size;
  }

  join(id: string, who: Who): Player {
    const player: Player = { ...who, id, look: sanitizeAvatar(who.look), x: 0, z: 30, yaw: 0, anim: ANIM_AWAY, district: 0, lastMove: 0 };
    this.players.set(id, player);
    return player;
  }

  /** Nik yoki uy o'zgargach ma'lumotni yangilaydi (joyi saqlanadi). */
  update(id: string, who: Who): void {
    const p = this.players.get(id);
    if (p) this.players.set(id, { ...p, ...who, look: sanitizeAvatar(who.look) });
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

  /** Eng yaqin 30 kishi (tepadan qarayotganlar ko'rinmaydi). */
  nearby(id: string): Player[] {
    const me = this.players.get(id);
    if (!me) return [];
    return [...this.players.values()]
      .filter((p) => p.id !== id && p.anim !== ANIM_AWAY)
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

  /** Hozir saytda bo'lgan, ismi bor odamlar. */
  online(): OnlinePerson[] {
    return [...this.players.values()].filter((p) => p.nick).slice(0, MAX_ONLINE_LIST).map((p) => ({ author: authorKey(p.userId ?? p.id), nick: p.nick ?? '', district: p.district, x: p.x, z: p.z }));
  }

  chat(id: string, raw: unknown, now: number): ChatResult {
    const p = this.players.get(id);
    if (!p?.nick || !p.userId) return { ok: false, code: 'not_signed_in' };
    return this.chatLog.post({ userId: p.userId, nick: p.nick, homes: p.homes ?? [], isModerator: p.isModerator ?? false, canWrite: p.canWrite ?? true }, raw, now);
  }

  /** Shikoyat uchun: xabar va uning haqiqiy muallifi (faqat serverda). */
  reported(id: string, messageId: unknown): (ChatMessage & { readonly userId: string }) | null {
    return this.players.get(id)?.userId && typeof messageId === 'string' ? this.chatLog.find(messageId) : null;
  }

  /** Moderator xabarni o'chiradi; muallifini bilish uchun xabar qaytadi. */
  removeMessage(id: string, messageId: unknown): (ChatMessage & { readonly userId: string }) | null {
    const p = this.players.get(id);
    if (!p?.isModerator || typeof messageId !== 'string') return null;
    return this.chatLog.remove(messageId);
  }
}
