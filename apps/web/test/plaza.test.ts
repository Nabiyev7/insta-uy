import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { describe, expect, test } from 'vitest';
import { CIVIC, PLAZA_HALF, TOWERS, TOWER_NAMES, civicById, decodePlan, type EncodedPlan } from '../../../packages/shared/src/index.ts';
import { commerceItem, commerceSolid } from '../src/logic/placement.ts';
import { movePlayer } from '../src/logic/motion.ts';
import { AISLE, HERO_SPOT, PLAZA_SOLIDS, civicRects, holidayItems, isTower, plazaItems } from '../src/logic/plaza.ts';

const plan = decodePlan(JSON.parse(readFileSync(new URL('../../../packages/shared/data/masterplan.json', import.meta.url), 'utf8')) as EncodedPlan);
const items = plazaItems();
const towers = plan.commerce.filter((c) => isTower(c.id));
interface Rect { readonly x: number; readonly z: number; readonly hx: number; readonly hz: number }
const gap = (a: Rect, b: Rect): number => Math.max(Math.abs(a.x - b.x) - a.hx - b.hx, Math.abs(a.z - b.z) - a.hz - b.hz);

describe('markaz', () => {
  test('3 davlat binosi promtdagi joyda, orasi ≥8 m, maydon ichida', () => {
    expect(CIVIC.map((c) => [c.id, c.x, c.z, c.w, c.d, c.rot])).toEqual([['prezident', -59, -59, 50, 36, 0], ['hokimiyat', 59, -59, 46, 32, 0], ['sud', -59, 59, 44, 30, 2]]);
    const big: Rect[] = [...civicRects, ...towers.map((c) => ({ x: c.x, z: c.z, hx: 14, hz: 14 }))];
    civicRects.forEach((a, i) => {
      expect(Math.abs(a.x) + a.hx).toBeLessThan(PLAZA_HALF);
      expect(Math.abs(a.z) + a.hz).toBeLessThan(PLAZA_HALF);
      big.forEach((b, k) => { if (k !== i) expect(gap(a, b)).toBeGreaterThanOrEqual(8); });
      // 4 kirish va markaz (|x|, |z| < 32) ochiq
      expect(Math.min(Math.abs(a.x) - a.hx, Math.abs(a.z) - a.hz)).toBeGreaterThanOrEqual(32);
    });
    expect(civicById('sud')?.panel).toBe('rules');
    expect(civicById('yoq')).toBeUndefined();
  });

  test('yo‘laklarda favvoradan boshqa hech narsa yo‘q', () => {
    const inAisle = items.filter((i) => (Math.abs(i.x) < AISLE || Math.abs(i.z) < AISLE) && i.model !== 'plaza_fountain');
    expect(inAisle.map((i) => `${i.model} ${i.x},${i.z}`)).toEqual([]);
    for (const h of ['yangi_yil', 'navroz', 'mustaqillik'] as const) {
      expect(holidayItems(h).length).toBeGreaterThan(0);
      expect(holidayItems(h).filter((i) => Math.abs(i.x) < AISLE || Math.abs(i.z) < AISLE)).toEqual([]);
    }
    expect(holidayItems(null)).toEqual([]);
  });

  test('hech narsa binolar ichida yoki bir-birining ustida emas', () => {
    const blocks: Rect[] = [...civicRects, ...towers.map((c) => ({ x: c.x, z: c.z, hx: 13, hz: 13 }))];
    const soft = items.filter((i) => ['tree_chinor', 'tree_archa', 'street_lamp', 'bench', 'yard_flowers'].includes(i.model));
    expect(soft.length).toBeGreaterThan(70);
    for (const i of soft) {
      expect(blocks.some((b) => Math.abs(i.x - b.x) < b.hx && Math.abs(i.z - b.z) < b.hz), `${i.model} ${i.x},${i.z}`).toBe(false);
      expect(Math.max(Math.abs(i.x), Math.abs(i.z))).toBeLessThan(PLAZA_HALF);
    }
    soft.forEach((a, i) => soft.slice(i + 1).forEach((b) => expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThan(3)));
  });

  test('ko‘chirilganlar: haykal, maktab, choyxona', () => {
    const at = (m: string): number[] => { const i = items.find((q) => q.model === m)!; return [i.x, i.z]; };
    expect(at('hero_statue')).toEqual([HERO_SPOT.x, HERO_SPOT.z]);
    expect(at('hero_statue')).toEqual([-24, -24]);
    expect(at('maktab')).toEqual([36, -107]);
    expect(at('choyxona')).toEqual([36, 108]);
    expect(items.filter((i) => i.model.startsWith('car_')).every((i) => Math.abs(i.x + 36) <= 10 && Math.abs(i.z + 107) <= 9)).toBe(true);
  });

  test('12 minora: ko‘rinishi, nomi, balandligi', () => {
    expect(towers).toHaveLength(12);
    const count = (look: string): number => Object.values(TOWERS).filter((t) => t.look === look).length;
    expect([count('bank'), count('agentlik'), count('novostroyka'), count('office')]).toEqual([3, 3, 2, 4]);
    expect(TOWERS.B104!.height).toBe(52);
    for (const c of towers) {
      const solid = commerceSolid(c)!;
      expect(solid.h).toBe(TOWERS[c.id]!.height);
      expect(Math.max(solid.hx, solid.hz)).toBeLessThanOrEqual(14);
      expect(TOWER_NAMES[TOWERS[c.id]!.look].ru.length).toBeGreaterThan(3);
    }
    const offices = towers.filter((c) => TOWERS[c.id]!.look === 'office').map(commerceItem);
    expect(new Set(offices.map((i) => i.wall)).size).toBe(4);
    expect(new Set(offices.map((i) => i.sy)).size).toBe(4);
  });

  test('odam davlat binosiga kirmaydi, boshlanish nuqtasi bo‘sh', () => {
    expect(movePlayer({ x: 0, z: 40 }, 0, 0, PLAZA_SOLIDS)).toEqual({ x: 0, z: 40 });
    const p = movePlayer({ x: -59, z: -30 }, 0, -15, PLAZA_SOLIDS);
    expect(p.z).toBeGreaterThan(-42);
  });

  test('modellar: 6 ta yangi, uchburchak chegarasi, markaz jami ≤40 ming', async () => {
    const doc = await new NodeIO().read(fileURLToPath(new URL('../../../assets/city-kit.glb', import.meta.url)));
    const meshes = new Map(doc.getRoot().listMeshes().map((m) => [m.getName(), m.listPrimitives()[0]!]));
    const tris = (n: string): number => (meshes.get(n)?.getIndices()?.getCount() ?? Number.NaN) / 3;
    for (const n of ['prezident', 'hokimiyat', 'sud']) {
      expect(tris(n)).toBeLessThanOrEqual(2500);
      expect(tris(`${n}_lod`)).toBeLessThanOrEqual(200);
    }
    for (const n of ['bank', 'agentlik', 'novostroyka']) expect(tris(n)).toBeLessThanOrEqual(1000);
    const all = [...items, ...towers.map(commerceItem)];
    expect(all.reduce((s, i) => s + tris(i.model), 0)).toBeLessThanOrEqual(40_000);
    const box = (n: string): readonly number[] => { const p = meshes.get(n)!.getAttribute('POSITION')!; const [a, b] = [p.getMin([]), p.getMax([])]; return [b[0]! - a[0]!, b[1]!, b[2]! - a[2]!]; };
    for (const c of CIVIC) {
      const [w, h, d] = box(c.id);
      expect(w!).toBeLessThanOrEqual(c.w + 0.5);
      expect(d!).toBeLessThanOrEqual(c.d + 0.8);
      expect(Math.abs(h! - c.height)).toBeLessThan(1.5);
    }
  });
});
