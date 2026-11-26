/** Yorliqlarni ekranga joylash: batafsillari (yaqin, o'z uyim) va uzoq niklar bitta ekran-to'rda — ustma-ust tushsa uzoqrog'i yashiriladi. */
import { Vector3, type Camera } from 'three';
import { declutter, labelPx, type ScreenBox } from '../logic/declutter.ts';
import type { NickCandidate } from './collect.ts';
import type { LabelInfo } from './labels.ts';
import { FAR_MAX, type FarNick, type FarNicks } from './nicks.ts';

/** Uzoq nik: matn ≥ ~10 px (pill 15 px), eng kattasi 24 px. */
const FAR_PX = { max: 24, min: 15 } as const;
/** Batafsil yorliq eni (px) taxmini: matn + ichki joy + belgi, level, yurak. */
const detailWidth = (l: LabelInfo, h: number): number =>
  h * (1.2 + 0.33 * l.text.length + (l.isMine || l.icon || l.badge ? 0.7 : 0) + (l.level ? 0.6 : 0) + (l.hearts ? 0.9 : 0));

const tmp = new Vector3();
/** Dunyo nuqtasi → ekran (CSS px); kamera orqasida — null. */
const toScreen = (camera: Camera, x: number, y: number, z: number, size: { readonly width: number; readonly height: number }): { readonly sx: number; readonly sy: number } | null => {
  tmp.set(x, y, z).applyMatrix4(camera.matrixWorldInverse);
  if (tmp.z > -0.5) return null;
  tmp.applyMatrix4(camera.projectionMatrix);
  return { sx: ((tmp.x + 1) / 2) * size.width, sy: ((1 - tmp.y) / 2) * size.height };
};

export interface Placed { readonly detail: readonly LabelInfo[]; readonly far: readonly FarNick[] }

/** `fixed` — doim ko'rinadi (qahramon, loyihalar); `detail` — batafsil (o'z uyim birinchi); `nicks` — qolgan egali uylar, yaqinidan. */
export const placeLabels = (fixed: readonly LabelInfo[], detail: readonly LabelInfo[], nicks: readonly NickCandidate[], camera: Camera, size: { readonly width: number; readonly height: number }, far: FarNicks): Placed => {
  const at = camera.position;
  const dist = (l: LabelInfo): number => Math.hypot(l.x - at.x, l.y - at.y, l.z - at.z);
  const boxOfDetail = (l: LabelInfo): ScreenBox | null => {
    const p = toScreen(camera, l.x, l.y, l.z, size);
    const h = labelPx(dist(l)) * (l.size ?? 1);
    return p ? { cx: p.sx, cy: p.sy, w: detailWidth(l, h), h } : null;
  };
  const candidates = nicks.slice(0, FAR_MAX * 3);
  const keepTexts = candidates.slice(0, FAR_MAX).map((n) => n.info.text);
  const farPx = candidates.map((n) => labelPx(dist(n.info), FAR_PX.max, FAR_PX.min));
  const boxOfFar = (n: NickCandidate, i: number): ScreenBox | null => {
    const p = toScreen(camera, n.info.x, n.info.y, n.info.z, size);
    const aspect = p ? far.aspectOf(n.info.text, keepTexts) : null;
    const h = farPx[i] ?? FAR_PX.min;
    return p && aspect ? { cx: p.sx, cy: p.sy, w: aspect * h, h } : null;
  };
  // O'z uyim birinchi (ro'yxatda allaqachon birinchi) — u hech qachon yashirilmaydi; qolgani yaqinidan.
  const boxes = [...detail.map(boxOfDetail), ...candidates.map(boxOfFar)];
  const kept = new Set(declutter(boxes, detail.length + FAR_MAX, size));
  const shownDetail = detail.filter((l, i) => l.isMine === true || kept.has(i));
  const shownFar: FarNick[] = [];
  candidates.forEach((n, i) => {
    if (!kept.has(detail.length + i)) return;
    shownFar.push({ key: n.info.key, text: n.info.text, x: n.info.x, y: n.info.y, z: n.info.z, px: farPx[i] ?? FAR_PX.min });
  });
  return { detail: [...fixed, ...shownDetail], far: shownFar };
};
