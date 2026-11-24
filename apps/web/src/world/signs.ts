/** Darvoza yonidagi lavhalarga egasining nikini yozadi (nik bazada so'z filtridan o'tgan). Faqat eng yaqinlari. */
import { CanvasTexture, Group, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace, Vector3 } from 'three';
import type { Lang } from '../../../../packages/shared/src/index.ts';
import type { Item } from '../logic/item.ts';

export interface SignInfo { readonly key: string; readonly text: string; readonly x: number; readonly y: number; readonly z: number; readonly yaw: number }
const MAX_SIGNS = 8;
const SIZE = { w: 1.1, h: 0.46 } as const;
const TEXTURE = { w: 256, h: 108 } as const;

const signTexture = (text: string): CanvasTexture => {
  const c = document.createElement('canvas');
  c.width = TEXTURE.w;
  c.height = TEXTURE.h;
  const g = c.getContext('2d');
  if (g) {
    g.fillStyle = '#f6ead0';
    g.fillRect(0, 0, TEXTURE.w, TEXTURE.h);
    g.fillStyle = '#4a2c16';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = '700 46px system-ui, sans-serif';
    g.fillText(text, TEXTURE.w / 2, TEXTURE.h / 2, TEXTURE.w - 18);
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
};

export class Signs {
  readonly group = new Group();
  private readonly shown = new Map<string, Mesh<PlaneGeometry, MeshBasicMaterial>>();
  private readonly geometry = new PlaneGeometry(SIZE.w, SIZE.h);

  set(list: readonly SignInfo[]): void {
    const wanted = list.slice(0, MAX_SIGNS);
    const keys = new Set(wanted.map((s) => `${s.key}|${s.text}`));
    for (const [key, mesh] of this.shown) if (!keys.has(key)) this.drop(key, mesh);
    for (const s of wanted) {
      const key = `${s.key}|${s.text}`;
      if (this.shown.has(key)) continue;
      const mesh = new Mesh(this.geometry, new MeshBasicMaterial({ map: signTexture(s.text) }));
      mesh.position.set(s.x, s.y, s.z);
      mesh.rotation.y = s.yaw;
      this.shown.set(key, mesh);
      this.group.add(mesh);
    }
  }

  private drop(key: string, mesh: Mesh<PlaneGeometry, MeshBasicMaterial>): void {
    mesh.material.map?.dispose();
    mesh.material.dispose();
    this.group.remove(mesh);
    this.shown.delete(key);
  }

  dispose(): void {
    for (const [key, mesh] of [...this.shown]) this.drop(key, mesh);
    this.geometry.dispose();
  }
}

const BOARD_TEXT: Readonly<Record<Lang, readonly [string, string]>> = { uz: ["Bo'sh joy —", 'oling!'], ru: ['Свободно —', 'забирайте!'] };
const BOARD = { w: 1.7, h: 0.72, y: 1.15, out: 0.075, max: 400, pxW: 512, pxH: 216 } as const;
const boardTexture = (lang: Lang): CanvasTexture => {
  const c = document.createElement('canvas');
  c.width = BOARD.pxW;
  c.height = BOARD.pxH;
  const g = c.getContext('2d');
  if (g) {
    g.fillStyle = '#fffdf6';
    g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#2f6f35';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = '800 92px system-ui, "Segoe UI", Roboto, sans-serif';
    BOARD_TEXT[lang].forEach((line, i) => g.fillText(line, c.width / 2, c.height * (0.28 + i * 0.46), c.width - 24));
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
};

/** Bo'sh uchastka taxtachalari yozuvi: hammasi bitta draw call. */
export class Boards {
  readonly mesh = new InstancedMesh(new PlaneGeometry(BOARD.w, BOARD.h), new MeshBasicMaterial(), BOARD.max);
  private lang: Lang | null = null;
  private readonly matrix = new Matrix4();
  private readonly scale = new Vector3();

  constructor() {
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    this.mesh.visible = false;
  }

  setLang(lang: Lang): void {
    if (lang === this.lang) return;
    this.lang = lang;
    this.mesh.material.map?.dispose();
    this.mesh.material.map = boardTexture(lang);
    this.mesh.material.needsUpdate = true;
  }

  /** Tunda yozuv ham xiralashadi. */
  setNight(night: number): void {
    this.mesh.material.color.setScalar(1 - 0.45 * night);
  }

  set(list: readonly Item[]): void {
    const shown = list.slice(0, BOARD.max);
    shown.forEach((it, i) => {
      const out = BOARD.out * it.sz;
      this.matrix.makeRotationY(it.yaw).scale(this.scale.set(it.sx, it.sy, 1)).setPosition(it.x + Math.sin(it.yaw) * out, it.y + BOARD.y * it.sy, it.z + Math.cos(it.yaw) * out);
      this.mesh.setMatrixAt(i, this.matrix);
    });
    this.mesh.count = shown.length;
    this.mesh.visible = shown.length > 0;
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.mesh.material.map?.dispose();
    this.mesh.material.dispose();
    this.mesh.dispose();
  }
}
