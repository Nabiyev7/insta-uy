/** "Mashina" rejimi: oddiy arkada fizikasi. Sof hisob. */
import { footprint, type Plot, type Road } from '../../../../packages/shared/src/index.ts';
import type { Item, Solid } from './item.ts';
import { movePlayer } from './motion.ts';

export interface CarSpec { readonly id: string; readonly model: string; readonly scale: number; readonly top: number; readonly accel: number; /** null — hammaga bepul. */ readonly decor: string | null; readonly uz: string; readonly ru: string }
/** Piyodadan (4.2 m/s) 4–5 barobar tez. Tartibi o'zgarmasin: indeks tarmoqda ishlatiladi. */
export const CARS: readonly CarSpec[] = [
  { id: 'oddiy', model: 'car_van', scale: 0.85, top: 17, accel: 7, decor: null, uz: 'Oddiy mashina', ru: 'Простая машина' },
  { id: 'furgon', model: 'car_van', scale: 1, top: 18.5, accel: 8, decor: 'car_van', uz: 'Oq furgon', ru: 'Белый фургон' },
  { id: 'sedan', model: 'car_sedan', scale: 1, top: 19.5, accel: 9, decor: 'car_sedan', uz: 'Sedan', ru: 'Седан' },
  { id: 'sport', model: 'car_sport', scale: 1, top: 21, accel: 13, decor: 'car_sport', uz: 'Sport mashina', ru: 'Спорткар' },
];
export const carById = (id: string): CarSpec => CARS.find((c) => c.id === id) ?? CARS[0]!;
/** Egalik qilingan mashinalar (bepuli doim bor). */
export const ownedCars = (decor: Readonly<Record<string, number>> | undefined): readonly CarSpec[] => CARS.filter((c) => c.decor === null || (decor?.[c.decor] ?? 0) > 0);

/** Tarmoqdagi holat kodi: 0–5 odam, 6 — shaharga tepadan qarayapti (ko'rinmaydi), 10+ — mashinada. */
export const ANIM_AWAY = 6;
export const ANIM_CAR = 10;
export const carOfAnim = (anim: number): CarSpec | null => (anim >= ANIM_CAR ? CARS[anim - ANIM_CAR] ?? null : null);
export const animOfCar = (id: string): number => ANIM_CAR + Math.max(0, CARS.findIndex((c) => c.id === id));

export interface CarState { readonly x: number; readonly z: number; readonly yaw: number; readonly speed: number }
export interface CarInput { readonly gas: number; readonly steer: number; readonly isBraking: boolean }

export const CAR_RADIUS = 1.3;
/** Markazdan old (yoki orqa) to'qnashuv nuqtasigacha, m. */
const NOSE = 0.95;
const REVERSE_TOP = 6;
const DRAG = 2.6;
const BRAKE = 24;
const TURN_RATE = 1.9;
const FULL_TURN_SPEED = 5;
const HIGH_SPEED_TURN_LOSS = 0.5;
const MAX_STEP = 0.6;

const toward = (v: number, target: number, step: number): number => (v < target ? Math.min(target, v + step) : Math.max(target, v - step));

const nextSpeed = (s: number, i: CarInput, spec: CarSpec, dt: number): number => {
  if (i.isBraking) return toward(s, 0, BRAKE * dt);
  if (Math.abs(i.gas) < 0.08) return toward(s, 0, DRAG * dt);
  const isReversing = s * i.gas < 0;
  const speed = s + i.gas * (isReversing ? BRAKE * 0.7 : spec.accel) * dt;
  return Math.max(-REVERSE_TOP, Math.min(spec.top, speed));
};

/** Bir qadam: tezlik, burilish, to'siqqa urilib to'xtash. */
export const stepCar = (s: CarState, i: CarInput, dt: number, spec: CarSpec, solids: readonly Solid[], hasBridge = false): CarState => {
  const speed = nextSpeed(s.speed, i, spec, dt);
  const grip = Math.min(1, Math.abs(speed) / FULL_TURN_SPEED) * (1 - HIGH_SPEED_TURN_LOSS * Math.min(1, Math.abs(speed) / spec.top));
  const yaw = s.yaw - i.steer * TURN_RATE * grip * Math.sign(speed) * dt;
  const distance = speed * dt;
  const steps = Math.max(1, Math.ceil(Math.abs(distance) / MAX_STEP));
  const [dx, dz] = [(Math.sin(yaw) * distance) / steps, (Math.cos(yaw) * distance) / steps];
  // To'qnashuv mashinaning yurayotgan tomondagi uchidan o'lchanadi: burni devorga kirmaydi.
  const tip = NOSE * (speed < 0 ? -1 : 1);
  const [tx, tz] = [Math.sin(yaw) * tip, Math.cos(yaw) * tip];
  let end = { x: s.x + tx, z: s.z + tz };
  for (let n = 0; n < steps; n++) end = movePlayer(end, dx, dz, solids, hasBridge, CAR_RADIUS);
  const at = { x: end.x - tx, z: end.z - tz };
  if (Math.abs(distance) < 1e-6) return { x: at.x, z: at.z, yaw, speed };
  // Urilganda faqat oldinga siljigan ulushi qoladi: to'g'ridan urilsa to'xtaydi, yonlab sirpansa sekinlashadi.
  const progress = ((at.x - s.x) * Math.sin(yaw) + (at.z - s.z) * Math.cos(yaw)) / distance;
  const isHit = progress < 0.98;
  return { x: at.x, z: at.z, yaw, speed: isHit ? speed * Math.max(0, progress) * 0.85 : speed };
};

/** Uchastka ichiga mashina kirmaydi (bo'sh bo'lsa ham). */
export const plotSolid = (p: Plot): Solid => ({ ...footprint(p), h: 1.6 });
const TREE_HALF: Readonly<Record<string, number>> = { tree_chinor: 0.45, tree_terak: 0.35, tree_archa: 0.35, tree_anor: 0.3, street_lamp: 0.2 };
export const treeSolid = (i: Item): Solid | null => {
  const half = TREE_HALF[i.model];
  return half === undefined ? null : { x: i.x, z: i.z, hx: half, hz: half, h: 3 };
};

const LANE: Readonly<Record<Road['kind'], number>> = { prospekt: 5.2, kocha: 1.9 };
/** Eng yaqin yo'l bo'lagi — mashina shu yerda paydo bo'ladi. */
export const roadSpot = (roads: readonly Road[], x: number, z: number): CarState => {
  const spot = (r: Road): { readonly x: number; readonly z: number; readonly yaw: number; readonly d: number } => {
    const isX = r.w > r.d;
    const end = (isX ? r.w : r.d) / 2 - 3;
    const u = Math.max(-end, Math.min(end, isX ? x - r.x : z - r.z));
    const [px, pz] = isX ? [r.x + u, r.z + LANE[r.kind]] : [r.x - LANE[r.kind], r.z + u];
    return { x: px, z: pz, yaw: isX ? Math.PI / 2 : 0, d: Math.hypot(px - x, pz - z) };
  };
  const best = roads.map(spot).reduce<ReturnType<typeof spot> | null>((b, s) => (b && b.d <= s.d ? b : s), null);
  return best ? { x: best.x, z: best.z, yaw: best.yaw, speed: 0 } : { x, z, yaw: 0, speed: 0 };
};
