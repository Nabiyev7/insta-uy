/** Shaharning asosiy o'lchamlari (metr). O'zgartirilmaydi: PLAN.md §2. */
export const CELL = 500;
export const CITY_HALF = 1000;
export const AVENUE = 28;
export const STREET = 12;
export const PLAZA_HALF = 125;

export const LAKE = { x: 500, z: 750, rx: 290, rz: 105 } as const;
export const HILL = { x: 770, z: -770, height: 28, sigma: 140 } as const;

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
  if (x < 514 || z > -514) return 0;
  const dx = x - HILL.x;
  const dz = z - HILL.z;
  const g = Math.exp(-(dx * dx + dz * dz) / (2 * HILL.sigma * HILL.sigma));
  return HILL.height * g * smoothstep(0.02, 0.3, g) * smoothstep(514, 610, x) * smoothstep(514, 610, -z);
};

export const rotatedSize = (w: number, d: number, rot: number): readonly [number, number] =>
  rot % 2 === 0 ? [w, d] : [d, w];
