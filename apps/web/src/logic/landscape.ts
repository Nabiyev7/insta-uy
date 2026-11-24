/** Jamoat joylaridagi narsalar: bulvar daraxtlari, maydon, to'rt markaz, bog', mahalla markazlari. Sof hisob. */
import { CENTER_BOXES, CIVIC, PARK_R, PLAZA_R, RING, SITES, ZONES, civicRect, hash01, inBox, inPlaza, type Box4 } from '../../../../packages/shared/src/index.ts';
import { item, toWorld, yawOf, type Item, type Solid } from './item.ts';
import { PARKING, PLAZA_AISLES, POND, STADIUM, WALK } from './paving.ts';

const TAU = Math.PI * 2;
/** Derazasi tunda doim yonadigan bino (kit.ts: seed < 0.78). */
const LIT_SEED = 0.5;
export const HERO_SPOT = { x: 0, z: -78 } as const;
const SCALE = (i: number): number => 1.05 + hash01(`ls${i}`) * 0.4;
const treeAt = (model: string, x: number, z: number, i: number, k = 1): Item => item(model, x, z, { yaw: hash01(`ly${i}${x}`) * TAU, sx: SCALE(i) * k, sy: SCALE(i + 1) * k, sz: SCALE(i) * k });
const TREE_KINDS = ['tree_chinor', 'tree_round', 'tree_wide', 'tree_tall'] as const;
const anyTree = (x: number, z: number, i: number): Item => treeAt(TREE_KINDS[Math.floor(hash01(`lk${x}${z}`) * 4)] ?? 'tree_round', x, z, i);

/** Halqa yo'l bulvarni kesib o'tadigan joy ochiq qoladi. */
const onRing = (x: number, z: number, margin = 5): boolean => Math.abs(Math.hypot(x, z) - RING.r) < RING.w / 2 + margin;
const isOpen = (x: number, z: number): boolean => !onRing(x, z) && !inPlaza(x, z, 5);
const line = (from: number, to: number, step: number): number[] => Array.from({ length: Math.max(0, Math.floor((to - from) / step) + 1) }, (_, i) => from + i * step);

// ---------- Bulvarlar ----------
const CROSS = 150;
/** Bulvardagi ko'ndalang yo'lakka tushib qolmasin. */
const nearCross = (u: number, start: number): boolean => { const t = ((u - start - CROSS / 2) % CROSS + CROSS) % CROSS; return Math.min(t, CROSS - t) < 5; };
interface BoulevardSpec { readonly from: number; readonly to: number; readonly start: number; readonly isX: boolean; readonly rows: readonly number[]; readonly main: number; readonly side: number }
const [BX0, , BX1] = ZONES.bulvar.rect;
const KZ = ZONES.bulvarKichik.rect[3];
const SPECS: readonly BoulevardSpec[] = [
  { from: BX0 + 8, to: -PLAZA_R - 8, start: BX0, isX: true, rows: [20, 33, 46, 70, 82], main: WALK.main, side: WALK.side },
  { from: PLAZA_R + 8, to: BX1 - 8, start: PLAZA_R - 2, isX: true, rows: [20, 33, 46, 70, 82], main: WALK.main, side: WALK.side },
  { from: -KZ + 8, to: -PLAZA_R - 8, start: -KZ, isX: false, rows: [16, 27, 48], main: WALK.small, side: WALK.smallSide },
  { from: PLAZA_R + 8, to: KZ - 8, start: PLAZA_R - 2, isX: false, rows: [16, 27, 48], main: WALK.small, side: WALK.smallSide },
];
const ROW_STEP = 12;
const boulevard = (s: BoulevardSpec): Item[] => {
  const at = (u: number, v: number): readonly [number, number] => (s.isX ? [u, v] : [v, u]);
  const trees = s.rows.flatMap((v, r) => [-1, 1].flatMap((side) => line(s.from + (r % 2) * (ROW_STEP / 2), s.to, ROW_STEP).flatMap((u, i) => {
    const [x, z] = at(u, side * v);
    return nearCross(u, s.start) || !isOpen(x, z) ? [] : [anyTree(x, z, i + r)];
  })));
  const yaw = s.isX ? 0 : Math.PI / 2;
  const along = line(s.from, s.to, 30).flatMap((u, i) => [-1, 1].flatMap((side) => {
    const [x, z] = at(u, side * (s.main + 1.6));
    if (nearCross(u, s.start) || !isOpen(x, z)) return [];
    if (i % 2) return [item('street_lamp', x, z)];
    return [item('bench', x, z, { yaw: yaw + (side > 0 ? Math.PI : 0) })];
  }));
  const hedges = line(s.from + 4, s.to - 4, 10).flatMap((u) => [-1, 1].flatMap((side) => {
    const [x, z] = at(u, side * (s.main + 5));
    return nearCross(u, s.start) || !isOpen(x, z) ? [] : [item('hedge', x, z, { yaw })];
  }));
  return [...trees, ...along, ...hedges];
};
const boulevardBeds = (): Item[] => SPECS.flatMap((s) => line(s.from + CROSS / 2, s.to, CROSS).flatMap((u) => [-1, 1].flatMap((side) => {
  const [x, z] = s.isX ? [u, side * 27] : [side * 22, u];
  return isOpen(x, z) && !nearCross(u, s.start) ? [item('flower_ring', x, z)] : [];
})));

