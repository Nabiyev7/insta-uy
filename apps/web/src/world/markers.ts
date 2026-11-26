/** Bo'sh uchastkalar ustidagi sariq "+" va tanlangan joyning sariq ramkasi. */
import { BoxGeometry, BufferAttribute, BufferGeometry, CanvasTexture, Group, Mesh, MeshBasicMaterial, PlaneGeometry, Points, PointsMaterial, SRGBColorSpace, Vector3, type Camera } from 'three';
import { padHeight, type Plot } from '../../../../packages/shared/src/index.ts';

const MAX = 60;
const HEIGHT = 2.6;
/** Ekrandagi o'lchami (px) va barmoq uchun bosish radiusi. */
const SIZE = 30;
const HIT = 24;
const YELLOW = '#f2b33d';

const plusTexture = (): CanvasTexture => {
  const c = document.createElement('canvas');
  c.width = c.height = 96;
  const g = c.getContext('2d');
  if (g) {
    g.beginPath();
    g.arc(48, 48, 44, 0, Math.PI * 2);
    g.fillStyle = '#ffffff';
    g.fill();
    g.beginPath();
    g.arc(48, 48, 38, 0, Math.PI * 2);
    g.fillStyle = YELLOW;
    g.fill();
    g.strokeStyle = '#3d2a05';
    g.lineWidth = 9;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(48, 32);
    g.lineTo(48, 64);
    g.moveTo(32, 48);
    g.lineTo(64, 48);
    g.stroke();
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
};

/** Hammasi bitta draw call (nuqtalar doim kameraga qaraydi). */
export class Markers {
  readonly points: Points<BufferGeometry, PointsMaterial>;
  private readonly position = new BufferAttribute(new Float32Array(MAX * 3), 3);
  private shown: readonly Plot[] = [];
  private readonly at = new Vector3();

  constructor() {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', this.position);
    this.points = new Points(geometry, new PointsMaterial({ map: plusTexture(), size: SIZE, sizeAttenuation: false, transparent: true, alphaTest: 0.2, depthTest: false, fog: false }));
    this.points.frustumCulled = false;
    this.points.renderOrder = 9;
    this.points.visible = false;
  }

  set(list: readonly Plot[]): void {
    this.shown = list.slice(0, MAX);
    this.shown.forEach((p, i) => this.position.setXYZ(i, p.x, padHeight(p) + HEIGHT, p.z));
    this.position.needsUpdate = true;
    this.points.geometry.setDrawRange(0, this.shown.length);
  }

  setVisible(isVisible: boolean): void {
    this.points.visible = isVisible && this.shown.length > 0;
  }

  /** Nechta "+" qo'yilgan (tekshiruv uchun). */
  get listed(): number { return this.shown.length; }

  /** Bosilgan "+": ekrandagi eng yaqini. */
  hit(x: number, y: number, size: { readonly width: number; readonly height: number }, camera: Camera): string | null {
    if (!this.points.visible) return null;
    const best = this.shown.reduce<{ readonly id: string; readonly d: number } | null>((b, p) => {
      this.at.set(p.x, padHeight(p) + HEIGHT, p.z).project(camera);
      if (this.at.z > 1) return b;
      const d = Math.hypot(((this.at.x + 1) / 2) * size.width - x, ((1 - this.at.y) / 2) * size.height - y);
      return d < HIT && (!b || d < b.d) ? { id: p.id, d } : b;
    }, null);
    return best?.id ?? null;
  }

  dispose(): void {
    this.points.geometry.dispose();
    this.points.material.map?.dispose();
    this.points.material.dispose();
  }
}

const LIFT = 0.14;
const BAR = 0.35;
/** Tanlangan bo'sh joy: chegarasi bo'ylab sariq ramka va och sariq fon. */
export class Selection {
  readonly group = new Group();
  private readonly fill = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({ color: YELLOW, transparent: true, opacity: 0.22, depthWrite: false }));
  private readonly bars = Array.from({ length: 4 }, () => new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial({ color: YELLOW })));

  constructor() {
    this.fill.rotation.x = -Math.PI / 2;
    this.group.add(this.fill, ...this.bars);
    this.group.visible = false;
  }

  set(plot: Plot | null): void {
    this.group.visible = plot !== null;
    if (!plot) return;
    const [w, d] = plot.rot % 2 ? [plot.d, plot.w] : [plot.w, plot.d];
    this.group.position.set(plot.x, padHeight(plot) + LIFT, plot.z);
    this.fill.scale.set(w, d, 1);
    const sides = [[0, -d / 2, w, BAR], [0, d / 2, w, BAR], [-w / 2, 0, BAR, d], [w / 2, 0, BAR, d]] as const;
    sides.forEach(([x, z, sx, sz], i) => {
      this.bars[i]?.position.set(x, 0.06, z);
      this.bars[i]?.scale.set(sx, 0.12, sz);
    });
  }

  dispose(): void {
    for (const m of [this.fill, ...this.bars]) {
      m.geometry.dispose();
      m.material.dispose();
    }
  }
}

