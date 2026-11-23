/** Barcha odamlar (o'yinchi, boshqalar, NPC) — bir nechta InstancedMesh ichida. */
import { BoxGeometry, CapsuleGeometry, Color, CylinderGeometry, DynamicDrawUsage, Euler, Group, InstancedMesh, Matrix4, MeshLambertMaterial, Quaternion, SphereGeometry, Vector3, type BufferGeometry } from 'three';
import type { AvatarLook } from '../../../../packages/shared/src/index.ts';

/** 0 turish, 1 yurish, 2 yugurish, 3 salom, 4 raqs, 5 o'tirish. */
export type Anim = 0 | 1 | 2 | 3 | 4 | 5;
export interface Body { readonly x: number; readonly y: number; readonly z: number; readonly yaw: number; readonly anim: number; readonly look: AvatarLook; readonly phase: number; readonly scale?: number }

const CAPACITY = 72;
type Part = 'head' | 'hair' | 'torso' | 'hip' | 'arm' | 'hand' | 'leg' | 'shoe' | 'doppi' | 'kepka' | 'coat';
const PER_BODY: Readonly<Record<Part, number>> = { head: 1, hair: 1, torso: 1, hip: 1, arm: 2, hand: 2, leg: 2, shoe: 2, doppi: 1, kepka: 1, coat: 1 };

const geometry = (part: Part): BufferGeometry => {
  switch (part) {
    case 'head': return new SphereGeometry(0.15, 10, 8).scale(0.92, 1.12, 1);
    case 'hair': return new SphereGeometry(0.162, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.52).scale(0.95, 1.05, 1.02);
    case 'torso': return new CapsuleGeometry(0.17, 0.3, 3, 8).scale(1.12, 1, 0.72);
    case 'hip': return new CapsuleGeometry(0.15, 0.06, 2, 8).scale(1.08, 1, 0.76);
    case 'arm': return new CapsuleGeometry(0.06, 0.4, 2, 6).translate(0, -0.22, 0);
    case 'hand': return new SphereGeometry(0.06, 6, 5).translate(0, -0.5, 0);
    case 'leg': return new CapsuleGeometry(0.08, 0.56, 2, 6).translate(0, -0.32, 0);
    case 'shoe': return new BoxGeometry(0.14, 0.1, 0.27).translate(0, -0.72, 0.05);
    case 'doppi': return new CylinderGeometry(0.115, 0.155, 0.1, 4).rotateY(Math.PI / 4).translate(0, 0.14, 0);
    case 'kepka': return new CylinderGeometry(0.15, 0.162, 0.09, 10).translate(0, 0.1, 0.03);
    case 'coat': return new CylinderGeometry(0.2, 0.31, 0.95, 8, 1, true).scale(1.05, 1, 0.8);
  }
};

const M = new Matrix4();
const ROOT = new Matrix4();
const P = new Vector3();
const Q = new Quaternion();
const E = new Euler();
const S = new Vector3(1, 1, 1);
const COL = new Color();

interface Limbs { readonly legA: number; readonly legB: number; readonly armA: number; readonly armB: number; readonly armOut: number; readonly bob: number; readonly lean: number; readonly sit: number; readonly twist: number }
const limbsAt = (anim: number, t: number): Limbs => {
  const rest: Limbs = { legA: 0, legB: 0, armA: 0, armB: 0, armOut: 0.08, bob: Math.sin(t * 2) * 0.008, lean: 0, sit: 0, twist: 0 };
  if (anim === 1 || anim === 2) {
    const speed = anim === 2 ? 11 : 7.5;
    const swing = Math.sin(t * speed) * (anim === 2 ? 0.95 : 0.6);
    return { ...rest, legA: swing, legB: -swing, armA: -swing * 0.8, armB: swing * 0.8, bob: Math.abs(Math.cos(t * speed)) * 0.05, lean: anim === 2 ? 0.16 : 0.04 };
  }
  if (anim === 3) return { ...rest, armB: -2.6, armOut: 0.25 + Math.sin(t * 9) * 0.25 };
  if (anim === 4) {
    const b = Math.sin(t * 6);
    return { ...rest, legA: b * 0.35, legB: -b * 0.35, armA: -2.2 + b * 0.5, armB: -2.2 - b * 0.5, armOut: 0.5, bob: Math.abs(b) * 0.1, twist: Math.sin(t * 3) * 0.5 };
  }
  return anim === 5 ? { ...rest, legA: -1.5, legB: -1.5, armA: -0.5, armB: -0.5, sit: 0.42 } : rest;
};