// ---------- Markaziy maydon ----------
/** Maysa halqasidagi nuqta yo'lakka tushmaydimi. */
const isOffAisle = (a: number, r: number, margin = 0): boolean => PLAZA_AISLES.angles.every((t) => Math.abs(Math.sin(a - t)) * r > PLAZA_AISLES.half + margin || Math.cos(a - t) < 0);
const onCircle = (n: number, r: number, shift = 0): readonly (readonly [number, number, number])[] => Array.from({ length: n }, (_, i) => { const a = (i / n) * TAU + shift; return [Math.cos(a) * r, Math.sin(a) * r, a] as const; });
const plaza = (): Item[] => [
  item('plaza_fountain', 0, 0), item('hero_statue', HERO_SPOT.x, HERO_SPOT.z),
  ...onCircle(24, 48).filter(([, , a]) => isOffAisle(a, 48, 3)).map(([x, z]) => item('flower_ring', x, z)),
  ...onCircle(36, 57).filter(([, , a]) => isOffAisle(a, 57, 2)).map(([x, z, a]) => item('hedge', x, z, { yaw: -a + Math.PI / 2 })),
  ...onCircle(44, 98).filter(([, , a]) => isOffAisle(a, 98, 2.5)).map(([x, z], i) => treeAt('tree_round', x, z, i)),
  ...onCircle(48, 114).filter(([, , a]) => isOffAisle(a, 114, 4)).map(([x, z], i) => treeAt('tree_chinor', x, z, i)),
  ...onCircle(16, 30, 0.2).map(([x, z, a]) => item('bench', x, z, { yaw: Math.PI / 2 - a })),
  ...onCircle(24, 76, 0.13).map(([x, z]) => item('street_lamp', x, z)), ...onCircle(16, 24, 0).map(([x, z]) => item('street_lamp', x, z)),
];
/** Maydon bilan bulvarlar orasidagi to'rt bog' bo'lagi (r = 140…214). */
const parkRing = (): Item[] => [150, 168, 200].flatMap((r, k) => onCircle(Math.round(r / 1.9), r, k * 0.02).flatMap(([x, z], i) => {
  const inBoulevard = inBox(ZONES.bulvar.rect, x, z, 4) || inBox(ZONES.bulvarKichik.rect, x, z, 4);
  return inBoulevard || Math.hypot(x, z) > PARK_R - 10 || (r > 180 && Math.abs(Math.abs(x) - Math.abs(z)) < 22) ? [] : [anyTree(x, z, i)];
}));

