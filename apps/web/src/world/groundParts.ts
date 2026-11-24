/** Yer bo'lagi nimalardan yig'iladi: maysa, uchastka, yo'l, bordyur, maydon qoplamasi. */
import { BufferAttribute, BufferGeometry, Color } from 'three';
import {
  CITY_HALF, HILL, HILL_EDGE, LAKE, RING, RIVER, SpatialIndex, ZONES, fromLocal, hash01, inBox, padHeight, rotatedSize, terrainHeight, type Building, type MasterPlan, type Plot, type Road,
} from '../../../../packages/shared/src/index.ts';
import { PAVE, PAVE_RINGS, PAVING, PLAZA_AISLES, type PaveKind, type PaveRing } from '../logic/paving.ts';
import { isOnRoad } from '../logic/roadGrid.ts';
import { isWide } from '../logic/streets.ts';

type P3 = readonly [number, number, number];
export type Rect = readonly [x0: number, z0: number, x1: number, z1: number];
const HILL_REACH = 3.2 * HILL.sigma;
const HILL_STEP = 7;
const isHilly = (r: Rect): boolean => r[0] < HILL.x + HILL_REACH && r[1] < HILL.z + HILL_REACH && r[0] < -HILL_EDGE && r[1] < -HILL_EDGE;

export class GeoBuilder {
  private readonly pos: number[] = [];
  private readonly col: number[] = [];

  get isEmpty(): boolean {
    return this.pos.length === 0;
  }

  quad(a: P3, b: P3, c: P3, d: P3, color: Color): void {
    for (const p of [a, b, c, a, c, d]) {
      this.pos.push(...p);
      this.col.push(color.r, color.g, color.b);
    }
  }

  tri(a: P3, b: P3, c: P3, color: Color): void {
    for (const p of [a, b, c]) {
      this.pos.push(...p);
      this.col.push(color.r, color.g, color.b);
    }
  }

  /** Yer relyefiga yotadigan to'rtburchak; tepalikda mayda bo'linadi. */
  rect(x0: number, z0: number, x1: number, z1: number, color: Color): void {
    const hilly = isHilly([x0, z0, x1, z1]);
    const nx = hilly ? Math.max(1, Math.ceil((x1 - x0) / HILL_STEP)) : 1;
    const nz = hilly ? Math.max(1, Math.ceil((z1 - z0) / HILL_STEP)) : 1;
    const at = (x: number, z: number): P3 => [x, hilly ? terrainHeight(x, z) : 0, z];
    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < nz; j++) {
        const [xa, xb] = [x0 + ((x1 - x0) * i) / nx, x0 + ((x1 - x0) * (i + 1)) / nx];
        const [za, zb] = [z0 + ((z1 - z0) * j) / nz, z0 + ((z1 - z0) * (j + 1)) / nz];
        this.quad(at(xa, zb), at(xb, zb), at(xb, za), at(xa, za), color);
      }
    }
  }

  build(): BufferGeometry {
    const g = new BufferGeometry();
    const n = this.pos.length / 3;
    g.setAttribute('position', new BufferAttribute(new Float32Array(this.pos), 3));
    g.setAttribute('color', new BufferAttribute(new Float32Array(this.col), 3));
    g.setAttribute('uv', new BufferAttribute(new Float32Array(n * 2), 2));
    g.setAttribute('uv1', new BufferAttribute(new Float32Array(n * 2), 2));
    g.computeVertexNormals();
    return g;
  }
}

/** Chizilish tartibi: yer → uchastka/qoplama → yo'lka → asfalt → chiziqlar (polygonOffset bilan). */
export const LAYER_NAMES = ['base', 'low', 'walk', 'high', 'top'] as const;
export type Layers = Readonly<Record<(typeof LAYER_NAMES)[number], GeoBuilder>>;
export const emptyLayers = (): Layers => ({ base: new GeoBuilder(), low: new GeoBuilder(), walk: new GeoBuilder(), high: new GeoBuilder(), top: new GeoBuilder() });

