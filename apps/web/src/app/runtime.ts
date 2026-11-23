/** Har kadrda o'zgaradigan holat — React'dan tashqarida (qayta render bo'lmasin). */
export interface PlayerState { x: number; y: number; z: number; yaw: number; anim: number; emote: number; emoteUntil: number }
export interface CameraState { yaw: number; pitch: number; distance: number }
export interface InputState { moveX: number; moveY: number; isRunning: boolean; lookX: number; lookY: number; zoom: number }
export interface RemotePlayer { id: string; nick: string | null; look: import('../../../../packages/shared/src/index.ts').AvatarLook; x: number; z: number; yaw: number; tx: number; tz: number; tyaw: number; anim: number }

export const player: PlayerState = { x: 0, y: 0, z: 40, yaw: Math.PI, anim: 0, emote: 0, emoteUntil: 0 };
export const camera: CameraState = { yaw: 0, pitch: 0.22, distance: 6 };
export const input: InputState = { moveX: 0, moveY: 0, isRunning: false, lookX: 0, lookY: 0, zoom: 0 };
export const remotes = new Map<string, RemotePlayer>();

/** Video yoki foto rejimida kamera tashqaridan boshqariladi. */
export const director: { pose: import('../logic/cameraPath.ts').Pose | null; dayFraction: number | null } = { pose: null, dayFraction: null };
/** Uy kartochkasi ochilganda kameraning qisqa yaqinlashishi emas — faqat teleport so'rovi. */
export const teleport = (x: number, z: number, yaw: number): void => {
  player.x = x;
  player.z = z;
  player.yaw = yaw;
  camera.yaw = yaw + Math.PI;
  camera.pitch = 0.2;
};
export const snapshotters: { capture: (() => HTMLCanvasElement | null) | null } = { capture: null };
