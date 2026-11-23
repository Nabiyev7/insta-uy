/** Har rejimda bir kadrlik harakat va kameraning kerakli holati. */
import type { MasterPlan, Plot } from '../../../../packages/shared/src/index.ts';
import { terrainHeight } from '../../../../packages/shared/src/index.ts';
import { camera as cam, car, city, input, player, transition } from '../app/runtime.ts';
import { getApp } from '../app/store.ts';
import type { Pose } from '../logic/cameraPath.ts';
import { cityPose, clampView, flightAt, metersPerPixel, pan, rotate, zoom } from '../logic/cityCamera.ts';
import { animOfCar, carById, stepCar } from '../logic/drive.ts';
import { cameraDistance, lerpAngle, movePlayer } from '../logic/motion.ts';
import { carSolids, walkSolids, worldIndex } from '../logic/worldIndex.ts';
import { groundHeight } from './ground.ts';

const WALK = 4.2;
const RUN = 8.5;
const EYE = 1.55;
const NEAR_PLOTS = 60;
const KEY_PAN = 1.15;
const TRANSITION_MS = 550;

export interface StepContext { readonly plan: MasterPlan; readonly dt: number; readonly hasBridge: boolean; readonly fov: number; readonly viewportHeight: number; readonly maxHeight: number }

const look = (maxDistance: number): void => {
  cam.yaw -= input.lookX;
  cam.pitch = Math.max(-0.35, Math.min(1.25, cam.pitch + input.lookY));
  cam.distance = Math.max(2.2, Math.min(maxDistance, cam.distance + input.zoom));
  input.lookX = input.lookY = input.zoom = 0;
};

export const stepWalk = (c: StepContext): readonly Plot[] => {
  look(getApp().isPhoto ? 60 : 16);
  const plots = worldIndex(c.plan).plots.query(player.x, player.z, NEAR_PLOTS);
  const mag = Math.min(1, Math.hypot(input.moveX, input.moveY));
  if (mag > 0.08) {
    const speed = (input.isRunning || mag > 0.92 ? RUN : WALK) * mag;
    const heading = cam.yaw + Math.PI + Math.atan2(-input.moveX, input.moveY);
    const solids = walkSolids(c.plan, getApp().houses, player.x, player.z, plots);
    const moved = movePlayer(player, Math.sin(heading) * speed * c.dt, Math.cos(heading) * speed * c.dt, solids, c.hasBridge);
    player.x = moved.x;
    player.z = moved.z;
    player.yaw = lerpAngle(player.yaw, heading, Math.min(1, c.dt * 12));
    player.anim = speed > 5.5 ? 2 : 1;
    player.emoteUntil = 0;
  } else player.anim = performance.now() < player.emoteUntil ? player.emote : 0;
  player.y = groundHeight(player.x, player.z, plots);
  return plots;
};

export const stepCity = (c: StepContext): void => {
  const now = performance.now();
  const hasInput = input.panX !== 0 || input.panY !== 0 || input.zoomBy !== 1 || input.twist !== 0 || input.moveX !== 0 || input.moveY !== 0;
  if (city.flight && !hasInput) {
    const f = flightAt(city.flight, now);
    city.view = f.view;
    if (f.isDone) city.flight = null;
  } else {
    city.flight = null;
    const k = metersPerPixel(city.view, c.fov, c.viewportHeight);
    const keys = city.view.height * KEY_PAN * c.dt;
    const moved = pan(city.view, input.panX * k - input.moveX * keys, input.panY * k + input.moveY * keys);
    city.view = clampView(rotate(zoom(moved, input.zoomBy), input.twist), c.maxHeight);
  }
  input.panX = input.panY = input.twist = input.zoom = input.lookX = input.lookY = 0;
  input.zoomBy = 1;
};

export const stepDrive = (c: StepContext): void => {
  look(16);
  const s = car.state;
  car.state = stepCar(s, { gas: input.moveY, steer: input.moveX, isBraking: input.isBraking }, c.dt, carById(car.id), carSolids(c.plan, s.x, s.z), c.hasBridge);
  player.x = car.state.x;
  player.z = car.state.z;
  player.yaw = car.state.yaw;
  player.anim = animOfCar(car.id);
  player.y = groundHeight(player.x, player.z, []);
  if (Math.abs(car.state.speed) > 1.5) cam.yaw = lerpAngle(cam.yaw, car.state.yaw + Math.PI, Math.min(1, c.dt * 2.6));
};

const orbitPose = (x: number, y: number, z: number, distance: number): Pose => {
  const flat = Math.cos(cam.pitch);
  return { x: x + Math.sin(cam.yaw) * flat * distance, y: Math.max(y + 0.35, y + EYE + Math.sin(cam.pitch) * distance), z: z + Math.cos(cam.yaw) * flat * distance, tx: x, ty: y + EYE, tz: z };
};
export const walkPose = (c: StepContext, smoothY: number, plots: readonly Plot[]): Pose => {
  const solids = walkSolids(c.plan, getApp().houses, player.x, player.z, plots);
  return orbitPose(player.x, smoothY, player.z, cameraDistance(player, Math.sin(cam.yaw), Math.cos(cam.yaw), cam.distance, EYE + Math.sin(cam.pitch) * cam.distance, solids));
};
const CHASE = 7.2;
const CHASE_PER_SPEED = 0.2;
export const drivePose = (smoothY: number): Pose => orbitPose(car.state.x, smoothY, car.state.z, CHASE + Math.abs(car.state.speed) * CHASE_PER_SPEED);
export const currentCityPose = (): Pose => cityPose(city.view, terrainHeight(city.view.x, city.view.z));

/** Rejim almashganda eski kameradan yangisiga silliq o'tish (1 soniyadan tez). */
export const blend = (to: Pose): Pose => {
  const from = transition.from;
  const t = (performance.now() - transition.at) / TRANSITION_MS;
  if (!from || t >= 1) {
    transition.from = null;
    transition.last = to;
    return to;
  }
  const k = t * t * (3 - 2 * t);
  const mix = (a: number, b: number): number => a + (b - a) * k;
  const pose: Pose = { x: mix(from.x, to.x), y: mix(from.y, to.y), z: mix(from.z, to.z), tx: mix(from.tx, to.tx), ty: mix(from.ty, to.ty), tz: mix(from.tz, to.tz) };
  transition.last = pose;
  return pose;
};
