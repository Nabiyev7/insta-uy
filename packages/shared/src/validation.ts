import { hasBannedWord } from './wordfilter.ts';

export const LIMITS = { login: [3, 24], password: [8, 72], bio: 120, streetName: 25, report: 500, chat: 200, gift: 100 } as const;

export type ValidationCode = 'empty' | 'too_short' | 'too_long' | 'bad_format' | 'banned_word';
export type Validated<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly code: ValidationCode };

const ok = <T>(value: T): Validated<T> => ({ ok: true, value });
const fail = (code: ValidationCode): Validated<never> => ({ ok: false, code });

/** "@nik", "https://instagram.com/nik/?x=1" → "nik". */
export const parseInstagram = (raw: string): Validated<string> => {
  const trimmed = raw.trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/^@/, '').replace(/[/?#].*$/, '');
  const nick = trimmed.toLowerCase();
  if (nick === '') return fail('empty');
  if (nick.length > 30) return fail('too_long');
  if (!/^[a-z0-9_](?:[a-z0-9._]*[a-z0-9_])?$/.test(nick) || nick.includes('..')) return fail('bad_format');
  return hasBannedWord(nick) ? fail('banned_word') : ok(nick);
};

export const instagramUrl = (nick: string): string => `https://www.instagram.com/${encodeURIComponent(nick)}/`;

export const parseLogin = (raw: string): Validated<string> => {
  const v = raw.trim().toLowerCase();
  if (v.length < LIMITS.login[0]) return fail('too_short');
  if (v.length > LIMITS.login[1]) return fail('too_long');
  if (!/^[a-z][a-z0-9_]*$/.test(v)) return fail('bad_format');
  return hasBannedWord(v) ? fail('banned_word') : ok(v);
};

/** bcrypt 72 baytdan keyingisini e'tiborsiz qoldiradi, shuning uchun yuqori chegara baytlarda. */
export const parsePassword = (raw: string): Validated<string> => {
  if (raw.length < LIMITS.password[0]) return fail('too_short');
  return new TextEncoder().encode(raw).length > LIMITS.password[1] ? fail('too_long') : ok(raw);
};

const hasControlChars = (s: string): boolean => /[\u0000-\u0008\u000b-\u001f\u007f​-‏‪-‮]/.test(s);

export const parseText = (raw: string, max: number, allowEmpty = false): Validated<string> => {
  const v = raw.trim().replace(/\s+/g, ' ');
  if (v === '') return allowEmpty ? ok('') : fail('empty');
  if ([...v].length > max) return fail('too_long');
  if (hasControlChars(v)) return fail('bad_format');
  return hasBannedWord(v) ? fail('banned_word') : ok(v);
};

export const parseBio = (raw: string): Validated<string> => {
  if (/(https?:\/\/|www\.|t\.me\/)/i.test(raw)) return fail('bad_format');
  return parseText(raw, LIMITS.bio, true);
};

export const parseStreetName = (raw: string): Validated<string> => {
  const r = parseText(raw, LIMITS.streetName);
  return r.ok && !/^[\p{L}\p{N} '’ʻ\-]+$/u.test(r.value) ? fail('bad_format') : r;
};

/** Login → Supabase Auth uchun ichki email (foydalanuvchiga ko'rinmaydi). */
export const loginEmail = (login: string): string => `${login}@login.obunachilar-shahri.uz`;
