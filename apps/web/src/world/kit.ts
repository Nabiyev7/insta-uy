/** Modellar to'plami, tekstura massivi va yagona material (draw call = model soni). */
import {
  BufferAttribute, BufferGeometry, Color, DataArrayTexture, LinearFilter, LinearMipmapLinearFilter, Mesh, MeshLambertMaterial, RGBAFormat, RepeatWrapping, SRGBColorSpace, UnsignedByteType, Vector3,
} from 'three';
import { DOOR_COLORS, FRAME_COLORS } from '../../../../packages/shared/src/index.ts';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

const LAYERS = 16;
const SIZE = 128;

export const kitUniforms = {
  uTex: { value: null as DataArrayTexture | null },
  uNight: { value: 0 },
  uSnow: { value: 0 },
  uLeaf: { value: new Vector3(1, 1, 1) },
  uFrames: { value: FRAME_COLORS.map((c) => new Color(c)) },
  uDoors: { value: DOOR_COLORS.map((c) => new Color(c)) },
};

const VERTEX_HEAD = `#include <common>
attribute vec2 uv1;
#ifdef USE_INSTANCING
attribute vec3 iWall; attribute vec3 iRoof; attribute vec4 iFx;
#endif
varying vec2 vTuv; varying vec2 vMat; varying vec3 vWall; varying vec3 vRoof; varying vec4 vFx; varying float vH; varying float vUp;`;
const VERTEX_BODY = `#include <begin_vertex>
vTuv = uv; vMat = uv1; vH = position.y;
#ifdef USE_INSTANCING
vWall = iWall; vRoof = iRoof; vFx = iFx;
vUp = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal).y;
#else
vWall = vec3(1.0); vRoof = vec3(1.0); vFx = vec4(0.0, 0.5, 1.0, 0.0); vUp = normalize(mat3(modelMatrix) * normal).y;
#endif`;
const FRAGMENT_HEAD = `#include <common>
precision highp sampler2DArray;
uniform sampler2DArray uTex; uniform float uNight; uniform float uSnow; uniform vec3 uLeaf;
varying vec2 vTuv; varying vec2 vMat; varying vec3 vWall; varying vec3 vRoof; varying vec4 vFx; varying float vH; varying float vUp;
uniform vec3 uFrames[8]; uniform vec3 uDoors[8];
float kitHash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }`;
const FRAGMENT_COLOR = `#include <color_fragment>
float kLayer = floor(vMat.x * ${LAYERS}.0);
float kMask = vMat.y;
float kMat = floor(vFx.z + 0.5);
float kWallLayer = mod(kMat, 16.0);
bool kIsWall = kMask > 0.15 && kMask < 0.35;
vec3 kTex = texture(uTex, vec3(vTuv, (kIsWall && kLayer == 1.0) ? kWallLayer : kLayer)).rgb;
bool kHasGlass = kLayer == 9.0 || kLayer == 12.0 || kLayer == 13.0;
float kGlass = kHasGlass ? smoothstep(0.1, 0.24, kTex.b - kTex.r) : 0.0;
vec3 kTint = kIsWall ? vWall : ((kMask > 0.4 && kMask < 0.6) ? vRoof : vec3(1.0));
diffuseColor.rgb *= kTex * (kLayer == 13.0 ? kTint : mix(kTint, vec3(1.0), kGlass));
if (kLayer == 8.0) diffuseColor.rgb *= uLeaf;
if (kLayer == 9.0) diffuseColor.rgb *= mix(uFrames[int(floor(kMat / 16.0))], vec3(1.0), kGlass);
int kDoor = int(floor(vFx.w + 0.5));
if (kMask > 0.04 && kMask < 0.15 && kDoor > 0) diffuseColor.rgb = uDoors[kDoor] * kTex;
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.86, 0.9, 0.95), uSnow * smoothstep(0.5, 0.85, vUp));`;
const FRAGMENT_EMISSIVE = `#include <emissivemap_fragment>
if (uNight > 0.01) {
  float kDark = kGlass;
  vec3 kWarm = vec3(1.0, 0.68, 0.32);
  float kSeed = floor(vFx.y * 997.0 + 0.5); // interpolyatsiya xatosi donadorlik bermasin
  float kLit = 0.0;
  if (kLayer == 9.0) kLit = kDark * step(vFx.y, 0.78) * 0.75;
  else if (kLayer == 12.0) kLit = kDark * step(kitHash(floor(vTuv * vec2(2.0, 1.0)) + kSeed), 0.42) * 0.6;
  else if (kLayer == 13.0) kLit = kDark * step(kitHash(floor(vTuv * vec2(4.0, 1.0)) + kSeed), 0.22) * 0.5;
  else if (kMask > 0.65 && kMask < 0.9 && kLayer == 0.0) kLit = 1.6;
  if (kMask > 0.9) totalEmissiveRadiance += diffuseColor.rgb * 0.55 * uNight; // yumshoq yorug'lik (gumbazlar)
  totalEmissiveRadiance += kWarm * kLit * uNight;
  totalEmissiveRadiance += diffuseColor.rgb * vec3(1.0, 0.78, 0.45) * vFx.x * uNight * (1.15 - smoothstep(0.0, 9.0, vH));
}`;

