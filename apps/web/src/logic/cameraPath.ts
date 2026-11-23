/** Video kamerasi: uyga uchib boradi, atrofida aylanadi, keyingisiga o'tadi (PLAN §7). Vaqtga bog'liq sof funksiya. */
import { padHeight, type Plot } from '../../../../packages/shared/src/index.ts';

export interface Pose { readonly x: number; readonly y: number; readonly z: number; readonly tx: number; readonly ty: number; readonly tz: number }
export interface Frame { readonly pose: Pose; readonly index: number; /** 0..1 — shu uydagi vaqt. */ readonly local: number; readonly labelAlpha: number }

const ease = (t: number): number => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);
const clamp01 = (t: number): number => Math.max(0, Math.min(1, t));
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const lerpPose = (a: Pose, b: Pose, t: number): Pose => ({
  x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), z: lerp(a.z, b.z, t), tx: lerp(a.tx, b.tx, t), ty: lerp(a.ty, b.ty, t), tz: lerp(a.tz, b.tz, t),
});

/** Uy atrofida: old tomondan ±40° yoy. */
const orbit = (p: Plot, t: number): Pose => {
  const yaw = (p.rot * Math.PI) / 2 + lerp(-0.6, 0.7, t);
  const size = Math.max(p.w, p.d);
  const r = size * lerp(1.75, 1.4, t);
  const y = padHeight(p);
  return { x: p.x + Math.sin(yaw) * r, y: y + size * lerp(0.62, 0.42, t), z: p.z + Math.cos(yaw) * r, tx: p.x, ty: y + (p.type === 'kvartira' ? 10 : 3), tz: p.z };
};
const aerial = (p: Plot): Pose => ({ x: p.x * 0.6, y: 150, z: p.z * 0.6 + 90, tx: p.x, ty: 0, tz: p.z });

const FLY_SHARE = 0.38;

export const frameAt = (plots: readonly Plot[], seconds: number, total: number): Frame => {
  const n = Math.max(1, plots.length);
  const per = total / n;
  const index = Math.min(n - 1, Math.max(0, Math.floor(seconds / per)));
  const local = clamp01((seconds - index * per) / per);
  const plot = plots[index];
  if (!plot) throw new Error("Video uchun uy yo'q");
  const prev = plots[index - 1];
  const start = prev ? orbit(prev, 1) : aerial(plot);
  const pose = local < FLY_SHARE ? lerpPose(start, orbit(plot, 0), ease(local / FLY_SHARE)) : orbit(plot, (local - FLY_SHARE) / (1 - FLY_SHARE));
  // Uchishda yoy bo'ylab ko'tariladi — uylar orasidan o'tmaydi.
  const hop = prev && local < FLY_SHARE ? Math.sin((local / FLY_SHARE) * Math.PI) * Math.min(40, Math.hypot(plot.x - prev.x, plot.z - prev.z) * 0.25) : 0;
  const labelAlpha = clamp01((local - FLY_SHARE) / 0.1) * clamp01((1 - local) / 0.06);
  return { pose: { ...pose, y: pose.y + hop }, index, local, labelAlpha };
};
