import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, Vector3 } from 'three';
import {
  SpatialIndex, districtAt, footprint, hash01, inLake, padHeight, sanitizeAvatar, AVATAR_OPTIONS, type AvatarLook, type MasterPlan, type Plot,
} from '../../../../packages/shared/src/index.ts';
import { cameraDistance, lerpAngle, movePlayer, pickNearest, type PickBox, type Ray } from '../logic/motion.ts';
import { PLAZA_SOLIDS, buildingSolid, commerceSolid, houseSolid, pickHeight, type Solid } from '../logic/placement.ts';
import { QUALITY, startGovernor, stepGovernor } from '../logic/quality.ts';
import { camera as cam, director, input, player, remotes, snapshotters } from '../app/runtime.ts';
import { getApp, openPanel, setApp, useApp } from '../app/store.ts';
import { Avatars, type Body } from './avatars.ts';
import { groundHeight } from './ground.ts';
import { Labels } from './labels.ts';

const WALK = 4.2;
const RUN = 8.5;
const EYE = 1.55;

const npcLook = (i: number): AvatarLook => {
  const pick = <T,>(list: readonly T[], salt: string): T => list[Math.floor(hash01(`${salt}${i}`) * list.length)]!;
  const o = AVATAR_OPTIONS;
  return { skin: pick(o.skin, 's'), hair: pick(o.hair, 'h'), top: pick(o.top, 't'), pants: pick(o.pants, 'p'), hat: pick(o.hat, 'c'), outfit: pick(o.outfit, 'o') };
};
interface Npc { x: number; z: number; tx: number; tz: number; yaw: number; readonly look: AvatarLook; readonly speed: number; pause: number; readonly seed: number }

/** Oddiy yo'lovchilar: o'yinchi atrofidagi yo'lkalarda yuradi. */
const updateNpcs = (npcs: Npc[], roads: SpatialIndex<MasterPlan['roads'][number]>, dt: number): void => {
  for (const n of npcs) {
    if (Math.hypot(n.x - player.x, n.z - player.z) > 95) {
      const near = roads.query(player.x, player.z, 260).filter((r) => Math.abs(r.x - player.x) < r.w / 2 + 70 && Math.abs(r.z - player.z) < r.d / 2 + 70);
      const r = near[Math.floor(Math.random() * near.length)];
      if (!r) continue;
      const isX = r.w > r.d;
      const side = (Math.random() < 0.5 ? -1 : 1) * (r.kind === 'prospekt' ? 12.6 : 5.2);
      const u = Math.max(-0.5, Math.min(0.5, ((isX ? player.x - r.x : player.z - r.z) + (Math.random() - 0.5) * 120) / (isX ? r.w : r.d))) * (isX ? r.w : r.d);
      [n.x, n.z] = isX ? [r.x + u, r.z + side] : [r.x + side, r.z + u];
      const far = (Math.random() < 0.5 ? -1 : 1) * 60;
      [n.tx, n.tz] = isX ? [n.x + far, n.z] : [n.x, n.z + far];
    }
    const dx = n.tx - n.x;
    const dz = n.tz - n.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.6) {
      n.pause = 2 + Math.random() * 4;
      [n.tx, n.tz] = [n.x - Math.sin(n.yaw) * 60, n.z - Math.cos(n.yaw) * 60];
    }
    if (n.pause > 0) { n.pause -= dt; continue; }
    n.yaw = lerpAngle(n.yaw, Math.atan2(dx, dz), Math.min(1, dt * 4));
    n.x += (dx / d) * n.speed * dt;
    n.z += (dz / d) * n.speed * dt;
  }
};

interface PlayerLayerProps { readonly plan: MasterPlan }

