/** Bosilgan joydagi uy, bino yoki tijorat joyini topish. */
import { Vector3, type Camera } from 'three';
import { CIVIC, civicById, civicRect, footprint, padHeight, type MasterPlan } from '../../../../packages/shared/src/index.ts';
import { here, session } from '../app/runtime.ts';
import { getApp, openPanel, toast } from '../app/store.ts';
import { flyTo, goToHouse } from '../app/modes.ts';
import { viewOfPoint } from '../logic/cityCamera.ts';
import { pickNearest, type PickBox, type Ray } from '../logic/motion.ts';
import { commerceSolid, pickHeight } from '../logic/placement.ts';
import { worldIndex } from '../logic/worldIndex.ts';

const TAP_MOVE = 8;
const TAP_MS = 400;
const REACH = { walk: 110, drive: 110, city: 420 } as const;
const COMMERCE_REACH = { walk: 160, drive: 160, city: 420 } as const;

const boxes = (plan: MasterPlan): PickBox[] => {
  const { houses } = getApp();
  const at = here();
  const index = worldIndex(plan);
  return [
    ...index.plots.query(at.x, at.z, REACH[session.mode]).map((p): PickBox => { const y = padHeight(p); return { id: p.id, ...footprint(p), y0: y - 1, y1: y + pickHeight(p, houses.get(p.id)) }; }),
    ...CIVIC.map((c): PickBox => ({ id: c.id, ...civicRect(c), y0: 0, y1: c.height * 0.7 })),
    ...plan.buildings.map((b): PickBox => ({ id: `#${b.id}`, x: b.x, z: b.z, hx: 22, hz: 8, y0: 0, y1: b.floors * 3 + 1 })),
    ...index.commerce.query(at.x, at.z, COMMERCE_REACH[session.mode]).map((c): PickBox => (c.type === 'bilbord'
      ? { id: c.id, x: c.x, z: c.z, hx: c.rot % 2 ? 0.6 : 4, hz: c.rot % 2 ? 4 : 0.6, y0: 4, y1: 7.5 }
      : { id: c.id, ...footprint(c), y0: 0, y1: commerceSolid(c)?.h ?? 5 })),
  ];
};

const CIVIC_VIEW_HEIGHT = 48;
const openPicked = (id: string): void => {
  const s = getApp();
  const isCity = session.mode === 'city';
  const civic = civicById(id);
  if (civic) {
    if (isCity) flyTo(viewOfPoint(civic.x, civic.z, (civic.rot * Math.PI) / 2, CIVIC_VIEW_HEIGHT));
    toast(s.lang === 'uz' ? civic.uz : civic.ru);
    if (civic.panel) openPanel({ kind: civic.panel });
    return;
  }
  if (id.startsWith('P')) {
    const plot = s.plotById.get(id);
    if (plot && isCity) goToHouse(plot);
    openPanel({ kind: 'plot', id });
  } else if (id.startsWith('B')) openPanel({ kind: 'commerce', id });
  else if (id.startsWith('#')) openPanel({ kind: 'building', id: Number(id.slice(1)) });
};

/** Sudrash emas, qisqa teginish. */
export const attachPicking = (el: HTMLCanvasElement, camera: Camera, plan: MasterPlan): (() => void) => {
  let start: { readonly x: number; readonly y: number; readonly t: number } | null = null;
  const down = (e: PointerEvent): void => { start = e.button === 0 && e.isPrimary ? { x: e.clientX, y: e.clientY, t: e.timeStamp } : null; };
  /** Sudrab, boshlangan joyga qaytarilsa ham bosish emas. */
  const move = (e: PointerEvent): void => { if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > TAP_MOVE) start = null; };
  const up = (e: PointerEvent): void => {
    const s = start;
    start = null;
    if (!s || Math.hypot(e.clientX - s.x, e.clientY - s.y) > TAP_MOVE || e.timeStamp - s.t > TAP_MS || getApp().isPhoto || getApp().isClean) return;
    const r = el.getBoundingClientRect();
    const dir = new Vector3(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1, 0.5).unproject(camera).sub(camera.position).normalize();
    const ray: Ray = { ox: camera.position.x, oy: camera.position.y, oz: camera.position.z, dx: dir.x, dy: dir.y, dz: dir.z };
    const id = pickNearest(ray, boxes(plan));
    if (id) openPicked(id);
  };
  el.addEventListener('pointerdown', down);
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', up);
  return () => {
    el.removeEventListener('pointerdown', down);
    el.removeEventListener('pointermove', move);
    el.removeEventListener('pointerup', up);
  };
};
