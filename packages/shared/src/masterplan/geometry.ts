/** Shaharning asosiy o'lchamlari (metr). O'zgartirilmaydi: PLAN.md §2. */
export const CELL = 750;
export const CITY_HALF = 1500;
export const AVENUE = 28;
export const STREET = 12;
export const PLAZA_HALF = 125;
/** Tumanlararo prospekt o'qlari (x va z bo'yicha bir xil). */
export const AVENUE_LINES = [-CITY_HALF, -CELL, 0, CELL, CITY_HALF] as const;

export const LAKE = { x: 750, z: 1125, rx: 420, rz: 150 } as const;
export const HILL = { x: 1150, z: -1150, height: 36, sigma: 205 } as const;
/** Tepalik shu chiziqdan (tuman chegarasi) tashqarida boshlanadi. */
export const HILL_EDGE = CELL + AVENUE / 2;
const HILL_RAMP = HILL_EDGE + 140;

const smoothstep = (a: number, b: number, v: number): number => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Ko'l ichida bo'lsa true; `margin` metr qirg'oq bilan. */
export const inLake = (x: number, z: number, margin = 0): boolean => {
  const dx = (x - LAKE.x) / (LAKE.rx + margin);
  const dz = (z - LAKE.z) / (LAKE.rz + margin);
  return dx * dx + dz * dz < 1;
};

export const inPlaza = (x: number, z: number, margin = 0): boolean =>
  Math.abs(x) < PLAZA_HALF + margin && Math.abs(z) < PLAZA_HALF + margin;

/** Tabiiy yer balandligi: tepalikdan boshqa joyda tekis. */
export const terrainHeight = (x: number, z: number): number => {
  if (x < HILL_EDGE || z > -HILL_EDGE) return 0;
  const dx = x - HILL.x;
  const dz = z - HILL.z;
  const g = Math.exp(-(dx * dx + dz * dz) / (2 * HILL.sigma * HILL.sigma));
  return HILL.height * g * smoothstep(0.02, 0.3, g) * smoothstep(HILL_EDGE, HILL_RAMP, x) * smoothstep(HILL_EDGE, HILL_RAMP, -z);
};

export const rotatedSize = (w: number, d: number, rot: number): readonly [number, number] =>
  rot % 2 === 0 ? [w, d] : [d, w];
