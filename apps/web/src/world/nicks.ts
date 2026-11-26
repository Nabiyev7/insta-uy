/** Uzoqdagi uylarning niklari: bitta matn atlasi (canvas) + bitta instanced mesh — yuzlab yorliq bitta draw call.
 *  O'lcham ekranda px da (shader), kamera har kadr yursa ham yorliq o'z joyida. Batafsil yorliqlar (yaqinda) — `labels.ts`. */
import { CanvasTexture, InstancedBufferAttribute, InstancedBufferGeometry, LinearFilter, Mesh, PlaneGeometry, ShaderMaterial, Vector2 } from 'three';

/** Ekranda bir vaqtda ko'pi bilan shuncha uzoq nik. */
export const FAR_MAX = 300;
const ATLAS_W = 2048;
const ATLAS_H = 1024;
const CELL_H = 32;
const PAD = 2;
const MAX_W = 420;
const FONT = '700 22px system-ui, "Segoe UI", Roboto, sans-serif';

export interface FarNick { readonly key: string; readonly text: string; readonly x: number; readonly y: number; readonly z: number; /** Ekrandagi balandlik (CSS px). */ readonly px: number }
interface Rect { readonly u0: number; readonly v0: number; readonly u1: number; readonly v1: number; readonly aspect: number }

/** Atlas: yangi nik kelganda chiziladi; to'lsa — tozalanib, faqat hozirgilar qayta chiziladi. */
class Atlas {
  readonly canvas = document.createElement('canvas');
  readonly texture: CanvasTexture;
  private readonly g: CanvasRenderingContext2D;
  private readonly rects = new Map<string, Rect>();
  private x = 0;
  private y = 0;

  constructor() {
    this.canvas.width = ATLAS_W;
    this.canvas.height = ATLAS_H;
    const g = this.canvas.getContext('2d');
    if (!g) throw new Error('2D kontekst yo‘q');
    this.g = g;
    this.texture = new CanvasTexture(this.canvas);
    this.texture.minFilter = LinearFilter;
    this.texture.generateMipmaps = false;
  }

  /** Bor bo'lsa — joyi; yo'q bo'lsa chiziladi; joy qolmagan bo'lsa — null. */
  rect(text: string): Rect | null {
    const known = this.rects.get(text);
    if (known) return known;
    const g = this.g;
    g.font = FONT;
    const w = Math.min(MAX_W, Math.ceil(g.measureText(text).width) + 22);
    if (this.x + w > ATLAS_W) { this.x = 0; this.y += CELL_H; }
    if (this.y + CELL_H > ATLAS_H) return null;
    const { x, y } = this;
    g.beginPath();
    g.roundRect(x + PAD, y + PAD, w - PAD * 2, CELL_H - PAD * 2, (CELL_H - PAD * 2) / 2);
    g.fillStyle = 'rgba(255,255,255,0.93)';
    g.fill();
    g.lineWidth = 1.5;
    g.strokeStyle = 'rgba(60,45,20,0.4)';
    g.stroke();
    g.fillStyle = '#1d1912';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, x + w / 2, y + CELL_H / 2 + 1, w - 14);
    this.x += w;
    const made: Rect = { u0: x / ATLAS_W, v0: 1 - (y + CELL_H) / ATLAS_H, u1: (x + w) / ATLAS_W, v1: 1 - y / ATLAS_H, aspect: w / CELL_H };
    this.rects.set(text, made);
    this.texture.needsUpdate = true;
    return made;
  }

  clear(): void {
    this.g.clearRect(0, 0, ATLAS_W, ATLAS_H);
    this.rects.clear();
    this.x = 0;
    this.y = 0;
    this.texture.needsUpdate = true;
  }

  dispose(): void { this.texture.dispose(); }
}

const VERTEX = /* glsl */ `
attribute vec3 aAt;
attribute vec4 aUv;
attribute vec2 aPx;
uniform vec2 uView;
varying vec2 vUv;
void main() {
  vec4 c = projectionMatrix * modelViewMatrix * vec4(aAt, 1.0);
  c.xy += position.xy * aPx / uView * 2.0 * c.w;
  vUv = mix(aUv.xy, aUv.zw, position.xy + 0.5);
  gl_Position = c;
}`;
const FRAGMENT = /* glsl */ `
uniform sampler2D uMap;
uniform float uOpacity;
varying vec2 vUv;
void main() {
  vec4 t = texture2D(uMap, vUv);
  if (t.a < 0.02) discard;
  gl_FragColor = vec4(t.rgb, t.a * uOpacity);
}`;

/** Yorliq ekranda qancha joy oladi (px) — declutter uchun. */
export const farBoxSize = (atlasAspect: number, px: number): { readonly w: number; readonly h: number } => ({ w: atlasAspect * px, h: px });

export class FarNicks {
  readonly mesh: Mesh<InstancedBufferGeometry, ShaderMaterial>;
  private readonly atlas = new Atlas();
  private readonly at = new InstancedBufferAttribute(new Float32Array(FAR_MAX * 3), 3);
  private readonly uv = new InstancedBufferAttribute(new Float32Array(FAR_MAX * 4), 4);
  private readonly px = new InstancedBufferAttribute(new Float32Array(FAR_MAX * 2), 2);
  private readonly uniforms = { uMap: { value: null as CanvasTexture | null }, uView: { value: new Vector2(1, 1) }, uOpacity: { value: 1 } };

  constructor() {
    const geometry = new InstancedBufferGeometry();
    const quad = new PlaneGeometry(1, 1);
    geometry.index = quad.index;
    geometry.setAttribute('position', quad.getAttribute('position'));
    geometry.setAttribute('aAt', this.at);
    geometry.setAttribute('aUv', this.uv);
    geometry.setAttribute('aPx', this.px);
    geometry.instanceCount = 0;
    this.uniforms.uMap.value = this.atlas.texture;
    const material = new ShaderMaterial({
      vertexShader: VERTEX, fragmentShader: FRAGMENT, transparent: true, depthTest: false, depthWrite: false,
      uniforms: this.uniforms,
    });
    this.mesh = new Mesh(geometry, material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 9;
  }

  /** Nikning atlasdagi eni/bo'yi nisbati (declutter uchun); atlas to'lsa — tozalab qayta urinadi. */
  aspectOf(text: string, keep: readonly string[]): number | null {
    const r = this.atlas.rect(text);
    if (r) return r.aspect;
    this.atlas.clear();
    for (const k of keep) this.atlas.rect(k);
    return this.atlas.rect(text)?.aspect ?? null;
  }

  set(list: readonly FarNick[], view: { readonly width: number; readonly height: number }): void {
    let n = 0;
    for (const it of list.slice(0, FAR_MAX)) {
      const r = this.atlas.rect(it.text);
      if (!r) continue;
      this.at.setXYZ(n, it.x, it.y, it.z);
      this.uv.setXYZW(n, r.u0, r.v0, r.u1, r.v1);
      this.px.setXY(n, it.px * r.aspect, it.px);
      n += 1;
    }
    this.at.needsUpdate = true;
    this.uv.needsUpdate = true;
    this.px.needsUpdate = true;
    this.mesh.geometry.instanceCount = n;
    this.mesh.visible = n > 0;
    this.uniforms.uView.value.set(Math.max(1, view.width), Math.max(1, view.height));
  }

  setOpacity(value: number): void { this.uniforms.uOpacity.value = value; }

  get count(): number { return this.mesh.visible ? this.mesh.geometry.instanceCount : 0; }

  dispose(): void {
    this.atlas.dispose();
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
