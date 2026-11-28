/** Rasmni saqlash va ulashish yo'li (19-qadam): muhitga qarab — Telegram Mini App, Instagram ichki brauzeri, mobil yoki kompyuter brauzeri. Sof hisob. */

export type ShareEnv = 'telegram' | 'instagram' | 'mobile' | 'desktop';
export interface EnvHints {
  readonly isMiniApp: boolean;
  readonly userAgent: string;
  /** `navigator.share` bor. */
  readonly canShare: boolean;
  /** `navigator.canShare({ files })` — fayl ulashish qo'llanadi. */
  readonly canShareFiles: boolean;
}
export const shareEnv = (h: EnvHints): ShareEnv => {
  if (h.isMiniApp) return 'telegram';
  if (/Instagram/i.test(h.userAgent)) return 'instagram';
  return h.canShare && /Android|iPhone|iPad|iPod|Mobile/i.test(h.userAgent) ? 'mobile' : 'desktop';
};

/** Telegram Mini App imkoniyatlari (Bot API versiyasiga qarab). */
export interface TgCaps { readonly downloadFile: boolean; readonly shareToStory: boolean; readonly isPremium: boolean }

export type SaveWay = 'tg-download' | 'tg-bot' | 'download' | 'instagram-hint';
/** Saqlash: Telegram 8.0+ — `downloadFile`; eski Telegram — bot chatga yuboradi; Instagram ichida — yuklab olish ishlamasligi mumkin → ko'rsatma. */
export const saveWay = (env: ShareEnv, tg: TgCaps): SaveWay => {
  if (env === 'telegram') return tg.downloadFile ? 'tg-download' : 'tg-bot';
  return env === 'instagram' ? 'instagram-hint' : 'download';
};

export type ShareWay = 'tg-story' | 'tg-bot' | 'native-files' | 'native-link' | 'download-copy' | 'instagram-hint';
/** Ulashish: Telegram — stories (7.8+), bo'lmasa bot rasmni chatga yuboradi (u yerdan do'stga uzatiladi);
 *  telefon — tizim ulashish oynasi (fayl bilan, bo'lmasa faqat havola); kompyuter — saqlash + havola nusxasi; Instagram ichida — ko'rsatma. */
export const shareWay = (env: ShareEnv, tg: TgCaps, h: Pick<EnvHints, 'canShare' | 'canShareFiles'>): ShareWay => {
  if (env === 'telegram') return tg.shareToStory ? 'tg-story' : 'tg-bot';
  if (env === 'instagram') return 'instagram-hint';
  if (h.canShareFiles) return 'native-files';
  return h.canShare ? 'native-link' : 'download-copy';
};

/** Havolani ulashish (taklif, uy): Telegram — `t.me/share/url` oynasi, telefon — tizim oynasi, bo'lmasa nusxalash. */
export type LinkWay = 'tg-share-url' | 'native' | 'copy';
export const linkWay = (env: ShareEnv, canShare: boolean): LinkWay => (env === 'telegram' ? 'tg-share-url' : canShare && env !== 'instagram' ? 'native' : 'copy');

/** Taklif havolasi: bot orqali (`?start=r_<kod>`) — do'st darhol botga tushadi; bot nomi yo'q bo'lsa — sayt havolasi. */
export const refLink = (bot: string, ref: string | null | undefined, siteOrigin: string): string => {
  const name = bot.replace(/^@/, '');
  if (ref && name) return `https://t.me/${name}?start=r_${ref}`;
  if (ref) return `${siteOrigin}/?ref=${ref}`;
  return name ? `https://t.me/${name}?start=from_share` : siteOrigin;
};

/** `https://t.me/share/url?url=…&text=…` — Telegram'da "kimga yuborish" oynasi. */
export const tgShareUrl = (url: string, text: string): string => `https://t.me/share/url?${new URLSearchParams({ url, text }).toString()}`;