// ---------- Markazlar ----------
const row = (model: string, n: number, from: readonly [number, number], step: readonly [number, number], over: Partial<Item> = {}): Item[] => Array.from({ length: n }, (_, i) => item(model, from[0] + step[0] * i, from[1] + step[1] * i, over));
const treesIn = (box: Box4, step: number, k = 1): Item[] => line(box[0], box[2], step).flatMap((x, i) => line(box[1], box[3], step).map((z, j) => anyTree(x + (hash01(`tx${x}${z}`) - 0.5) * step * 0.5, z + (hash01(`tz${x}${z}`) - 0.5) * step * 0.5, i * 7 + j * k)));
const admin = (): Item[] => [
  ...[[-62, -990], [62, -990], [-62, -872], [62, -872]].flatMap(([x = 0, z = 0]) => [item('flower_ring', x, z, { sx: 2, sz: 2 }), ...[-1, 0, 1].flatMap((i) => [-1, 0, 1].flatMap((j) => (i === 0 && j === 0 ? [] : [treeAt('tree_round', x + i * 30, z + j * 24, i * 3 + j)])))]),
  item('water_fountain', 0, -932, { sx: 4, sy: 3, sz: 4 }),
  ...row('street_lamp', 7, [-16, -1030], [0, 30]), ...row('street_lamp', 7, [16, -1030], [0, 30]),
  ...row('bench', 5, [-26, -1010], [0, 40], { yaw: Math.PI / 2 }), ...row('bench', 5, [26, -1010], [0, 40], { yaw: -Math.PI / 2 }),
  ...treesIn([-272, -1050, -232, -840], 17), ...treesIn([234, -1050, 274, -840], 17), ...treesIn([-270, -1108, -52, -1060], 18), ...treesIn([54, -1108, 270, -1060], 18), ...treesIn([-270, -1170, -34, -1142], 16), ...treesIn([34, -1170, 270, -1142], 16),
  ...treesIn([-210, -882, -124, -836], 17), ...treesIn([124, -882, 210, -836], 17), ...treesIn([-210, -1044, -124, -996], 17), ...treesIn([124, -1044, 210, -996], 17),
];
const CARS = ['car_sedan', 'car_van', 'car_sport'] as const;
const cars = (box: Box4, stepX: number, stepZ: number): Item[] => line(box[0], box[2], stepX).flatMap((x) => line(box[1], box[3], stepZ).flatMap((z) => (hash01(`c${x}${z}`) < 0.6 ? [item(CARS[Math.floor(hash01(`m${x}${z}`) * 3)] ?? 'car_van', x, z, { yaw: hash01(`cy${x}${z}`) < 0.5 ? 0 : Math.PI })] : [])));
const market = (): Item[] => [
  ...cars([PARKING[0] + 8, PARKING[1] + 10, PARKING[2] - 8, PARKING[3] - 10], 5, 20),
  ...treesIn([-100, 858, -26, 934], 16), ...treesIn([28, 858, 94, 934], 16), ...row('tree_round', 10, [-268, 832], [16, 0]), ...row('tree_round', 10, [124, 832], [16, 0]), ...row('tree_tall', 24, [-272, 1110], [11, 0]), ...row('tree_tall', 24, [18, 1110], [11, 0]), ...row('tree_round', 18, [-272, 1172], [14, 0]), ...row('tree_round', 18, [32, 1172], [14, 0]), ...row('tree_round', 8, [-49, 1086], [14, 0]),
  ...row('street_lamp', 10, [-256, 963], [24, 0]), ...row('street_lamp', 10, [40, 963], [24, 0]),
  ...[-20, 20].flatMap((x) => [item('flower_ring', x, 982), item('bench', x, 975, { yaw: Math.PI })]),
  ...row('bozor_stall', 6, [-130, 872], [0, 11], { yaw: Math.PI / 2 }), ...row('bozor_stall', 6, [-118, 872], [0, 11], { yaw: -Math.PI / 2 }),
  ...row('tree_tall', 8, [-270, 985], [0, 16]), ...row('tree_tall', 8, [270, 985], [0, 16]),
];
/** Biznes markazi: yashil burchaklar, yangi turar-joylar, qurilish maydoni (faqat ko'rinish). */
export const BLOCKS: readonly { readonly x: number; readonly z: number; readonly sy: number; readonly wall: string }[] = [
  { x: 845, z: -190, sy: 0.75, wall: '#fdf3e1' }, { x: 915, z: -190, sy: 0.9, wall: '#eef3f7' }, { x: 985, z: -190, sy: 0.8, wall: '#fbe6d8' }, { x: 1055, z: -190, sy: 0.95, wall: '#e9f3e3' },
  { x: 880, z: -255, sy: 0.65, wall: '#e9f3e3' }, { x: 950, z: -255, sy: 0.7, wall: '#fdf3e1' }, { x: 1020, z: -255, sy: 0.6, wall: '#eef3f7' }, { x: 1170, z: -140, sy: 0.8, wall: '#fbe6d8' }, { x: 1240, z: -140, sy: 0.7, wall: '#fdf3e1' }, { x: 1205, z: -230, sy: 0.85, wall: '#eef3f7' },
];
const business = (): Item[] => [
  ...BLOCKS.map((b) => item('novostroyka', b.x, b.z, { yaw: 0, sy: b.sy, wall: b.wall, seed: hash01(`nb${b.x}`) })),
  ...BLOCKS.flatMap((b, i) => [-1, 1].flatMap((s) => [16, 0, -16].map((dz) => treeAt('tree_round', b.x + s * 22, b.z + dz, i + dz)))),
  item('crane', 1180, 150, { yaw: 0.6 }), item('crane', 1240, 240, { yaw: 2.4 }), ...[[1165, 120], [1225, 130], [1190, 220], [1250, 190]].map(([x = 0, z = 0]) => item('foundation', x, z, { sx: 2.6, sz: 2.6, sy: 1.6 })),
  ...line(1146, 1270, 8).flatMap((x) => [item('barrier', x, 86), item('barrier', x, 288, { yaw: Math.PI })]), ...line(92, 284, 8).flatMap((z) => [item('barrier', 1143, z, { yaw: Math.PI / 2 }), item('barrier', 1271, z, { yaw: -Math.PI / 2 })]),
  ...row('tree_tall', 23, [820, 138], [12.5, 0]), ...row('tree_round', 23, [820, 154], [12.5, 0]), ...row('tree_round', 19, [822, 262], [12, 0]), ...row('tree_chinor', 16, [826, 280], [14, 0]), ...row('tree_chinor', 4, [1085, 190], [0, 26]),
  ...row('street_lamp', 7, [819, -23], [43, 0]), ...row('street_lamp', 7, [819, 23], [43, 0]), ...row('hedge', 7, [820, -20], [46, 0]), ...row('hedge', 7, [820, 20], [46, 0]),
  ...cars([1090, -118, 1108, -84], 6, 12), ...cars([1090, 84, 1108, 118], 6, 12),
];
/** Dam olish bog'i: hovuz, daraxtlar; stadion joyi (umumiy loyiha) hozircha to'siq ichida. */
const leisure = (): Item[] => {
  const free = (x: number, z: number): boolean => Math.hypot(x - POND.x, z - POND.z) > POND.r + 10 && !(Math.abs(x - STADIUM.x) < 100 && Math.abs(z - STADIUM.z) < 80)
    && Math.abs(z) > 10 && Math.abs(x + 1376) > 9 && Math.abs(x + 1156) > 9 && Math.abs(Math.abs(z) - 299) > 9 && Math.abs(z + 50) > 8;
  const grid = line(-1486, -1064, 17).flatMap((x, i) => line(-306, 306, 17).map((z, j): Item => {
    const [px, pz] = [x + (hash01(`px${x}${z}`) - 0.5) * 12, z + (hash01(`pz${x}${z}`) - 0.5) * 12];
    return anyTree(px, pz, i * 31 + j);
  })).filter((t) => free(t.x, t.z) && hash01(`keep${t.x}`) < 0.78);
  const fence = Array.from({ length: 48 }, (_, i) => { const a = (i / 48) * TAU; return item('barrier', STADIUM.x + Math.cos(a) * 84, STADIUM.z + Math.sin(a) * 64, { yaw: -a + Math.PI / 2 }); });
  return [
    ...grid, ...fence, item('foundation', STADIUM.x, STADIUM.z, { sx: 4, sz: 4 }), item('foundation', STADIUM.x - 40, STADIUM.z + 10, { sx: 2, sz: 2, yaw: 1 }), item('crane', STADIUM.x + 38, STADIUM.z - 20, { yaw: 0.8 }),
    ...onCircle(14, POND.r + 6).map(([x, z, a]) => item('bench', POND.x + x, POND.z + z, { yaw: -a - Math.PI / 2 })), item('bolalar', -1190, -110), item('bolalar', -1220, -240), item('sport', -1420, -240, { yaw: Math.PI / 2 }), item('kafe', -1110, -70),
    ...[-1330, -1220, -1110].flatMap((x) => [item('street_lamp', x, -9), item('street_lamp', x, 9)]),
  ];
};
/** Alohida binolar hovlisi. */
const sites = (): Item[] => [
  item('car_ambulance', -835, -136, { yaw: Math.PI / 2 }), item('car_ambulance', -803, -136, { yaw: -Math.PI / 2 }), item('car_fire', 716, 588, { yaw: Math.PI / 2 }), item('car_fire', 716, 604, { yaw: Math.PI / 2 }),
  ...Object.values(SITES).flatMap(([x0, z0, x1], k) => (k === 3 ? [] : [...row('tree_round', 5, [x0 + 8, z0 + 8], [(x1 - x0 - 16) / 4, 0]), ...row('tree_tall', 4, [x0 + 6, z0 + 26], [0, 22]), ...row('tree_tall', 4, [x1 - 6, z0 + 26], [0, 22])])),
  ...[[-850, -118], [-788, -118], [-459, -124], [-399, -124], [399, -126], [458, -126]].map(([x = 0, z = 0]) => item('flower_ring', x, z)),
  ...row('tree_round', 4, [655, 571], [12, 0]), ...row('tree_round', 4, [655, 621], [12, 0]),
];

