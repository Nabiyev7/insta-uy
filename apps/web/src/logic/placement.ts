/** Qaysi model qayerda turadi. Faqat hisob — Three.js yo'q. */
import {
  DECOR, HILL, PLAZA_HALF, inPlaza, WALL_COLORS, ROOF_COLORS, decorById, hash01, inLake, padHeight, terrainHeight,
  type Building, type Commerce, type DecorSlot, type Expansion, type MasterPlan, type Plot, type Rot,
} from '../../../../packages/shared/src/index.ts';

export interface HouseState {
  readonly plot: string;
  readonly nick: string | null;
  readonly tier: number;
  readonly wall: number;
  readonly roof: number;
  readonly decor: readonly string[];
  readonly label: 'plain' | 'silver' | 'gold';
  readonly badge: string | null;
  readonly status: 'pending' | 'owned';
  readonly expanded: boolean;
}
export interface Item {
  readonly model: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly yaw: number;
  readonly sx: number;
  readonly sy: number;
  readonly sz: number;
  readonly wall: string;
  readonly roof: string;
  /** 0..1 — tungi hashamatli yoritish. */
  readonly glow: number;
  readonly seed: number;
}
const WHITE = '#ffffff';

const item = (model: string, x: number, z: number, over: Partial<Item> = {}): Item => ({
  model, x, y: terrainHeight(x, z), z, yaw: 0, sx: 1, sy: 1, sz: 1, wall: WHITE, roof: WHITE, glow: 0, seed: hash01(`${model}${x.toFixed(1)}${z.toFixed(1)}`), ...over,
});

export const yawOf = (rot: Rot): number => (rot * Math.PI) / 2;
export const toWorld = (p: { readonly x: number; readonly z: number; readonly rot: Rot }, lx: number, lz: number): readonly [number, number] => {
  const a = yawOf(p.rot);
  return [p.x + lx * Math.cos(a) + lz * Math.sin(a), p.z - lx * Math.sin(a) + lz * Math.cos(a)];
};

const HOUSE: Readonly<Record<Plot['type'], { readonly scale: number; readonly back: number }>> = {
  hovli: { scale: 1, back: 4.5 }, kvartira: { scale: 1, back: 0 }, villa: { scale: 1.25, back: 5 }, qasr: { scale: 1.9, back: 8 },
};
/** Bezak joylari — 16x24 uchastkaga nisbatan, boshqalariga masshtablanadi. */
const SPOTS: Readonly<Record<string, readonly [number, number]>> = {
  path_stone: [0, 7], tree_anor: [-6.4, 10.4], tree_chinor: [6.3, 10.2], tree_archa: [6.7, 2.4], yard_sori: [-5, 6.5], yard_tok: [-5, 6.5], yard_flowers: [-3.2, 10.8],
  special_peacock: [1.9, 4], special_statue: [-2, 4], special_yurt: [-5.6, 3],
};
const SLOT_SPOTS: Readonly<Partial<Record<DecorSlot, readonly [number, number]>>> = { water: [4.6, 6], car: [3.4, 9.7], light: [0, 7], pet: [-1.8, 5.4] };

const decorItem = (p: Plot, id: string, y: number): Item | null => {
  const d = decorById(id);
  if (!d) return null;
  const fx = p.w / 16;
  const fz = p.d / 24;
  const base = { y, yaw: yawOf(p.rot) };
  if (d.slot === 'fence') return item(id, p.x, p.z, { ...base, sx: fx, sz: fz });
  if (d.slot === 'gate') {
    const [x, z] = toWorld(p, 0, p.d / 2 - 0.35 * fz);
    return item(id, x, z, { ...base, sx: fx });
  }
  if (id === 'light_luxe') {
    const { scale, back } = HOUSE[p.type];
    const [x, z] = toWorld(p, 0, -back);
    return item(id, x, z, { ...base, sx: scale, sz: scale });
  }
  const spot = SPOTS[id] ?? SLOT_SPOTS[d.slot] ?? [0, 6];
  const [x, z] = toWorld(p, spot[0] * fx, spot[1] * fz);
  const grow = p.type === 'qasr' && (d.slot === 'water' || d.slot === 'tree') ? 1.5 : 1;
  return item(id, x, z, { ...base, sx: grow, sy: grow, sz: grow * (id === 'path_stone' ? fz : 1) });
};

const houseGlow = (s: HouseState): number => (s.tier >= 5 ? 0.8 : s.tier === 4 ? 0.45 : 0) + (s.decor.includes('light_luxe') ? 0.35 : 0);