/** "Bu joy sizni kutyapti": markazga eng yaqin bo'sh joylarda bayroqcha + yorqin "+", sekin yonib-o'chadi. Hammasi bitta draw call. */
const BEACON_SIZE = 44;
const BEACON_LIFT = 7;
const beaconTexture = (): CanvasTexture => {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  if (g) {
    // bayroqcha: ustun + uchburchak
    g.fillStyle = '#ffffff';
    g.fillRect(60, 6, 6, 70);
    g.fillStyle = '#e0465a';
    g.beginPath();
    g.moveTo(66, 8);
    g.lineTo(104, 22);
    g.lineTo(66, 36);
    g.closePath();
    g.fill();
    g.beginPath();
    g.arc(64, 92, 32, 0, Math.PI * 2);
    g.fillStyle = '#ffffff';
    g.fill();
    g.beginPath();
    g.arc(64, 92, 27, 0, Math.PI * 2);
    g.fillStyle = YELLOW;
    g.fill();
    g.strokeStyle = '#3d2a05';
    g.lineWidth = 8;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(64, 79);
    g.lineTo(64, 105);
    g.moveTo(51, 92);
    g.lineTo(77, 92);
    g.stroke();
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
};
export class Beacons {
  readonly points: Points<BufferGeometry, PointsMaterial>;
  private readonly position = new BufferAttribute(new Float32Array(MAX * 3), 3);
  private count = 0;

  constructor() {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', this.position);
    this.points = new Points(geometry, new PointsMaterial({ map: beaconTexture(), size: BEACON_SIZE, sizeAttenuation: false, transparent: true, alphaTest: 0.1, depthTest: true, depthWrite: false, fog: false }));
    this.points.frustumCulled = false;
    this.points.renderOrder = 8;
    this.points.visible = false;
  }

  set(list: readonly Plot[]): void {
    this.count = Math.min(MAX, list.length);
    list.slice(0, MAX).forEach((p, i) => this.position.setXYZ(i, p.x, padHeight(p) + BEACON_LIFT, p.z));
    this.position.needsUpdate = true;
    this.points.geometry.setDrawRange(0, this.count);
  }

  /** "Bu joy sizni kutyapti" ko'rinadimi (tekshiruv uchun). */
  get isOn(): boolean { return this.points.visible; }

  /** Yonib-o'chish: faqat o'lcham va shaffoflik (bitta material). */
  update(isVisible: boolean, seconds: number): void {
    this.points.visible = isVisible && this.count > 0;
    if (!this.points.visible) return;
    const wave = (Math.sin(seconds * 2.4) + 1) / 2;
    this.points.material.size = BEACON_SIZE * (0.9 + wave * 0.2);
    this.points.material.opacity = 0.7 + wave * 0.3;
  }

  dispose(): void {
    this.points.geometry.dispose();
    this.points.material.map?.dispose();
    this.points.material.dispose();
  }
}

/** Bosishni aniqlash uchun hozirgi belgilar (pick.ts). */
export const activeMarkers: { current: Markers | null } = { current: null };
export const activeBeacons: { current: Beacons | null } = { current: null };