export class Avatars {
  readonly group = new Group();
  private readonly meshes: Readonly<Record<Part, InstancedMesh>>;
  private readonly counts = new Map<Part, number>();

  constructor() {
    const make = (part: Part): InstancedMesh => {
      const m = new InstancedMesh(geometry(part), new MeshLambertMaterial(), CAPACITY * PER_BODY[part]);
      m.instanceMatrix.setUsage(DynamicDrawUsage);
      m.frustumCulled = false;
      m.castShadow = true;
      m.setColorAt(0, COL);
      this.group.add(m);
      return m;
    };
    this.meshes = {
      head: make('head'), hair: make('hair'), torso: make('torso'), hip: make('hip'), arm: make('arm'), hand: make('hand'), leg: make('leg'), shoe: make('shoe'), doppi: make('doppi'), kepka: make('kepka'), coat: make('coat'),
    };
  }

  private put(part: Part, color: string, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0): void {
    const mesh = this.meshes[part];
    const i = this.counts.get(part) ?? 0;
    if (i >= mesh.instanceMatrix.count) return;
    M.compose(P.set(x, y, z), Q.setFromEuler(E.set(rx, ry, rz)), S).premultiply(ROOT);
    mesh.setMatrixAt(i, M);
    mesh.setColorAt(i, COL.set(color));
    this.counts.set(part, i + 1);
  }

  private draw(b: Body, seconds: number): void {
    const l = limbsAt(b.anim, seconds + b.phase);
    const k = b.scale ?? 1;
    ROOT.compose(new Vector3(b.x, b.y + (l.bob - l.sit) * k, b.z), new Quaternion().setFromEuler(new Euler(l.lean, b.yaw + l.twist, 0, 'YXZ')), new Vector3(k, k, k));
    const { look } = b;
    const isCoat = look.outfit === 'chopon';
    this.put('head', look.skin, 0, 1.6, 0);
    this.put('hair', look.hair, 0, 1.625, -0.012, -0.25);
    this.put('torso', look.top, 0, 1.18, 0);
    this.put('hip', look.pants, 0, 0.88, 0);
    if (isCoat) this.put('coat', look.top, 0, 0.98, 0);
    for (const s of [-1, 1] as const) {
      const arm = s < 0 ? l.armA : l.armB;
      const leg = s < 0 ? l.legA : l.legB;
      this.put('arm', look.top, s * 0.235, 1.36, 0, arm, 0, s * l.armOut);
      this.put('hand', look.skin, s * 0.235, 1.36, 0, arm, 0, s * l.armOut);
      this.put('leg', look.pants, s * 0.095, 0.84, 0, leg);
      this.put('shoe', '#2a2320', s * 0.095, 0.84, 0, leg);
    }
    if (look.hat === 'doppi') this.put('doppi', '#17221f', 0, 1.64, 0);
    if (look.hat === 'kepka') this.put('kepka', '#3b4a57', 0, 1.64, 0);
  }

  update(bodies: readonly Body[], seconds: number): void {
    this.counts.clear();
    for (const b of bodies.slice(0, CAPACITY)) this.draw(b, seconds);
    for (const part of Object.keys(this.meshes) as Part[]) {
      const m = this.meshes[part];
      m.count = this.counts.get(part) ?? 0;
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
  }
}
