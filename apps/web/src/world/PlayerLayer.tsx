import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera } from 'three';
import { districtAt, hash01, inLake, sanitizeAvatar, type MasterPlan, type Plot } from '../../../../packages/shared/src/index.ts';
import { camera as cam, city, director, here, player, remotes, session, snapshotters, transition } from '../app/runtime.ts';
import { getApp, setApp, useApp } from '../app/store.ts';
import { MIN_HEIGHT } from '../logic/cityCamera.ts';
import { ANIM_AWAY, ANIM_CAR, carById, carOfAnim } from '../logic/drive.ts';
import type { Item } from '../logic/item.ts';
import { lerpAngle } from '../logic/motion.ts';
import { PEOPLE_HEIGHT } from '../logic/view.ts';
import { QUALITY, startGovernor, stepGovernor } from '../logic/quality.ts';
import { worldIndex } from '../logic/worldIndex.ts';
import { car } from '../app/runtime.ts';
import { Avatars, type Body } from './avatars.ts';
import { groundHeight } from './ground.ts';
import type { Kit } from './kit.ts';
import { Labels } from './labels.ts';
import { blend, currentCityPose, drivePose, stepCity, stepDrive, stepWalk, walkPose, type StepContext } from './motionCamera.ts';
import { NPC_HIDDEN, createNpcs, updateNpcs } from './npcs.ts';
import { attachPicking } from './pick.ts';
import { Pools } from './pools.ts';

const FOV = { portrait: 70, landscape: 58, video: 52 } as const;
const HUD_INTERVAL = 0.5;
const CLOSE_PLOTS = 60;
const FULL_YAW = Math.PI * 2;

const carItem = (model: string, scale: number, x: number, y: number, z: number, yaw: number): Item =>
  ({ model, x, y, z, yaw, sx: scale, sy: scale, sz: scale, wall: '#ffffff', roof: '#ffffff', glow: 0, seed: 0.5 });

interface PlayerLayerProps { readonly plan: MasterPlan; readonly kit: Kit }

