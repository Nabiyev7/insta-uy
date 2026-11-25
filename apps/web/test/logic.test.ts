import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { describe, expect, test } from 'vitest';
import { FENCE_RANK, GATE_RANK, LAKE, LEVEL_FENCE, LEVEL_GATE, MAX_TIER, MIN_TIER, TIERS, decodePlan, levelYard, footprint, inLake, type EncodedPlan } from '../../../packages/shared/src/index.ts';
import { daylightAt, leafTint, snowAmount } from '../src/logic/atmosphere.ts';
import { frameAt } from '../src/logic/cameraPath.ts';
import { CITY_LIMIT, cameraDistance, lerpAngle, movePlayer, pickNearest, rayBox } from '../src/logic/motion.ts';
import {
  buildingItem, buildingSolid, commerceItem, commerceSolid, expansionItems, houseItem, houseSolid, pickHeight, plotItems, projectItems,
  type HouseState,
} from '../src/logic/placement.ts';
import { toWorld } from '../src/logic/item.ts';
import { PUBLIC_SOLIDS } from '../src/logic/landscape.ts';
import { closedDistrictItems, staticItems } from '../src/logic/streets.ts';
import { initialQuality, startGovernor, stepGovernor, type GovernorState } from '../src/logic/quality.ts';

const plan = decodePlan(JSON.parse(readFileSync(new URL('../../../packages/shared/data/masterplan.json', import.meta.url), 'utf8')) as EncodedPlan);
const state = (over: Partial<HouseState> = {}): HouseState => ({ plot: 'P0001', nick: 'ali', tier: 2, wall: 0, roof: 0, decor: [], material: 0, frame: 0, door: 0, label: 'plain', badge: null, status: 'owned', expanded: false, ...over });
const GARDEN = ['path_stone', 'tree_round', 'tree_wide', 'tree_tall', 'tree_slim'];
const plotOf = (type: string): (typeof plan.plots)[number] => plan.plots.find((p) => p.type === type)!;

