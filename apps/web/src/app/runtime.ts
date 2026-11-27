/** Har kadrda o'zgaradigan holat — React'dan tashqarida (qayta render bo'lmasin). */
import type { HouseOrbit } from '../logic/houseOrbit.ts';
import type { AvatarLook } from '../../../../packages/shared/src/index.ts';
import { START_VIEW, type CityView, type Flight } from '../logic/cityCamera.ts';
import type { Pose } from '../logic/cameraPath.ts';
import type { CarState } from '../logic/drive.ts';

export type Mode = 'city' | 'walk' | 'drive';
export interface PlayerState { x: number; y: number; z: number; yaw: number; anim: number; emote: number; emoteUntil: number }
export interface CameraState { yaw: number; pitch: number; distance: number }
export interface InputState {
  moveX: number; moveY: number; isRunning: boolean; isBraking: boolean;
  lookX: number; lookY: number; zoom: number;
  /** Shahar rejimi: sudrash (piksel), chimchilash (ko'paytuvchi), burish (radian). */
  panX: number; panY: number; zoomBy: number; twist: number;
}
export interface RemotePlayer { id: string; nick: string | null; look: AvatarLook; x: number; z: number; yaw: number; tx: number; tz: number; tyaw: number; anim: number }

export const player: PlayerState = { x: 0, y: 0, z: 40, yaw: Math.PI, anim: 0, emote: 0, emoteUntil: 0 };
export const camera: CameraState = { yaw: 0, pitch: 0.22, distance: 6 };
export const input: InputState = { moveX: 0, moveY: 0, isRunning: false, isBraking: false, lookX: 0, lookY: 0, zoom: 0, panX: 0, panY: 0, zoomBy: 1, twist: 0 };
export const remotes = new Map<string, RemotePlayer>();

/** Joriy rejim (React tomoni `store.mode` ni ko'radi; ikkalasi `setMode` da birga o'zgaradi). */
export const session: { mode: Mode; buildTimer: ReturnType<typeof setTimeout> | null } = { mode: 'city', buildTimer: null };
/** Uy qurilishi tabrigi taymeri bitta: yangisi yoki rejim almashganda eskisi bekor qilinadi. */
export const cancelBuildTimer = (): void => {
  if (session.buildTimer !== null) clearTimeout(session.buildTimer);
  session.buildTimer = null;
};
export const city: { view: CityView; flight: Flight | null } = { view: START_VIEW, flight: null };
export const car: { state: CarState; id: string } = { state: { x: 0, z: 140, yaw: 0, speed: 0 }, id: 'oddiy' };

/** "Uyimni suratga olish": Foto rejimida kamera faqat shu uy atrofida aylanadi (19-qadam). */
export const houseShot: { orbit: HouseOrbit | null } = { orbit: null };
/** Video yoki foto rejimida kamera tashqaridan boshqariladi. */
export const director: { pose: Pose | null; dayFraction: number | null } = { pose: null, dayFraction: null };
/** Rejim almashganda kamera eski joyidan yangisiga silliq o'tadi. */
export const transition: { from: Pose | null; at: number; last: Pose | null } = { from: null, at: 0, last: null };

/** Foydalanuvchi hozir qayerda: shaharda — kamera qaragan nuqta, aks holda o'zi. */
export const here = (): { readonly x: number; readonly z: number; readonly yaw: number } => {
  if (session.mode === 'city') return { x: city.view.x, z: city.view.z, yaw: city.view.yaw + Math.PI };
  if (session.mode === 'drive') return car.state;
  return player;
};

export const teleport = (x: number, z: number, yaw: number): void => {
  player.x = x;
  player.z = z;
  player.yaw = yaw;
  camera.yaw = yaw + Math.PI;
  camera.pitch = 0.2;
};
/** `photo` — Foto rejimi kadri (17-qadam): effektlar bilan, yuqori aniqlikda, belgi bilan. */
export const snapshotters: { capture: (() => HTMLCanvasElement | null) | null; photo: (() => HTMLCanvasElement | null) | null } = { capture: null, photo: null };
