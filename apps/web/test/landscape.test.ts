import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { NodeIO, type Primitive } from '@gltf-transform/core';
import { beforeAll, describe, expect, test } from 'vitest';
import { CENTER_BOXES, CIVIC, RING, SITES, TOWERS, TOWER_NAMES, ZONES, civicById, civicRect, decodePlan, footprint, inBox, inLake, inRiverbed, zoneAt, type EncodedPlan } from '../../../packages/shared/src/index.ts';
import { PUBLIC_SOLIDS, holidayItems, landscapeItems } from '../src/logic/landscape.ts';
import { movePlayer } from '../src/logic/motion.ts';
import { PAVE, PAVE_RINGS, PAVING } from '../src/logic/paving.ts';
import { commerceItem, commerceSolid } from '../src/logic/placement.ts';
import { isOnRoad, roadsNear } from '../src/logic/roadGrid.ts';
import { closedDistrictItems, isWide, staticItems } from '../src/logic/streets.ts';

const plan = decodePlan(JSON.parse(readFileSync(new URL('../../../packages/shared/data/masterplan.json', import.meta.url), 'utf8')) as EncodedPlan);
const items = landscapeItems();
const statics = staticItems(plan);
const towers = plan.commerce.filter((c) => c.id in TOWERS);
const byId = (id: string): (typeof CIVIC)[number] => civicById(id)!;
const isTree = (m: string): boolean => m.startsWith('tree_');
let meshes: Map<string, Primitive>;
beforeAll(async () => {
  const doc = await new NodeIO().read(fileURLToPath(new URL('../../../assets/city-kit.glb', import.meta.url)));
  meshes = new Map(doc.getRoot().listMeshes().map((m) => [m.getName(), m.listPrimitives()[0]!]));
});
const tris = (n: string): number => (meshes.get(n)?.getIndices()?.getCount() ?? Number.NaN) / 3;

