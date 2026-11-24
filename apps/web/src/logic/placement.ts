/** Qaysi model qayerda turadi. Faqat hisob — Three.js yo'q. */
import {
  FREE_SPOTS, HILL, LAKE, LEVEL_FENCE, LEVEL_GATE, REF_YARD, ROOF_COLORS, TOWERS, TOWER_BASE, TOWER_HALF, WALL_COLORS, WALL_MATERIALS,
  anchorById, hash01, levelYard, padHeight, parsePlaced,
  type Anchor, type Building, type Commerce, type DecorItem, type Expansion, type Plot, type SpotKind,
} from '../../../../packages/shared/src/index.ts';
import { decorOf } from './decorCatalog.ts';
import { WHITE, item, toWorld, yawOf, type Item, type Solid } from './item.ts';
import { STADIUM } from './paving.ts';

export interface HouseState {
  readonly plot: string;
  readonly nick: string | null;
  readonly tier: number;
  readonly wall: number;
  readonly roof: number;
  /** "nuqta:bezak" ko'rinishida. */
  readonly decor: readonly string[];
  readonly material: number;
  readonly frame: number;
  readonly door: number;
  readonly label: 'plain' | 'silver' | 'gold';
  readonly badge: string | null;
  readonly status: 'pending' | 'owned';
  readonly expanded: boolean;
}
const HOUSE: Readonly<Record<Plot['type'], { readonly scale: number; readonly back: number }>> = {
  hovli: { scale: 1.2, back: 7.5 }, kvartira: { scale: 1, back: 0 }, villa: { scale: 1.3, back: 11 }, qasr: { scale: 1.9, back: 14 },
};
/** 1–6 level modellari hovliga to'liq o'lchamda chizilgan, 7–10 esa uchastka turiga qarab kattalashadi. */
const OWN_SIZE_TIERS = 6;
const houseScale = (p: Plot, tier: number): number => (p.type === 'hovli' && tier <= OWN_SIZE_TIERS ? 1 : HOUSE[p.type].scale);
/** Panjara va bezaklar shu o'lchamdagi uchastkaga chizilgan, boshqalariga masshtablanadi. */
const freeSpot = (id: string): readonly [number, number] => { const s = FREE_SPOTS[id]; return s ? [s[0], s[1]] : [0, 6]; };
export const REF_PLOT = REF_YARD;
/** Uy bo'yiga deyarli o'smaydi; hovlida umuman o'smaydi. */
const houseGrow = (p: Plot, scale: number): number => (p.type === 'hovli' ? 1 : 1 + (scale - 1) * 0.6);
/** Hovliga sig'ishi uchun kichraytiriladigan daraxtlar. */
const YARD_SCALE: Readonly<Record<string, number>> = { tree_chinor: 0.5, tree_archa: 0.8 };
const PALACE_GROW = 1.5;

const yardItem = (p: Plot, model: string, at: readonly [number, number], y: number, tint: string | null): Item => {
  const fz = p.d / REF_PLOT.d;
  const [x, z] = toWorld(p, at[0] * (p.w / REF_PLOT.w), at[1] * fz);
  const isGrown = p.type === 'qasr' && (model.startsWith('tree_') || model.startsWith('water_'));
  const k = (YARD_SCALE[model] ?? 1) * (isGrown ? PALACE_GROW : 1);
  const base = { y, yaw: yawOf(p.rot), tint };
  return item(model, x, z, model === 'path_stone' ? { ...base, sz: fz } : { ...base, sx: k, sy: k, sz: k });
};
/** Uy atrofidagi yer chiroqlari uy bilan birga kattalashadi. */
const luxeItem = (p: Plot, model: string, y: number): Item => {
  const { scale, back } = HOUSE[p.type];
  const [x, z] = toWorld(p, 0, -back);
  return item(model, x, z, { y, yaw: yawOf(p.rot), sx: scale, sz: scale });
};
const LUXE = 'light_luxe';
/** Darvoza soyaboni ham uchastka ichida qolsin. */
const GATE_INSET = 0.65;
/** Tomdagi joy (indeks = level): model o'lchamida x, balandlik, z (old +). */
const ROOF_MOUNT: readonly (readonly [number, number, number])[] = [
  [0, 4, 1.2], [0, 4.4, 2], [1, 4.4, -1], [0, 4.9, -2.4], [-0.6, 4.25, 0.5], [0, 4.75, 0.2], [0, 4.75, 0.2], [0.25, 7.3, 0.6], [0.25, 7.3, 0.6], [0, 8.1, 1.6], [0, 8.1, 1.6],
];
const roofItem = (p: Plot, tier: number, model: string, y: number, tint: string | null): Item => {
  const [rx, ry, rz] = ROOF_MOUNT[tier] ?? [0, 4, 0];
  const scale = houseScale(p, tier);
  const [x, z] = toWorld(p, rx * scale, rz * scale - HOUSE[p.type].back);
  return item(model, x, z, { y: y + ry * houseGrow(p, scale), yaw: yawOf(p.rot), tint });
};
const anchorItem = (p: Plot, anchor: Anchor, d: DecorItem, y: number, tier: number): Item | null => {
  if (anchor.kind === 'roof') return roofItem(p, tier, d.model, y, d.tint);
  if (anchor.kind === 'fence' || anchor.kind === 'gate') return null;
  if (anchor.kind === 'luxe') return luxeItem(p, d.model, y);
  return yardItem(p, d.model, [anchor.x, anchor.z], y, d.tint);
};

