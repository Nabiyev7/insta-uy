/** Foto rejimi (17-qadam): yorug'lik (oltin soat, tun), maket effekti (tilt-shift), format va kadr o'lchami. Sof hisob — testlanadi.
 *  Effektlar faqat Foto rejimida; o'yin rejimi va uning tezligi o'zgarmaydi. */
import type { Daylight, Rgb } from './atmosphere.ts';

export type PhotoLight = 'now' | 'golden' | 'night';
export type PhotoTilt = 'off' | 'low' | 'mid' | 'high';
export type PhotoFormat = '9:16' | '4:5' | '1:1';
/** `hasSign: false` — belgisiz kadr (Instagram shabloni o'z logotipini qo'yadi); `showMarks` — "+" belgilari kadrda qoladi (faqat lokal postlar uchun). */
export interface PhotoSettings { readonly light: PhotoLight; readonly tilt: PhotoTilt; readonly format: PhotoFormat; readonly hasLink: boolean; readonly hasSign?: boolean; readonly showMarks?: boolean }
export const PHOTO_DEFAULT: PhotoSettings = { light: 'now', tilt: 'off', format: '9:16', hasLink: true };

const hex = (h: string): Rgb => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
/** Quyosh yo'nalishi balandlik (gradus) va azimut bo'yicha (birlik vektor). */
export const sunDirection = (elevationDeg: number, azimuthDeg: number): readonly [number, number, number] => {
  const e = (elevationDeg * Math.PI) / 180;
  const a = (azimuthDeg * Math.PI) / 180;
  return [Math.cos(e) * Math.cos(a), Math.sin(e), Math.cos(e) * Math.sin(a)];
};

/** Oltin soat: past (~20°) iliq quyosh, uzun soyalar, kontrast kuchliroq; osmon pastda iliq, tepada och ko'k. */
export const GOLDEN: Daylight = {
  sun: sunDirection(20, 35), sunColor: hex('#ffc98a'), sunIntensity: 2.4, skyTop: hex('#7fbcef'), skyHorizon: hex('#ffe2bd'), ambient: 0.98, night: 0,
};
/** Tun: to'q ko'k osmon, oy yorug'i kuchsiz; derazalar va chiroqlar yonadi (`night` = 1). */
export const NIGHT: Daylight = {
  sun: sunDirection(38, 210), sunColor: hex('#9fb4ff'), sunIntensity: 0.32, skyTop: hex('#0b1533'), skyHorizon: hex('#1d2d57'), ambient: 0.5, night: 1,
};
export const lightOf = (mode: PhotoLight): Daylight | null => (mode === 'golden' ? GOLDEN : mode === 'night' ? NIGHT : null);

/** Ranglarni yakuniy tuzatish (faqat Foto): to'yinganlik, iliqlik (yorug' joylar), soyalardagi ko'kimtirlik, bloom. */
/** `exposure` — umumiy yorqinlik (tunda pasayadi, yonayotgan derazalar bloom bilan ajralib turadi); `night` — tungi ko'k tus. */
export interface Grade { readonly saturation: number; readonly warmth: number; readonly coolShadows: number; readonly bloom: number; readonly exposure: number; readonly night: number }
export const gradeOf = (light: PhotoLight, tilt: PhotoTilt): Grade => {
  const sat = tilt === 'off' ? 1.05 : 1.14;
  if (light === 'golden') return { saturation: sat + 0.04, warmth: 0.07, coolShadows: 0.05, bloom: 0, exposure: 1.06, night: 0 };
  if (light === 'night') return { saturation: sat - 0.12, warmth: 0.02, coolShadows: 0, bloom: 0.8, exposure: 0.46, night: 1 };
  return { saturation: sat, warmth: 0, coolShadows: 0, bloom: 0, exposure: 1, night: 0 };
};

/** Tilt-shift: xiralik kuchi (piksel, 1080 lik kadr uchun) va tiniq tasma markazi (0 — past, 1 — tepa). Kamera qanchalik tepadan qarasa, tasma shunchalik markazda. */
const BLUR_PX: Readonly<Record<PhotoTilt, number>> = { off: 0, low: 2.2, mid: 3.6, high: 5.2 };
export interface Tilt { readonly blur: number; readonly focus: number }
export const tiltOf = (tilt: PhotoTilt, pitchRad: number): Tilt => ({ blur: BLUR_PX[tilt], focus: 0.42 + 0.08 * Math.min(1, Math.max(0, pitchRad / 1.1)) });

/** Natija o'lchami. */
export const FORMAT_SIZE: Readonly<Record<PhotoFormat, { readonly w: number; readonly h: number }>> = { '9:16': { w: 1080, h: 1920 }, '4:5': { w: 1080, h: 1350 }, '1:1': { w: 1080, h: 1080 } };
export const aspectOf = (f: PhotoFormat): number => FORMAT_SIZE[f].w / FORMAT_SIZE[f].h;

/** Ekrandagi ramka (markazda, eng katta sig'adigan to'rtburchak). */
export interface Rect { readonly x: number; readonly y: number; readonly w: number; readonly h: number }
export const frameRect = (width: number, height: number, aspect: number): Rect => {
  const w = Math.min(width, height * aspect);
  const h = w / aspect;
  return { x: (width - w) / 2, y: (height - h) / 2, w, h };
};

/** Supersampling: ramka natija o'lchamidan kichik bo'lsa — kattaroq render (2×, kuchsiz telefonda 1,5×), lekin GPU chegarasidan oshmaydi. */
export const renderScale = (frameW: number, targetW: number, isWeak: boolean, maxCanvas = 4096, canvasW = frameW): number => {
  const want = Math.max(isWeak ? 1.5 : 2, targetW / Math.max(1, frameW));
  return Math.max(1, Math.min(want, maxCanvas / Math.max(1, canvasW)));
};


/** Tungi Foto kadrida derazalar va chiroqlarning yorqinligi (o'yindagidan necha baravar). */
export const PHOTO_NIGHT_GLOW = 1.9;
