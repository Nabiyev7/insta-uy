import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { decodePlan, frontOf, type EncodedPlan } from '../../../packages/shared/src/index.ts';
import { walkSolids, worldIndex } from '../src/logic/worldIndex.ts';
import type { Solid } from '../src/logic/item.ts';
import { movePlayer } from '../src/logic/motion.ts';
import { CLEAR_AHEAD, clearDistance, openSpawn } from '../src/logic/spawn.ts';

const box = (x: number, z: number, hx: number, hz: number): Solid => ({ x, z, hx, hz, h: 3 });
/** 1 soniya "oldinga" (piyoda ~4 m/s, 60 kadr). */
const walkOneSecond = (p: { x: number; z: number; yaw: number }, solids: readonly Solid[]): number => {
  let q = { x: p.x, z: p.z };
  for (let i = 0; i < 60; i++) q = movePlayer(q, (Math.sin(p.yaw) * 4) / 60, (Math.cos(p.yaw) * 4) / 60, solids);
  return Math.hypot(q.x - p.x, q.z - p.z);
};

describe('paydo bo‘lish joyi', () => {
  test('oldida favvora (to‘siq) — bo‘sh tomonga qaraydi va 1 s da ≥ 3 m yuradi', () => {
    const fountain = [box(0, 3, 4, 1.5)];
    expect(clearDistance({ x: 0, z: 0 }, 0, fountain)).toBeLessThan(3);
    const s = openSpawn({ x: 0, z: 0 }, 0, fountain);
    expect(clearDistance(s, s.yaw, fountain)).toBeGreaterThanOrEqual(CLEAR_AHEAD);
    expect(walkOneSecond(s, fountain)).toBeGreaterThanOrEqual(3);
  });
  test('devor ichida yoki tor joyda (darvoza oldi, daraxtlar orasi) — ochiq joyga chiqadi', () => {
    const yard = [box(0, 0, 6, 6), box(0, 9, 12, 1), box(9, 0, 1, 12), box(-9, 0, 1, 12)];
    const s = openSpawn({ x: 0, z: 0 }, Math.PI / 2, yard);
    expect(yard.some((b) => Math.abs(s.x - b.x) < b.hx && Math.abs(s.z - b.z) < b.hz)).toBe(false);
    expect(walkOneSecond(s, yard)).toBeGreaterThanOrEqual(3);
  });
  test('to‘siq yo‘q bo‘lsa — kamera yo‘nalishi o‘zgarmaydi', () => {
    expect(openSpawn({ x: 5, z: 5 }, 1, [])).toEqual({ x: 5, z: 5, yaw: 1 });
  });
});

describe('haqiqiy xaritada', () => {
  const plan = decodePlan(JSON.parse(readFileSync(new URL('../../../packages/shared/data/masterplan.json', import.meta.url), 'utf8')) as EncodedPlan);
  const solidsAt = (x: number, z: number): ReturnType<typeof walkSolids> => walkSolids(plan, new Map(), x, z, worldIndex(plan).plots.query(x, z, 60));
  test('markaz (0, 0) — favvora oldi: har qanday kamera yo‘nalishida 1 s da ≥ 3 m', () => {
    for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
      const solids = solidsAt(0, 0);
      const s = openSpawn({ x: 0, z: 0 }, yaw, solids);
      expect(walkOneSecond(s, solids)).toBeGreaterThanOrEqual(3);
    }
  });
  test('uy darvozasi oldi', () => {
    const plot = plan.plots[0]!;
    const gate = frontOf(plot);
    const solids = solidsAt(gate.x, gate.z);
    const s = openSpawn(gate, 0, solids);
    expect(walkOneSecond(s, solids)).toBeGreaterThanOrEqual(3);
  });
});

