/** Tashriflar: Cloudflare Web Analytics (cookie'siz; token bo'lmasa skript qo'shilmaydi) va kelish manbai (?from=bio). */
import { rpc } from './api.ts';

const BEACON = 'https://static.cloudflareinsights.com/beacon.min.js';
const SOURCE_KEY = 'from';
const SENT_KEY = 'fromSent';

/** Token faqat harf, raqam va chiziqchadan — boshqa matn skriptga yozilmaydi. */
export const analyticsTag = (token: string | undefined): { readonly src: string; readonly beacon: string } | null =>
  token && /^[A-Za-z0-9_-]{8,64}$/.test(token) ? { src: BEACON, beacon: JSON.stringify({ token }) } : null;

export const startAnalytics = (token: string | undefined = import.meta.env.VITE_CF_ANALYTICS as string | undefined): void => {
  const tag = analyticsTag(token);
  if (!tag) return;
  const s = document.createElement('script');
  s.defer = true;
  s.src = tag.src;
  s.dataset.cfBeacon = tag.beacon;
  document.head.append(s);
};

/** `?from=bio` / `?from=reels` — birinchi marta kelgandagisi saqlanadi. */
export const parseSource = (value: string | null): string | null => {
  const v = value?.trim().toLowerCase() ?? '';
  return /^[a-z0-9_]{1,20}$/.test(v) ? v : null;
};
export const rememberSource = (value: string | null): void => {
  const source = parseSource(value);
  if (!source) return;
  try {
    if (localStorage.getItem(SOURCE_KEY) === null) localStorage.setItem(SOURCE_KEY, source);
  } catch { /* maxfiy rejim */ }
};
/** Akkaunt ochilgach bir marta profilga yoziladi (server faqat yangi akkauntga va bo'sh bo'lsa yozadi). */
export const sendSource = async (): Promise<void> => {
  try {
    const source = localStorage.getItem(SOURCE_KEY);
    if (!source || localStorage.getItem(SENT_KEY) === '1') return;
    await rpc('my_source', { p_source: source });
    localStorage.setItem(SENT_KEY, '1');
  } catch { /* keyingi kirishda qayta */ }
};