const C = {
  grass: new Color('#76b550'), verge: new Color('#7fbf55'), yardA: new Color('#83c45a'), yardB: new Color('#8acb62'), closed: new Color('#a3c97c'), edge: new Color('#a9d884'),
  asphalt: new Color('#6b6e75'), walk: new Color('#e7dfd0'), curb: new Color('#d6d3cd'), line: new Color('#f7f5ee'), plinth: new Color('#cfcac2'), sand: new Color('#f3e6bf'), meadow: new Color('#8ccf66'),
};
const PAVE_COLOR = Object.fromEntries(Object.entries(PAVE).map(([k, v]) => [k, new Color(v)])) as Readonly<Record<PaveKind, Color>>;

const clip = (r: Rect, c: Rect): Rect | null => {
  const out: Rect = [Math.max(r[0], c[0]), Math.max(r[1], c[1]), Math.min(r[2], c[2]), Math.min(r[3], c[3])];
  return out[0] < out[2] - 0.01 && out[1] < out[3] - 0.01 ? out : null;
};
const holds = (c: Rect, x: number, z: number): boolean => x >= c[0] && x < c[2] && z >= c[1] && z < c[3];

// ---------- Yo'llar ----------
type Strip = readonly [from: number, to: number, color: Color, isHigh: boolean];
const STREET_STRIPS: readonly Strip[] = [[-6, -4.4, C.walk, false], [-4.4, -4.1, C.curb, false], [-4.1, 4.1, C.asphalt, true], [4.1, 4.4, C.curb, false], [4.4, 6, C.walk, false]];
const MEDIAN = 0.8;
const wideStrips = (half: number): readonly Strip[] => {
  const verge = half - 2.2;
  const curb = half - 4.3;
  const side = (s: 1 | -1): Strip[] => {
    const strip = (a: number, b: number, color: Color, isHigh = false): Strip => (s > 0 ? [a, b, color, isHigh] : [-b, -a, color, isHigh]);
    return [strip(verge, half, C.walk), strip(curb, verge, C.verge), strip(curb - 0.3, curb, C.curb), strip(MEDIAN, curb - 0.3, C.asphalt, true)];
  };
  return [...side(-1), [-MEDIAN, MEDIAN, C.verge, false], ...side(1)];
};
/** Uzoq ko'rinishda bordyursiz, kamroq chiziq. */
const farStrips = (half: number): readonly Strip[] => [[-half, half, C.walk, false], [-half + (half > 8 ? 4.3 : 1.6), half - (half > 8 ? 4.3 : 1.6), C.asphalt, true]];
const stripsOf = (r: Road, half: number, isFar: boolean): readonly Strip[] => {
  if (isFar) return farStrips(half);
  return isWide(r) ? wideStrips(half) : STREET_STRIPS;
};