/** Tungi yoritish: indeks = level. */
const LEVEL_GLOW = [0, 0, 0, 0.05, 0.1, 0.18, 0.28, 0.4, 0.55, 0.7, 0.85] as const;
const houseGlow = (s: HouseState): number => (LEVEL_GLOW[s.tier] ?? 0) + (s.decor.some((x) => x.endsWith(`:${LUXE}`)) ? 0.3 : 0);
/** Kuchsiz telefonda ikki qo'shni level bitta uzoq shaklda (draw call kamayadi). */
const lodOf = (tier: number, isSimple: boolean): string => `house${isSimple ? Math.ceil(tier / 2) * 2 - 1 : tier}_lod`;

const FRAME_STRIDE = 16;
export const houseItem = (p: Plot, s: HouseState, isFar: boolean, isSimple = false): Item => {
  const scale = houseScale(p, s.tier);
  const [x, z] = toWorld(p, 0, -HOUSE[p.type].back);
  return item(isFar ? lodOf(s.tier, isSimple) : `house${s.tier}`, x, z, {
    y: padHeight(p), yaw: yawOf(p.rot), sx: scale, sy: houseGrow(p, scale), sz: scale,
    wall: WALL_COLORS[s.wall] ?? WALL_COLORS[0], roof: ROOF_COLORS[s.roof] ?? ROOF_COLORS[0], glow: Math.min(1, houseGlow(s)), seed: hash01(p.id), mat: (WALL_MATERIALS[s.material]?.layer ?? 1) + FRAME_STRIDE * s.frame, door: s.door,
  });
};

const FOUNDATION_SHARE = 0.22;
const BARRIER_SHARE = 0.4;
/** Yopiq tumandagi uchastka: ba'zisida poydevor, ba'zisining oldida to'siq. */
const closedPlot = (p: Plot, y: number): Item[] => {
  const h = hash01(`f${p.id}`);
  if (h < FOUNDATION_SHARE) return [item('foundation', p.x, p.z, { y, yaw: yawOf(p.rot), sx: p.w / 18, sz: p.w / 18 })];
  if (h > BARRIER_SHARE) return [];
  const [x, z] = toWorld(p, 0, p.d / 2 - 1);
  return [item('barrier', x, z, { y, yaw: yawOf(p.rot) })];
};

/** Bitta uchastkaning barcha modellari. `isOpen` — tuman ochiqmi. */
export const plotItems = (p: Plot, s: HouseState | undefined, isOpen: boolean): Item[] => {
  if (p.type === 'kvartira') return [];
  const y = padHeight(p);
  const yaw = yawOf(p.rot);
  if (!s) {
    if (!isOpen) return closedPlot(p, y);
    const [x, z] = toWorld(p, 0, p.d / 2 - 2);
    return [item('forsale', x, z, { y, yaw })];
  }
  const fx = p.w / REF_PLOT.w;
  const placed = parsePlaced(s.decor).flatMap(({ anchor, decor }) => { const a = anchorById(anchor); const d = decorOf(decor); return a && d ? [{ a, d }] : []; });
  const own = (kind: SpotKind): DecorItem | undefined => placed.find((x) => x.a.kind === kind)?.d;
  const [gx, gz] = toWorld(p, 0, p.d / 2 - GATE_INSET);
  const wall = WALL_COLORS[s.wall] ?? WHITE;
  const [fence, gate] = [own('fence'), own('gate')];
  // Egasi qo'ygan yo'lak yoki chiroq leveldan kelganini almashtiradi.
  const taken = new Set([own('path') ? 'path_stone' : '', own('lamps') ? 'light_lamps' : '', own('luxe') ? LUXE : '']);
  const free = levelYard(s.tier).filter((id) => !taken.has(id)).map((id) => (id === LUXE ? luxeItem(p, id, y) : yardItem(p, id, freeSpot(id), y, null)));
  return [
    houseItem(p, s, false),
    item(fence?.model ?? LEVEL_FENCE[s.tier] ?? 'fence_basic', p.x, p.z, { y, yaw, sx: fx, sz: p.d / REF_PLOT.d, wall, tint: fence?.tint ?? null }),
    item(gate?.model ?? LEVEL_GATE[s.tier] ?? 'gate_basic', gx, gz, { y, yaw, sx: fx, tint: gate?.tint ?? null }),
    ...free, ...placed.map(({ a, d }) => anchorItem(p, a, d, y, s.tier)).filter((i): i is Item => i !== null),
  ];
};
/** plotItems boshidagi uy, panjara, darvoza — qolgani mayda bezak (faqat yaqindan ko'rinadi). */
export const PLOT_SHELL = 3;