export function PlayerLayer({ plan }: PlayerLayerProps): null {
  const { scene, camera, gl, size } = useThree();
  const houses = useApp((s) => s.houses);
  const profile = useApp((s) => s.profile);
  const level = useApp((s) => s.quality);
  const boot = useApp((s) => s.boot);
  const look = useMemo(() => sanitizeAvatar(profile?.avatar), [profile]);
  const avatars = useMemo(() => new Avatars(), []);
  const names = useMemo(() => new Labels(), []);
  const governor = useRef(startGovernor(level));
  const tick = useRef({ hud: 0, smoothY: 0, fpsFrames: 0, fpsTime: 0 });

  const index = useMemo(() => ({
    plots: new SpatialIndex(plan.plots.filter((p) => p.type !== 'kvartira')),
    roads: new SpatialIndex(plan.roads.map((r) => ({ ...r })), 250),
    commerce: new SpatialIndex(plan.commerce),
  }), [plan]);
  const npcs = useMemo(() => Array.from({ length: QUALITY[level].npcs }, (_, i): Npc => ({ x: 9999, z: 9999, tx: 0, tz: 0, yaw: 0, look: npcLook(i), speed: 1 + hash01(`v${i}`) * 0.6, pause: 0, seed: i })), [level]);
  const hasBridge = boot?.projects.some((p) => p.kind === 'koprik' && p.status === 'done') ?? false;

  const nearPlots = (r: number): Plot[] => index.plots.query(player.x, player.z, r);
  const solidsNear = (plots: readonly Plot[]): Solid[] => [
    ...plots.flatMap((p) => { const s = houses.get(p.id); const b = s ? houseSolid(p, s) : null; return b ? [b] : []; }),
    ...plan.buildings.filter((b) => Math.abs(b.x - player.x) < 40 && Math.abs(b.z - player.z) < 40).map(buildingSolid),
    ...index.commerce.query(player.x, player.z, 40).flatMap((c) => { const b = commerceSolid(c); return b ? [b] : []; }),
    ...(Math.abs(player.x) < 130 && Math.abs(player.z) < 130 ? PLAZA_SOLIDS : []),
  ];

  useEffect(() => {
    scene.add(avatars.group, names.group);
    return () => {
      scene.remove(avatars.group, names.group);
      avatars.dispose();
      names.dispose();
    };
  }, [scene, avatars, names]);

  // Uyni bosish: sudrash emas, qisqa teginish.
  useEffect(() => {
    const el = gl.domElement;
    let start: { x: number; y: number; t: number } | null = null;
    const down = (e: PointerEvent): void => { start = { x: e.clientX, y: e.clientY, t: e.timeStamp }; };
    const up = (e: PointerEvent): void => {
      if (!start || Math.hypot(e.clientX - start.x, e.clientY - start.y) > 8 || e.timeStamp - start.t > 400 || getApp().isPhoto) return;
      const r = el.getBoundingClientRect();
      const dir = new Vector3(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1, 0.5).unproject(camera).sub(camera.position).normalize();
      const ray: Ray = { ox: camera.position.x, oy: camera.position.y, oz: camera.position.z, dx: dir.x, dy: dir.y, dz: dir.z };
      const id = pickNearest(ray, pickBoxes());
      if (id?.startsWith('P')) openPanel({ kind: 'plot', id });
      else if (id?.startsWith('B')) openPanel({ kind: 'commerce', id });
      else if (id?.startsWith('#')) openPanel({ kind: 'building', id: Number(id.slice(1)) });
    };
    const pickBoxes = (): PickBox[] => [
      ...nearPlots(110).map((p): PickBox => { const y = padHeight(p); return { id: p.id, ...footprint(p), y0: y - 1, y1: y + pickHeight(p, houses.get(p.id)) }; }),
      ...plan.buildings.map((b): PickBox => ({ id: `#${b.id}`, x: b.x, z: b.z, hx: 22, hz: 8, y0: 0, y1: b.floors * 3 + 1 })),
      ...index.commerce.query(player.x, player.z, 160).map((c): PickBox => (c.type === 'bilbord'
        ? { id: c.id, x: c.x, z: c.z, hx: c.rot % 2 ? 0.6 : 4, hz: c.rot % 2 ? 4 : 0.6, y0: 4, y1: 7.5 }
        : { id: c.id, ...footprint(c), y0: 0, y1: commerceSolid(c)?.h ?? 5 })),
    ];
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointerup', up);
    };
  });

  useEffect(() => {
    snapshotters.capture = () => {
      gl.render(scene, camera);
      const copy = document.createElement('canvas');
      copy.width = gl.domElement.width;
      copy.height = gl.domElement.height;
      copy.getContext('2d')?.drawImage(gl.domElement, 0, 0);
      return copy;
    };
    if (import.meta.env.DEV) Object.assign(window, { __scene: scene, __gl: () => ({ calls: gl.info.render.calls, triangles: gl.info.render.triangles }) });
    return () => { snapshotters.capture = null; };
  }, [gl, scene, camera, size]);

  const stepPlayer = (dt: number): readonly Plot[] => {
    cam.yaw -= input.lookX;
    cam.pitch = Math.max(-0.35, Math.min(1.25, cam.pitch + input.lookY));
    cam.distance = Math.max(2.2, Math.min(getApp().isPhoto ? 60 : 16, cam.distance + input.zoom));
    input.lookX = input.lookY = input.zoom = 0;
    const plots = nearPlots(60);
    const mag = Math.min(1, Math.hypot(input.moveX, input.moveY));
    if (mag > 0.08) {
      const speed = (input.isRunning || mag > 0.92 ? RUN : WALK) * mag;
      const heading = cam.yaw + Math.PI + Math.atan2(-input.moveX, input.moveY);
      const moved = movePlayer(player, Math.sin(heading) * speed * dt, Math.cos(heading) * speed * dt, solidsNear(plots), hasBridge);
      player.x = moved.x;
      player.z = moved.z;
      player.yaw = lerpAngle(player.yaw, heading, Math.min(1, dt * 12));
      player.anim = speed > 5.5 ? 2 : 1;
      player.emoteUntil = 0;
    } else player.anim = performance.now() < player.emoteUntil ? player.emote : 0;
    player.y = groundHeight(player.x, player.z, plots);
    return plots;
  };

  const placeCamera = (dt: number, plots: readonly Plot[]): void => {
    const t = tick.current;
    t.smoothY += (player.y - t.smoothY) * Math.min(1, dt * 10);
    const pose = director.pose;
    if (pose) {
      camera.position.set(pose.x, pose.y, pose.z);
      camera.lookAt(pose.tx, pose.ty, pose.tz);
      return;
    }
    const flat = Math.cos(cam.pitch);
    const dx = Math.sin(cam.yaw) * flat;
    const dz = Math.cos(cam.yaw) * flat;
    const d = cameraDistance(player, Math.sin(cam.yaw), Math.cos(cam.yaw), cam.distance, EYE + Math.sin(cam.pitch) * cam.distance, solidsNear(plots));
    const cy = t.smoothY + EYE + Math.sin(cam.pitch) * d;
    camera.position.set(player.x + dx * d, Math.max(t.smoothY + 0.35, cy), player.z + dz * d);
    camera.lookAt(player.x, t.smoothY + EYE, player.z);
  };

  const drawBodies = (dt: number, seconds: number): void => {
    const bodies: Body[] = [];
    if (!director.pose && !(getApp().isPhoto && cam.distance < 2.4)) bodies.push({ x: player.x, y: tick.current.smoothY, z: player.z, yaw: player.yaw, anim: player.anim, look, phase: 0 });
    for (const r of remotes.values()) {
      const k = Math.min(1, dt * 8);
      r.x += (r.tx - r.x) * k;
      r.z += (r.tz - r.z) * k;
      r.yaw = lerpAngle(r.yaw, r.tyaw, k);
      bodies.push({ x: r.x, y: groundHeight(r.x, r.z, []), z: r.z, yaw: r.yaw, anim: r.anim, look: r.look, phase: hash01(r.id) * 10 });
    }
    for (const n of npcs) if (n.x < 2000 && !inLake(n.x, n.z)) bodies.push({ x: n.x, y: groundHeight(n.x, n.z, []), z: n.z, yaw: n.yaw, anim: n.pause > 0 ? 0 : 1, look: n.look, phase: n.seed, scale: 0.92 + (n.seed % 5) * 0.03 });
    avatars.update(bodies, seconds);
    names.set([...remotes.values()].filter((r) => r.nick).slice(0, 12).map((r) => ({ key: r.id, text: r.nick ?? '', kind: 'plain' as const, badge: null, x: r.x, y: groundHeight(r.x, r.z, []) + 2.25, z: r.z, size: 0.42 })));
  };

  const updateHud = (dt: number): void => {
    const t = tick.current;
    t.hud += dt;
    t.fpsFrames += 1;
    t.fpsTime += dt;
    if (t.hud < 0.5) return;
    t.hud = 0;
    const nearest = nearPlots(45).sort((a, b) => Math.hypot(a.x - player.x, a.z - player.z) - Math.hypot(b.x - player.x, b.z - player.z))[0];
    const next = { district: districtAt(plan, player.x, player.z) || (nearest?.districtId ?? 0), street: nearest?.streetId ?? 0, fps: Math.round(t.fpsFrames / t.fpsTime) };
    t.fpsFrames = t.fpsTime = 0;
    const s = getApp();
    if (s.district !== next.district || s.street !== next.street || s.fps !== next.fps) setApp(next);
  };

  useFrame(({ clock }, delta) => {
    const dt = Math.min(0.1, delta);
    const plots = director.pose ? [] : stepPlayer(dt);
    placeCamera(dt, plots);
    updateNpcs(npcs, index.roads, dt);
    drawBodies(dt, clock.elapsedTime);
    updateHud(dt);
    if (camera instanceof PerspectiveCamera) {
      const portrait = size.height > size.width;
      const fov = director.pose ? 52 : portrait ? 70 : 58;
      if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
    }
    const s = getApp();
    if (s.isAutoQuality && s.stage === 'play' && !director.pose) {
      governor.current = stepGovernor(governor.current.level === s.quality ? governor.current : startGovernor(s.quality), delta * 1000);
      if (governor.current.level !== s.quality) setApp({ quality: governor.current.level });
    }
  }, -2);
  return null;
}