const PIECE = 14;
const addTiltedRoad = (out: Layers, r: Road, chunk: Rect, isFar: boolean): void => {
  const n = Math.max(1, Math.ceil(r.w / PIECE));
  const strips = stripsOf(r, r.d / 2, isFar);
  const corner = (u: number, v: number): P3 => { const [x, z] = fromLocal(r, u, v); return [x, terrainHeight(x, z), z]; };
  for (let i = 0; i < n; i++) {
    const [u0, u1] = [(i / n - 0.5) * r.w, ((i + 1) / n - 0.5) * r.w];
    const [mx, mz] = fromLocal(r, (u0 + u1) / 2, 0);
    if (!holds(chunk, mx, mz)) continue;
    for (const [from, to, color, isHigh] of strips) (isHigh ? out.high : out.walk).quad(corner(u0, to), corner(u1, to), corner(u1, from), corner(u0, from), color);
  }
};
/** Halqa yo'l: bo'laklari orasida tirqish qolmasin deb aylana bo'ylab chiziladi. */
const RING_PARTS = 144;
const addRingRoad = (out: Layers, chunk: Rect, isFar: boolean): void => {
  const strips = isFar ? farStrips(RING.w / 2) : wideStrips(RING.w / 2);
  const at = (t: number, v: number): P3 => [Math.cos(t) * (RING.r + v), 0, Math.sin(t) * (RING.r + v)];
  for (let i = 0; i < RING_PARTS; i++) {
    const [a, b] = [(i / RING_PARTS) * Math.PI * 2, ((i + 1) / RING_PARTS) * Math.PI * 2];
    const mid = at((a + b) / 2, 0);
    if (!holds(chunk, mid[0], mid[2])) continue;
    for (const [from, to, color, isHigh] of strips) (isHigh ? out.high : out.walk).quad(at(a, to), at(a, from), at(b, from), at(b, to), color);
  }
};
/** Ko'cha uchlari dumaloq: burilish va tutashgan joylarda tirqish ko'rinmaydi. */
const CAP_PARTS = 12;
const CAPS = [[6, C.walk, false], [4.1, C.asphalt, true]] as const;
const addCaps = (out: Layers, r: Road, chunk: Rect): void => {
  const isX = r.w > r.d;
  const ends = r.angle !== undefined ? [fromLocal(r, -r.w / 2, 0), fromLocal(r, r.w / 2, 0)]
    : isX ? [[r.x - r.w / 2, r.z], [r.x + r.w / 2, r.z]] as const : [[r.x, r.z - r.d / 2], [r.x, r.z + r.d / 2]] as const;
  for (const [x, z] of ends) {
    if (!holds(chunk, x, z)) continue;
    for (const [radius, color, isHigh] of CAPS) {
      const at = (i: number): P3 => { const t = (i / CAP_PARTS) * Math.PI * 2; const [px, pz] = [x + Math.cos(t) * radius, z + Math.sin(t) * radius]; return [px, terrainHeight(px, pz), pz]; };
      for (let i = 0; i < CAP_PARTS; i++) (isHigh ? out.high : out.walk).tri(at(i), [x, terrainHeight(x, z), z], at(i + 1), color);
    }
  }
};
export const addRoads = (out: Layers, plan: MasterPlan, chunk: Rect, isFar: boolean): void => {
  for (const r of plan.roads) {
    if (r.kind === 'halqa') continue;
    if (!isWide(r)) addCaps(out, r, chunk);
    if (r.angle !== undefined) { addTiltedRoad(out, r, chunk, isFar); continue; }
    const isX = r.w > r.d;
    for (const [from, to, color, isHigh] of stripsOf(r, Math.min(r.w, r.d) / 2, isFar)) {
      const full: Rect = isX ? [r.x - r.w / 2, r.z + from, r.x + r.w / 2, r.z + to] : [r.x + from, r.z - r.d / 2, r.x + to, r.z + r.d / 2];
      const part = clip(full, chunk);
      if (part) (isHigh ? out.high : out.walk).rect(...part, color);
    }
  }
  addRingRoad(out, chunk, isFar);
};

// ---------- Chiziqlar ----------
interface Mark { readonly x: number; readonly z: number; readonly pts: readonly P3[] }
const DASH = { step: 12, length: 4, half: 0.12 } as const;
const ZEBRA = { n: 9, length: 5, half: 0.45 } as const;
const markQuad = (r: Road, isU: boolean, u0: number, u1: number, v0: number, v1: number): Mark => {
  const at = (u: number, v: number): P3 => { const [x, z] = isU ? fromLocal(r, u, v) : [r.x + v, r.z + u]; return [x, terrainHeight(x, z), z]; };
  const [mx, , mz] = at((u0 + u1) / 2, (v0 + v1) / 2);
  return { x: mx, z: mz, pts: isU ? [at(u0, v1), at(u1, v1), at(u1, v0), at(u0, v0)] : [at(u1, v0), at(u1, v1), at(u0, v1), at(u0, v0)] };
};
const dashesOf = (plan: MasterPlan, r: Road): Mark[] => {
  const isU = r.angle !== undefined || r.w > r.d;
  const len = isU ? r.w : r.d;
  const half = (isU ? r.d : r.w) / 2;
  const lane = (half - 4.6) / 2 + 0.4;
  const n = Math.floor(len / DASH.step);
  return Array.from({ length: n }, (_, i) => -len / 2 + 6 + i * DASH.step).flatMap((u) => {
    const [x, z] = isU ? fromLocal(r, u + DASH.length / 2, 0) : [r.x, r.z + u + DASH.length / 2];
    const isCrossing = isOnRoad(plan, x, z, half - 2, (o) => o === r || (o.kind === 'halqa' && r.kind === 'halqa'));
    return isCrossing ? [] : [-lane, lane].map((v) => markQuad(r, isU, u, u + DASH.length, v - DASH.half, v + DASH.half));
  });
};
/** Halqa yo'l bulvarni kesgan to'rt joyda piyodalar yo'lagi. */
const zebras = (): Mark[] => [0, 1, 2, 3].flatMap((k) => {
  const a = (k * Math.PI) / 2;
  const r: Road = { x: Math.cos(a) * RING.r, z: Math.sin(a) * RING.r, w: 20, d: RING.w, kind: 'halqa', angle: a + Math.PI / 2 };
  return Array.from({ length: ZEBRA.n }, (_, i) => (i - (ZEBRA.n - 1) / 2) * 1.9).map((v) => markQuad(r, true, -ZEBRA.length / 2, ZEBRA.length / 2, v - ZEBRA.half, v + ZEBRA.half));
});
const inBulvar = (m: Mark): boolean => inBox(ZONES.bulvar.rect, m.x, m.z) || inBox(ZONES.bulvarKichik.rect, m.x, m.z);
const markCache = new WeakMap<MasterPlan, SpatialIndex<Mark>>();
const marksOf = (plan: MasterPlan): SpatialIndex<Mark> => {
  const known = markCache.get(plan);
  if (known) return known;
  const dashes = plan.roads.filter(isWide).flatMap((r) => dashesOf(plan, r)).filter((m) => !inBulvar(m));
  const made = new SpatialIndex([...dashes, ...zebras()]);
  markCache.set(plan, made);
  return made;
};
export const addMarks = (out: Layers, plan: MasterPlan, chunk: Rect): void => {
  const [cx, cz] = [(chunk[0] + chunk[2]) / 2, (chunk[1] + chunk[3]) / 2];
  for (const m of marksOf(plan).query(cx, cz, Math.hypot(chunk[2] - chunk[0], chunk[3] - chunk[1]) / 2 + 1)) {
    if (!holds(chunk, m.x, m.z)) continue;
    const [a, b, c, d] = m.pts;
    if (a && b && c && d) out.top.quad(a, b, c, d, C.line);
  }
};