export interface KitMaterialOptions { readonly offset?: number }
export const createKitMaterial = ({ offset = 0 }: KitMaterialOptions = {}): MeshLambertMaterial => {
  const m = new MeshLambertMaterial({ vertexColors: true, polygonOffset: offset !== 0, polygonOffsetFactor: offset, polygonOffsetUnits: offset * 4 });
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, kitUniforms);
    shader.vertexShader = shader.vertexShader.replace('#include <common>', VERTEX_HEAD).replace('#include <begin_vertex>', VERTEX_BODY);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', FRAGMENT_HEAD).replace('#include <color_fragment>', FRAGMENT_COLOR).replace('#include <emissivemap_fragment>', FRAGMENT_EMISSIVE);
  };
  m.customProgramCacheKey = () => 'kit';
  return m;
};

const loadTexture = async (url: string): Promise<DataArrayTexture> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Tekstura: ${res.status}`);
  const bitmap = await createImageBitmap(await res.blob());
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE * LAYERS;
  const g = canvas.getContext('2d', { willReadFrequently: true });
  if (!g) throw new Error('2D kontekst yo‘q');
  g.drawImage(bitmap, 0, 0);
  bitmap.close();
  const data = new Uint8Array(g.getImageData(0, 0, SIZE, SIZE * LAYERS).data.buffer);
  const tex = new DataArrayTexture(data, SIZE, SIZE, LAYERS);
  tex.format = RGBAFormat;
  tex.type = UnsignedByteType;
  tex.colorSpace = SRGBColorSpace;
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.minFilter = LinearMipmapLinearFilter;
  tex.magFilter = LinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
};

/** Kvantlangan GLB → float geometriya (tugun matritsasi qo'llangan). */
const bake = (mesh: Mesh): BufferGeometry => {
  const src = mesh.geometry;
  const pos = src.getAttribute('position');
  const out = new Float32Array(pos.count * 3);
  const v = new Vector3();
  for (let i = 0; i < pos.count; i++) v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld).toArray(out, i * 3);
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(out, 3));
  for (const name of ['normal', 'uv', 'uv1', 'color']) g.setAttribute(name, src.getAttribute(name));
  g.setIndex(src.getIndex());
  return g;
};

export interface Kit { readonly geometries: ReadonlyMap<string, BufferGeometry>; readonly material: MeshLambertMaterial }

export const loadKit = async (onProgress: (share: number) => void): Promise<Kit> => {
  let done = 0;
  const track = <T,>(p: Promise<T>): Promise<T> => p.then((r) => { done += 1; onProgress(done / 2); return r; });
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const [tex, gltf] = await Promise.all([track(loadTexture('/assets/tex.webp')), track(loader.loadAsync('/assets/city-kit.glb'))]);
  kitUniforms.uTex.value = tex;
  gltf.scene.updateMatrixWorld(true);
  const geometries = new Map<string, BufferGeometry>();
  gltf.scene.traverse((o) => { if (o instanceof Mesh) geometries.set(o.name, bake(o)); });
  return { geometries, material: createKitMaterial() };
};