describe('joylashtirish', () => {
  test.each(['hovli', 'villa', 'qasr'])('%s: har darajadagi uy o‘z uchastkasidan chiqmaydi', (type) => {
    for (const p of plan.plots.filter((q) => q.type === type).slice(0, 40)) {
      for (const { id: tier } of TIERS.filter((t) => t.id >= MIN_TIER[p.type])) {
        const s = houseSolid(p, state({ tier }))!;
        const f = footprint(p);
        expect(Math.abs(s.x - f.x) + s.hx).toBeLessThanOrEqual(f.hx + 0.01);
        expect(Math.abs(s.z - f.z) + s.hz).toBeLessThanOrEqual(f.hz + 0.01);
      }
    }
  });
  test('bezak panjara/darvoza oddiysini almashtiradi', () => {
    const models = plotItems(plotOf('hovli'), state({ tier: 1, decor: ['fence:fence_brick', 'gate:gate_gold', 'yoq'] }), true).map((i) => i.model);
    expect(models).toEqual(['house1', 'fence_brick', 'gate_gold', ...GARDEN]);
    expect(plotItems(plotOf('hovli'), state({ tier: 3 }), true).map((i) => i.model)).toEqual(['house3', 'fence_basic', 'gate_wood', 'drive_narrow', ...GARDEN]);
    expect(plotItems(plotOf('hovli'), state({ tier: 4 }), true).map((i) => i.model)).toEqual(['house4', 'fence_brick', 'gate_slat', 'drive_narrow', ...GARDEN]);
    expect(plotItems(plotOf('hovli'), state({ tier: 5 }), true).map((i) => i.model).slice(0, 4)).toEqual(['house5', 'fence_brick', 'gate_slat', 'drive_wide']);
    expect(plotItems(plotOf('hovli'), state({ tier: 2 }), true).map((i) => i.model).slice(0, 3)).toEqual(['house2', 'fence_basic', 'gate_basic']);
    expect(plotItems(plotOf('hovli'), state({ tier: 1 }), true).map((i) => i.model)).toEqual(['house1', 'fence_low', 'gate_open', ...GARDEN]);
  });
  test('bo‘sh, yopiq va kvartira', () => {
    const empty = plotItems(plotOf('hovli'), undefined, true).map((i) => i.model);
    expect(empty.at(-1)).toBe('forsale');
    expect(new Set(empty.slice(0, -1))).toEqual(new Set(['tree_round']));
    for (const q of plan.plots.filter((x) => x.districtId === 1 && x.type === 'hovli')) {
      const list = plotItems(q, undefined, true);
      const f = footprint(q);
      expect(list.length === 2 || list.length === 3, q.id).toBe(true);
      for (const i of list) expect(Math.abs(i.x - q.x) < f.hx - 1 && Math.abs(i.z - q.z) < f.hz - 1, `${q.id} ${i.model}`).toBe(true);
    }
    expect(plotItems(plotOf('villa'), undefined, true).map((i) => i.model)).not.toContain('forsale');
    expect(plotItems(plotOf('kvartira'), state(), true)).toEqual([]);
    const closed = plan.plots.filter((p) => p.districtId === 5).flatMap((p) => plotItems(p, undefined, false));
    expect(closed.length).toBeGreaterThan(100);
    expect(new Set(closed.map((i) => i.model))).toEqual(new Set(['foundation', 'barrier']));
    expect(houseSolid(plotOf('kvartira'), state())).toBeNull();
  });
  test('hashamat tunda yonadi, bo‘yiga o‘smaydi', () => {
    const p = plotOf('hovli');
    expect(houseItem(p, state({ tier: 1 }), false).glow).toBe(0);
    expect(houseItem(p, state({ tier: MAX_TIER, decor: ['luxe:light_luxe'] }), false).glow).toBeCloseTo(0.65);
    expect(houseItem(p, state({ tier: MAX_TIER }), true)).toMatchObject({ model: 'house5_lod', sy: 1 });
    expect(houseItem(p, state({ tier: 1 }), true).model).toBe('house1_lod');
    expect(houseItem(p, state({ tier: 2 }), true).model).toBe('house2_lod');
    expect(houseItem(p, state({ tier: 2 }), true, true).model).toBe('house1_lod');
  });
  test('5 level: har biri oldingisidan kuchli (6–10 keyin)', () => {
    const p = plotOf('hovli');
    expect(TIERS.map((t) => t.id)).toEqual([1, 2, 3, 4, 5]);
    expect(MIN_TIER).toEqual({ hovli: 1, kvartira: 1, villa: 1, qasr: 1 });
    expect(new Set(TIERS.map((t) => houseItem(p, state({ tier: t.id }), false).model)).size).toBe(MAX_TIER);
    for (const { id } of TIERS.slice(1)) {
      const glow = (tier: number): number => houseItem(p, state({ tier }), false).glow;
      expect(glow(id)).toBeGreaterThanOrEqual(glow(id - 1));
      expect(levelYard(id).length).toBeGreaterThanOrEqual(levelYard(id - 1).length);
    }
    expect(plotItems(p, state({ tier: 5 }), true).map((i) => i.model)).toEqual(expect.arrayContaining(['house5', 'fence_brick', 'gate_slat', 'light_lamps']));
  });
  test('4–5-level zamonaviy: tanlanmagan tom va ramka to‘q; tanlangani o‘zgarmaydi', () => {
    const p = plotOf('hovli');
    expect(houseItem(p, state({ tier: 3 }), false).roof).toBe('#d9604a');
    expect(houseItem(p, state({ tier: 4 }), false)).toMatchObject({ roof: '#4a5663', mat: 1 + 16 * 3 });
    expect(houseItem(p, state({ tier: 5, roof: 3, frame: 2 }), false)).toMatchObject({ roof: '#4f9478', mat: 1 + 16 * 2 });
  });
  test('egasi olgan bezak level bezagidan ustun', () => {
    const models = plotItems(plotOf('hovli'), state({ tier: 5, decor: ['fence:fence_wood', 'luxe:light_luxe', 'path:path_stone'] }), true).map((i) => i.model);
    expect(models).toEqual(expect.arrayContaining(['fence_wood', 'gate_slat']));
    expect(models).not.toContain('fence_brick');
    for (const m of ['light_luxe', 'path_stone']) expect(models.filter((d) => d === m)).toHaveLength(1);
    expect(levelYard(99)).toEqual([]);
  });
  test('panjara va darvoza har levelda oldingisidan past emas; temir panjara va oltin darvoza faqat bezak', () => {
    for (const { id } of TIERS.slice(1)) {
      expect(FENCE_RANK.indexOf(LEVEL_FENCE[id]!)).toBeGreaterThanOrEqual(FENCE_RANK.indexOf(LEVEL_FENCE[id - 1]!));
      expect(GATE_RANK.indexOf(LEVEL_GATE[id]!)).toBeGreaterThanOrEqual(GATE_RANK.indexOf(LEVEL_GATE[id - 1]!));
    }
    expect(LEVEL_GATE).not.toContain('gate_gold');
    expect(LEVEL_FENCE).not.toContain('fence_ornate');
    expect(LEVEL_FENCE).toHaveLength(MAX_TIER + 1);
    expect(levelYard(1)).toEqual(GARDEN);
    expect(TIERS.map((t) => t.uz)).toEqual(['Kichik uy', 'Shinam uy', 'Hovli uy', 'Bezakli uy', 'Katta uy']);
  });
  test('har level modeli (haqiqiy o‘lchami bilan) uchastkadan chiqmaydi, oldida ≥10 m hovli, uy izi ≤45%', async () => {
    const doc = await new NodeIO().read(fileURLToPath(new URL('../../../assets/city-kit.glb', import.meta.url)));
    const boxes = new Map(doc.getRoot().listNodes().flatMap((n) => {
      const pos = n.getMesh()?.listPrimitives()[0]?.getAttribute('POSITION');
      return pos ? [[n.getName(), { min: pos.getMin([]), max: pos.getMax([]) }] as const] : [];
    }));
    const SIZE_LIMIT = 2500;
    const TWO_FLOORS_LIMIT = 3000;
    for (const [type, from] of [['hovli', 1], ['villa', 1], ['qasr', 1]] as const) {
      const p = plan.plots.find((q) => q.type === type && q.rot === 0)!;
      for (const { id: tier } of TIERS.filter((t) => t.id >= from)) {
        const i = houseItem(p, state({ tier }), false);
        const b = boxes.get(`house${tier}`)!;
        const [x0, x1] = [i.x + b.min[0]! * i.sx - p.x, i.x + b.max[0]! * i.sx - p.x];
        const [z0, z1] = [i.z + b.min[2]! * i.sz - p.z, i.z + b.max[2]! * i.sz - p.z];
        expect(Math.max(-x0, x1), `${type} ${tier}`).toBeLessThan(p.w / 2 - 0.5);
        expect(-z0, `${type} ${tier}`).toBeLessThan(p.d / 2 - 0.5);
        expect(p.d / 2 - z1, `${type} ${tier}`).toBeGreaterThanOrEqual(10);
        expect((x1 - x0) * (z1 - z0), `${type} ${tier}`).toBeLessThanOrEqual(p.w * p.d * 0.45);
        expect(boxes.has(`house${tier}_lod`)).toBe(true);
      }
    }
    for (const n of doc.getRoot().listMeshes().filter((m) => /^house\d+$/.test(m.getName()))) {
      const tris = (n.listPrimitives()[0]?.getIndices()?.getCount() ?? 0) / 3;
      expect(tris, n.getName()).toBeLessThanOrEqual(n.getName() === 'house5' ? TWO_FLOORS_LIMIT : SIZE_LIMIT);
    }
    // 6–10-level modellari hozircha eksport qilinmaydi.
    for (const id of [6, 7, 8, 9, 10]) {
      expect(boxes.has(`house${id}`), `house${id}`).toBe(false);
    }
  });
  test('baland uyning tomini bosganda ham tanlanadi', () => {
    expect(pickHeight(plotOf('hovli'), undefined)).toBeLessThan(2);
    expect(pickHeight(plotOf('hovli'), state({ tier: 5 }))).toBeGreaterThanOrEqual(9);
    expect(pickHeight(plotOf('qasr'), state({ tier: 5 }))).toBeGreaterThan(pickHeight(plotOf('hovli'), state({ tier: 5 })));
  });
  test('burish: fasad +z dan rot bo‘yicha', () => {
    expect(toWorld({ x: 0, z: 0, rot: 0 }, 0, 5)[1]).toBeCloseTo(5);
    expect(toWorld({ x: 0, z: 0, rot: 1 }, 0, 5)[0]).toBeCloseTo(5);
    expect(toWorld({ x: 0, z: 0, rot: 2 }, 0, 5)[1]).toBeCloseTo(-5);
  });
  test('statik narsalar ko‘lga tushmaydi, yetarli', () => {
    const items = staticItems(plan);
    expect(items.length).toBeGreaterThan(1500);
    expect(items.filter((i) => inLake(i.x, i.z))).toEqual([]);
  });
  test('tijorat, bino, kengaytirish, yopiq tuman, loyiha, bayram', () => {
    expect(new Set(plan.commerce.map((c) => commerceItem(c).model))).toEqual(new Set(['shop', 'office', 'office_low', 'billboard', 'bank', 'agentlik', 'novostroyka']));
    expect(plan.commerce.filter((c) => c.type !== 'bilbord').every((c) => commerceSolid(c) !== null)).toBe(true);
    expect(commerceSolid(plan.commerce.find((c) => c.type === 'bilbord')!)).toBeNull();
    expect(buildingItem(plan.buildings[0]!, true).model).toMatch(/apt\d_lod/);
    expect(buildingSolid(plan.buildings[0]!).h).toBeGreaterThan(15);
    expect(expansionItems(plan.expansions[0]!).length).toBeGreaterThan(3);
    expect(closedDistrictItems(plan, 5).some((i) => i.model === 'crane')).toBe(true);
    const project = (kind: 'bog' | 'stadion' | 'koprik', raised: number): string[] => projectItems([{ id: 1, kind, goal: 100, raised, status: 'open' }]).map((i) => i.model);
    expect(project('bog', 50)).toHaveLength(30);
    expect(project('stadion', 100)).toEqual(['stadium']);
    expect(project('koprik', 10)).toContain('crane');
    expect(project('koprik', 0)).toEqual([]);
  });
});

