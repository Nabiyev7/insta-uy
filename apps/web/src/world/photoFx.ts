/** Foto rejimi effektlari (17-qadam): rang tuzatish, tunda bloom, maket (tilt-shift, 2 o'tish) va yuqori aniqlikdagi kadr.
 *  Faqat Foto rejimida yaratiladi — o'yin rejimi oddiy render bilan qoladi. */
import { DirectionalLight, Vector2, Vector3, type Camera, type Scene, type WebGLRenderer } from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { HorizontalTiltShiftShader } from 'three/examples/jsm/shaders/HorizontalTiltShiftShader.js';
import { VerticalTiltShiftShader } from 'three/examples/jsm/shaders/VerticalTiltShiftShader.js';
import { FORMAT_SIZE, aspectOf, frameRect, renderScale, type Grade, type PhotoSettings, type Tilt } from '../logic/photo.ts';

/** To'yinganlik, iliqlik (yorug' joylar) va soyalarda ko'kimtirlik — chiziqli ranglarda, sRGB ga o'tishdan oldin. */
const GradeShader = {
  uniforms: { tDiffuse: { value: null }, uSat: { value: 1 }, uWarm: { value: 0 }, uCool: { value: 0 }, uExp: { value: 1 }, uNight: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uSat; uniform float uWarm; uniform float uCool; uniform float uExp; uniform float uNight; varying vec2 vUv;
void main() {
  vec4 c = texture2D(tDiffuse, vUv);
  float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
  vec3 rgb = mix(vec3(l), c.rgb, uSat);
  float hi = smoothstep(0.25, 0.9, l);
  rgb *= mix(vec3(1.0 - uCool * 0.6, 1.0 - uCool * 0.2, 1.0 + uCool), vec3(1.0 + uWarm, 1.0 + uWarm * 0.45, 1.0 - uWarm * 0.6), hi);
  // Tunda: qorong'i joylar to'q ko'k, yonayotgan (yorug') joylar o'z rangida qoladi.
  float glow = smoothstep(0.55, 1.2, l);
  rgb = mix(rgb * uExp, rgb, glow * uNight) * mix(vec3(1.0), vec3(0.78, 0.86, 1.18), uNight * (1.0 - glow));
  gl_FragColor = vec4(max(rgb, 0.0), c.a);
}`,
};

export interface PhotoComposer {
  readonly composer: EffectComposer;
  /** `frameWidthPx` — ramkaning render pikseldagi eni (xiralik 1080 lik kadrga nisbatan bir xil bo'lsin), `canvas` — chizish buferi o'lchami. */
  readonly update: (grade: Grade, tilt: Tilt, frameWidthPx: number, canvas: { readonly x: number; readonly y: number }) => void;
  readonly dispose: () => void;
}

export const makeComposer = (gl: WebGLRenderer, scene: Scene, camera: Camera): PhotoComposer => {
  const composer = new EffectComposer(gl);
  composer.addPass(new RenderPass(scene, camera));
  const size = gl.getDrawingBufferSize(new Vector2());
  const bloom = new UnrealBloomPass(new Vector2(size.x, size.y), 0.5, 0.45, 0.82);
  composer.addPass(bloom);
  const passes = [HorizontalTiltShiftShader, VerticalTiltShiftShader, HorizontalTiltShiftShader, VerticalTiltShiftShader].map((s) => new ShaderPass(s));
  for (const p of passes) composer.addPass(p);
  const grade = new ShaderPass(GradeShader);
  composer.addPass(grade);
  composer.addPass(new OutputPass());
  return {
    composer,
    update: (g, tilt, fw, canvas) => {
      bloom.enabled = g.bloom > 0;
      bloom.strength = g.bloom;
      // Xiralik render pikselda: kadr eni 1080 bo'lganda `tilt.blur` px; 2 o'tish (ikkinchisi kuchsizroq — gauss yaqinlashuvi).
      const px = tilt.blur * (fw / 1080);
      passes.forEach((p, i) => {
        p.enabled = tilt.blur > 0;
        const k = px * (i < 2 ? 1 : 0.6);
        const u = p.uniforms as Record<string, { value: number }>;
        if (u.h) u.h.value = k / Math.max(1, canvas.x);
        if (u.v) u.v.value = k / Math.max(1, canvas.y);
        if (u.r) u.r.value = tilt.focus;
      });
      const gu = grade.uniforms as Record<'uSat' | 'uWarm' | 'uCool' | 'uExp' | 'uNight', { value: number }>;
      gu.uExp.value = g.exposure;
      gu.uNight.value = g.night;
      gu.uSat.value = g.saturation;
      gu.uWarm.value = g.warmth;
      gu.uCool.value = g.coolShadows;
    },
    dispose: () => { composer.dispose(); bloom.dispose(); },
  };
};

const sunOf = (scene: Scene): DirectionalLight | null => {
  let sun: DirectionalLight | null = null;
  scene.traverse((o) => { if (!sun && o instanceof DirectionalLight && o.castShadow) sun = o; });
  return sun;
};

export interface Signature { readonly nick: string | null; readonly hasLink: boolean }
/** Pastki chap burchakda: "CityLand UZ" (bitta oltin urg'u) va o'z uyi kadrda bo'lsa — @nik; o'ngda kichik havola. */
export const drawSignature = (g: CanvasRenderingContext2D, w: number, h: number, sign: Signature): void => {
  const unit = w / 1080;
  const pad = 48 * unit;
  const base = h - pad;
  g.save();
  const shade = g.createLinearGradient(0, h - 260 * unit, 0, h);
  shade.addColorStop(0, 'rgba(0,0,0,0)');
  shade.addColorStop(1, 'rgba(0,0,0,0.32)');
  g.fillStyle = shade;
  g.fillRect(0, h - 260 * unit, w, 260 * unit);
  g.textBaseline = 'alphabetic';
  g.shadowColor = 'rgba(0,0,0,0.35)';
  g.shadowBlur = 8 * unit;
  const top = sign.nick ? base - 46 * unit : base;
  g.fillStyle = '#f2c14e';
  g.beginPath();
  g.roundRect(pad, top - 30 * unit, 30 * unit, 30 * unit, 7 * unit);
  g.fill();
  g.fillStyle = '#fff';
  g.font = `800 ${34 * unit}px "Golos Text Variable", system-ui, sans-serif`;
  g.fillText('CityLand UZ', pad + 44 * unit, top - 3 * unit);
  if (sign.nick) {
    g.font = `700 ${32 * unit}px "Golos Text Variable", system-ui, sans-serif`;
    g.fillStyle = '#f2c14e';
    g.fillText(`@${sign.nick}`, pad, base);
  }
  if (sign.hasLink) {
    g.font = `600 ${24 * unit}px "Golos Text Variable", system-ui, sans-serif`;
    g.fillStyle = 'rgba(255,255,255,0.85)';
    g.textAlign = 'right';
    g.fillText('t.me/Citylanduz_bot', w - pad, base);
  }
  g.restore();
};

/** O'z uyi ramka ichidami (nik yozuvi uchun). */
export const isInFrame = (camera: Camera, at: { readonly x: number; readonly z: number } | null, frame: { readonly x: number; readonly y: number; readonly w: number; readonly h: number }, view: { readonly width: number; readonly height: number }): boolean => {
  if (!at) return false;
  const p = new Vector3(at.x, 3, at.z).project(camera);
  if (p.z > 1) return false;
  const sx = ((p.x + 1) / 2) * view.width;
  const sy = ((1 - p.y) / 2) * view.height;
  return sx >= frame.x && sx <= frame.x + frame.w && sy >= frame.y && sy <= frame.y + frame.h;
};

export interface ShotInput {
  readonly gl: WebGLRenderer; readonly scene: Scene; readonly camera: Camera; readonly settings: PhotoSettings; readonly grade: Grade; readonly tilt: Tilt;
  readonly view: { readonly width: number; readonly height: number }; readonly isWeak: boolean; readonly sign: Signature | null;
}
/** Yuqori aniqlikda kadr: ekran 2× (kuchsizda 1,5×) render → ramka kesiladi → 1080×1920 / 1350 / 1080. Xotira yetmasa — 1× bilan qayta. */
export const takeShot = (input: ShotInput): HTMLCanvasElement => {
  try {
    return shotAt(input, renderScale(frameRect(input.view.width, input.view.height, aspectOf(input.settings.format)).w * input.gl.getPixelRatio(), 1080, input.isWeak, 4096, input.view.width * input.gl.getPixelRatio()));
  } catch {
    return shotAt(input, 1);
  }
};

const shotAt = ({ gl, scene, camera, settings, grade, tilt, view, sign }: ShotInput, scale: number): HTMLCanvasElement => {
  const ratio = gl.getPixelRatio();
  const sun = sunOf(scene);
  const oldMap = sun ? sun.shadow.mapSize.x : 0;
  const fx = makeComposer(gl, scene, camera);
  try {
    gl.setPixelRatio(ratio * scale);
    // Oltin soatda soyalar shu kadr uchun yuqori sifatda.
    if (sun && settings.light === 'golden' && oldMap < 4096) { sun.shadow.mapSize.set(4096, 4096); sun.shadow.map?.dispose(); sun.shadow.map = null; }
    const px = ratio * scale;
    const frame = frameRect(view.width, view.height, aspectOf(settings.format));
    fx.composer.setPixelRatio(px);
    fx.composer.setSize(view.width, view.height);
    fx.update(grade, tilt, frame.w * px, gl.getDrawingBufferSize(new Vector2()));
    fx.composer.render();
    const { w, h } = FORMAT_SIZE[settings.format];
    const out = document.createElement('canvas');
    out.width = w;
    out.height = h;
    const g = out.getContext('2d');
    if (!g) throw new Error('2D kontekst yo‘q');
    g.imageSmoothingQuality = 'high';
    g.drawImage(gl.domElement, frame.x * px, frame.y * px, frame.w * px, frame.h * px, 0, 0, w, h);
    if (sign) drawSignature(g, w, h, sign);
    return out;
  } finally {
    fx.dispose();
    gl.setPixelRatio(ratio);
    if (sun && sun.shadow.mapSize.x !== oldMap) { sun.shadow.mapSize.set(oldMap, oldMap); sun.shadow.map?.dispose(); sun.shadow.map = null; }
  }
};