describe('to‘rt markaz va yashil bulvar', () => {
  test('jamoat binolari rejadagi joyda', () => {
    const at = (id: string): number[] => [byId(id).x, byId(id).z];
    expect(at('prezident')).toEqual([-180, -940]);
    expect(at('hokimiyat')).toEqual([0, -1090]);
    expect(at('sud')).toEqual([180, -940]);
    for (const [id, x, z] of [['kasalxona', -800, -170], ['teatr', -420, -170], ['masjid', 420, -170], ['otochirish', 620, 600]] as const) {
      const [cx, cz] = at(id);
      expect(Math.hypot(cx! - x, cz! - z), id).toBeLessThan(75);
    }
    const zoneOf: Record<string, string> = { prezident: 'mamuriy', hokimiyat: 'mamuriy', sud: 'mamuriy', univermag: 'savdo', bozor: 'savdo' };
    for (const c of CIVIC) {
      const r = civicRect(c);
      const box = c.id in SITES ? SITES[c.id as keyof typeof SITES] : ZONES[zoneOf[c.id] as 'savdo'].rect;
      expect(r.x - r.hx >= box[0] && r.x + r.hx <= box[2] && r.z - r.hz >= box[1] && r.z + r.hz <= box[3], c.id).toBe(true);
    }
    expect(civicById('yoq')).toBeUndefined();
  });

  test('binolar bir-biriga, tijorat joylariga va yo‘llarga tegmaydi', () => {
    const rects = CIVIC.map(civicRect);
    rects.forEach((a, i) => {
      for (const b of rects.slice(i + 1)) expect(Math.abs(a.x - b.x) < a.hx + b.hx && Math.abs(a.z - b.z) < a.hz + b.hz).toBe(false);
      for (const c of plan.commerce) { const f = footprint(c); expect(Math.abs(a.x - f.x) < a.hx + f.hx && Math.abs(a.z - f.z) < a.hz + f.hz, `${CIVIC[i]!.id} ${c.id}`).toBe(false); }
      for (const [dx, dz] of [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, 0]] as const) expect(isOnRoad(plan, a.x + dx * a.hx, a.z + dz * a.hz), CIVIC[i]!.id).toBe(false);
    });
  });

  test('narsalar binolar ichida, suvda yoki mashina yo‘lida emas', () => {
    const solid = CIVIC.filter((c) => c.id !== 'bozor').map(civicRect);
    const soft = items.filter((i) => isTree(i.model) || ['bench', 'street_lamp', 'flower_ring', 'hedge'].includes(i.model));
    expect(soft.length).toBeGreaterThan(1200);
    const bad = soft.filter((i) => solid.some((b) => Math.abs(i.x - b.x) < b.hx && Math.abs(i.z - b.z) < b.hz) || inLake(i.x, i.z) || isOnRoad(plan, i.x, i.z, -0.5));
    expect(bad.map((i) => `${i.model} ${i.x.toFixed(0)},${i.z.toFixed(0)}`)).toEqual([]);
  });

  test('yo‘l bo‘yidagi daraxtlar asfaltda emas, uchastkada emas; daryo yo‘lagi bo‘sh', () => {
    const trees = statics.filter((i) => isTree(i.model));
    expect(trees.length).toBeGreaterThan(5000);
    const plots = plan.plots.filter((p) => p.unit === 0).map(footprint);
    const step = Math.ceil(trees.length / 900);
    for (const t of trees.filter((_, i) => i % step === 0)) expect(plots.some((f) => Math.abs(t.x - f.x) < f.hx && Math.abs(t.z - f.z) < f.hz), `${t.x},${t.z}`).toBe(false);
    const wideRoads = plan.roads.filter(isWide);
    expect(trees.filter((t) => inRiverbed(t.x, t.z, -8) && !wideRoads.some((r) => Math.hypot(r.x - t.x, r.z - t.z) < Math.hypot(r.w, r.d) / 2 + 20)).length).toBe(0);
  });

  test('8 mahalla markazining har birida maktab, kafe, do‘kon, sport va bolalar maydonchasi', () => {
    expect(CENTER_BOXES).toHaveLength(8);
    for (const b of CENTER_BOXES) {
      const inside = items.filter((i) => inBox(b, i.x, i.z)).map((i) => i.model);
      for (const m of ['maktab', 'kafe', 'shop', 'sport', 'bolalar']) expect(inside).toContain(m);
    }
  });

  test('bulvarni halqa kesgan joy ochiq; kasalxona va o‘t o‘chirishda mashinalar bor', () => {
    const onRing = items.filter((i) => Math.abs(Math.hypot(i.x, i.z) - RING.r) < RING.w / 2 && (inBox(ZONES.bulvar.rect, i.x, i.z) || inBox(ZONES.bulvarKichik.rect, i.x, i.z)));
    expect(onRing).toEqual([]);
    expect(items.filter((i) => i.model === 'car_ambulance')).toHaveLength(2);
    expect(items.filter((i) => i.model === 'car_fire')).toHaveLength(2);
  });

  test('bayram bezaklari maydon ichida', () => {
    for (const h of ['yangi_yil', 'navroz', 'mustaqillik'] as const) {
      expect(holidayItems(h).length).toBeGreaterThan(3);
      expect(holidayItems(h).every((i) => Math.hypot(i.x, i.z) < 130 && Math.hypot(i.x, i.z) > 12)).toBe(true);
    }
    expect(holidayItems(null)).toEqual([]);
  });

  test('davlat binolarining derazasi tunda yonadi', () => {
    for (const c of CIVIC) expect(items.find((i) => i.model === c.id)!.seed).toBeLessThan(0.78);
  });

  test('odam binoga kirmaydi, boshlanish nuqtasi bo‘sh', () => {
    expect(movePlayer({ x: 0, z: 30 }, 0, 0, PUBLIC_SOLIDS)).toEqual({ x: 0, z: 30 });
    expect(movePlayer({ x: 0, z: -1062 }, 0, -20, PUBLIC_SOLIDS).z).toBeGreaterThan(-1076);
    expect(movePlayer({ x: 0, z: 0.1 }, 0, 0, PUBLIC_SOLIDS)).not.toEqual({ x: 0, z: 0.1 });
  });

  test('zona nomlari ikki tilda', () => {
    expect(zoneAt(0, -900)?.id).toBe('mamuriy');
    expect(zoneAt(-400, 0)?.uz).toContain('bulvar');
    expect(zoneAt(-500, -300)).toBeUndefined();
    for (const z of Object.values(ZONES)) expect(z.uz.length > 2 && z.ru.length > 2).toBe(true);
  });
});