export const houseItem = (p: Plot, s: HouseState, isFar: boolean): Item => {
  const { scale, back } = HOUSE[p.type];
  const [x, z] = toWorld(p, 0, -back);
  return item(`house${s.tier}${isFar ? '_lod' : ''}`, x, z, {
    y: padHeight(p), yaw: yawOf(p.rot), sx: scale, sy: 1 + (scale - 1) * 0.6, sz: scale,
    wall: WALL_COLORS[s.wall] ?? WALL_COLORS[0], roof: ROOF_COLORS[s.roof] ?? ROOF_COLORS[0], glow: Math.min(1, houseGlow(s)), seed: hash01(p.id),
  });
};

/** Bitta uchastkaning barcha modellari. `isOpen` — tuman ochiqmi. */
export const plotItems = (p: Plot, s: HouseState | undefined, isOpen: boolean): Item[] => {
  if (p.type === 'kvartira') return [];
  const y = padHeight(p);
  const yaw = yawOf(p.rot);
  if (!s) {
    if (!isOpen) return hash01(`f${p.id}`) < 0.55 ? [item('foundation', p.x, p.z, { y, yaw, sx: p.w / 16, sz: p.w / 16 })] : [];
    const [x, z] = toWorld(p, 0, p.d / 2 - 2);
    return [item('forsale', x, z, { y, yaw })];
  }
  const fx = p.w / 16;
  const has = (slot: DecorSlot): boolean => s.decor.some((id) => decorById(id)?.slot === slot);
  const [gx, gz] = toWorld(p, 0, p.d / 2 - 0.35);
  return [
    houseItem(p, s, false),
    ...(has('fence') ? [] : [item('fence_basic', p.x, p.z, { y, yaw, sx: fx, sz: p.d / 24, wall: WALL_COLORS[s.wall] ?? WHITE })]),
    ...(has('gate') ? [] : [item('gate_basic', gx, gz, { y, yaw, sx: fx })]),
    ...s.decor.map((id) => decorItem(p, id, y)).filter((i): i is Item => i !== null),
  ];
};

export const expansionItems = (e: Expansion): Item[] => {
  const yaw = yawOf(e.rot);
  const at = (lx: number, lz: number): readonly [number, number] => toWorld(e, lx, lz);
  const tree = (model: string, lx: number, lz: number): Item => item(model, ...at(lx, lz), { yaw });
  return [
    item('fence_basic', e.x, e.z, { yaw, sx: e.w / 16, sz: e.d / 24 }), tree('tree_anor', -4, 6), tree('tree_anor', 4, 6), tree('tree_chinor', 0, -5), tree('yard_tok', -3, 0), tree('yard_flowers', 3, 1),
  ];
};

export const buildingItem = (b: Building, isFar: boolean): Item =>
  item(`apt${b.floors}${isFar ? '_lod' : ''}`, b.x, b.z, { yaw: yawOf(b.rot), wall: WALL_COLORS[b.id % WALL_COLORS.length] ?? WHITE, roof: ROOF_COLORS[b.id % ROOF_COLORS.length] ?? WHITE, seed: hash01(`b${b.id}`) });

export const commerceItem = (c: Commerce): Item => {
  const yaw = yawOf(c.rot);
  const h = hash01(c.id);
  if (c.type === 'bilbord') return item('billboard', c.x, c.z, { yaw });
  if (c.type === 'dokon') return item('shop', c.x, c.z, { yaw, wall: WALL_COLORS[Math.floor(h * 8)] ?? WHITE, roof: ROOF_COLORS[Math.floor(h * 6)] ?? WHITE });
  if (c.w > 30) return item('office_low', c.x, c.z, { yaw });
  return item('office', c.x, c.z, { yaw, sy: 0.75 + h * 0.75, seed: h });
};

