/** Yer, yo'l, ariq, maydon — 375 m bo'laklar (chunk streaming). */
import { BufferAttribute, BufferGeometry, Color, Group, Mesh, type MeshLambertMaterial } from 'three';
import { AVENUE_LINES, HILL, HILL_EDGE, LAKE, PLAZA_HALF, inLake, padHeight, rotatedSize, terrainHeight, type MasterPlan, type Plot, type Road } from '../../../../packages/shared/src/index.ts';
import { createKitMaterial } from './kit.ts';

const CHUNK = 375;
/** Baland kameradan ko'riladigan yer: kattaroq bo'laklar, mayda chiziqlarsiz (draw call kam). */
export const FAR_CHUNK = 750;
const L = { plain: 0, asphalt: 5, grass: 6, stone: 15, naqsh: 10, soil: 14 } as const;
const TILE: Readonly<Record<number, number>> = { 0: 4, 5: 5, 6: 6, 10: 4, 14: 7, 15: 3 };
const HILL_REACH = 3.2 * HILL.sigma;

class GeoBuilder {
  private readonly pos: number[] = [];
  private readonly uv: number[] = [];
  private readonly uv1: number[] = [];
  private readonly col: number[] = [];

  get isEmpty(): boolean {
    return this.pos.length === 0;
  }

  tri(points: readonly (readonly [number, number, number])[], layer: number, color: Color, vertical = false): void {
    const s = TILE[layer] ?? 4;
    for (const [x, y, z] of points) {
      this.pos.push(x, y, z);
      this.uv.push(vertical ? (x + z) / s : x / s, (vertical ? y : z) / s);
      this.uv1.push((layer + 0.5) / 16, 0);
      this.col.push(color.r, color.g, color.b);
    }
  }

  quad(a: readonly [number, number, number], b: readonly [number, number, number], c: readonly [number, number, number], d: readonly [number, number, number], layer: number, color: Color, vertical = false): void {
    this.tri([a, b, c, a, c, d], layer, color, vertical);
  }

  /** Yer relyefiga yotadigan to'rtburchak; tepalikda mayda bo'linadi. */
  rect(x0: number, z0: number, x1: number, z1: number, layer: number, color: Color): void {
    const isHilly = x1 > HILL.x - HILL_REACH && z0 < HILL.z + HILL_REACH && x1 > HILL_EDGE && z0 < -HILL_EDGE;
    const nx = isHilly ? Math.max(1, Math.ceil((x1 - x0) / 7)) : 1;
    const nz = isHilly ? Math.max(1, Math.ceil((z1 - z0) / 7)) : 1;
    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < nz; j++) {
        const [xa, xb] = [x0 + ((x1 - x0) * i) / nx, x0 + ((x1 - x0) * (i + 1)) / nx];
        const [za, zb] = [z0 + ((z1 - z0) * j) / nz, z0 + ((z1 - z0) * (j + 1)) / nz];
        const at = (x: number, z: number): readonly [number, number, number] => [x, isHilly ? terrainHeight(x, z) : 0, z];
        this.quad(at(xa, zb), at(xb, zb), at(xb, za), at(xa, za), layer, color);
      }
    }
  }

  build(): BufferGeometry {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(this.pos), 3));
    g.setAttribute('uv', new BufferAttribute(new Float32Array(this.uv), 2));
    g.setAttribute('uv1', new BufferAttribute(new Float32Array(this.uv1), 2));
    g.setAttribute('color', new BufferAttribute(new Float32Array(this.col), 3));
    g.computeVertexNormals();
    return g;
  }
}

const C = {
  white: new Color('#ffffff'), grass: new Color('#a5c283'), yard: new Color('#d2d0a2'), asphalt: new Color('#c9c9cc'), walk: new Color('#e2d8c4'), water: new Color('#4fb4cc'),
  plaza: new Color('#efe4cf'), soil: new Color('#c9b493'), line: new Color('#f4f1e6'), plinth: new Color('#cdbfa6'),
};

/** Chizilish tartibi: yer → hovli/tuproq → yo'lka → asfalt → chiziqlar (polygonOffset bilan). */
const LAYER_NAMES = ['base', 'low', 'walk', 'high', 'top'] as const;
type Layers = Readonly<Record<(typeof LAYER_NAMES)[number], GeoBuilder>>;
type Rect = readonly [number, number, number, number];

const clip = (r: Rect, c: Rect): Rect | null => {
  const out: Rect = [Math.max(r[0], c[0]), Math.max(r[1], c[1]), Math.min(r[2], c[2]), Math.min(r[3], c[3])];
  return out[0] < out[2] - 0.01 && out[1] < out[3] - 0.01 ? out : null;
};

