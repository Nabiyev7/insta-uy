/** Shaharning asosiy o'lchamlari (metr). O'zgartirilmaydi: PLAN.md §2. x — sharq, z — janub. */
export const CITY_HALF = 1500;
/** Prospektlar orasi; ko'chalar shuning yarmida. */
export const CELL = 750;
export const BLOCK = 375;
export const AVENUE = 28;
export const STREET = 12;
/** Katak chiziqlari: prospektlar va ular orasidagi (har 375 m) ko'chalar. */
export const AVENUE_LINES = [-CELL, 0, CELL] as const;
export const STREET_LINES = [-CELL - BLOCK, -BLOCK, BLOCK, CELL + BLOCK] as const;
/** Halqa yo'l va undan shahar burchaklarigacha 4 diagonal prospekt. */
export const RING = { r: 650, w: 26 } as const;
export const DIAGONAL = { from: 220, w: 24 } as const;
/** Markaziy maydon (doira) va uni o'ragan bog' chegarasi. */
export const PLAZA_R = 140;
export const PARK_R = DIAGONAL.from;

export const LAKE = { x: 1220, z: 1220, rx: 180, rz: 180 } as const;
/** Ko'l atrofidagi sayilgoh ko'chasining o'qi. */
export const LAKE_ROAD = 200;
/** Daryo uchun ajratilgan yo'lak (eni 60 + har tomonda 20 m qirg'oq): uchastka qo'yilmaydi. */
export const RIVER = { half: 50, points: [[1500, -750], [1370, -300], [1370, 300], [1250, 800], [1220, 1220]] } as const;
export const HILL = { x: -1215, z: -1215, height: 30, sigma: 175 } as const;
/** Tepalik shu chiziqdan tashqarida (shimoli-g'arb burchakda) boshlanadi. */
export const HILL_EDGE = 880;
const HILL_RAMP = HILL_EDGE + 140;

const smoothstep = (a: number, b: number, v: number): number => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Ko'l ichida bo'lsa true; `margin` metr qirg'oq bilan. */
export const inLake = (x: number, z: number, margin = 0): boolean => Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.rx + margin;
export const inPlaza = (x: number, z: number, margin = 0): boolean => Math.hypot(x, z) < PLAZA_R + margin;

/** Tabiiy yer balandligi: tepalikdan boshqa joyda tekis. */
export const terrainHeight = (x: number, z: number): number => {
  if (x > -HILL_EDGE || z > -HILL_EDGE) return 0;
  const dx = x - HILL.x;
  const dz = z - HILL.z;
  const g = Math.exp(-(dx * dx + dz * dz) / (2 * HILL.sigma * HILL.sigma));
  return HILL.height * g * smoothstep(0.02, 0.3, g) * smoothstep(HILL_EDGE, HILL_RAMP, -x) * smoothstep(HILL_EDGE, HILL_RAMP, -z);
};

export const rotatedSize = (w: number, d: number, rot: number): readonly [number, number] =>
  rot % 2 === 0 ? [w, d] : [d, w];

type Point2 = readonly [number, number];
/** Nuqtadan kesmagacha masofa. */
export const segmentDistance = (x: number, z: number, [ax, az]: Point2, [bx, bz]: Point2): number => {
  const [dx, dz] = [bx - ax, bz - az];
  const t = Math.min(1, Math.max(0, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - ax - dx * t, z - az - dz * t);
};
/** Daryo o'qigacha masofa. */
export const riverDistance = (x: number, z: number): number => {
  const p: readonly Point2[] = RIVER.points;
  return Math.min(...p.slice(1).map((b, i) => segmentDistance(x, z, p[i] ?? b, b)));
};
export const inRiverbed = (x: number, z: number, margin = 0): boolean => riverDistance(x, z) < RIVER.half + margin;

/** `angle` — w o'qining x o'qidan burilishi (radian, x → z tomonga). */
export interface Tilted { readonly x: number; readonly z: number; readonly w: number; readonly d: number; readonly angle?: number }
/** Burilgan to'rtburchakning mahalliy o'qlari: u — w bo'ylab, v — d bo'ylab. */
export const toLocal = (r: Tilted, x: number, z: number): Point2 => {
  const a = r.angle ?? 0;
  const [dx, dz] = [x - r.x, z - r.z];
  return [dx * Math.cos(a) + dz * Math.sin(a), dz * Math.cos(a) - dx * Math.sin(a)];
};
/** Mahalliy (u, v) nuqta shahar koordinatasida. */
export const fromLocal = (r: Tilted, u: number, v: number): Point2 => {
  const a = r.angle ?? 0;
  return [r.x + u * Math.cos(a) - v * Math.sin(a), r.z + u * Math.sin(a) + v * Math.cos(a)];
};
export const inTilted = (r: Tilted, x: number, z: number, margin = 0): boolean => {
  const [u, v] = toLocal(r, x, z);
  return Math.abs(u) <= r.w / 2 + margin && Math.abs(v) <= r.d / 2 + margin;
};
/** O'qlarga parallel quti va burilgan to'rtburchak ustma-ust tushadimi (ajratuvchi o'qlar usuli). */
export const boxHitsTilted = (x: number, z: number, hx: number, hz: number, r: Tilted, slack = 0): boolean => {
  const a = r.angle ?? 0;
  const [c, s] = [Math.abs(Math.cos(a)), Math.abs(Math.sin(a))];
  const [rw, rd] = [r.w / 2 - slack, r.d / 2 - slack];
  if (Math.abs(r.x - x) >= hx + rw * c + rd * s || Math.abs(r.z - z) >= hz + rw * s + rd * c) return false;
  const [u, v] = toLocal(r, x, z);
  return Math.abs(u) < rw + hx * c + hz * s && Math.abs(v) < rd + hx * s + hz * c;
};
