import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, test } from 'vitest';
import {
  ANCHORS, DECOR, DECOR_LEVEL, DEFAULT_DECOR_SLOTS, FREE_ANCHOR, LEVEL_DRIVE, MAX_DECOR_SLOTS, MAX_TIER, REF_YARD, TIERS, anchorById, decodePlan, decorSlots, footprint, levelYard, openAnchors, parsePlaced, type Anchor, type EncodedPlan, type Plot,
} from '../../../packages/shared/src/index.ts';
import { decorOf, setCatalog, type CatalogRow } from '../src/logic/decorCatalog.ts';
import type { Item } from '../src/logic/item.ts';
import { houseItem, plotItems, type HouseState } from '../src/logic/placement.ts';

const plan = decodePlan(JSON.parse(readFileSync(new URL('../../../packages/shared/data/masterplan.json', import.meta.url), 'utf8')) as EncodedPlan);
const state = (over: Partial<HouseState> = {}): HouseState => ({ plot: 'P0001', nick: 'ali', tier: 10, wall: 0, roof: 0, decor: [], material: 0, frame: 0, door: 0, label: 'plain', badge: null, status: 'owned', expanded: false, ...over });
const sample = (type: string): Plot => plan.plots.find((p) => p.type === type && p.rot === 0)!;
type Box = readonly [x0: number, x1: number, z0: number, z1: number];
let boxes: Map<string, Box>;
let points: Map<string, readonly (readonly [number, number, number])[]>;
beforeAll(async () => {
  const doc = await new NodeIO().read(fileURLToPath(new URL('../../../assets/city-kit.glb', import.meta.url)));
  points = new Map(doc.getRoot().listMeshes().filter((m) => /^house\d+$/.test(m.getName())).map((m) => {
    const pos = m.listPrimitives()[0]!.getAttribute('POSITION')!;
    return [m.getName(), Array.from({ length: pos.getCount() }, (_, i) => { const [x = 0, y = 0, z = 0] = pos.getElement(i, []); return [x, y, z] as const; })];
  }));
  boxes = new Map(doc.getRoot().listMeshes().map((m) => {
    const pos = m.listPrimitives()[0]!.getAttribute('POSITION')!;
    const [a, b] = [pos.getMin([]), pos.getMax([])];
    return [m.getName(), [a[0]!, b[0]!, a[2]!, b[2]!] as const];
  }));
});
/** Haqiqiy model o'lchami bilan (rot 0). */
const boxOf = (i: Item): Box => {
  const b = boxes.get(i.model);
  if (!b) throw new Error(`model yo'q: ${i.model}`);
  return [i.x + b[0] * i.sx, i.x + b[1] * i.sx, i.z + b[2] * i.sz, i.z + b[3] * i.sz];
};
const isSized = (a: Anchor): boolean => a.w > 0;
const overlap = (a: Anchor, b: { readonly x: number; readonly z: number; readonly w: number; readonly d: number }): boolean => Math.abs(a.x - b.x) < (a.w + b.w) / 2 - 1e-6 && Math.abs(a.z - b.z) < (a.d + b.d) / 2 - 1e-6;

