/** Shu kadrda nima chiziladi: yaqin/uzoq masofalar, ko'rinadigan uchburchak, tuman. Sof hisob. */
import { inWedge, pitchOf, viewDistance, wedgeOf, type CityView, type Wedge } from './cityCamera.ts';
import type { Quality } from './quality.ts';

/** Shu balandlikdan odamlar, mashinalar va mayda narsalar ko'rinmaydi. */
export const PEOPLE_HEIGHT = 45;
/** Shundan balandda soyalar o'chadi va yengil (katta bo'lakli) yer ishlatiladi. */
export const HIGH_ALTITUDE = 65;

export interface View {
  /** Qidiruv markazi va radiusi. */
  readonly x: number; readonly z: number; readonly radius: number;
  /** Masofalar shu nuqtadan (balandlik bilan) o'lchanadi. */
  readonly eyeX: number; readonly eyeZ: number; readonly eyeY: number;
  readonly near: number; readonly detail: number;
  /** Katta narsalar (minora, kran, tijorat) ko'rinadigan masofa. */
  readonly far: number;
  readonly tree: number; readonly small: number; readonly label: number;
  /** Uzoq niklar (bitta qatlam) shu masofagacha: shaharda — butun ko'rinish, piyoda/mashinada — faqat yaqindagilar. */
  readonly nicks: number;
  readonly fogNear: number; readonly fogFar: number;
  readonly isSimple: boolean;
  readonly isHidden: (x: number, z: number, slack?: number) => boolean;
}

const LABEL_RANGE = 46;
const BEHIND_FREE = 34;

export interface GroundViewInput { readonly x: number; readonly z: number; readonly yaw: number; readonly quality: Quality; /** Video: hamma narsa uzoqroqdan. */ readonly boost: number; readonly isVideo: boolean }
/** Piyoda, mashina va video: markaz — odam, orqadagi uzoq narsalar chizilmaydi. */
export const groundView = ({ x, z, yaw, quality: q, boost, isVideo }: GroundViewInput): View => {
  const dirX = Math.sin(yaw);
  const dirZ = Math.cos(yaw);
  return {
    x, z, radius: q.mid * boost, eyeX: x, eyeZ: z, eyeY: 0, near: q.near * boost, detail: q.detail * boost, far: q.fog * boost, tree: q.mid * boost * 0.75, small: q.near * boost * 1.8, label: LABEL_RANGE * boost, nicks: LABEL_RANGE * boost,
    fogNear: q.fog * 0.25 * boost, fogFar: q.fog * boost, isSimple: q.level === 'low' && !isVideo,
    isHidden: (px, pz, slack = 0) => {
      const d = Math.hypot(px - x, pz - z) - slack;
      return !isVideo && d > BEHIND_FREE && (px - x) * dirX + (pz - z) * dirZ < d * -0.1;
    },
  };
};

const CITY_NEAR_BOOST = 1.5;
/** Shahar rejimi: markaz — kamera qaragan nuqta, tashqaridagi hamma narsa kesiladi. */
export const cityView = (v: CityView, q: Quality, halfFov: number): View => {
  const wedge: Wedge = wedgeOf(v, halfFov);
  const distance = viewDistance(v);
  const isHigh = v.height > PEOPLE_HEIGHT;
  const ahead = Math.min(q.cityView * 0.35, v.height / Math.tan(pitchOf(v.height)));
  return {
    x: v.x - Math.sin(v.yaw) * ahead, z: v.z - Math.cos(v.yaw) * ahead, radius: q.cityView,
    eyeX: wedge.x, eyeZ: wedge.z, eyeY: v.height, near: q.near * CITY_NEAR_BOOST, detail: isHigh ? 0 : q.detail * CITY_NEAR_BOOST, far: q.cityView,
    tree: isHigh ? q.cityTree : q.mid, small: isHigh ? 0 : q.near * 2, label: isHigh ? 0 : LABEL_RANGE * CITY_NEAR_BOOST, nicks: q.cityView,
    fogNear: distance + q.cityView * 0.25, fogFar: distance + q.cityView * 0.95, isSimple: q.level === 'low',
    isHidden: (px, pz) => !inWedge(wedge, px, pz),
  };
};
export const distanceFrom = (v: View, x: number, z: number): number => Math.hypot(x - v.eyeX, z - v.eyeZ, v.eyeY);
