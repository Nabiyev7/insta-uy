import { Color, DynamicDrawUsage, Group, InstancedBufferAttribute, InstancedMesh } from 'three';
import type { Item } from '../logic/item.ts';
import type { Kit } from './kit.ts';

/** Suvoq devor, oq ramka. */
const DEFAULT_MAT = 1;
const colorCache = new Map<string, Color>();
const linear = (hex: string): Color => {
  const known = colorCache.get(hex);
  if (known) return known;
  const c = new Color(hex);
  colorCache.set(hex, c);
  return c;
};

/** Faqat y o'qi atrofida burilgan obyektning matritsasi (umumiy hisobdan ancha tez). */
const writeMatrix = (out: Float32Array, at: number, it: Item): void => {
  const c = Math.cos(it.yaw);
  const s = Math.sin(it.yaw);
  out[at] = c * it.sx; out[at + 1] = 0; out[at + 2] = -s * it.sx; out[at + 3] = 0;
  out[at + 4] = 0; out[at + 5] = it.sy; out[at + 6] = 0; out[at + 7] = 0;
  out[at + 8] = s * it.sz; out[at + 9] = 0; out[at + 10] = c * it.sz; out[at + 11] = 0;
  out[at + 12] = it.x; out[at + 13] = it.y; out[at + 14] = it.z; out[at + 15] = 1;
};

/** Har model uchun bitta InstancedMesh; sig'im kerak bo'lganda kengayadi. */
export class Pools {
  readonly group = new Group();
  private readonly meshes = new Map<string, InstancedMesh>();
  private readonly kit: Kit;
  private castShadow = false;

  constructor(kit: Kit) {
    this.kit = kit;
  }

  setShadows(on: boolean): void {
    this.castShadow = on;
    for (const m of this.meshes.values()) m.castShadow = m.receiveShadow = on;
  }

  private mesh(model: string, count: number): InstancedMesh | null {
    const known = this.meshes.get(model);
    if (known && known.instanceMatrix.count >= count) return known;
    const source = this.kit.geometries.get(model);
    if (!source) return null;
    if (known) {
      this.group.remove(known);
      known.geometry.dispose();
      known.dispose();
    }
    const capacity = Math.max(16, Math.ceil(count * 1.5));
    const g = source.clone();
    for (const [name, size] of [['iWall', 3], ['iRoof', 3], ['iFx', 4]] as const) {
      g.setAttribute(name, new InstancedBufferAttribute(new Float32Array(capacity * size), size).setUsage(DynamicDrawUsage));
    }
    const m = new InstancedMesh(g, this.kit.material, capacity);
    m.instanceMatrix.setUsage(DynamicDrawUsage);
    m.frustumCulled = false;
    m.castShadow = m.receiveShadow = this.castShadow;
    this.meshes.set(model, m);
    this.group.add(m);
    return m;
  }

  set(items: readonly Item[]): void {
    const byModel = Map.groupBy(items, (i) => i.model);
    for (const [model, m] of this.meshes) if (!byModel.has(model)) m.count = 0;
    for (const [model, list] of byModel) {
      const m = this.mesh(model, list.length);
      if (m) this.fill(m, list);
    }
  }

  private fill(m: InstancedMesh, list: readonly Item[]): void {
    const wall = m.geometry.getAttribute('iWall') as InstancedBufferAttribute;
    const roof = m.geometry.getAttribute('iRoof') as InstancedBufferAttribute;
    const fx = m.geometry.getAttribute('iFx') as InstancedBufferAttribute;
    const matrix = m.instanceMatrix.array as Float32Array;
    list.forEach((it, i) => {
      writeMatrix(matrix, i * 16, it);
      linear(it.wall).toArray(wall.array, i * 3);
      linear(it.roof).toArray(roof.array, i * 3);
      fx.setXYZW(i, it.glow, it.seed, it.mat ?? DEFAULT_MAT, it.door ?? 0);
    });
    if (m.instanceColor || list.some((it) => it.tint)) {
      list.forEach((it, i) => m.setColorAt(i, linear(it.tint ?? '#ffffff')));
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
    m.count = list.length;
    m.visible = list.length > 0;
    for (const a of [m.instanceMatrix, wall, roof, fx]) a.needsUpdate = true;
  }

  dispose(): void {
    for (const m of this.meshes.values()) {
      m.geometry.dispose();
      m.dispose();
    }
    this.meshes.clear();
    this.group.clear();
  }
}
