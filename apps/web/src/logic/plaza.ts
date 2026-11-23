/** Markaziy maydonda nima qayerda: favvora, davlat binolari, daraxt va jihozlar. Joylari to'qnashmaydi, yo'laklar ochiq. */
import { CIVIC, PLAZA_HALF, TOWERS, rotatedSize } from '../../../../packages/shared/src/index.ts';
import { item, yawOf, type Item, type Solid } from './item.ts';

/** Favvoraga boradigan to'rt yo'lakning yarim eni — bu yerda favvoradan boshqa hech narsa turmaydi. */
export const AISLE = 14;
export const HERO_SPOT = { x: -24, z: -24 } as const;
const SCHOOL = { x: 36, z: -107, sx: 0.75, sz: 0.89, hx: 15, hz: 7 } as const;
const TEAHOUSE = { x: 36, z: 108 } as const;
const PARKING = { x: -36, z: -107 } as const;
const TOWER_PLOT_HALF = 14;
const CORNER = 108;
const CORNER_STEP = 34;

interface Rect { readonly x: number; readonly z: number; readonly hx: number; readonly hz: number }
export const civicRects: readonly Rect[] = CIVIC.map((c) => {
  const [w, d] = rotatedSize(c.w, c.d, c.rot);
  return { x: c.x, z: c.z, hx: w / 2, hz: d / 2 };
});
const towerRects: readonly Rect[] = [-1, 1].flatMap((sx) => [-1, 1].flatMap((sz) =>
  [[0, 0], [CORNER_STEP, 0], [0, CORNER_STEP]].map(([a = 0, b = 0]): Rect => ({ x: sx * (CORNER - a), z: sz * (CORNER - b), hx: TOWER_PLOT_HALF, hz: TOWER_PLOT_HALF }))));
const PARKING_RECT: Rect = { ...PARKING, hx: 10, hz: 9 };
const MARKET_RECT: Rect = { x: 37, z: 54, hx: 17, hz: 11 };
const BLOCKED: readonly Rect[] = [
  ...civicRects, ...towerRects, PARKING_RECT, MARKET_RECT, { x: 0, z: 0, hx: 12, hz: 12 }, { ...HERO_SPOT, hx: 3, hz: 3 },
  { x: SCHOOL.x, z: SCHOOL.z, hx: SCHOOL.hx, hz: SCHOOL.hz + 1 }, { ...TEAHOUSE, hx: 9, hz: 7 },
];

const isFree = (x: number, z: number, margin: number): boolean =>
  Math.abs(x) >= AISLE + margin && Math.abs(z) >= AISLE + margin && Math.abs(x) < PLAZA_HALF - 2 && Math.abs(z) < PLAZA_HALF - 2
  && !BLOCKED.some((b) => Math.abs(x - b.x) < b.hx + margin && Math.abs(z - b.z) < b.hz + margin);

const SEARCH_STEP = 2;
const SEARCH_RINGS = 24;
const DIRECTIONS = 16;
/** Band joyga tushgan narsani eng yaqin bo'sh joyga suradi. */
const nearestFree = (x: number, z: number, margin: number, taken: readonly Item[], gap: number): readonly [number, number] | null => {
  const fits = (px: number, pz: number): boolean => isFree(px, pz, margin) && taken.every((t) => Math.hypot(t.x - px, t.z - pz) >= gap);
  for (let ring = 0; ring <= SEARCH_RINGS; ring++) {
    for (let k = 0; k < DIRECTIONS; k++) {
      const a = (k / DIRECTIONS) * Math.PI * 2;
      const px = x + Math.cos(a) * ring * SEARCH_STEP;
      const pz = z + Math.sin(a) * ring * SEARCH_STEP;
      if (fits(px, pz)) return [px, pz];
      if (ring === 0) break;
    }
  }
  return null;
};
const MARGIN: Readonly<Record<string, number>> = { tree_chinor: 3.2, tree_archa: 1.8, yard_flowers: 1.6, bench: 1.2, street_lamp: 0.6 };
const GAP = 3.2;
const settle = (list: readonly Item[]): Item[] => list.reduce<Item[]>((done, it) => {
  const spot = nearestFree(it.x, it.z, MARGIN[it.model] ?? 1, done, GAP);
  return spot ? [...done, { ...it, x: spot[0], z: spot[1] }] : done;
}, []);

const ring = (n: number, r: number, model: string, scale = 1): Item[] => Array.from({ length: n }, (_, i) => {
  const a = (i / n) * Math.PI * 2 + 0.2;
  return item(model, Math.cos(a) * r, Math.sin(a) * r, { yaw: -a + Math.PI / 2, sx: scale, sy: scale, sz: scale });
});

const CARS = [['car_van', -7, -6], ['car_sedan', 7, -6], ['car_van', -7, 6], ['car_sedan', 7, 6]] as const;

export const plazaItems = (): Item[] => {
  const stalls = Array.from({ length: 12 }, (_, i) => item('bozor_stall', 24 + (i % 4) * 9, 46 + Math.floor(i / 4) * 8, { yaw: i % 2 ? Math.PI : 0 }));
  const soft = settle([
    ...ring(16, 28, 'street_lamp'), ...ring(12, 24, 'bench'), ...ring(14, 36, 'tree_archa'), ...ring(26, 86, 'tree_chinor'), ...ring(10, 26, 'yard_flowers'), ...ring(18, 58, 'yard_flowers', 1.6),
  ]);
  return [
    item('plaza_fountain', 0, 0), item('hero_statue', HERO_SPOT.x, HERO_SPOT.z),
    ...CIVIC.map((c) => item(c.id, c.x, c.z, { yaw: yawOf(c.rot), glow: 0.35 })),
    item('maktab', SCHOOL.x, SCHOOL.z, { sx: SCHOOL.sx, sz: SCHOOL.sz }), item('choyxona', TEAHOUSE.x, TEAHOUSE.z, { yaw: Math.PI }),
    ...CARS.map(([model, dx, dz]) => item(model, PARKING.x + dx, PARKING.z + dz)),
    ...stalls, ...soft,
  ];
};

/** Maydonda odam va mashina kirolmaydigan joylar. */
export const PLAZA_SOLIDS: readonly Solid[] = [
  { x: 0, z: 0, hx: 10, hz: 10, h: 3 }, { ...HERO_SPOT, hx: 2.6, hz: 2.6, h: 8 }, { x: SCHOOL.x, z: SCHOOL.z, hx: SCHOOL.hx, hz: SCHOOL.hz, h: 8 }, { ...TEAHOUSE, hx: 8, hz: 2.4, h: 4 },
  ...CIVIC.map((c, i): Solid => ({ ...civicRects[i]!, h: c.height * 0.6 })),
];
export const isTower = (id: string): boolean => id in TOWERS;

const HOLIDAY_Z = 32;
export const holidayItems = (h: 'yangi_yil' | 'navroz' | 'mustaqillik' | null): Item[] => {
  if (h === 'yangi_yil') return [item('tree_archa', 24, 24, { sx: 3.2, sy: 3.4, sz: 3.2, glow: 1 }), ...[-34, -24, 34].map((x) => item('light_lamps', x, HOLIDAY_Z))];
  if (h === 'navroz') return [-34, -22, 22, 34].map((x) => item('special_yurt', x, HOLIDAY_Z, { sx: 1.6, sy: 1.6, sz: 1.6 }));
  if (h === 'mustaqillik') return [-38, -24, 24, 38].map((x) => item('light_luxe', x, HOLIDAY_Z));
  return [];
};
