/** Sahnadagi bitta narsa: model, joy, rang. Faqat hisob — Three.js yo'q. */
import { hash01, terrainHeight, type Rot } from '../../../../packages/shared/src/index.ts';

export interface Item {
  readonly model: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly yaw: number;
  readonly sx: number;
  readonly sy: number;
  readonly sz: number;
  readonly wall: string;
  readonly roof: string;
  /** 0..1 — tungi hashamatli yoritish. */
  readonly glow: number;
  readonly seed: number;
}
export const WHITE = '#ffffff';

export const item = (model: string, x: number, z: number, over: Partial<Item> = {}): Item => ({
  model, x, y: terrainHeight(x, z), z, yaw: 0, sx: 1, sy: 1, sz: 1, wall: WHITE, roof: WHITE, glow: 0, seed: hash01(`${model}${x.toFixed(1)}${z.toFixed(1)}`), ...over,
});

export const yawOf = (rot: Rot): number => (rot * Math.PI) / 2;
export const toWorld = (p: { readonly x: number; readonly z: number; readonly rot: Rot }, lx: number, lz: number): readonly [number, number] => {
  const a = yawOf(p.rot);
  return [p.x + lx * Math.cos(a) + lz * Math.sin(a), p.z - lx * Math.sin(a) + lz * Math.cos(a)];
};

/** Avatar kirolmaydigan to'rtburchaklar. */
export interface Solid { readonly x: number; readonly z: number; readonly hx: number; readonly hz: number; readonly h: number }