// ---------- Mahalla markazlari ----------
interface Placed { readonly model: string; readonly x: number; readonly z: number; readonly hx: number; readonly hz: number; readonly h: number }
/** 100×100 m ichida (markazdan): maktab, kafe, do'kon, sport va bolalar maydonchasi. */
const CENTER_PARTS: readonly Placed[] = [
  { model: 'maktab', x: -20, z: -24, hx: 20, hz: 8, h: 8 }, { model: 'kafe', x: 30, z: -24, hx: 8, hz: 6, h: 4 }, { model: 'shop', x: 32, z: 6, hx: 7.6, hz: 6.4, h: 5 },
  { model: 'sport', x: -22, z: 20, hx: 22, hz: 13, h: 0 }, { model: 'bolalar', x: 26, z: 31, hx: 11, hz: 8, h: 0 },
];
const centerOf = (b: Box4): { readonly x: number; readonly z: number; readonly rot: 0 } => ({ x: (b[0] + b[2]) / 2, z: (b[1] + b[3]) / 2, rot: 0 });
const ROOFS = ['#d9604a', '#5f7f95', '#4f9478', '#b5483a'] as const;
const centers = (): Item[] => CENTER_BOXES.flatMap((b, k) => {
  const c = centerOf(b);
  const put = (model: string, x: number, z: number, over: Partial<Item> = {}): Item => item(model, ...toWorld(c, x, z), over);
  return [
    ...CENTER_PARTS.map((p) => put(p.model, p.x, p.z, { seed: LIT_SEED, roof: ROOFS[k % ROOFS.length] ?? '#d9604a' })),
    ...line(-42, 42, 14).flatMap((x) => [put('tree_round', x, -44), put('tree_chinor', x, 45)]), ...line(-28, 28, 14).flatMap((z) => [put('tree_tall', -47, z), put('tree_tall', 47, z)]),
    put('flower_ring', 6, -4), put('flower_ring', 18, -2), put('bench', 8, 6, { yaw: Math.PI }), put('bench', 16, 8, { yaw: Math.PI }), ...[-8, 12].flatMap((x) => [put('street_lamp', x, 2), put('street_lamp', x, -12)]),
  ];
});

