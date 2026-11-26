/** "Shahar" rejimi: erkin kamera. Holat — qaralayotgan nuqta, burilish va balandlik; qolgani shundan hisoblanadi. */
import { CITY_HALF, padHeight, type Plot } from '../../../../packages/shared/src/index.ts';
import type { Pose } from './cameraPath.ts';

export interface CityView { readonly x: number; readonly z: number; readonly yaw: number; readonly height: number }
export const MIN_HEIGHT = 15;
export const START_VIEW: CityView = { x: 0, z: 0, yaw: 0, height: 95 };
const LOW_PITCH = 0.52;
/** Eng balandda ~63° — xarita kabi tepadan (14-qadam). */
const HIGH_PITCH = 1.1;
const FULL_PITCH_HEIGHT = 450;
const LIMIT = CITY_HALF;

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));

/** Pastda qiyaroq, balandda deyarli tepadan qaraydi. */
export const pitchOf = (height: number): number => LOW_PITCH + (HIGH_PITCH - LOW_PITCH) * clamp((height - MIN_HEIGHT) / (FULL_PITCH_HEIGHT - MIN_HEIGHT), 0, 1);

export const clampView = (v: CityView, maxHeight: number): CityView => ({
  x: clamp(v.x, -LIMIT, LIMIT), z: clamp(v.z, -LIMIT, LIMIT), yaw: wrap(v.yaw), height: clamp(v.height, MIN_HEIGHT, maxHeight),
});

export const cityPose = (v: CityView, ground = 0): Pose => {
  const back = v.height / Math.tan(pitchOf(v.height));
  return { x: v.x + Math.sin(v.yaw) * back, y: ground + v.height, z: v.z + Math.cos(v.yaw) * back, tx: v.x, ty: ground + 1, tz: v.z };
};
export const viewDistance = (v: CityView): number => v.height / Math.sin(pitchOf(v.height));
export const metersPerPixel = (v: CityView, fovDeg: number, viewportHeight: number): number =>
  (2 * viewDistance(v) * Math.tan((fovDeg * Math.PI) / 360)) / Math.max(1, viewportHeight);

/** Ekranni sudrash: barmoq ostidagi yer barmoq bilan birga yuradi. dx o'ngga, dy pastga (metr). */
export const pan = (v: CityView, dx: number, dy: number): CityView => {
  const s = Math.sin(v.yaw);
  const c = Math.cos(v.yaw);
  const ahead = dy / Math.sin(pitchOf(v.height));
  return { ...v, x: v.x - c * dx - s * ahead, z: v.z + s * dx - c * ahead };
};
export const zoom = (v: CityView, factor: number): CityView => ({ ...v, height: v.height * factor });
export const rotate = (v: CityView, delta: number): CityView => ({ ...v, yaw: v.yaw + delta });

export interface Flight { readonly from: CityView; readonly to: CityView; readonly startedAt: number; readonly ms: number }
const FLIGHT_MIN = 450;
const FLIGHT_MAX = 950;
const FLIGHT_MS_PER_M = 1.4;
export const startFlight = (from: CityView, to: CityView, now: number): Flight =>
  ({ from, to, startedAt: now, ms: clamp(Math.hypot(to.x - from.x, to.z - from.z) * FLIGHT_MS_PER_M, FLIGHT_MIN, FLIGHT_MAX) });
/** Silliq uchish; uzoq masofada o'rtada balandroq ko'tariladi. */
export const flightAt = (f: Flight, now: number): { readonly view: CityView; readonly isDone: boolean } => {
  const t = clamp((now - f.startedAt) / f.ms, 0, 1);
  const k = t * t * (3 - 2 * t);
  const distance = Math.hypot(f.to.x - f.from.x, f.to.z - f.from.z);
  const lift = Math.sin(t * Math.PI) * Math.min(60, distance * 0.12);
  return {
    isDone: t >= 1,
    view: {
      x: f.from.x + (f.to.x - f.from.x) * k, z: f.from.z + (f.to.z - f.from.z) * k, yaw: f.from.yaw + wrap(f.to.yaw - f.from.yaw) * k,
      height: f.from.height + (f.to.height - f.from.height) * k + lift,
    },
  };
};

const HOUSE_HEIGHT: Readonly<Record<Plot['type'], number>> = { hovli: 22, villa: 26, qasr: 34, kvartira: 40 };
/** Uyga qaragan ko'rinish: kamera old tomonda turadi. */
export const viewOfPlot = (p: Plot): CityView => {
  const yaw = (p.rot * Math.PI) / 2;
  const ahead = p.type === 'kvartira' ? 0 : p.d * 0.12;
  return { x: p.x + Math.sin(yaw) * ahead, z: p.z + Math.cos(yaw) * ahead, yaw, height: HOUSE_HEIGHT[p.type] + padHeight(p) * 0.2 };
};
export interface Screen { readonly width: number; readonly height: number }
const NARROW = 640;
const SHEET_WIDTH = 422;
/** Ochiladigan oyna telefonda ekranning pastki yarmini, kompyuterda o'ng chetini egallaydi. */
const PHONE_LIFT = 0.17;
/** Uy oyna to'sib qo'ymagan qismda ko'rinishi uchun kamerani suradi. */
export const framed = (v: CityView, s: Screen): CityView => {
  const k = metersPerPixel(v, s.height > s.width ? 70 : 58, s.height);
  return s.width <= NARROW ? pan(v, 0, -s.height * PHONE_LIFT * k) : pan(v, -Math.min(SHEET_WIDTH, s.width * 0.6) * 0.5 * k, 0);
};
export const viewOfPoint = (x: number, z: number, yaw: number, height: number): CityView => ({ x, z, yaw, height });

/** Kamera qaragan tomondagi uchburchak: undan tashqaridagi narsa chizilmaydi. */
export interface Wedge { readonly x: number; readonly z: number; readonly dirX: number; readonly dirZ: number; readonly cos: number; readonly slack: number }
const WEDGE_MARGIN = 0.28;
export const wedgeOf = (v: CityView, halfFov: number): Wedge => {
  const back = v.height / Math.tan(pitchOf(v.height));
  return { x: v.x + Math.sin(v.yaw) * back, z: v.z + Math.cos(v.yaw) * back, dirX: -Math.sin(v.yaw), dirZ: -Math.cos(v.yaw), cos: Math.cos(Math.min(1.5, halfFov + WEDGE_MARGIN)), slack: 35 + v.height * 0.35 };
};
export const inWedge = (w: Wedge, x: number, z: number): boolean => {
  const dx = x - w.x;
  const dz = z - w.z;
  const d = Math.hypot(dx, dz);
  return d < w.slack || dx * w.dirX + dz * w.dirZ > (d - w.slack) * w.cos - w.slack * 0.2;
};