describe('harakat', () => {
  const wall = { x: 10, z: 0, hx: 2, hz: 2, h: 4 };
  test('devordan o‘tmaydi, sirpanadi', () => {
    expect(movePlayer({ x: 7, z: 0.5 }, 2, 0, [wall]).x).toBeCloseTo(7.55);
    expect(movePlayer({ x: 0, z: 0 }, 1, 1, [wall])).toEqual({ x: 1, z: 1 });
    expect(movePlayer({ x: 10, z: -3 }, 0, 1, [wall]).z).toBeCloseTo(-2.45);
  });
  test('ko‘lga kirmaydi, ko‘prikdan o‘tadi, shahar chegarasi', () => {
    const p = movePlayer({ x: LAKE.x - LAKE.rx + 20, z: LAKE.z }, 0, 0, []);
    expect(inLake(p.x, p.z, 0.9)).toBe(false);
    expect(movePlayer({ x: LAKE.x, z: LAKE.z }, 0, 0, [], true)).toEqual({ x: LAKE.x, z: LAKE.z });
    expect(movePlayer({ x: CITY_LIMIT - 1, z: 0 }, 500, 0, []).x).toBe(CITY_LIMIT);
  });
  test('kamera devor orqasida qolmaydi', () => {
    expect(cameraDistance({ x: 5, z: 0 }, 1, 0, 6, 2, [wall])).toBeLessThan(3);
    expect(cameraDistance({ x: 5, z: 0 }, 1, 0, 6, 9, [wall])).toBe(6);
  });
  test('bosish eng yaqin uyni topadi', () => {
    const box = (id: string, z: number): Parameters<typeof rayBox>[1] => ({ id, x: 0, z, hx: 2, hz: 2, y0: 0, y1: 5 });
    const ray = { ox: 0, oy: 2, oz: 20, dx: 0, dy: 0, dz: -1 };
    expect(pickNearest(ray, [box('uzoq', 0), box('yaqin', 10)])).toBe('yaqin');
    expect(pickNearest({ ...ray, dz: 1 }, [box('a', 0)])).toBeNull();
    expect(rayBox({ ...ray, oy: 20 }, box('a', 0))).toBeNull();
  });
  test('burchak qisqa yo‘ldan', () => expect(lerpAngle(3, -3, 0.5)).toBeCloseTo(Math.PI, 1));
  test('maydonda boshlanish nuqtasi bo‘sh', () => expect(movePlayer({ x: 0, z: 30 }, 0, 0, PUBLIC_SOLIDS)).toEqual({ x: 0, z: 30 }));
});

