import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { decodePlan, encodePlan, type EncodedPlan } from '../src/masterplan/codec.ts';
import { generateMasterPlan } from '../src/masterplan/generate.ts';
import { AVENUE_LINES, CITY_HALF, HILL, PLAZA_HALF, inLake, inPlaza, terrainHeight } from '../src/masterplan/geometry.ts';
import { SpatialIndex, footprint, frontOf, boxContains } from '../src/city.ts';

const raw = readFileSync(new URL('../data/masterplan.json', import.meta.url), 'utf8');
const lock = readFileSync(new URL('../data/masterplan.lock', import.meta.url), 'utf8').trim();
const plan = decodePlan(JSON.parse(raw) as EncodedPlan);

describe('qulflangan bosh reja', () => {
  test('xesh hech qachon o‘zgarmaydi', () => {
    expect(createHash('sha256').update(raw).digest('hex')).toBe(lock);
  });

  test('generator qulflangan faylni aynan qayta yaratadi', () => {
    expect(JSON.stringify(encodePlan(generateMasterPlan()))).toBe(raw);
  });

  test('5000 uchastka: 3500/1000/400/100', () => {
    const count = (t: string): number => plan.plots.filter((p) => p.type === t).length;
    expect(plan.plots).toHaveLength(5000);
    expect([count('hovli'), count('kvartira'), count('villa'), count('qasr')]).toEqual([3500, 1000, 400, 100]);
  });

  test('12 tuman, har biri 400–500 uchastka', () => {
    expect(plan.districts).toHaveLength(12);
    for (const d of plan.districts) {
      const n = plan.plots.filter((p) => p.districtId === d.id).length;
      expect(n).toBeGreaterThanOrEqual(400);
      expect(n).toBeLessThanOrEqual(500);
    }
  });

  test('tumanlar markazdan tashqariga ochiladi', () => {
    const distance = plan.districts.map(({ rect: [a, b, c, d] }) =>
      Math.hypot(Math.max(a, -c, 0), Math.max(b, -d, 0)));
    expect([...distance].sort((x, y) => x - y)).toEqual(distance);
  });

  test('manzillar takrorlanmaydi va raqamlar musbat', () => {
    const keys = plan.plots.map((p) => `${p.streetId}/${p.number}/${p.unit}`);
    expect(new Set(keys).size).toBe(5000);
    expect(plan.plots.every((p) => p.number > 0)).toBe(true);
  });

  test('uchastkalar bir-biriga, yo‘lga, ko‘lga va maydonga tegmaydi', () => {
    const solid = [
      ...plan.plots.filter((p) => p.unit <= 1).map((p) => ({ id: p.id, ...footprint(p) })),
      ...plan.expansions.map((e) => ({ id: e.id, ...footprint(e) })),
      ...plan.commerce.filter((c) => c.type !== 'bilbord').map((c) => ({ id: c.id, ...footprint(c) })),
    ];
    const index = new SpatialIndex(solid);
    const overlaps: string[] = [];
    for (const a of solid) {
      for (const b of index.query(a.x, a.z, 60)) {
        if (a.id < b.id && Math.abs(a.x - b.x) < a.hx + b.hx - 0.15 && Math.abs(a.z - b.z) < a.hz + b.hz - 0.15) overlaps.push(`${a.id}-${b.id}`);
      }
      for (const r of plan.roads) {
        if (Math.abs(a.x - r.x) < a.hx + r.w / 2 - 0.15 && Math.abs(a.z - r.z) < a.hz + r.d / 2 - 0.15) overlaps.push(`${a.id}-yo'l`);
      }
      if (inLake(a.x, a.z)) overlaps.push(`${a.id}-ko'l`);
    }
    expect(overlaps).toEqual([]);
    expect(plan.plots.some((p) => inPlaza(p.x, p.z))).toBe(false);
  });

  test('har hovli tuman chegarasi ichida', () => {
    for (const p of plan.plots) {
      const r = plan.districts[p.districtId - 1]!.rect;
      expect(p.x >= r[0] && p.x <= r[2] && p.z >= r[1] && p.z <= r[3]).toBe(true);
    }
  });

  test('har uchastka oldida yo‘l bor', () => {
    const orphan = plan.plots.filter((p) => p.type !== 'kvartira').filter((p) => {
      const f = frontOf(p, 4);
      return !plan.roads.some((r) => boxContains({ x: r.x, z: r.z, hx: r.w / 2, hz: r.d / 2 }, f.x, f.z, 3));
    });
    expect(orphan.map((p) => p.id)).toEqual([]);
  });

  test('tepalik balandligi silliq va faqat NE burchakda', () => {
    expect(terrainHeight(0, 0)).toBe(0);
    expect(terrainHeight(HILL.x, HILL.z)).toBeGreaterThan(25);
    expect(terrainHeight(-HILL.x, HILL.z)).toBe(0);
    for (let x = 750; x < CITY_HALF + 100; x += 2) expect(Math.abs(terrainHeight(x, HILL.z) - terrainHeight(x + 2, HILL.z))).toBeLessThan(1);
  });

  test('v2: kattalashgan uchastkalar (±10%), shahar ~3×3 km', () => {
    expect(plan.version).toBe(2);
    expect(CITY_HALF).toBeGreaterThanOrEqual(1450);
    expect(CITY_HALF).toBeLessThanOrEqual(1600);
    const target = { hovli: [24, 34], villa: [30, 42], qasr: [40, 56] } as const;
    for (const p of plan.plots) {
      if (p.type === 'kvartira') continue;
      const [w, d] = target[p.type];
      expect(Math.abs(p.w / w - 1)).toBeLessThanOrEqual(0.1);
      expect(Math.abs(p.d / d - 1)).toBeLessThanOrEqual(0.1);
    }
    const area = (t: string): number => { const p = plan.plots.find((q) => q.type === t)!; return p.w * p.d; };
    expect(area('villa')).toBeGreaterThan(area('hovli') * 1.4);
    expect(area('qasr')).toBeGreaterThan(area('villa') * 1.4);
  });

  test('B101–B112 va markaziy maydon joyi o‘zgarmagan', () => {
    const at = Object.fromEntries(plan.commerce.map((c) => [c.id, [c.type, c.x, c.z, c.w, c.d, c.rot]]));
    const n = [[-108, -108], [-108, -74], [-74, -108], [108, -108], [108, -74], [74, -108], [108, 108], [108, 74], [74, 108], [-108, 108], [-108, 74], [-74, 108]] as const;
    n.forEach(([x, z], i) => expect(at[`B${101 + i}`], `B${101 + i}`).toEqual(['ofis', x, z, 28, 28, z < 0 ? 0 : 2]));
    expect(PLAZA_HALF).toBe(125);
    expect(AVENUE_LINES).toContain(0);
    expect(plan.commerce).toHaveLength(170);
  });

  test('hovlilar maydon chetidan ~3 m narida boshlanadi, markazga yaqin joy yetarli', () => {
    const gap = (p: (typeof plan.plots)[number]): number => { const f = footprint(p); return Math.max(Math.abs(p.x) - f.hx, Math.abs(p.z) - f.hz) - PLAZA_HALF; };
    const gaps = plan.plots.filter((p) => p.type === 'hovli').map(gap);
    expect(Math.min(...gaps)).toBeGreaterThanOrEqual(2);
    expect(Math.min(...gaps)).toBeLessThanOrEqual(6);
    expect(plan.plots.filter((p) => p.type === 'hovli' && p.districtId <= 4 && Math.hypot(p.x, p.z) < 350).length).toBeGreaterThanOrEqual(100);
  });

  test('kengaytirish joyi bitta uchastkaga bittadan', () => {
    expect(new Set(plan.expansions.map((e) => e.plotId)).size).toBe(plan.expansions.length);
  });

  test('100–200 tijorat joyi', () => {
    expect(plan.commerce.length).toBeGreaterThanOrEqual(100);
    expect(plan.commerce.length).toBeLessThanOrEqual(200);
    expect(new Set(plan.commerce.map((c) => `${c.x},${c.z}`)).size).toBe(plan.commerce.length);
  });
});
