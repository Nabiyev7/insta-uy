/** 14-qadam (5): hamma egali uylarning niki — yaqinda batafsil, qolgani bitta qatlamda; ustma-ust tushsa uzoqrog'i yashiriladi. */
import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { SpatialIndex, decodePlan, type EncodedPlan } from '../../../packages/shared/src/index.ts';
import { LABEL_MAX_PX, LABEL_MIN_PX, declutter, labelPx } from '../src/logic/declutter.ts';
import type { HouseState } from '../src/logic/placement.ts';
import { QUALITY } from '../src/logic/quality.ts';
import { cityView, groundView } from '../src/logic/view.ts';
import { worldIndex } from '../src/logic/worldIndex.ts';
import { collect, type CollectSource } from '../src/world/collect.ts';

const plan = decodePlan(JSON.parse(readFileSync(new URL('../../../packages/shared/data/masterplan.json', import.meta.url), 'utf8')) as EncodedPlan);
const index = worldIndex(plan);
const owned = plan.plots.filter((p) => p.districtId <= 4).slice(0, 1000);
const houses = new Map(owned.map((p, i): [string, HouseState] => [p.id, { plot: p.id, nick: `odam_${i}`, tier: 3, wall: 0, roof: 0, decor: [], material: 0, frame: 0, door: 0, label: 'plain', badge: null, status: 'owned', expanded: false }]));
const mineId = owned[999]!.id;
const src = (): CollectSource => ({ plots: index.plots, statics: new SpatialIndex([]), extras: new SpatialIndex([]), commerce: new SpatialIndex([]), plan: { ...plan, buildings: [] }, houses, open: new Set([1, 2, 3, 4]), building: null, mine: new Set([mineId]), full: new Map(), simple: new Map() });

describe('o‘lcham', () => {
  test('yaqinda katta (~18 px matn), uzoqda kichrayadi, lekin ~10 px matndan kichik emas', () => {
    expect(labelPx(10)).toBe(LABEL_MAX_PX);
    expect(labelPx(60)).toBe(LABEL_MAX_PX);
    expect(labelPx(120)).toBeLessThan(LABEL_MAX_PX);
    expect(labelPx(5000)).toBe(LABEL_MIN_PX);
    // Batafsil yorliqda matn yorliq balandligining ~0,59 qismi (40/68).
    expect(LABEL_MAX_PX * (40 / 68)).toBeGreaterThanOrEqual(16);
    expect(LABEL_MIN_PX * (40 / 68)).toBeGreaterThanOrEqual(10);
  });
});

describe('declutter', () => {
  const screen = { width: 390, height: 844 };
  test('ustma-ust tushsa — keyingisi (uzoqrog‘i) yashiriladi; alohidalari qoladi; chegara', () => {
    const a = { cx: 100, cy: 100, w: 80, h: 20 };
    expect(declutter([a, { ...a, cx: 120 }, { ...a, cy: 200 }, null], 10, screen)).toEqual([0, 2]);
    expect(declutter([a, { ...a, cy: 200 }, { ...a, cy: 300 }], 2, screen)).toEqual([0, 1]);
    expect(declutter([{ ...a, cx: -500 }], 10, screen)).toEqual([]);
  });
  test('300 ta tasodifiy yorliqdan qabul qilinganlarning hech qaysi ikkisi kesishmaydi', () => {
    let seed = 7;
    const rnd = (): number => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const boxes = Array.from({ length: 300 }, () => ({ cx: rnd() * 390, cy: rnd() * 844, w: 40 + rnd() * 80, h: 17 }));
    const kept = declutter(boxes, 300, screen).map((i) => boxes[i]!);
    for (const [i, a] of kept.entries()) for (const b of kept.slice(i + 1)) expect(Math.abs(a.cx - b.cx) * 2 >= a.w + b.w || Math.abs(a.cy - b.cy) * 2 >= a.h + b.h).toBe(true);
  });
});

describe('hamma egali uylar', () => {
  test('baland kamerada ham niklar bor (oldin yo‘q edi); o‘z uyim — doim batafsil va birinchi', () => {
    for (const q of Object.values(QUALITY)) {
      const r = collect(cityView({ x: -300, z: -300, yaw: 0.4, height: q.cityMax }, q, 0.4), src(), q.labels);
      expect(r.nicks.length, q.level).toBeGreaterThan(100);
    }
    const mine = plan.plots.find((p) => p.id === mineId)!;
    const near = collect(cityView({ x: mine.x, z: mine.z, yaw: 0, height: 300 }, QUALITY.mid, 0.6), src(), QUALITY.mid.labels);
    expect(near.labels[0]).toMatchObject({ key: mineId, isMine: true });
    expect(near.nicks.some((n) => n.info.key === mineId)).toBe(false);
  });
  test('past kamerada yaqindagilar batafsil (8/16/26 gacha), qolgani uzoq qatlamda', () => {
    const p = owned[10]!;
    const r = collect(cityView({ x: p.x, z: p.z, yaw: 0, height: 30 }, QUALITY.low, 0.6), src(), QUALITY.low.labels);
    expect(r.labels.length).toBeGreaterThan(0);
    expect(r.labels.length).toBeLessThanOrEqual(QUALITY.low.labels + 1);
    expect(r.nicks.length).toBeGreaterThan(0);
  });
  test('piyoda/mashina — faqat yaqindagilar', () => {
    const p = owned[10]!;
    const r = collect(groundView({ x: p.x, z: p.z, yaw: 0, quality: QUALITY.mid, boost: 1, isVideo: false }), src(), QUALITY.mid.labels);
    for (const n of r.nicks) expect(n.d).toBeLessThan(70);
  });
});
