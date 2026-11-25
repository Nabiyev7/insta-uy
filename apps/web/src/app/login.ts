/** Telegram bot yuborgan bir martalik havola (?kirish=...) bilan saytga kirish. */
import { post, signInWithToken } from './api.ts';
import { errorText, translate } from './i18n.ts';
import { getApp, openPanel, toast, type Panel } from './store.ts';

const KEY = 'afterLogin';
const TOKEN = /^[0-9a-f]{32}$/;

/** Telegramga o'tishdan oldin ochiq oyna eslab qolinadi — qaytganda shu joyga qaytariladi. */
export const rememberPanel = (panel: Panel | null): void => {
  try {
    if (panel) localStorage.setItem(KEY, JSON.stringify(panel));
    else localStorage.removeItem(KEY);
  } catch {
    // maxfiy rejim: qaytganda "Mening uyim" ochiladi
  }
};

const takePanel = (): Panel => {
  try {
    const raw = localStorage.getItem(KEY);
    localStorage.removeItem(KEY);
    const p = raw ? (JSON.parse(raw) as Panel) : null;
    return p && typeof p === 'object' && typeof p.kind === 'string' && p.kind !== 'auth' ? p : { kind: 'me' };
  } catch {
    return { kind: 'me' };
  }
};

/** Havola tokeni manzildan darhol olib tashlanadi (tarix va skrinshotda qolmasin). */
const takeToken = (): string | null => {
  const url = new URL(location.href);
  const token = url.searchParams.get('kirish');
  if (token === null) return null;
  url.searchParams.delete('kirish');
  history.replaceState(history.state, '', url.pathname + url.search + url.hash);
  return TOKEN.test(token) ? token : '';
};

export const applyLoginLink = async (): Promise<void> => {
  const token = takeToken();
  if (token === null) return;
  const lang = getApp().lang;
  try {
    if (!token) throw new Error('expired');
    const { token_hash: hash } = await post<{ token_hash: string }>('/auth/telegram/redeem', { token });
    await signInWithToken(hash);
    openPanel(takePanel());
    toast(translate('welcomeBack', lang));
  } catch (error: unknown) {
    toast(error instanceof Error && error.message === 'expired' ? translate('e_loginLink', lang) : errorText(error, lang), true);
  }
};
