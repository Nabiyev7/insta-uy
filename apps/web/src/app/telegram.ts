/** Telegram Mini App: sayt bot ichida ochilganda — avtomatik kirish (initData), to'liq ekran, "Orqaga" tugmasi, tebranish. Oddiy brauzerda hech narsa qilmaydi. */
import { ApiError, post, signInWithToken, supabase } from './api.ts';
import { translate } from './i18n.ts';
import { backPanel, getApp, openPanel, refreshProfile, setting, toast, useApp } from './store.ts';

interface BackButton { show(): void; hide(): void; onClick(cb: () => void): void }
interface Haptic { impactOccurred(style: 'light' | 'medium' | 'heavy'): void; notificationOccurred(type: 'success' | 'error' | 'warning'): void }
export interface TgWebApp {
  readonly initData: string;
  ready(): void; expand(): void; close(): void;
  requestFullscreen?(): void; disableVerticalSwipes?(): void; setHeaderColor?(color: string): void; setBackgroundColor?(color: string): void;
  isVersionAtLeast?(v: string): boolean;
  openTelegramLink?(url: string): void;
  readonly BackButton?: BackButton; readonly HapticFeedback?: Haptic;
}
declare global { interface Window { Telegram?: { WebApp?: TgWebApp } } }

const SDK = 'https://telegram.org/js/telegram-web-app.js';
const BG = '#0e1116';
/** Telegram ishga tushirish parametrlarini manzil oxiriga (#tgWebAppData=...) qo'yadi. */
export const isTelegramLaunch = (hash: string): boolean => /(^|[#&])tgWebAppData=/.test(hash);

let app: TgWebApp | null = null;
export const miniApp = (): TgWebApp | null => app;

const loadSdk = (): Promise<TgWebApp | null> => new Promise((resolve) => {
  if (window.Telegram?.WebApp) { resolve(window.Telegram.WebApp); return; }
  const s = document.createElement('script');
  s.src = SDK;
  s.onload = () => resolve(window.Telegram?.WebApp ?? null);
  s.onerror = () => resolve(null);
  document.head.append(s);
});

/** Telegram "Orqaga" tugmasi saytdagi "Orqaga" bilan bir: oyna ochiq bo'lsa ko'rinadi. */
const wireBack = (wa: TgWebApp): void => {
  const back = wa.BackButton;
  if (!back) return;
  back.onClick(() => { if (getApp().trail.length > 0) backPanel(); else openPanel(null); });
  const sync = (hasPanel: boolean): void => { if (hasPanel) back.show(); else back.hide(); };
  sync(getApp().panel !== null);
  useApp.subscribe((s, prev) => { if ((s.panel !== null) !== (prev.panel !== null)) sync(s.panel !== null); });
};

/** Akkaunt yo'q (nik yozilmagan) — botga qaytaradi. */
const backToBot = (wa: TgWebApp): void => {
  toast(translate('miniNeedNick', getApp().lang), true);
  const bot = setting('telegram_bot', '');
  setTimeout(() => {
    if (bot && wa.openTelegramLink) wa.openTelegramLink(`https://t.me/${bot}`);
    wa.close();
  }, 2500);
};

const signIn = async (wa: TgWebApp): Promise<boolean> => {
  const { data } = await supabase.auth.getSession();
  if (data.session) return true;
  // Ba'zi Telegram ilovalarida pastdagi menyu tugmasi initData bermaydi — Menu tugmasi orqali ochish kerak.
  if (!wa.initData) { toast(translate('miniUseMenu', getApp().lang)); return false; }
  try {
    const { token_hash: hash } = await post<{ token_hash: string }>('/auth/telegram/webapp', { init_data: wa.initData });
    await signInWithToken(hash);
    return true;
  } catch (error: unknown) {
    if (error instanceof ApiError && error.message === 'need_nick') backToBot(wa);
    return false;
  }
};

/** Sayt Telegram ichida ochilgan bo'lsa: sozlash va kirish. Keyin — `?panel=` dagi oyna. */
export const startMiniApp = async (onReady: () => void): Promise<void> => {
  if (!isTelegramLaunch(location.hash) && !window.Telegram?.WebApp?.initData) { onReady(); return; }
  const wa = await loadSdk();
  if (!wa) { onReady(); return; }
  app = wa;
  wa.ready();
  wa.expand();
  // Shaharni barmoq bilan surganda ilova yopilib ketmasin; mavzu doim to'q.
  if (wa.isVersionAtLeast?.('7.7')) wa.disableVerticalSwipes?.();
  if (wa.isVersionAtLeast?.('8.0')) wa.requestFullscreen?.();
  wa.setHeaderColor?.(BG);
  wa.setBackgroundColor?.(BG);
  wireBack(wa);
  if (await signIn(wa)) await refreshProfile();
  onReady();
};

/** Tebranish: Telegram ichida — uning API si, aks holda brauzer. */
export const haptic = (strength: 'light' | 'medium' | 'heavy'): boolean => {
  if (!app?.HapticFeedback) return false;
  app.HapticFeedback.impactOccurred(strength);
  return true;
};
