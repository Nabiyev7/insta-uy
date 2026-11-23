/** Chat: umumiy va mahalla kanallari, filtr, tarix. Vaqt cheklovi sukut bo'yicha yo'q — faqat admin yoqadigan "sekin rejim". */
import { hasBannedWord } from '../../../packages/shared/src/wordfilter.ts';

/** 0 — umumiy, 1..12 — mahalla. */
export interface ChatMessage { readonly id: string; readonly channel: number; readonly nick: string; readonly text: string; readonly at: number }
export type ChatResult = { readonly ok: true; readonly message: ChatMessage } | { readonly ok: false; readonly code: string };
export interface Author { readonly userId: string; readonly nick: string; readonly homes: readonly number[]; readonly isModerator: boolean; readonly canWrite: boolean }
interface Stored extends ChatMessage { readonly userId: string }

const MAX_TEXT = 200;
const MAX_CHANNEL = 12;
const HISTORY = 30;
const FLOOD_WINDOW_MS = 3000;
/** Odam qo'lda bunchalik tez yoza olmaydi — bu faqat dastur (bot) oqimini to'sadi. */
const FLOOD_LIMIT = 12;
const LINK = /(https?:\/\/|www\.|t\.me|@[a-z0-9_]{4,}bot\b|\b[a-z0-9-]{2,}\s*\.\s*(uz|ru|com|net|org|me|io|info|link|site|online|xyz|shop|club|app|bet|top)\b)/i;

const strip = ({ userId: _userId, ...message }: Stored): ChatMessage => message;

export class ChatLog {
  private history: readonly Stored[] = [];
  private readonly recent = new Map<string, readonly number[]>();
  private counter = 0;
  slowSeconds = 0;

  post(author: Author, raw: unknown, now: number): ChatResult {
    const input = (typeof raw === 'object' && raw !== null ? raw : {}) as { readonly channel?: unknown; readonly text?: unknown };
    const channel = input.channel;
    const text = typeof input.text === 'string' ? input.text.trim().replace(/\s+/g, ' ') : '';
    if (typeof channel !== 'number' || !Number.isInteger(channel) || channel < 0 || channel > MAX_CHANNEL || text === '' || text.length > MAX_TEXT) return { ok: false, code: 'bad_format' };
    if (!author.canWrite) return { ok: false, code: 'telegram_required' };
    if (channel > 0 && !author.homes.includes(channel) && !author.isModerator) return { ok: false, code: 'not_resident' };
    if (hasBannedWord(text)) return { ok: false, code: 'banned_word' };
    if (LINK.test(text)) return { ok: false, code: 'no_links' };
    if (this.isTooFast(author, now)) return { ok: false, code: 'rate_limited' };
    const stored: Stored = { id: `${now}-${++this.counter}`, channel, nick: author.nick, text, at: now, userId: author.userId };
    this.history = [...this.history.filter((m) => m.channel !== channel), ...[...this.history.filter((m) => m.channel === channel), stored].slice(-HISTORY)];
    return { ok: true, message: strip(stored) };
  }

  private isTooFast(author: Author, now: number): boolean {
    const times = (this.recent.get(author.userId) ?? []).filter((t) => now - t < Math.max(FLOOD_WINDOW_MS, this.slowSeconds * 1000));
    const last = times.at(-1) ?? -Infinity;
    const isSlow = !author.isModerator && this.slowSeconds > 0 && now - last < this.slowSeconds * 1000;
    const isFlood = times.filter((t) => now - t < FLOOD_WINDOW_MS).length >= FLOOD_LIMIT;
    if (!isSlow && !isFlood) this.recent.set(author.userId, [...times, now]);
    return isSlow || isFlood;
  }

  messages(): ChatMessage[] {
    return this.history.map(strip).sort((a, b) => a.at - b.at);
  }

  remove(id: string): Stored | null {
    const found = this.history.find((m) => m.id === id) ?? null;
    if (found) this.history = this.history.filter((m) => m.id !== id);
    return found;
  }

  forget(userId: string): void {
    this.recent.delete(userId);
  }
}