export const landscapeItems = (): Item[] => [
  ...CIVIC.map((c) => item(c.id, c.x, c.z, { yaw: yawOf(c.rot), glow: 0.35, seed: LIT_SEED })),
  ...SPECS.flatMap(boulevard), ...boulevardBeds(), ...plaza(), ...parkRing(), ...admin(), ...market(), ...business(), ...leisure(), ...sites(), ...centers(),
];

/** Odam va mashina kirolmaydigan jamoat binolari. */
export const PUBLIC_SOLIDS: readonly Solid[] = [
  { x: 0, z: 0, hx: 11.2, hz: 11.2, h: 3 }, { ...HERO_SPOT, hx: 2.6, hz: 2.6, h: 8 },
  ...CIVIC.filter((c) => c.id !== 'bozor').map((c): Solid => ({ ...civicRect(c), h: c.height * 0.6 })),
  ...BLOCKS.map((b): Solid => ({ x: b.x, z: b.z, hx: 12.6, hz: 10.6, h: 56 * b.sy })),
  ...CENTER_BOXES.flatMap((b) => { const c = centerOf(b); return CENTER_PARTS.filter((p) => p.h > 0).map((p): Solid => ({ x: c.x + p.x, z: c.z + p.z, hx: p.hx, hz: p.hz, h: p.h })); }),
];

const HOLIDAY_R = 82;
export const holidayItems = (h: 'yangi_yil' | 'navroz' | 'mustaqillik' | null): Item[] => {
  const spots = [0.4, 1.17, 1.97, 2.74, 3.54, 4.31, 5.11, 5.88].map((a): readonly [number, number] => [Math.cos(a) * HOLIDAY_R, Math.sin(a) * HOLIDAY_R]);
  if (h === 'yangi_yil') return [item('tree_newyear', 0, 22, { sx: 3, sy: 3.2, sz: 3, glow: 1 }), ...spots.map(([x, z]) => item('light_lamps', x, z))];
  if (h === 'navroz') return spots.filter((_, i) => i % 2 === 0).map(([x, z]) => item('special_yurt', x, z, { sx: 1.6, sy: 1.6, sz: 1.6 }));
  return h === 'mustaqillik' ? spots.map(([x, z]) => item('light_lamps', x, z, { sx: 1.4, sy: 1.4, sz: 1.4 })) : [];
};