describe('joy nuqtalari', () => {
  test('ID noyob, nuqtalar bir-biriga, yo‘lakka va avtomobil yo‘liga tegmaydi', () => {
    expect(new Set(ANCHORS.map((a) => a.id)).size).toBe(ANCHORS.length);
    const PATH = { x: 0, z: 7.8, w: 1.8, d: 17.6 };
    const DRIVE = { x: 8, z: 8, w: 6, d: 18 };
    const sized = ANCHORS.filter(isSized);
    sized.forEach((a, i) => {
      for (const b of sized.slice(i + 1)) expect(overlap(a, b), `${a.id} va ${b.id}`).toBe(false);
      expect(overlap(a, PATH), `${a.id} yo‘lakda`).toBe(false);
      if (a.kind !== 'car') expect(overlap(a, DRIVE), `${a.id} avtomobil yo‘lida`).toBe(false);
      expect(Math.abs(a.x) + a.w / 2, a.id).toBeLessThanOrEqual(REF_YARD.w / 2 - 0.4);
      expect(Math.abs(a.z) + a.d / 2, a.id).toBeLessThanOrEqual(REF_YARD.d / 2 - 0.3);
    });
    for (const [model, id] of Object.entries(FREE_ANCHOR)) expect(anchorById(id), model).toBeDefined();
  });
  test('har uchastka turida 10-level uyga ham tegmaydi', () => {
    for (const type of ['hovli', 'villa', 'qasr']) {
      const p = sample(type);
      const [kx, kz] = [p.w / REF_YARD.w, p.d / REF_YARD.d];
      for (const { id: tier } of TIERS.filter((t) => type === 'hovli' || t.id >= 7)) {
        const [x0, x1, z0, z1] = boxOf(houseItem(p, state({ tier }), false));
        for (const a of openAnchors(tier).filter((q) => isSized(q) && q.kind !== 'sign')) {
          const [ax, az] = [p.x + a.x * kx, p.z + a.z * kz];
          const hits = ax + a.w / 2 > x0 && ax - a.w / 2 < x1 && az + a.d / 2 > z0 && az - a.d / 2 < z1;
          expect(hits, `${type} ${tier}-level ${a.id}`).toBe(false);
        }
      }
    }
  });
  test('1–4-levelda faqat nik lavhasi; 5 dan boshlab nuqtalar ochiq va joylar soniga yetadi', () => {
    for (let level = 1; level < DECOR_LEVEL; level++) expect(openAnchors(level).map((a) => a.id)).toEqual(['sign']);
    const prompt = ['garaj_oldi', 'old_hovli_chap', 'old_hovli_ong', 'darvoza_yoni', 'burchak_1', 'burchak_2', 'burchak_3', 'burchak_4'];
    for (let level = DECOR_LEVEL; level <= MAX_TIER; level++) expect(openAnchors(level).map((a) => a.id)).toEqual(expect.arrayContaining(prompt));
    for (let level = 1; level <= MAX_TIER; level++) {
      expect(openAnchors(level).length, `level ${level}`).toBeGreaterThanOrEqual(decorSlots(level));
      if (level >= DECOR_LEVEL) expect(decorSlots(level)).toBeGreaterThan(decorSlots(level - 1));
    }
    expect([...DEFAULT_DECOR_SLOTS]).toEqual([1, 1, 1, 1, 8, 10, 12, 14, 16, 17]);
    expect(decorSlots(10, [1, 1, 1, 1, 1, 1, 1, 1, 1, 99])).toBe(MAX_DECOR_SLOTS);
    expect(decorSlots(99)).toBe(17);
    expect(decorSlots(0)).toBe(1);
  });
  test('har nuqtaga kamida bitta bezak sig‘adi, har bezakning joyi bor', () => {
    const kinds = new Set(ANCHORS.map((a) => a.kind));
    for (const d of DECOR) expect(d.spots.every((s) => kinds.has(s)) && d.spots.length > 0, d.id).toBe(true);
    for (const a of ANCHORS) expect(DECOR.some((d) => d.spots.includes(a.kind)) || a.kind === 'roof', a.id).toBe(true);
  });
  test('tekin daraxtlar 1–6-levelda uyga kirmaydi', () => {
    const p = sample('hovli');
    for (let tier = 1; tier <= 6; tier++) {
      const items = plotItems(p, state({ tier }), true);
      const house = items[0]!;
      const at = points.get(house.model)!.map(([x, y, z]) => [house.x + x, y, house.z + z] as const);
      for (const t of items.filter((i) => i.model.startsWith('tree_'))) {
        const [x0, x1, z0, z1] = boxOf(t);
        expect(at.filter(([x, y, z]) => y < 6 && x > x0 && x < x1 && z > z0 && z < z1), `${tier}-level ${t.model}`).toEqual([]);
        expect(x0 >= p.x - p.w / 2 && x1 <= p.x + p.w / 2 && z0 >= p.z - p.d / 2 && z1 <= p.z + p.d / 2, `${tier}-level ${t.model} chetda`).toBe(true);
      }
    }
  });
  test('matnni o‘qish', () => {
    expect(parsePlaced(['burchak_1:tree_anor', 'buzuq', ':x', 'gate:gate_gold'])).toEqual([{ anchor: 'burchak_1', decor: 'tree_anor' }, { anchor: 'gate', decor: 'gate_gold' }]);
    expect(anchorById('yoq')).toBeUndefined();
  });
});

describe('bezak uchastkadan chiqmaydi', () => {
  const TOLERANCE = 0.5;
  /** Daraxt shoxi nuqtadan sal chiqishi mumkin (tanasi ichida, uchastkadan chiqmaydi). */
  const CANOPY = 1.1;
  test.each(['hovli', 'villa', 'qasr'])('%s: har bezak har mos nuqtada', (type) => {
    const p = sample(type);
    const f = footprint(p);
    for (const d of DECOR) {
      for (const a of ANCHORS.filter((q) => d.spots.includes(q.kind))) {
        const items = plotItems(p, state({ decor: [`${a.id}:${d.id}`] }), true);
        for (const i of items) {
          const [x0, x1, z0, z1] = boxOf(i);
          expect(x0 >= p.x - f.hx - 0.01 && x1 <= p.x + f.hx + 0.01 && z0 >= p.z - f.hz - 0.01 && z1 <= p.z + f.hz + 0.01, `${type} ${a.id}:${d.id} → ${i.model} ${(x0 - p.x).toFixed(2)}..${(x1 - p.x).toFixed(2)}, ${(z0 - p.z).toFixed(2)}..${(z1 - p.z).toFixed(2)}`).toBe(true);
        }
        const own = items.at(-1)!;
        if (!isSized(a) || type !== 'hovli') continue;
        const [x0, x1, z0, z1] = boxOf(own);
        expect(x1 - x0, `${a.id}:${d.id} eni`).toBeLessThanOrEqual(a.w + (d.slot === 'tree' ? CANOPY : TOLERANCE));
        expect(z1 - z0, `${a.id}:${d.id} chuqurligi`).toBeLessThanOrEqual(a.d + (d.slot === 'tree' ? CANOPY : TOLERANCE));
      }
    }
  });
  test('hamma nuqtasi to‘la uy: bezaklar ko‘rinadi, o‘sha nuqtadagi tekinlari yo‘qoladi', () => {
    const decor = ANCHORS.flatMap((a) => { const d = DECOR.find((q) => q.spots.includes(a.kind)); return d ? [`${a.id}:${d.id}`] : []; });
    const items = plotItems(sample('hovli'), state({ decor }), true);
    expect(decor).toHaveLength(ANCHORS.length);
    // uy, panjara, darvoza, avtomobil yo‘li + panjara va darvozadan boshqa hamma nuqta
    expect(items).toHaveLength(4 + ANCHORS.length - 2);
    expect(levelYard(10).length).toBeGreaterThan(0);
    expect(items.filter((i) => i.model === 'tree_round')).toEqual([]);
  });
});

