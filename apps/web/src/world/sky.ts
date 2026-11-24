import {
  AdditiveBlending, BackSide, BufferAttribute, BufferGeometry, CircleGeometry, Color, DoubleSide, Group, Mesh, MeshBasicMaterial, MeshLambertMaterial, Points, PointsMaterial, ShaderMaterial, SphereGeometry, Vector3,
} from 'three';
import { LAKE, hash01 } from '../../../../packages/shared/src/index.ts';
import type { Daylight } from '../logic/atmosphere.ts';

const DOME = 1500;
const RIDGE = { nearNight: new Color('#243562'), nearDay: new Color('#8fc2a0'), farNight: new Color('#2c4076'), farDay: new Color('#a9cbe6') };

/** Osmon gumbazi, quyosh/oy, yulduzlar va uzoqdagi tog'lar. */
export class Sky {
  readonly group = new Group();
  readonly fogColor = new Color();
  private readonly uniforms = { uTop: { value: new Color() }, uHorizon: { value: new Color() }, uSun: { value: new Vector3(0, 1, 0) }, uSunColor: { value: new Color() }, uNight: { value: 0 } };
  private readonly mountains: Mesh<BufferGeometry, MeshBasicMaterial>;
  private readonly peaks: Mesh<BufferGeometry, MeshBasicMaterial>;
  private readonly stars: Points<BufferGeometry, PointsMaterial>;

  constructor() {
    const dome = new Mesh(new SphereGeometry(DOME, 24, 12), new ShaderMaterial({
      side: BackSide, depthWrite: false, fog: false, uniforms: this.uniforms,
      vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uSun; uniform vec3 uSunColor; uniform float uNight; varying vec3 vDir;
        void main(){ vec3 d = normalize(vDir); float h = max(d.y, 0.0); vec3 c = mix(uHorizon, uTop, pow(h, 0.55)); float s = max(dot(d, normalize(uSun)), 0.0);
        c += uSunColor * (smoothstep(0.9988, 0.9994, s) * mix(1.4, 0.9, uNight) + pow(s, 48.0) * 0.28 * (1.0 - uNight * 0.6) + pow(s, 6.0) * 0.10 * (1.0 - uNight));
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
        }`,
    }));
    dome.renderOrder = -10;
    dome.frustumCulled = false;
    this.mountains = new Mesh(ridge(1420, 70, 150, 'a'), new MeshBasicMaterial({ fog: false, side: DoubleSide, depthWrite: false }));
    this.peaks = new Mesh(ridge(1460, 130, 260, 'b'), new MeshBasicMaterial({ fog: false, side: DoubleSide, depthWrite: false }));
    this.mountains.renderOrder = -7;
    this.peaks.renderOrder = -8;
    this.stars = starField();
    this.group.add(dome, this.peaks, this.mountains, this.stars);
  }

  update(d: Daylight, x: number, z: number): void {
    this.group.position.set(x, 0, z);
    // Ranglar sRGB da berilgan → chiziqli fazoga.
    const set = (c: Color, v: readonly [number, number, number]): Color => c.setRGB(v[0], v[1], v[2], 'srgb');
    set(this.uniforms.uTop.value, d.skyTop);
    set(this.uniforms.uHorizon.value, d.skyHorizon);
    set(this.uniforms.uSunColor.value, d.sunColor);
    this.uniforms.uSun.value.set(...d.sun);
    this.uniforms.uNight.value = d.night;
    this.fogColor.copy(this.uniforms.uHorizon.value);
    const base = this.uniforms.uHorizon.value;
    this.mountains.material.color.copy(base).lerp(d.night > 0.5 ? RIDGE.nearNight : RIDGE.nearDay, 0.5);
    this.peaks.material.color.copy(base).lerp(d.night > 0.5 ? RIDGE.farNight : RIDGE.farDay, 0.42);
    this.stars.material.opacity = d.night * 0.9;
    this.stars.visible = d.night > 0.05;
  }
}

const ridge = (r: number, base: number, amp: number, seed: string): BufferGeometry => {
  const n = 120;
  const pos: number[] = [];
  const height = (i: number): number => {
    const k = i % n;
    const wave = Math.sin(k * 0.21 + seed.length) * 0.3 + Math.sin(k * 0.0524 * 3) * 0.35;
    return base + amp * Math.max(0, 0.35 + wave + hash01(`${seed}${k}`) * 0.4);
  };
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const b = ((i + 1) / n) * Math.PI * 2;
    const p = (t: number, y: number): number[] => [Math.cos(t) * r, y, Math.sin(t) * r];
    pos.push(...p(a, -60), ...p(b, -60), ...p(b, height(i + 1)), ...p(a, -60), ...p(b, height(i + 1)), ...p(a, height(i)));
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
  return g;
};

const starField = (): Points<BufferGeometry, PointsMaterial> => {
  const pos: number[] = [];
  for (let i = 0; i < 420; i++) {
    const a = hash01(`sa${i}`) * Math.PI * 2;
    const t = Math.asin(0.12 + hash01(`st${i}`) * 0.86);
    pos.push(Math.cos(a) * Math.cos(t) * 1380, Math.sin(t) * 1380, Math.sin(a) * Math.cos(t) * 1380);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
  const p = new Points(g, new PointsMaterial({ color: '#dfe8ff', size: 2.2, sizeAttenuation: false, transparent: true, depthWrite: false, fog: false, blending: AdditiveBlending }));
  p.renderOrder = -9;
  p.frustumCulled = false;
  return p;
};

/** Ko'l suvi: yengil to'lqinli rang. */
export class Lake {
  readonly mesh: Mesh<CircleGeometry, MeshLambertMaterial>;
  private readonly time = { value: 0 };

  constructor() {
    const g = new CircleGeometry(1, 72);
    g.rotateX(-Math.PI / 2);
    g.scale(LAKE.rx, 1, LAKE.rz);
    const m = new MeshLambertMaterial({ color: '#6cc4ea', polygonOffset: true, polygonOffsetFactor: -5, polygonOffsetUnits: -20 });
    m.onBeforeCompile = (s) => {
      s.uniforms.uTime = this.time;
      s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vW;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvW = position.xz;');
      s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vW; uniform float uTime;')
        .replace('#include <color_fragment>', `#include <color_fragment>
        float w = sin(vW.x * 0.05 + sin(vW.y * 0.07 + uTime * 0.4) * 1.6) + sin(vW.y * 0.06 - vW.x * 0.03 - uTime * 0.3);
        diffuseColor.rgb *= 0.97 + 0.03 * w; diffuseColor.rgb += 0.06 * smoothstep(1.5, 1.9, w);`);
    };
    this.mesh = new Mesh(g, m);
    this.mesh.position.set(LAKE.x, 0.01, LAKE.z);
    this.mesh.renderOrder = -1;
  }

  update(seconds: number): void {
    this.time.value = seconds;
  }
}
