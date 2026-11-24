/** Oddiy yo'lovchilar: o'yinchi atrofidagi yo'lkalarda yuradi. */
import { AVATAR_OPTIONS, fromLocal, hash01, inTilted, toLocal, type AvatarLook, type Road } from '../../../../packages/shared/src/index.ts';
import { lerpAngle } from '../logic/motion.ts';

export interface Npc { x: number; z: number; tx: number; tz: number; yaw: number; readonly look: AvatarLook; readonly speed: number; pause: number; readonly seed: number }
export const NPC_HIDDEN = 9999;

const npcLook = (i: number): AvatarLook => {
  const pick = <T,>(list: readonly T[], salt: string): T => list[Math.floor(hash01(`${salt}${i}`) * list.length)]!;
  const o = AVATAR_OPTIONS;
  return { skin: pick(o.skin, 's'), hair: pick(o.hair, 'h'), top: pick(o.top, 't'), pants: pick(o.pants, 'p'), hat: pick(o.hat, 'c'), outfit: pick(o.outfit, 'o') };
};
export const createNpcs = (n: number): Npc[] =>
  Array.from({ length: n }, (_, i): Npc => ({ x: NPC_HIDDEN, z: NPC_HIDDEN, tx: 0, tz: 0, yaw: 0, look: npcLook(i), speed: 1 + hash01(`v${i}`) * 0.6, pause: 0, seed: i }));

const KEEP = 95;
const WALK_LENGTH = 60;
/** Yo'lka o'rtasi yo'l chetidan shuncha ichkarida. */
const SIDEWALK_HALF = 0.8;

const respawn = (n: Npc, at: { readonly x: number; readonly z: number }, roads: readonly Road[]): void => {
  const near = roads.filter((r) => inTilted(r, at.x, at.z, 70));
  const r = near[Math.floor(Math.random() * near.length)];
  if (!r) return;
  const isX = r.angle !== undefined || r.w > r.d;
  const side = (Math.random() < 0.5 ? -1 : 1) * ((isX ? r.d : r.w) / 2 - SIDEWALK_HALF);
  const length = isX ? r.w : r.d;
  const [lu, lv] = toLocal(r, at.x, at.z);
  const u = Math.max(-0.5, Math.min(0.5, ((isX ? lu : lv) + (Math.random() - 0.5) * 120) / length)) * length;
  const spot = (t: number): readonly [number, number] => (isX ? fromLocal(r, t, side) : [r.x + side, r.z + t]);
  [n.x, n.z] = spot(u);
  [n.tx, n.tz] = spot(u + (Math.random() < 0.5 ? -1 : 1) * Math.min(WALK_LENGTH, length));
};

export const updateNpcs = (npcs: readonly Npc[], at: { readonly x: number; readonly z: number }, roads: readonly Road[], dt: number): void => {
  for (const n of npcs) {
    if (Math.hypot(n.x - at.x, n.z - at.z) > KEEP) respawn(n, at, roads);
    const dx = n.tx - n.x;
    const dz = n.tz - n.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.6) {
      n.pause = 2 + Math.random() * 4;
      [n.tx, n.tz] = [n.x - Math.sin(n.yaw) * WALK_LENGTH, n.z - Math.cos(n.yaw) * WALK_LENGTH];
    }
    if (n.pause > 0) { n.pause -= dt; continue; }
    n.yaw = lerpAngle(n.yaw, Math.atan2(dx, dz), Math.min(1, dt * 4));
    n.x += (dx / d) * n.speed * dt;
    n.z += (dz / d) * n.speed * dt;
  }
};
