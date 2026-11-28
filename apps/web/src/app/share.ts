/** Rasm va havolani saqlash / ulashish (19-qadam). Har ulashishda o'z taklif havolasi ketadi. Muhitga qarab yo'l `logic/shareEnv.ts` da tanlanadi;
 *  har bir yo'lda natija yoki tushunarli xabar chiqadi — jim yiqilmaydi. */
import { linkWay, refLink, saveWay, shareEnv, shareWay, tgShareUrl, type EnvHints, type TgCaps } from '../logic/shareEnv.ts';
import { post, supabase } from './api.ts';
import { translate, type Key } from './i18n.ts';
import { shareLead, shareMessage, storyText, storyWidget } from './shareText.ts';
import { getApp, setting, toast } from './store.ts';
import { miniApp } from './telegram.ts';

const say = (key: Key, isError = false): void => toast(translate(key, getApp().lang), isError);

const blobOf = (c: HTMLCanvasElement): Promise<Blob> => new Promise((ok, bad) => { c.toBlob((b) => (b ? ok(b) : bad(new Error('shot'))), 'image/jpeg', 0.92); });
const fileOf = (blob: Blob): File => new File([blob], 'cityland.jpg', { type: 'image/jpeg' });

export const envHints = (blob?: Blob): EnvHints => ({
  isMiniApp: miniApp() !== null,
  userAgent: navigator.userAgent,
  canShare: typeof navigator.share === 'function',
  canShareFiles: blob ? navigator.canShare?.({ files: [fileOf(blob)] }) === true : false,
});
const tgCaps = (): TgCaps => {
  const wa = miniApp();
  const at = (v: string): boolean => wa?.isVersionAtLeast?.(v) === true;
  return { downloadFile: Boolean(wa?.downloadFile) && at('8.0'), shareToStory: Boolean(wa?.shareToStory) && at('7.8'), isPremium: wa?.initDataUnsafe?.user?.is_premium === true };
};

/** O'z taklif havolasi (bot orqali): `https://t.me/<bot>?start=r_<kod>`. */
export const myRefLink = (): string => refLink(setting('telegram_bot', ''), getApp().profile?.ref, location.origin);

const download = (blob: Blob, name = 'cityland.jpg'): void => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
};
const copy = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

/** Telegram uchun: rasm vaqtincha ochiq omborga (https havola kerak). */
const upload = async (blob: Blob): Promise<{ readonly path: string; readonly url: string }> => {
  const uid = getApp().profile?.id;
  if (!uid) throw new Error('not_signed_in');
  const path = `${uid}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from('shots').upload(path, blob, { contentType: 'image/jpeg' });
  if (error) throw new Error('upload');
  return { path, url: supabase.storage.from('shots').getPublicUrl(path).data.publicUrl };
};
/** Bot rasmni foydalanuvchining o'ziga chatga yuboradi (taklif havolasi bilan). */
const viaBot = async (blob: Blob): Promise<void> => {
  const { path } = await upload(blob);
  await post('/photo/send', { path }, true);
  say('photoSentChat');
};

/** "Saqlash". */
export const savePhoto = async (canvas: HTMLCanvasElement): Promise<void> => {
  const blob = await blobOf(canvas);
  const way = saveWay(shareEnv(envHints()), tgCaps());
  try {
    if (way === 'tg-download') {
      const { url } = await upload(blob);
      miniApp()?.downloadFile?.({ url, file_name: 'cityland.jpg' });
      return;
    }
    if (way === 'tg-bot') return await viaBot(blob);
    download(blob);
    say(way === 'instagram-hint' ? 'instaHint' : 'photoSaved');
  } catch {
    // Telegram'da yuklash yoki bot ishlamasa — oddiy yuklab olish va xabar.
    download(blob);
    say('photoSaveFail', true);
  }
};

/** "Ulashish": rasm + o'z taklif havolasi. */
export const sharePhoto = async (canvas: HTMLCanvasElement): Promise<void> => {
  const blob = await blobOf(canvas);
  const hints = envHints(blob);
  const env = shareEnv(hints);
  const way = shareWay(env, tgCaps(), hints);
  const link = myRefLink();
  const lang = getApp().lang;
  try {
    if (way === 'tg-story') {
      const { url } = await upload(blob);
      const premium = tgCaps().isPremium;
      miniApp()?.shareToStory?.(url, { text: storyText(lang), ...(premium ? { widget_link: { url: link, name: storyWidget(lang) } } : {}) });
      return;
    }
    if (way === 'tg-bot') return await viaBot(blob);
    if (way === 'instagram-hint') {
      download(blob);
      await copy(link);
      say('instaHint');
      return;
    }
    // Instagram stories'ga havola avtomatik qo'shilmaydi — avval nusxalanadi va ko'rsatma.
    const isCopied = await copy(link);
    if (way === 'native-files') {
      await navigator.share({ files: [fileOf(blob)], text: shareMessage(lang, link) });
      if (isCopied) say('storyLinkHint');
      return;
    }
    if (way === 'native-link') {
      download(blob);
      await navigator.share({ text: shareLead(lang), url: link });
      return;
    }
    download(blob);
    say(isCopied ? 'photoSavedLink' : 'photoSaved');
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === 'AbortError') return; // foydalanuvchi o'zi bekor qildi
    download(blob);
    say('shareFail', true);
  }
};

/** Havolani ulashish (taklif, uy): Mini App'da Telegram oynasi, telefonda tizim oynasi; bo'lmasa — nusxalash. */
export const shareLink = async (url: string, text: string): Promise<void> => {
  const env = shareEnv(envHints());
  const way = linkWay(env, typeof navigator.share === 'function');
  if (way === 'tg-share-url') {
    const wa = miniApp();
    if (wa?.openTelegramLink) { wa.openTelegramLink(tgShareUrl(url, text)); return; }
  }
  if (way === 'native') {
    try {
      await navigator.share({ text, url });
      return;
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
    }
  }
  const isCopied = await copy(url);
  say(isCopied ? 'copied' : 'shareFail', !isCopied);
};

/** O'z taklif havolasini ulashish (Uyim, tabrik, uy oynasi). */
export const shareInvite = (): Promise<void> => shareLink(myRefLink(), shareLead(getApp().lang));
