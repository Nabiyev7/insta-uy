/** 19-qadam (2–3): rasmni saqlash va ulashish — har muhit uchun yo'l; har ulashishda o'z taklif havolasi. */
import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { linkWay, refLink, saveWay, shareEnv, shareWay, tgShareUrl, type TgCaps } from '../src/logic/shareEnv.ts';
import { shareLead, shareMessage } from '../src/app/shareText.ts';

const UA = {
  android: 'Mozilla/5.0 (Linux; Android 14) Chrome/130 Mobile Safari/537.36',
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Safari/604.1',
  insta: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0) Instagram 350.0',
  desktop: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130 Safari/537.36',
};
const TG_NEW: TgCaps = { downloadFile: true, shareToStory: true, isPremium: false };
const TG_OLD: TgCaps = { downloadFile: false, shareToStory: false, isPremium: false };

describe('muhit', () => {
  test('Telegram Mini App, Instagram ichi, telefon, kompyuter', () => {
    expect(shareEnv({ isMiniApp: true, userAgent: UA.android, canShare: true, canShareFiles: true })).toBe('telegram');
    expect(shareEnv({ isMiniApp: false, userAgent: UA.insta, canShare: true, canShareFiles: true })).toBe('instagram');
    expect(shareEnv({ isMiniApp: false, userAgent: UA.iphone, canShare: true, canShareFiles: true })).toBe('mobile');
    expect(shareEnv({ isMiniApp: false, userAgent: UA.desktop, canShare: false, canShareFiles: false })).toBe('desktop');
  });
});

describe('saqlash', () => {
  test('Telegram 8.0+ — downloadFile; eski Telegram — bot chatga yuboradi; Instagram — ko‘rsatma; boshqalar — yuklab olish', () => {
    expect(saveWay('telegram', TG_NEW)).toBe('tg-download');
    expect(saveWay('telegram', TG_OLD)).toBe('tg-bot');
    expect(saveWay('instagram', TG_OLD)).toBe('instagram-hint');
    expect(saveWay('mobile', TG_OLD)).toBe('download');
    expect(saveWay('desktop', TG_OLD)).toBe('download');
  });
});

describe('ulashish', () => {
  test('Telegram — stories yoki bot; telefon — fayl bilan tizim oynasi, bo‘lmasa havola; kompyuter — saqlash + nusxa; Instagram — ko‘rsatma', () => {
    expect(shareWay('telegram', TG_NEW, { canShare: true, canShareFiles: true })).toBe('tg-story');
    expect(shareWay('telegram', TG_OLD, { canShare: true, canShareFiles: true })).toBe('tg-bot');
    expect(shareWay('mobile', TG_OLD, { canShare: true, canShareFiles: true })).toBe('native-files');
    expect(shareWay('mobile', TG_OLD, { canShare: true, canShareFiles: false })).toBe('native-link');
    expect(shareWay('desktop', TG_OLD, { canShare: false, canShareFiles: false })).toBe('download-copy');
    expect(shareWay('instagram', TG_OLD, { canShare: true, canShareFiles: true })).toBe('instagram-hint');
  });
  test('havola ulashish: Telegram oynasi, telefon — tizim oynasi, aks holda nusxalash', () => {
    expect(linkWay('telegram', false)).toBe('tg-share-url');
    expect(linkWay('mobile', true)).toBe('native');
    expect(linkWay('desktop', false)).toBe('copy');
    expect(linkWay('instagram', true)).toBe('copy');
    expect(tgShareUrl('https://t.me/b?start=r_ab', 'Salom')).toBe('https://t.me/share/url?url=https%3A%2F%2Ft.me%2Fb%3Fstart%3Dr_ab&text=Salom');
  });
});

describe('taklif havolasi', () => {
  test('bot orqali: https://t.me/Citylanduz_bot?start=r_<kod>', () => {
    expect(refLink('@Citylanduz_bot', 'abc123', 'https://citylanduz.pages.dev')).toBe('https://t.me/Citylanduz_bot?start=r_abc123');
    expect(refLink('', 'abc123', 'https://sayt.uz')).toBe('https://sayt.uz/?ref=abc123');
    expect(refLink('Citylanduz_bot', null, 'https://sayt.uz')).toBe('https://t.me/Citylanduz_bot?start=from_share');
  });
  test('ulashish matni (uz/ru) havola bilan — egasining so‘zlari', () => {
    expect(shareMessage('uz', 'https://t.me/b?start=r_x')).toBe("Men CityLand UZ'da uy oldim 🏡 Sen ham bepul ol 👉 https://t.me/b?start=r_x");
    expect(shareMessage('ru', 'L')).toContain('CityLand UZ');
    expect(shareMessage('ru', 'L').endsWith('L')).toBe(true);
    expect(shareLead('uz')).not.toContain('{link}');
  });
  test('rasm belgisida o‘z taklif havolasi; natijada "Saqlash" va "Ulashish" — share.ts orqali', () => {
    const layer = readFileSync(new URL('../src/world/PhotoLayer.tsx', import.meta.url), 'utf8');
    expect(layer).toContain('link: myRefLink()');
    const panel = readFileSync(new URL('../src/ui/PhotoPanel.tsx', import.meta.url), 'utf8');
    expect(panel).toContain('act(savePhoto)');
    expect(panel).toContain('act(sharePhoto)');
  });
});

describe('4-band: "nusxalash" o‘rniga "Ulashish"', () => {
  test('Uyim (taklif va uy kartasi), uy oynasi, tabrik — shareInvite; nusxalash faqat kichik belgi sifatida', () => {
    for (const f of ['MePanel.tsx', 'PlotPanel.tsx', 'CongratsPanel.tsx']) {
      const src = readFileSync(new URL(`../src/ui/${f}`, import.meta.url), 'utf8');
      expect(src, f).toContain('run(shareInvite)');
      expect(src, f).not.toMatch(/copyText\(houseUrl|copyText\(inviteUrl/);
    }
    expect(readFileSync(new URL('../src/ui/MePanel.tsx', import.meta.url), 'utf8')).toContain("copyText(myRefLink())");
  });
});