describe('qoplama va yo‘l to‘ri', () => {
  test('qoplama ranglari va qatlamlari to‘g‘ri, zonadan chiqmaydi', () => {
    for (const p of PAVING) expect(p.box[0] < p.box[2] && p.box[1] < p.box[3] && p.kind in PAVE).toBe(true);
    for (const r of PAVE_RINGS) expect(r.r1).toBeGreaterThan(r.r0);
  });
  test('yo‘l to‘ri oddiy qidiruv bilan bir xil natija beradi', () => {
    for (const [x, z] of [[0, 0], [650, 0], [460, 460], [750, 300], [-1000, -1000], [1220, 1020], [375, 200], [-300, 600]] as const) {
      const direct = plan.roads.some((r) => { const a = r.angle ?? 0; const dx = x - r.x; const dz = z - r.z; return Math.abs(dx * Math.cos(a) + dz * Math.sin(a)) <= r.w / 2 && Math.abs(dz * Math.cos(a) - dx * Math.sin(a)) <= r.d / 2; });
      expect(isOnRoad(plan, x, z), `${x},${z}`).toBe(direct);
    }
    expect(roadsNear(plan, 99_999, 0)).toEqual([]);
  });
  test('yopiq tumanda kranlar o‘z hududida', () => {
    for (const id of [5, 9, 11]) {
      const list = closedDistrictItems(plan, id);
      expect(list.length).toBeGreaterThan(0);
      expect(list.every((i) => i.model === 'crane')).toBe(true);
    }
  });
});

describe('biznes markazi minoralari', () => {
  test('12 minora: ko‘rinishi, nomi, balandligi', () => {
    expect(towers).toHaveLength(12);
    const count = (look: string): number => Object.values(TOWERS).filter((t) => t.look === look).length;
    expect([count('bank'), count('agentlik'), count('novostroyka'), count('office')]).toEqual([3, 3, 2, 4]);
    for (const c of towers) {
      const solid = commerceSolid(c)!;
      expect(solid.h).toBe(TOWERS[c.id]!.height);
      expect(Math.max(solid.hx, solid.hz)).toBeLessThanOrEqual(14);
      expect(TOWER_NAMES[TOWERS[c.id]!.look].ru.length).toBeGreaterThan(3);
      expect(inBox(ZONES.biznes.rect, c.x, c.z)).toBe(true);
    }
    const offices = towers.filter((c) => TOWERS[c.id]!.look === 'office').map(commerceItem);
    expect(new Set(offices.map((i) => i.wall)).size).toBe(4);
  });
});

describe('modellar', () => {
  test('yangi binolar ≤2500 uchburchak, uzoq shakli bor; hamma narsaning modeli bor', () => {
    for (const c of CIVIC) {
      expect(tris(c.id), c.id).toBeLessThanOrEqual(2500);
      expect(tris(`${c.id}_lod`), c.id).toBeLessThanOrEqual(200);
    }
    for (const n of ['bank', 'agentlik', 'novostroyka']) expect(tris(n)).toBeLessThanOrEqual(1000);
    const missing = new Set([...statics, ...items].map((i) => i.model).filter((m) => !meshes.has(m)));
    expect([...missing]).toEqual([]);
  });
  test('bino o‘lchami ro‘yxatdagidan katta emas', () => {
    for (const c of CIVIC) {
      const p = meshes.get(c.id)!.getAttribute('POSITION')!;
      const [a, b] = [p.getMin([]), p.getMax([])];
      expect(b[0]! - a[0]!, c.id).toBeLessThanOrEqual(c.w + 0.8);
      expect(b[2]! - a[2]!, c.id).toBeLessThanOrEqual(c.d + 0.8);
      expect(Math.abs(b[1]! - c.height), c.id).toBeLessThan(2);
    }
  });
});