export const expansionItems = (e: Expansion): Item[] => {
  const yaw = yawOf(e.rot);
  const at = (lx: number, lz: number): readonly [number, number] => toWorld(e, lx, lz);
  const tree = (model: string, lx: number, lz: number): Item => item(model, ...at(lx, lz), { yaw });
  return [
    item('fence_basic', e.x, e.z, { yaw, sx: e.w / REF_PLOT.w, sz: e.d / REF_PLOT.d }), tree('tree_round', -6, 9), tree('tree_tall', 6, 9), tree('tree_wide', 0, -8), tree('yard_flowers', -5, 0), tree('yard_flowers', 5, 1),
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
  const tower = TOWERS[c.id];
  if (!tower) return item('office', c.x, c.z, { yaw, seed: h });
  return item(tower.look, c.x, c.z, { yaw, sy: tower.height / TOWER_BASE[tower.look], wall: tower.tint, seed: h });
};

/** Umumiy loyiha bog'i: dam olish bog'ining shimoli-sharqida. */
const GARDEN_SPOT = { x: -1100, z: -190 } as const;
const GARDEN_TREES = 60;
/** Ko'prik modelining yarim uzunligi (zaxirasiz). */
const BRIDGE_HALF = 105;

export interface ProjectInfo { readonly id: number; readonly kind: 'bog' | 'stadion' | 'koprik'; readonly goal: number; readonly raised: number; readonly status: string }
/** Umumiy loyihalar: yig'ilgan ulushga qarab quriladi. */
export const projectItems = (projects: readonly ProjectInfo[]): Item[] => projects.flatMap((p) => {
  const done = Math.min(1, p.raised / p.goal);
  if (p.kind === 'bog') {
    return Array.from({ length: Math.floor(GARDEN_TREES * done) }, (_, i) => {
      const a = i * 2.4;
      const r = 4 + Math.sqrt(i) * 5;
      return item(['tree_chinor', 'tree_round', 'tree_archa'][i % 3] ?? 'tree_round', GARDEN_SPOT.x + Math.cos(a) * r, GARDEN_SPOT.z + Math.sin(a) * r, { yaw: a });
    });
  }
  const [model, x, z] = p.kind === 'stadion' ? ['stadium', STADIUM.x, STADIUM.z] as const : ['bridge', LAKE.x, LAKE.z] as const;
  if (done >= 1) return [item(model, x, z, { sz: p.kind === 'koprik' ? LAKE.rz / BRIDGE_HALF : 1 })];
  const site = p.kind === 'stadion' ? [x, z] as const : [x, z + LAKE.rz + 20] as const;
  return done > 0 ? [item('crane', site[0], site[1]), item('foundation', site[0] + 12, site[1], { sx: 2, sz: 2 })] : [];
});

const HALF: Readonly<Record<number, readonly [number, number]>> = { 1: [5.3, 4.4], 2: [8.7, 6.5], 3: [8.6, 7], 4: [6.8, 6.2], 5: [7.8, 6.6], 6: [7.9, 6.9], 7: [6.5, 5.2], 8: [6.9, 5.4], 9: [6.8, 5.9], 10: [7.2, 6.2] };
export const houseSolid = (p: Plot, s: HouseState): Solid | null => {
  if (p.type === 'kvartira') return null;
  const scale = houseScale(p, s.tier);
  const [x, z] = toWorld(p, 0, -HOUSE[p.type].back);
  const [a, b] = HALF[s.tier] ?? [6, 5];
  const [hx, hz] = p.rot % 2 === 0 ? [a * scale, b * scale] : [b * scale, a * scale];
  return { x, z, hx, hz, h: 5 };
};
/** Bosish qutisining balandligi: indeks = level (bo'sh uchastka — belgi bo'yi). */
const TIER_HEIGHT = [1.2, 5.5, 5.5, 6, 6, 6.5, 7.5, 8.5, 9, 12, 13] as const;
const PALACE_PICK = 1.54;
export const pickHeight = (p: Plot, s: HouseState | undefined): number => (TIER_HEIGHT[s?.tier ?? 0] ?? 6) * (p.type === 'qasr' && s ? PALACE_PICK : 1);
export const buildingSolid = (b: Building): Solid => ({ x: b.x, z: b.z, hx: 22.2, hz: 8.2, h: b.floors * 3 + 2 });
export const commerceSolid = (c: Commerce): Solid | null => {
  if (c.type === 'bilbord') return null;
  const tower = TOWERS[c.id];
  const [a, b, h] = tower ? [...TOWER_HALF[tower.look], tower.height] as const : c.type === 'dokon' ? [7.6, 6.1, 5] : c.w > 30 ? [15, 8, 14] : [12, 12, 38];
  return { x: c.x, z: c.z, hx: c.rot % 2 ? b : a, hz: c.rot % 2 ? a : b, h };
};
export const CITY_HILL = HILL;