// ---------- Uchastkalar ----------
const addPlinth = (out: Layers, p: Plot, y: number, top: Color): void => {
  const [w, d] = rotatedSize(p.w, p.d, p.rot);
  const [x0, x1, z0, z1] = [p.x - w / 2 + 0.3, p.x + w / 2 - 0.3, p.z - d / 2 + 0.3, p.z + d / 2 - 0.3];
  const b = y - 7;
  out.base.quad([x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0], top);
  for (const [ax, az, bx, bz] of [[x0, z1, x1, z1], [x1, z1, x1, z0], [x1, z0, x0, z0], [x0, z0, x0, z1]] as const) out.base.quad([ax, b, az], [bx, b, bz], [bx, y, bz], [ax, y, az], C.plinth);
};
const EDGE = 0.7;
/** Bo'sh uchastka ham chiroyli: ikki xil maysa va och hoshiya. */
export const addPlot = (out: Layers, p: Plot, isOpen: boolean, hasEdge: boolean): void => {
  const color = isOpen ? (hash01(p.id) < 0.5 ? C.yardA : C.yardB) : C.closed;
  const y = padHeight(p) + 0.02;
  if (y >= 0.4) { addPlinth(out, p, y, color); return; }
  const [w, d] = rotatedSize(p.w, p.d, p.rot);
  const [x0, z0, x1, z1] = [p.x - w / 2 + 0.2, p.z - d / 2 + 0.2, p.x + w / 2 - 0.2, p.z + d / 2 - 0.2];
  const m = hasEdge ? EDGE : 0;
  out.low.rect(x0 + m, z0 + m, x1 - m, z1 - m, color);
  if (!hasEdge) return;
  for (const e of [[x0, z0, x1, z0 + m], [x0, z1 - m, x1, z1], [x0, z0 + m, x0 + m, z1 - m], [x1 - m, z0 + m, x1, z1 - m]] as const) out.low.rect(...e, C.edge);
};

