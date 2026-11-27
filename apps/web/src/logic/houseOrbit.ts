/** "Uyimni suratga olish" (19-qadam): kamera faqat o'z uyi atrofida — 360° aylanish, burchak 25°–65°, cheklangan yaqinlashtirish. Sof hisob. */
import type { Pose } from './cameraPath.ts';

export interface HouseOrbit {
  readonly plot: string;
  /** Qaraladigan nuqta (uy markazi, yerdan biroz yuqori). */
  readonly x: number; readonly y: number; readonly z: number;
  readonly yaw: number; readonly pitch: number; readonly dist: number;
  readonly minDist: number; readonly maxDist: number;
}
export const PITCH_MIN = (25 * Math.PI) / 180;
export const PITCH_MAX = (65 * Math.PI) / 180;
/** Boshlang'ich burchak ~40° pastga: uy va hovli to'liq kadrda. */
export const PITCH_START = (40 * Math.PI) / 180;
/** Old tomondan biroz yon (eng chiroyli rakurs). */
const SIDE = 0.62;
const YAW_PER_PX = 0.006;
const PITCH_PER_PX = 0.004;

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

interface PlotLike { readonly id: string; readonly x: number; readonly z: number; readonly w: number; readonly d: number; readonly rot: number }
/** Uy uchun boshlang'ich orbit: masofa uchastka o'lchamiga qarab, hovli kadrdan chiqib ketmaydi. */
export const startOrbit = (p: PlotLike, ground: number): HouseOrbit => {
  const size = Math.max(p.w, p.d);
  return {
    plot: p.id, x: p.x, y: ground + 3, z: p.z, yaw: (p.rot * Math.PI) / 2 + SIDE, pitch: PITCH_START,
    dist: size * 1.2, minDist: size * 0.6, maxDist: size * 1.7,
  };
};

export interface OrbitInput { readonly panX: number; readonly panY: number; readonly zoomBy: number; readonly twist: number }
/** Barmoq: gorizontal — aylantirish, vertikal — burchak, qisish/g'ildirak — yaqinlashtirish. Markaz o'zgarmaydi. */
export const stepOrbit = (o: HouseOrbit, i: OrbitInput): HouseOrbit => ({
  ...o,
  yaw: o.yaw - i.panX * YAW_PER_PX + i.twist,
  pitch: clamp(o.pitch + i.panY * PITCH_PER_PX, PITCH_MIN, PITCH_MAX),
  dist: clamp(o.dist * (i.zoomBy || 1), o.minDist, o.maxDist),
});

export const orbitPose = (o: HouseOrbit): Pose => {
  const flat = Math.cos(o.pitch) * o.dist;
  return { x: o.x + Math.sin(o.yaw) * flat, y: o.y + Math.sin(o.pitch) * o.dist, z: o.z + Math.cos(o.yaw) * flat, tx: o.x, ty: o.y, tz: o.z };
};
