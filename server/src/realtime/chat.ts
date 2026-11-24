/** Chat: umumiy va mahalla kanallari, filtr, tarix. Vaqt cheklovi sukut bo'yicha yo'q — faqat admin yoqadigan "sekin rejim". */
import { createHash } from 'node:crypto';
import { hasBannedWord } from '../../../packages/shared/src/wordfilter.ts';

/** 0 — umumiy, 1..12 — mahalla. */
export interface ChatMessage { readonly id: string; readonly channel: number; readonly nick: string; /** Muallifning barqaror kaliti (nik bir xil bo'lishi mumkin). */ readonly author: string; readonly text: string; readonly at: number }
export type ChatResult = { readonly ok: true; readonly message: ChatMessage } | { readonly ok: false; readonly code: string };
export interface Author { readonly userId: string; readonly nick: string; readonly homes: readonly number[]; readonly isModerator: boolean; readonly canWrite: boolean }
interface Stored extends ChatMessage { readonly userId: string }

const MAX_TEXT = 200;
const MAX_CHANNEL = 12;
const HISTORY = 30;
const FLOOD_WINDOW_MS = 3000;
/** Odam qo'lda bunchalik tez yoza olmaydi — bu faqat dastur (bot) oqimini to'sadi. */
const FLOOD_LIMIT = 12;
/** Har qanday sxema, www, @kanal, domen (nuqtadan keyin bo'shliqsiz), hamda "sayt . com" kabi aylanma yozuv. */
const LINK = new RegExp([
  String.raw`[a-z]{2,}:\/\/`, String.raw`\bwww\.`, String.raw`@[a-z0-9_.]{3,}`, String.raw`\b[a-z0-9-]+\.[a-z]{2,10}\/`,
  String.raw`\b[a-z0-9-]+\.(uz|ru|su|kz|kg|tj|tm|com|net|org|me|io|info|link|site|online|xyz|shop|club|app|bet|top|ly|be|gg|tv|cc|co|dev|pro|biz|store|live|fun|win|vip|eu|de|uk|us|tr|cn|in|su|page|space|website|click|one|to|gl|ws)\b`,
  String.raw`\w\s+\.\s*(uz|ru|com|net|org)\b`,
].join('|'), 'i');

export const authorKey = (userId: string): string => createHash('sha256').update(userId).digest('hex').slice(0, 10);
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
    const stored: Stored = { id: `${now}-${++this.counter}`, channel, nick: author.nick, author: authorKey(author.userId), text, at: now, userId: author.userId };
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

  find(id: string): Stored | null {
    return this.history.find((m) => m.id === id) ?? null;
  }

  remove(id: string): Stored | null {
    const found = this.history.find((m) => m.id === id) ?? null;
    if (found) this.history = this.history.filter((m) => m.id !== id);
    return found;
  }

  /** Odamning barcha xabarlarini o'chiradi; o'chgan xabarlar ID lari. */
  forget(userId: string): string[] {
    const gone = this.history.filter((m) => m.userId === userId).map((m) => m.id);
    this.history = this.history.filter((m) => m.userId !== userId);
    this.recent.delete(userId);
    return gone;
  }
}
