/** Uch rejim (Shahar, Piyoda, Mashina) orasida o'tish va "o'sha joyga borish". */
import type { Plot } from '../../../../packages/shared/src/index.ts';
import { frontOf } from '../../../../packages/shared/src/index.ts';
import { framed, startFlight, viewOfPlot, viewOfPoint, type CityView } from '../logic/cityCamera.ts';
import { ownedCars, roadSpot, type CarState } from '../logic/drive.ts';
import { movePlayer } from '../logic/motion.ts';
import { walkSolids, worldIndex } from '../logic/worldIndex.ts';
import { camera, car, city, here, input, player, session, teleport, transition, type Mode } from './runtime.ts';
import { getApp, read, setApp } from './store.ts';

const RETURN_HEIGHT = 60;
const WALK_DISTANCE = 6;
const SPAWN_REACH = 60;
const SPAWN_TRIES = 4;

/** Devor ichida paydo bo'lmaslik uchun bo'sh nuqta. */
const freeSpot = (x: number, z: number): { readonly x: number; readonly z: number } => {
  const { plan, houses } = getApp();
  if (!plan) return { x, z };
  const near = worldIndex(plan).plots.query(x, z, SPAWN_REACH);
  const solids = walkSolids(plan, houses, x, z, near);
  return Array.from({ length: SPAWN_TRIES }).reduce<{ readonly x: number; readonly z: number }>((p) => movePlayer(p, 0, 0, solids), { x, z });
};

const placeCar = (s: CarState): void => {
  car.state = s;
  camera.yaw = s.yaw + Math.PI;
  camera.pitch = 0.24;
};
const spawnCar = (x: number, z: number): void => {
  const plan = getApp().plan;
  if (plan) placeCar(roadSpot(plan.roads, x, z));
  const owned = ownedCars(getApp().profile?.decor);
  const saved = read('car');
  car.id = (owned.find((c) => c.id === saved) ?? owned.find((c) => c.id === car.id) ?? owned[0])?.id ?? 'oddiy';
};
const spawnPlayer = (x: number, z: number, yaw: number): void => {
  const p = freeSpot(x, z);
  teleport(p.x, p.z, yaw);
  camera.distance = WALK_DISTANCE;
};

const resetInput = (): void => {
  Object.assign(input, { moveX: 0, moveY: 0, isRunning: false, isBraking: false, lookX: 0, lookY: 0, zoom: 0, panX: 0, panY: 0, zoomBy: 1, twist: 0 });
};

export const setMode = (mode: Mode): void => {
  if (mode === session.mode) return;
  const from = here();
  transition.from = transition.last;
  transition.at = performance.now();
  resetInput();
  if (mode === 'walk') spawnPlayer(from.x, from.z, from.yaw);
  else if (mode === 'drive') spawnCar(from.x, from.z);
  else {
    city.view = viewOfPoint(from.x, from.z, camera.yaw, RETURN_HEIGHT);
    city.flight = null;
  }
  player.anim = 0;
  session.mode = mode;
  setApp({ mode, isPhoto: false, isClean: false });
};

export const flyTo = (to: CityView, isInstant = false): void => {
  if (isInstant) {
    city.view = to;
    city.flight = null;
  } else city.flight = startFlight(city.view, to, performance.now());
};

/** Uyga borish: shaharda kamera uchadi, piyoda — eshik oldida, mashinada — ko'chada. */
export const goToHouse = (p: Plot, isInstant = false): void => {
  if (session.mode === 'city') { flyTo(framed(viewOfPlot(p), { width: innerWidth, height: innerHeight }), isInstant); return; }
  const f = frontOf(p, p.type === 'kvartira' ? 14 : 4);
  if (session.mode === 'walk') teleport(f.x, f.z, f.yaw + Math.PI);
  else spawnCar(f.x, f.z);
};
const POINT_HEIGHT = 70;
export const goToPoint = (x: number, z: number): void => {
  if (session.mode === 'city') flyTo(viewOfPoint(x, z, city.view.yaw, Math.min(POINT_HEIGHT, city.view.height)));
  else if (session.mode === 'walk') spawnPlayer(x, z, Math.PI);
  else spawnCar(x, z);
};