describe('kun/tun va sifat', () => {
  test('tunda qorong‘i, kunduz yorug‘, uzluksiz', () => {
    expect(daylightAt(0).night).toBe(1);
    expect(daylightAt(0.5).night).toBe(0);
    expect(daylightAt(0.5).sunIntensity).toBeGreaterThan(daylightAt(0).sunIntensity * 2);
    expect(daylightAt(0.5, 'yomgir').sunIntensity).toBeLessThan(daylightAt(0.5).sunIntensity);
    for (let f = 0; f < 1; f += 0.002) {
      const [a, b] = [daylightAt(f), daylightAt(f + 0.002)];
      expect(Math.abs(a.skyTop[0] - b.skyTop[0])).toBeLessThan(0.03);
      expect(a.sun[1]).toBeGreaterThan(0);
    }
    expect(daylightAt(-0.5).night).toBe(0);
  });
  test('fasl', () => {
    expect(snowAmount('qish', 'qor')).toBeGreaterThan(snowAmount('qish', 'ochiq'));
    expect(snowAmount('yoz', 'ochiq')).toBe(0);
    expect(new Set((['bahor', 'yoz', 'kuz', 'qish'] as const).map((s) => leafTint(s).join())).size).toBe(4);
  });
  const run = (s: GovernorState, fps: number, seconds: number): GovernorState => {
    let g = s;
    for (let i = 0; i < fps * seconds; i++) g = stepGovernor(g, 1000 / fps);
    return g;
  };
  test('sekin qurilmada pasayadi va qayta ko‘tarilmaydi', () => {
    const slow = run(startGovernor('high'), 20, 10);
    expect(slow.level).toBe('low');
    expect(run(slow, 60, 60).level).toBe('low');
  });
  test('barqaror tez bo‘lsa ko‘tariladi; uzun kadr e’tiborsiz', () => {
    expect(run(startGovernor('low'), 60, 60).level).toBe('high');
    expect(stepGovernor(startGovernor('mid'), 5000).level).toBe('mid');
  });
  test('boshlang‘ich sifat', () => {
    expect(initialQuality({ cores: 8, memoryGb: 2, isTouch: true })).toBe('low');
    expect(initialQuality({ cores: 8, memoryGb: 6, isTouch: true })).toBe('mid');
    expect(initialQuality({ cores: 8, memoryGb: 8, isTouch: false })).toBe('high');
  });
});

describe('video kamerasi', () => {
  const first = plan.plots[0]!;
  const plots = plan.plots.filter((p) => p.streetId === first.streetId && Math.abs(p.x - first.x) < 90 && Math.abs(p.z - first.z) < 20).slice(0, 3);
  test('uzluksiz, uyga qaraydi, yozuv uchishdan keyin chiqadi', () => {
    for (let t = 0; t < 12; t += 1 / 30) {
      const [a, b] = [frameAt(plots, t, 12).pose, frameAt(plots, t + 1 / 30, 12).pose];
      expect(Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)).toBeLessThan(12);
    }
    expect(frameAt(plots, 0.1, 12).labelAlpha).toBe(0);
    expect(frameAt(plots, 2.8, 12)).toMatchObject({ index: 0, labelAlpha: 1 });
    expect(frameAt(plots, 99, 12).index).toBe(2);
    expect(() => frameAt([], 0, 1)).toThrow();
  });
});
