/** Darvoza yonidagi lavhalarga egasining nikini yozadi (nik bazada so'z filtridan o'tgan). Faqat eng yaqinlari. */
import { CanvasTexture, Group, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace } from 'three';

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