/** Yo'l chetidagi daraxt va chiroqlar, maydon jihozlari, bog'chalar — bir marta hisoblanadi. */
export const staticItems = (plan: MasterPlan): Item[] => {
  const out: Item[] = [];
  const crossesAvenue = (v: number): boolean => [-1000, -500, 0, 500, 1000].some((l) => Math.abs(v - l) < 17);
  for (const r of plan.roads.filter((q) => q.kind === 'prospekt')) {
    const isX = r.w > r.d;
    const len = isX ? r.w : r.d;
    const from = (isX ? r.x : r.z) - len / 2;
    for (let i = 0; i * 14 < len; i++) {
      const u = from + i * 14 + 7;
      if (crossesAvenue(u) || (Math.abs(u) < PLAZA_HALF && Math.abs(isX ? r.z : r.x) < PLAZA_HALF)) continue;
      for (const side of [-1, 1]) {
        const v = (isX ? r.z : r.x) + side * 10.4;
        const [x, z] = isX ? [u, v] : [v, u];
        if (inLake(x, z, 3)) continue;
        if (i % 2 === 0) out.push(item('street_lamp', x, z));
        else out.push(item(hash01(`t${x}${z}`) < 0.6 ? 'tree_chinor' : 'tree_terak', x, z, { yaw: hash01(`y${x}${z}`) * 6, sx: 0.9, sz: 0.9, sy: 0.85 + hash01(`h${x}${z}`) * 0.35 }));
      }
    }
  }
  for (const [x, z, w, d] of plan.greens) {
    const n = Math.max(1, Math.floor((w * d) / 220));
    for (let i = 0; i < n; i++) {
      const gx = x + (hash01(`gx${x}${z}${i}`) - 0.5) * (w - 5);
      const gz = z + (hash01(`gz${x}${z}${i}`) - 0.5) * (d - 5);
      out.push(item(['tree_chinor', 'tree_terak', 'tree_anor', 'tree_archa'][Math.floor(hash01(`gm${gx}`) * 4)] ?? 'tree_anor', gx, gz, { yaw: i }));
    }
    if (hash01(`bench${x}${z}`) < 0.5) out.push(item('bench', x, z));
  }
  for (const b of plan.buildings) {
    for (let i = 0; i < 4; i++) {
      out.push(item(i % 2 ? 'tree_chinor' : 'tree_terak', b.x - 18 + i * 12, b.z + (b.rot === 0 ? -16 : 16), { yaw: i }));
      out.push(item('bench', b.x - 14 + i * 9, b.z + (b.rot === 0 ? 14 : -14), { yaw: b.rot === 0 ? Math.PI : 0 }));
    }
  }
  return [...out, ...plazaItems()];
};

const plazaItems = (): Item[] => {
  const ring = (n: number, r: number, model: string, scale = 1): Item[] => Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + 0.2;
    return item(model, Math.cos(a) * r, Math.sin(a) * r, { yaw: -a + Math.PI / 2, sx: scale, sy: scale, sz: scale });
  });
  const stalls = Array.from({ length: 12 }, (_, i) => item('bozor_stall', 24 + (i % 4) * 9, 46 + Math.floor(i / 4) * 8, { yaw: i % 2 ? Math.PI : 0 }));
  return [
    item('plaza_fountain', 0, 0), item('hero_statue', 0, -55), item('choyxona', -40, 62, { yaw: Math.PI / 2 }), item('maktab', 40, -82),
    ...ring(12, 20, 'bench'), ...ring(16, 26, 'street_lamp'), ...ring(14, 34, 'tree_archa').filter((i) => Math.abs(i.x) > 12), ...ring(10, 17, 'yard_flowers'), ...ring(26, 86, 'tree_chinor').filter((i) => Math.abs(i.x) > 16 && Math.abs(i.z) > 16 && !(i.x > 14 && i.x < 66 && i.z < -68)), ...ring(18, 58, 'yard_flowers', 1.6), ...stalls,
    ...[[-22, 60], [-52, 40], [-58, 78], [-24, 84], [20, -60], [60, -64]].map(([x = 0, z = 0]) => item('tree_chinor', x, z)),
    ...[[-30, -70], [-45, -70], [-30, -82], [-45, -82]].map(([x = 0, z = 0], i) => item(['car_van', 'car_sedan', 'car_van', 'car_sedan'][i] ?? 'car_van', x, z)),
  ];
};

/** Yopiq tuman: to'siq va kranlar (PLAN §3). */
export const closedDistrictItems = (rect: readonly [number, number, number, number], id: number): Item[] => {
  const [x0, z0, x1, z1] = rect;
  const out: Item[] = [];
  const fence = (x: number, z: number, yaw: number): void => { if (!inPlaza(x, z, 4)) out.push(item('barrier', x, z, { yaw })); };
  for (let x = x0 + 4; x < x1; x += 8) { fence(x, z0 - 0.5, 0); fence(x, z1 + 0.5, Math.PI); }
  for (let z = z0 + 4; z < z1; z += 8) { fence(x0 - 0.5, z, Math.PI / 2); fence(x1 + 0.5, z, -Math.PI / 2); }
  for (let i = 0; i < 4; i++) {
    const x = x0 + (x1 - x0) * (0.2 + hash01(`cx${id}${i}`) * 0.6);
    const z = z0 + (z1 - z0) * (0.2 + hash01(`cz${id}${i}`) * 0.6);
    if (!inLake(x, z, 5)) out.push(item('crane', x, z, { yaw: hash01(`cy${id}${i}`) * 6 }));
  }
  return out;
};