type Strip = readonly [from: number, to: number, layer: number, color: Color, isHigh: boolean];
const STREET_STRIPS: readonly Strip[] = [
  [-6, -4.4, L.stone, C.walk, false], [-4.4, -3.7, L.plain, C.water, false], [-3.7, 3.7, L.asphalt, C.asphalt, true], [3.7, 4.4, L.plain, C.water, false], [4.4, 6, L.stone, C.walk, false],
];
const AVENUE_STRIPS: readonly Strip[] = [
  [-14, -11.6, L.stone, C.walk, false], [-11.6, -9.2, L.grass, C.grass, false], [-9.2, -1, L.asphalt, C.asphalt, true], [-1, 1, L.grass, C.grass, false], [1, 9.2, L.asphalt, C.asphalt, true],
  [9.2, 11.6, L.grass, C.grass, false], [11.6, 14, L.stone, C.walk, false],
];

const addRoad = (out: Layers, r: Road, chunk: Rect): void => {
  const isX = r.w > r.d;
  const strips = r.kind === 'prospekt' ? AVENUE_STRIPS : STREET_STRIPS;
  for (const [from, to, layer, color, isHigh] of strips) {
    const full: Rect = isX ? [r.x - r.w / 2, r.z + from, r.x + r.w / 2, r.z + to] : [r.x + from, r.z - r.d / 2, r.x + to, r.z + r.d / 2];
    const part = clip(full, chunk);
    if (part) (isHigh ? out.high : out.walk).rect(...part, layer, color);
  }
};

const addPlinth = (out: Layers, p: Plot): void => {
  const y = padHeight(p) + 0.02;
  if (y < 0.4) return;
  const [w, d] = rotatedSize(p.w, p.d, p.rot);
  const [x0, x1, z0, z1] = [p.x - w / 2 + 0.3, p.x + w / 2 - 0.3, p.z - d / 2 + 0.3, p.z + d / 2 - 0.3];
  const b = y - 7;
  out.base.quad([x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0], L.grass, C.grass);
  for (const [ax, az, bx, bz] of [[x0, z1, x1, z1], [x1, z1, x1, z0], [x1, z0, x0, z0], [x0, z0, x0, z1]] as const) {
    out.base.quad([ax, b, az], [bx, b, bz], [bx, y, bz], [ax, y, az], L.stone, C.plinth, true);
  }
};

const addPlaza = (out: Layers, chunk: Rect): void => {
  const p = clip([-PLAZA_HALF, -PLAZA_HALF, PLAZA_HALF, PLAZA_HALF], chunk);
  if (p) out.walk.rect(...p, L.stone, C.plaza);
  const n = 48;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const b = ((i + 1) / n) * Math.PI * 2;
    const at = (t: number, r: number): readonly [number, number, number] => [Math.cos(t) * r, 0, Math.sin(t) * r];
    const mid = at((a + b) / 2, 14);
    if (mid[0] < chunk[0] || mid[0] >= chunk[2] || mid[2] < chunk[1] || mid[2] >= chunk[3]) continue;
    out.top.quad(at(a, 15.5), at(a, 12.5), at(b, 12.5), at(b, 15.5), L.naqsh, C.white);
  }
};

const addLake = (out: Layers, chunk: Rect): void => {
  if (!clip([LAKE.x - LAKE.rx - 6, LAKE.z - LAKE.rz - 6, LAKE.x + LAKE.rx + 6, LAKE.z + LAKE.rz + 6], chunk)) return;
  const n = 96;
  const at = (t: number, m: number): readonly [number, number, number] => [LAKE.x + Math.cos(t) * (LAKE.rx + m), 0, LAKE.z + Math.sin(t) * (LAKE.rz + m)];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const b = ((i + 1) / n) * Math.PI * 2;
    const mid = at((a + b) / 2, 2);
    if (mid[0] >= chunk[0] && mid[0] < chunk[2] && mid[2] >= chunk[1] && mid[2] < chunk[3]) out.walk.quad(at(a, 4), at(a, -1), at(b, -1), at(b, 4), L.stone, C.walk);
  }
};

const addDashes = (out: Layers, r: Road, chunk: Rect): void => {
  if (r.kind !== 'prospekt') return;
  const isX = r.w > r.d;
  const len = isX ? r.w : r.d;
  const start = (isX ? r.x : r.z) - len / 2;
  for (let u = start + 6; u < start + len; u += 12) {
    if (AVENUE_LINES.some((l) => Math.abs(u - l) < 18)) continue;
    for (const v of [-5, 5]) {
      const part = clip(isX ? [u, r.z + v - 0.12, u + 4, r.z + v + 0.12] : [r.x + v - 0.12, u, r.x + v + 0.12, u + 4], chunk);
      if (part) out.top.rect(...part, L.plain, C.line);
    }
  }
};

export interface GroundOptions { readonly chunk?: number; readonly hasTop?: boolean }
export interface GroundState { readonly openDistricts: ReadonlySet<number> }