// ---------- Qoplama, ko'l, daryo ----------
const ARC = 64;
const addRing = (target: GeoBuilder, r: PaveRing, chunk: Rect, color: Color): void => {
  const at = (t: number, q: number): P3 => [r.x + Math.cos(t) * q, 0, r.z + Math.sin(t) * q];
  for (let i = 0; i < ARC; i++) {
    const [a, b] = [(i / ARC) * Math.PI * 2, ((i + 1) / ARC) * Math.PI * 2];
    const mid = at((a + b) / 2, (r.r0 + r.r1) / 2);
    if (!holds(chunk, mid[0], mid[2])) continue;
    if (r.r0 > 0) target.quad(at(a, r.r1), at(a, r.r0), at(b, r.r0), at(b, r.r1), color);
    else target.tri(at(a, r.r1), [r.x, 0, r.z], at(b, r.r1), color);
  }
};
const addAisles = (out: Layers, chunk: Rect): void => {
  const [from, to] = [20, 124];
  for (const t of PLAZA_AISLES.angles) {
    const [c, s] = [Math.cos(t), Math.sin(t)];
    const at = (u: number, v: number): P3 => [c * u - s * v, 0, s * u + c * v];
    for (let u = from; u < to; u += 13) {
      const end = Math.min(to, u + 13);
      const mid = at((u + end) / 2, 0);
      if (holds(chunk, mid[0], mid[2])) out.top.quad(at(u, 6), at(end, 6), at(end, -6), at(u, -6), PAVE_COLOR.tile);
    }
  }
};
const LAKE_PARTS = 96;
const addLakeShore = (out: Layers, chunk: Rect): void => {
  const at = (t: number, m: number): P3 => [LAKE.x + Math.cos(t) * (LAKE.rx + m), 0, LAKE.z + Math.sin(t) * (LAKE.rz + m)];
  for (let i = 0; i < LAKE_PARTS; i++) {
    const [a, b] = [(i / LAKE_PARTS) * Math.PI * 2, ((i + 1) / LAKE_PARTS) * Math.PI * 2];
    const mid = at((a + b) / 2, 4);
    if (holds(chunk, mid[0], mid[2])) out.walk.quad(at(a, 11), at(a, -1), at(b, -1), at(b, 11), C.sand);
  }
};
const APT_HALF = 25;
/** Ko'p qavatli uy: old yo'lagi, hovli maydonchasi va orqadagi avtoturargoh. */
const addBuildingYard = (out: Layers, b: Building, chunk: Rect): void => {
  const s = b.rot === 0 ? 1 : -1;
  const strip = (from: number, to: number, half: number, color: Color, layer: GeoBuilder): void => {
    const [z0, z1] = s > 0 ? [b.z + from, b.z + to] : [b.z - to, b.z - from];
    const part = clip([b.x - half, z0, b.x + half, z1], chunk);
    if (part) layer.rect(...part, color);
  };
  strip(-19, 14, APT_HALF, PAVE_COLOR.path, out.low);
  strip(-17, -10, APT_HALF - 1, PAVE_COLOR.asphalt, out.walk);
  strip(14, 33, 14, PAVE_COLOR.path, out.low);
};
export const addPaving = (out: Layers, plan: MasterPlan, chunk: Rect): void => {
  for (const b of plan.buildings) addBuildingYard(out, b, chunk);
  for (const { box, kind, level } of PAVING) {
    const part = clip(box, chunk);
    if (part) (level === 0 ? out.low : out.walk).rect(...part, PAVE_COLOR[kind]);
  }
  for (const r of PAVE_RINGS) addRing(r.level === 0 ? out.walk : out.high, r, chunk, PAVE_COLOR[r.kind]);
  addAisles(out, chunk);
  addLakeShore(out, chunk);
};
export const addMeadow = (out: Layers, strips: readonly { readonly x: number; readonly z: number; readonly w: number; readonly d: number; readonly angle?: number }[], chunk: Rect): void => {
  for (const r of strips) {
    const n = Math.ceil(r.w / PIECE);
    for (let i = 0; i < n; i++) {
      const [u0, u1] = [(i / n - 0.5) * r.w, ((i + 1) / n - 0.5) * r.w];
      const [mx, mz] = fromLocal(r, (u0 + u1) / 2, 0);
      if (!holds(chunk, mx, mz) || mx > CITY_HALF - RIVER.half * 0.6 || Math.hypot(mx - LAKE.x, mz - LAKE.z) < LAKE.rx + 10) continue;
      const at = (u: number, v: number): P3 => { const [x, z] = fromLocal(r, u, v); return [x, 0, z]; };
      out.low.quad(at(u0, r.d / 2), at(u1, r.d / 2), at(u1, -r.d / 2), at(u0, -r.d / 2), C.meadow);
    }
  }
};
export const GRASS = C.grass;
