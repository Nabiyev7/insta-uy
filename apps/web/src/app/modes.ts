/** Uch rejim (Shahar, Piyoda, Mashina) orasida o'tish va "o'sha joyga borish". */
import type { Plot } from '../../../../packages/shared/src/index.ts';
import { frontOf } from '../../../../packages/shared/src/index.ts';
import { framed, startFlight, viewOfPlot, viewOfPoint, type CityView } from '../logic/cityCamera.ts';
import { ownedCars, roadSpot, type CarState } from '../logic/drive.ts';
import { CLEAR_AHEAD, clearDistance, openSpawn } from '../logic/spawn.ts';
import { walkSolids, worldIndex } from '../logic/worldIndex.ts';
import { camera, cancelBuildTimer, car, city, here, input, player, session, teleport, transition, type Mode } from './runtime.ts';
import { getApp, read, setApp } from './store.ts';

const RETURN_HEIGHT = 60;
const WALK_DISTANCE = 6;
const SPAWN_REACH = 60;

/** Ochiq joy va oldida kamida 8 m bo'sh yo'l (bino, favvora, daraxt, bezak ichida emas). */
const openSpot = (x: number, z: number, yaw: number): { readonly x: number; readonly z: number; readonly yaw: number } => {
  const { plan, houses } = getApp();
  if (!plan) return { x, z, yaw };
  const near = worldIndex(plan).plots.query(x, z, SPAWN_REACH);
  return openSpawn({ x, z }, yaw, walkSolids(plan, houses, x, z, near));
};

const placeCar = (s: CarState): void => {
  car.state = s;
  camera.yaw = s.yaw + Math.PI;
  camera.pitch = 0.24;
};
const spawnCar = (x: number, z: number): void => {
  const plan = getApp().plan;
  if (plan) {
    const s = roadSpot(plan.roads, x, z);
    // Yo'lda turadi; oldi to'siq bo'lsa — teskari tomonga qaraydi.
    const solids = walkSolids(plan, getApp().houses, s.x, s.z, worldIndex(plan).plots.query(s.x, s.z, SPAWN_REACH));
    const yaw = clearDistance(s, s.yaw, solids) >= CLEAR_AHEAD || clearDistance(s, s.yaw + Math.PI, solids) < CLEAR_AHEAD ? s.yaw : s.yaw + Math.PI;
    placeCar({ ...s, yaw });
  }
  const owned = ownedCars(getApp().profile?.decor);
  const saved = read('car');
  car.id = (owned.find((c) => c.id === saved) ?? owned.find((c) => c.id === car.id) ?? owned[0])?.id ?? 'oddiy';
};
const spawnPlayer = (x: number, z: number, yaw: number): void => {
  const p = openSpot(x, z, yaw);
  teleport(p.x, p.z, p.yaw);
  camera.distance = WALK_DISTANCE;
};

const resetInput = (): void => {
  Object.assign(input, { moveX: 0, moveY: 0, isRunning: false, isBraking: false, lookX: 0, lookY: 0, zoom: 0, panX: 0, panY: 0, zoomBy: 1, twist: 0 });
};

export const setMode = (mode: Mode): void => {
  if (mode === session.mode) return;
  cancelBuildTimer();
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