export function PlayerLayer({ plan, kit }: PlayerLayerProps): null {
  const { scene, camera, gl, size } = useThree();
  const profile = useApp((s) => s.profile);
  const level = useApp((s) => s.quality);
  const boot = useApp((s) => s.boot);
  const look = useMemo(() => sanitizeAvatar(profile?.avatar), [profile]);
  const avatars = useMemo(() => new Avatars(), []);
  const names = useMemo(() => new Labels(), []);
  const cars = useMemo(() => new Pools(kit), [kit]);
  const governor = useRef(startGovernor(level));
  const tick = useRef({ hud: 0, smoothY: 0, fpsFrames: 0, fpsTime: 0 });
  const npcs = useMemo(() => createNpcs(QUALITY[level].npcs), [level]);
  const hasBridge = boot?.projects.some((p) => p.kind === 'koprik' && p.status === 'done') ?? false;

  useEffect(() => {
    scene.add(avatars.group, names.group, cars.group);
    return () => {
      scene.remove(avatars.group, names.group, cars.group);
      avatars.dispose();
      names.dispose();
      cars.dispose();
    };
  }, [scene, avatars, names, cars]);

  useEffect(() => attachPicking(gl.domElement, camera, plan), [gl, camera, plan]);

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

  const step = (c: StepContext): readonly Plot[] => {
    if (session.mode === 'walk') return stepWalk(c);
    if (session.mode === 'city') stepCity(c);
    else stepDrive(c);
    return [];
  };

  const placeCamera = (c: StepContext, plots: readonly Plot[]): void => {
    const t = tick.current;
    t.smoothY += (player.y - t.smoothY) * Math.min(1, c.dt * 10);
    const pose = director.pose ?? blend(session.mode === 'city' ? currentCityPose() : session.mode === 'walk' ? walkPose(c, t.smoothY, plots) : drivePose(t.smoothY));
    camera.position.set(pose.x, pose.y, pose.z);
    camera.lookAt(pose.tx, pose.ty, pose.tz);
  };

  const isPeopleVisible = (): boolean => session.mode !== 'city' || city.view.height < PEOPLE_HEIGHT;

  const drawBodies = (dt: number, seconds: number): void => {
    const bodies: Body[] = [];
    const vehicles: Item[] = [];
    const isMe = !director.pose && session.mode !== 'city';
    if (isMe && session.mode === 'walk' && !(getApp().isPhoto && cam.distance < 2.4)) bodies.push({ x: player.x, y: tick.current.smoothY, z: player.z, yaw: player.yaw, anim: player.anim, look, phase: 0 });
    if (isMe && session.mode === 'drive') { const s = carById(car.id); vehicles.push(carItem(s.model, s.scale, car.state.x, tick.current.smoothY, car.state.z, car.state.yaw)); }
    const k = Math.min(1, dt * 8);
    for (const r of remotes.values()) {
      r.x += (r.tx - r.x) * k;
      r.z += (r.tz - r.z) * k;
      r.yaw = lerpAngle(r.yaw, r.tyaw, k);
      if (r.anim === ANIM_AWAY || !isPeopleVisible()) continue;
      const y = groundHeight(r.x, r.z, []);
      const spec = carOfAnim(r.anim);
      if (spec) vehicles.push(carItem(spec.model, spec.scale, r.x, y, r.z, r.yaw));
      else bodies.push({ x: r.x, y, z: r.z, yaw: r.yaw, anim: r.anim, look: r.look, phase: hash01(r.id) * 10 });
    }
    if (isPeopleVisible()) for (const n of npcs) if (n.x < NPC_HIDDEN && !inLake(n.x, n.z)) bodies.push({ x: n.x, y: groundHeight(n.x, n.z, []), z: n.z, yaw: n.yaw, anim: n.pause > 0 ? 0 : 1, look: n.look, phase: n.seed, scale: 0.92 + (n.seed % 5) * 0.03 });
    avatars.update(bodies, seconds);
    cars.set(vehicles);
    const named = isPeopleVisible() ? [...remotes.values()].filter((r) => r.nick && r.anim !== ANIM_AWAY).slice(0, 12) : [];
    names.set(named.map((r) => ({ key: r.id, text: r.nick ?? '', kind: 'plain' as const, badge: null, x: r.x, y: groundHeight(r.x, r.z, []) + (r.anim >= ANIM_CAR ? 2.6 : 2.25), z: r.z, size: 0.42 })));
  };

  const updateHud = (dt: number): void => {
    const t = tick.current;
    t.hud += dt;
    t.fpsFrames += 1;
    t.fpsTime += dt;
    if (t.hud < HUD_INTERVAL) return;
    t.hud = 0;
    const at = here();
    const nearest = worldIndex(plan).plots.query(at.x, at.z, CLOSE_PLOTS).reduce<{ readonly p: Plot; readonly d: number } | null>((best, p) => {
      const d = Math.hypot(p.x - at.x, p.z - at.z);
      return best && best.d <= d ? best : { p, d };
    }, null);
    const next = { district: districtAt(plan, at.x, at.z) || (nearest?.p.districtId ?? 0), street: nearest?.p.streetId ?? 0, fps: Math.round(t.fpsFrames / t.fpsTime) };
    t.fpsFrames = t.fpsTime = 0;
    const s = getApp();
    if (s.district !== next.district || s.street !== next.street || s.fps !== next.fps) setApp(next);
  };

  const tuneLens = (): number => {
    const fov = director.pose ? FOV.video : size.height > size.width ? FOV.portrait : FOV.landscape;
    if (!(camera instanceof PerspectiveCamera)) return fov;
    const near = session.mode === 'city' && !director.pose && !transition.from ? Math.max(0.5, city.view.height * 0.06) : 0.25;
    if (camera.fov !== fov || Math.abs(camera.near - near) > 0.2) {
      camera.fov = fov;
      camera.near = near;
      camera.updateProjectionMatrix();
    }
    return fov;
  };

  useFrame(({ clock }, delta) => {
    const dt = Math.min(0.1, delta);
    const fov = tuneLens();
    const c: StepContext = { plan, dt, hasBridge, fov, viewportHeight: size.height, maxHeight: Math.max(MIN_HEIGHT, QUALITY[level].cityMax) };
    const plots = director.pose ? [] : step(c);
    placeCamera(c, plots);
    if (isPeopleVisible()) updateNpcs(npcs, here(), plan.roads, dt);
    drawBodies(dt, clock.elapsedTime % (FULL_YAW * 1e4));
    updateHud(dt);
    const s = getApp();
    if (s.isAutoQuality && s.stage === 'play' && !director.pose) {
      governor.current = stepGovernor(governor.current.level === s.quality ? governor.current : startGovernor(s.quality), delta * 1000);
      if (governor.current.level !== s.quality) setApp({ quality: governor.current.level });
    }
  }, -2);
  return null;
}
