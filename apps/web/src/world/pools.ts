import { Color, DynamicDrawUsage, Euler, Group, InstancedBufferAttribute, InstancedMesh, Matrix4, Quaternion, Vector3 } from 'three';
import type { Item } from '../logic/item.ts';
import type { Kit } from './kit.ts';

const colorCache = new Map<string, Color>();
const linear = (hex: string): Color => {
  const known = colorCache.get(hex);
  if (known) return known;
  const c = new Color(hex);
  colorCache.set(hex, c);
  return c;
};

const M = new Matrix4();
const P = new Vector3();
const Q = new Quaternion();
const E = new Euler();
const S = new Vector3();

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
    for (const [name, size] of [['iWall', 3], ['iRoof', 3], ['iFx', 2]] as const) {
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
    list.forEach((it, i) => {
      Q.setFromEuler(E.set(0, it.yaw, 0));
      m.setMatrixAt(i, M.compose(P.set(it.x, it.y, it.z), Q, S.set(it.sx, it.sy, it.sz)));
      linear(it.wall).toArray(wall.array, i * 3);
      linear(it.roof).toArray(roof.array, i * 3);
      fx.setXY(i, it.glow, it.seed);
    });
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