const buildChunk = (plan: MasterPlan, cx: number, cz: number, state: GroundState, size: number, hasTop: boolean): Layers => {
  const rect: Rect = [cx * size, cz * size, (cx + 1) * size, (cz + 1) * size];
  const out: Layers = { base: new GeoBuilder(), low: new GeoBuilder(), walk: new GeoBuilder(), high: new GeoBuilder(), top: new GeoBuilder() };
  out.base.rect(...rect, L.grass, C.grass);
  for (const d of plan.districts) {
    const part = state.openDistricts.has(d.id) ? null : clip(d.rect, rect);
    if (part && d.zone !== 'kol') out.low.rect(...part, L.soil, C.soil);
  }
  for (const p of plan.plots) {
    if (p.type === 'kvartira' || p.x < rect[0] || p.x >= rect[2] || p.z < rect[1] || p.z >= rect[3]) continue;
    addPlinth(out, p);
    if (!state.openDistricts.has(p.districtId) || padHeight(p) > 0.4) continue;
    const [w, d] = rotatedSize(p.w, p.d, p.rot);
    out.low.rect(p.x - w / 2 + 0.3, p.z - d / 2 + 0.3, p.x + w / 2 - 0.3, p.z + d / 2 - 0.3, L.soil, C.yard);
  }
  addPlaza(out, rect);
  for (const r of plan.roads) addRoad(out, r, rect);
  if (hasTop) for (const r of plan.roads) addDashes(out, r, rect);
  addLake(out, rect);
  return out;
};

export class Ground {
  readonly group = new Group();
  private readonly chunks = new Map<string, Group>();
  private readonly materials: Readonly<Record<keyof Layers, MeshLambertMaterial>>;
  private readonly plan: MasterPlan;
  private state: GroundState;

  private readonly size: number;
  private readonly hasTop: boolean;

  constructor(plan: MasterPlan, state: GroundState, { chunk = CHUNK, hasTop = true }: GroundOptions = {}) {
    this.plan = plan;
    this.size = chunk;
    this.hasTop = hasTop;
    this.state = state;
    const [base, low, walk, high, top] = LAYER_NAMES.map((_, i) => createKitMaterial({ offset: -i }));
    this.materials = { base: base!, low: low!, walk: walk!, high: high!, top: top! };
  }

  setState(state: GroundState): void {
    const same = state.openDistricts.size === this.state.openDistricts.size && [...state.openDistricts].every((d) => this.state.openDistricts.has(d));
    this.state = state;
    if (!same) for (const key of [...this.chunks.keys()]) this.drop(key);
  }

  private drop(key: string): void {
    const g = this.chunks.get(key);
    if (!g) return;
    g.traverse((o) => { if (o instanceof Mesh) o.geometry.dispose(); });
    this.group.remove(g);
    this.chunks.delete(key);
  }

  /** Bir chaqiruvda ko'pi bilan `budget` bo'lak quriladi — kadr qotmasin. */
  update(x: number, z: number, radius: number, receiveShadow: boolean, budget = 2): boolean {
    const wanted = new Map<string, readonly [number, number, number]>();
    const s = this.size;
    for (let cx = Math.floor((x - radius) / s); cx <= Math.floor((x + radius) / s); cx++) {
      for (let cz = Math.floor((z - radius) / s); cz <= Math.floor((z + radius) / s); cz++) {
        wanted.set(`${cx},${cz}`, [cx, cz, Math.hypot((cx + 0.5) * s - x, (cz + 0.5) * s - z)]);
      }
    }
    for (const [key, g] of this.chunks) {
      if (!wanted.has(key)) this.drop(key);
      else for (const m of g.children) m.receiveShadow = receiveShadow;
    }
    const missing = [...wanted].filter(([k]) => !this.chunks.has(k)).sort((a, b) => a[1][2] - b[1][2]);
    for (const [key, [cx, cz]] of missing.slice(0, budget)) {
      const layers = buildChunk(this.plan, cx, cz, this.state, this.size, this.hasTop);
      const g = new Group();
      for (const name of LAYER_NAMES) {
        if (layers[name].isEmpty) continue;
        const mesh = new Mesh(layers[name].build(), this.materials[name]);
        mesh.renderOrder = LAYER_NAMES.indexOf(name) - 6;
        mesh.receiveShadow = receiveShadow;
        g.add(mesh);
      }
      this.chunks.set(key, g);
      this.group.add(g);
    }
    return missing.length <= budget;
  }

  dispose(): void {
    for (const key of [...this.chunks.keys()]) this.drop(key);
    for (const m of Object.values(this.materials)) m.dispose();
  }
}

/** Odam turgan joy balandligi: tepalikdagi hovli maydonchasi yoki tabiiy yer. */
export const groundHeight = (x: number, z: number, nearbyPlots: readonly Plot[]): number => {
  const h = terrainHeight(x, z);
  if (h < 0.2) return h;
  const p = nearbyPlots.find((q) => {
    const [w, d] = rotatedSize(q.w, q.d, q.rot);
    return Math.abs(x - q.x) < w / 2 - 0.2 && Math.abs(z - q.z) < d / 2 - 0.2;
  });
  return p ? padHeight(p) : h;
};
export const isWater = (x: number, z: number): boolean => inLake(x, z);