describe('yangi bezaklar', () => {
  const NEW = ['dam_besedka', 'dam_mangal', 'dam_basseyn', 'dam_stol', 'avto_sedan', 'avto_krossover', 'avto_sport', 'daraxt_olma', 'daraxt_orik', 'daraxt_gilos', 'daraxt_archa', 'daraxt_palma', 'gul_zor', 'gul_kamar', 'suv_hovuz'];
  test('15 tasi katalogda, faqat 5-leveldan; nik lavhasi bundan mustasno', () => {
    for (const id of NEW) expect(DECOR.find((d) => d.id === id), id).toMatchObject({ minLevel: DECOR_LEVEL, isActive: true });
    expect(DECOR.filter((d) => d.minLevel < DECOR_LEVEL).map((d) => d.id)).toEqual(['sign_nick']);
    expect(DECOR.filter((d) => !d.isActive).length).toBeGreaterThan(5);
  });
  test('toifa narxlari (docs/chat/TANGA-NARXLAR.md)', () => {
    const range = (ids: readonly string[], lo: number, hi: number): void => {
      for (const id of ids) {
        const { priceCoins } = DECOR.find((d) => d.id === id)!;
        expect(priceCoins >= lo && priceCoins <= hi, id).toBe(true);
      }
    };
    range(['daraxt_olma', 'daraxt_orik', 'daraxt_gilos', 'daraxt_archa', 'daraxt_palma', 'gul_zor', 'gul_kamar'], 100, 300);
    range(['dam_besedka', 'dam_mangal', 'dam_stol', 'suv_hovuz'], 400, 800);
    range(['avto_sedan', 'avto_krossover', 'avto_sport', 'dam_basseyn'], 1000, 2500);
  });
  test('mashina avtomobil yo‘li ustida turadi', () => {
    for (const tier of [5, 6, 10]) {
      const items = plotItems(sample('hovli'), state({ tier, decor: ['garaj_oldi:avto_krossover'] }), true);
      const [cx0, cx1, cz0, cz1] = boxOf(items.find((i) => i.model === 'avto_krossover')!);
      const [x0, x1, z0, z1] = boxOf(items.find((i) => i.model === LEVEL_DRIVE[tier])!);
      expect(cx0 >= x0 && cx1 <= x1 && cz0 >= z0 && cz1 <= z1, `${tier}-level`).toBe(true);
    }
  });
});

describe('katalog', () => {
  test('admin yaratgan tovar: boshqa nom va rang, o‘sha model', () => {
    const row: CatalogRow = { id: 'oltin_anor', slot: 'tree', model: 'tree_anor', uz: 'Oltin anor', ru: 'Золотой', uzs: 1, coins: 2, left: 3, spots: ['corner'], min: 5, from: null, to: null, set: null, isNew: true, tint: '#ffcc00', onSale: true };
    setCatalog([row]);
    expect(decorOf('oltin_anor')).toMatchObject({ model: 'tree_anor', tint: '#ffcc00', priceCoins: 2 });
    const own = plotItems(sample('hovli'), state({ decor: ['burchak_1:oltin_anor', 'burchak_2:yoqolgan'] }), true).at(-1)!;
    expect(own).toMatchObject({ model: 'tree_anor', tint: '#ffcc00' });
    setCatalog(DECOR.map((d): CatalogRow => ({ id: d.id, slot: d.slot, model: d.model, uz: d.uz, ru: d.ru, uzs: d.priceUzs, coins: d.priceCoins, left: d.stock, spots: d.spots, min: d.minLevel, from: null, to: null, set: null, isNew: false, tint: null, onSale: true })));
  });
  test('devor materiali, ramka va eshik rangi modelga uzatiladi', () => {
    const i = houseItem(sample('hovli'), state({ material: 1, frame: 3, door: 5 }), false);
    expect(i.mat).toBe(2 + 16 * 3);
    expect(i.door).toBe(5);
    expect(houseItem(sample('hovli'), state(), true).mat).toBe(1);
  });
});