export interface ProjectInfo { readonly id: number; readonly kind: 'bog' | 'stadion' | 'koprik'; readonly goal: number; readonly raised: number; readonly status: string }
/** Umumiy loyihalar: yig'ilgan ulushga qarab quriladi. */
export const projectItems = (projects: readonly ProjectInfo[]): Item[] => projects.flatMap((p) => {
  const done = Math.min(1, p.raised / p.goal);
  if (p.kind === 'bog') {
    return Array.from({ length: Math.floor(60 * done) }, (_, i) => {
      const a = i * 2.4;
      const r = 10 + Math.sqrt(i) * 11;
      return item(['tree_chinor', 'tree_anor', 'tree_archa'][i % 3] ?? 'tree_anor', -760 + Math.cos(a) * r, -640 + Math.sin(a) * r, { yaw: a });
    });
  }
  const [model, x, z] = p.kind === 'stadion' ? ['stadium', -750, -850] as const : ['bridge', 500, 750] as const;
  if (done >= 1) return [item(model, x, z)];
  const site = p.kind === 'stadion' ? [x, z] as const : [x, z + 125] as const;
  return done > 0 ? [item('crane', site[0], site[1]), item('foundation', site[0] + 12, site[1], { sx: 2, sz: 2 })] : [];
});

export const holidayItems = (h: 'yangi_yil' | 'navroz' | 'mustaqillik' | null): Item[] => {
  if (h === 'yangi_yil') return [item('tree_archa', 0, 46, { sx: 3.2, sy: 3.4, sz: 3.2, glow: 1 }), ...[-12, -6, 6, 12].map((x) => item('light_lamps', x, 46))];
  if (h === 'navroz') return [-24, -8, 8, 24].map((x) => item('special_yurt', x, 46, { sx: 1.6, sy: 1.6, sz: 1.6 }));
  if (h === 'mustaqillik') return [-20, -10, 10, 20].map((x) => item('light_luxe', x, 46));
  return [];
};

/** Avatar kirolmaydigan to'rtburchaklar. */
export interface Solid { readonly x: number; readonly z: number; readonly hx: number; readonly hz: number; readonly h: number }
const HALF: Readonly<Record<number, readonly [number, number]>> = { 1: [4, 3.3], 2: [5.5, 4.8], 3: [6.4, 5.4], 4: [6.5, 5.2], 5: [6.8, 5.9] };
export const houseSolid = (p: Plot, s: HouseState): Solid | null => {
  if (p.type === 'kvartira') return null;
  const { scale, back } = HOUSE[p.type];
  const [x, z] = toWorld(p, 0, -back);
  const [a, b] = HALF[s.tier] ?? [6, 5];
  const [hx, hz] = p.rot % 2 === 0 ? [a * scale, b * scale] : [b * scale, a * scale];
  return { x, z, hx, hz, h: 5 };
};
export const buildingSolid = (b: Building): Solid => ({ x: b.x, z: b.z, hx: 22.2, hz: 8.2, h: b.floors * 3 + 2 });
export const commerceSolid = (c: Commerce): Solid | null => {
  if (c.type === 'bilbord') return null;
  const [a, b, h] = c.type === 'dokon' ? [7.6, 6.1, 5] : c.w > 30 ? [15, 8, 14] : [12, 12, 38];
  return { x: c.x, z: c.z, hx: c.rot % 2 ? b : a, hz: c.rot % 2 ? a : b, h };
};
export const PLAZA_SOLIDS: readonly Solid[] = [
  { x: 0, z: 0, hx: 10, hz: 10, h: 3 }, { x: 0, z: -55, hx: 2.6, hz: 2.6, h: 8 }, { x: 40, z: -82, hx: 20, hz: 7, h: 8 }, { x: -44, z: 62, hx: 2, hz: 8, h: 4 },
];
export const CITY_HILL = HILL;
export const ALL_DECOR = DECOR;
