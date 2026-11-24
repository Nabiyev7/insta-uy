/** Yer, yo'l, maydon — 375 m bo'laklar (chunk streaming). */
import { Group, Mesh, type MeshLambertMaterial } from 'three';
import { inLake, padHeight, rotatedSize, riverStrips, terrainHeight, type MasterPlan, type Plot } from '../../../../packages/shared/src/index.ts';
import { createKitMaterial } from './kit.ts';
import { GRASS, LAYER_NAMES, addMarks, addMeadow, addPaving, addPlot, addRoads, emptyLayers, type Layers, type Rect } from './groundParts.ts';

const CHUNK = 375;
/** Baland kameradan ko'riladigan yer: kattaroq bo'laklar, mayda chiziqlarsiz (draw call kam). */
export const FAR_CHUNK = 750;
const RIVERBANK = riverStrips();

export interface GroundOptions { readonly chunk?: number; readonly hasTop?: boolean }
export interface GroundState { readonly openDistricts: ReadonlySet<number> }

const buildChunk = (plan: MasterPlan, cx: number, cz: number, state: GroundState, size: number, hasTop: boolean): Layers => {
  const rect: Rect = [cx * size, cz * size, (cx + 1) * size, (cz + 1) * size];
  const out = emptyLayers();
  out.base.rect(...rect, GRASS);
  addMeadow(out, RIVERBANK, rect);
  for (const p of plan.plots) {
    if (p.type === 'kvartira' || p.x < rect[0] || p.x >= rect[2] || p.z < rect[1] || p.z >= rect[3]) continue;
    addPlot(out, p, state.openDistricts.has(p.districtId), hasTop);
  }
  addPaving(out, plan, rect);
  addRoads(out, plan, rect, !hasTop);
  if (hasTop) addMarks(out, plan, rect);
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
