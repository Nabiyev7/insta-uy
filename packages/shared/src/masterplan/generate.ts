/** Bosh reja v3 generatori: to'rt markaz + yashil bulvar (reja-DE). Natija data/masterplan.json da qulflangan. */
import type { Building, District, Expansion, MasterPlan, Plot, PlotType, Road, Street } from '../types.ts';
import { planCommerce } from './commerce.ts';
import { CUTTERS, HOVLI_CUTTERS, SPECS, cellInner, type DistrictSpec } from './districts.ts';
import { DIAGONAL, HILL, LAKE, boxHitsTilted, rotatedSize } from './geometry.ts';
import { layoutCell, type LayoutResult, type PlotSize, type Spot } from './layout.ts';
import { boxInCurves, diagonalRoads, networkRoads, type NetRoad } from './network.ts';
import { ZONES, type Box4 } from './zones.ts';

const SIZE: Readonly<Record<'hovli' | 'villa' | 'qasr', PlotSize>> = { hovli: { w: 24, d: 34 }, villa: { w: 30, d: 42 }, qasr: { w: 40, d: 56 } };
const COUNT = { mahalla: 400, villa: 400, qasr: 100, hillHovli: 300, buildings: 17 } as const;
const VALUE_REACH = 2100;
const LAKE_REACH = 620;
const HILL_REACH = 400;

type Green = MasterPlan['greens'][number];
const dist = (x: number, z: number, cx = 0, cz = 0): number => Math.hypot(x - cx, z - cz);
const round1 = (v: number): number => Math.round(v * 10) / 10;

/** Joy qiymati 0..100: markaz, ko'l bo'yi, tepalik qimmatroq. */
const plotValue = (type: PlotType, x: number, z: number): number => {
  const centre = Math.max(0, 1 - dist(x, z) / VALUE_REACH);
  const lake = type === 'villa' ? Math.max(0, 1 - (dist(x, z, LAKE.x, LAKE.z) - LAKE.rx) / LAKE_REACH) : 0;
  const hill = type === 'qasr' ? Math.max(0, 1 - dist(x, z, HILL.x, HILL.z) / HILL_REACH) : 0;
  return Math.round(Math.min(100, centre * 60 + Math.max(lake, hill) * 70));
};

const pick = (spots: readonly Spot[], n: number, score: (s: Spot) => number, what: string): { used: Spot[]; rest: Spot[] } => {
  if (spots.length < n) throw new Error(`${what}: ${spots.length} joy bor, ${n} kerak`);
  const sorted = [...spots].sort((a, b) => score(a) - score(b) || a.x - b.x || a.z - b.z);
  return { used: sorted.slice(0, n), rest: sorted.slice(n) };
};

interface Draft { readonly spot: Spot; readonly type: PlotType; readonly districtId: number }
interface HousePlan { readonly roads: readonly NetRoad[]; readonly drafts: readonly Draft[]; readonly rest: readonly Spot[] }
const draftsOf = (spots: readonly Spot[], type: PlotType, districtId: number): Draft[] => spots.map((spot): Draft => ({ spot, type, districtId }));

const clipBox = ([a, b, c, d]: Box4, z: Box4): Box4 => [Math.max(a, z[0]), Math.max(b, z[1]), Math.min(c, z[2]), Math.min(d, z[3])];
const layoutCells = (s: DistrictSpec, size: PlotSize, around: readonly NetRoad[], cutters: readonly Box4[], within?: Box4): LayoutResult => {
  const parts = s.cells.map((cell) => {
    const inner = cellInner(cell);
    return layoutCell({ id: `${size.w}:${cell.join('')}`, rect: within ? clipBox(inner, within) : inner, size, around }, cutters);
  });
  return { spots: parts.flatMap((p) => p.spots), roads: parts.flatMap((p) => p.roads) };
};

const toCentre = (p: Spot): number => dist(p.x, p.z);
const planMahalla = (s: DistrictSpec, net: readonly NetRoad[]): HousePlan => {
  const grid = layoutCells(s, SIZE.hovli, net, HOVLI_CUTTERS);
  const { used, rest } = pick(grid.spots, COUNT.mahalla, toCentre, `tuman ${s.id}`);
  return { roads: grid.roads, drafts: draftsOf(used, 'hovli', s.id), rest };
};
const planLake = (s: DistrictSpec, net: readonly NetRoad[]): HousePlan => {
  const grid = layoutCells(s, SIZE.villa, net, CUTTERS);
  const { used, rest } = pick(grid.spots, COUNT.villa, (p) => dist(p.x, p.z, LAKE.x, LAKE.z), "ko'l");
  return { roads: grid.roads, drafts: draftsOf(used, 'villa', s.id), rest };
};
const planHill = (s: DistrictSpec, net: readonly NetRoad[]): HousePlan => {
  const high = layoutCells(s, SIZE.qasr, net, CUTTERS, ZONES.tepalik.rect);
  const low = layoutCells(s, SIZE.hovli, net, HOVLI_CUTTERS);
  const a = pick(low.spots, COUNT.hillHovli, toCentre, 'tepalik hovli');
  const b = pick(high.spots, COUNT.qasr, (p) => dist(p.x, p.z, HILL.x, HILL.z), 'tepalik qasr');
  return { roads: [...low.roads, ...high.roads], drafts: [...draftsOf(a.used, 'hovli', s.id), ...draftsOf(b.used, 'qasr', s.id)], rest: [...a.rest, ...b.rest] };
};
const PLANNERS = { mahalla: planMahalla, kol: planLake, tepalik: planHill } as const;

const APT = { w: 44, d: 16, margin: 6, stepX: 78, stepZ: 92 } as const;
const COURTYARD = { away: 24, w: 46, d: 26 } as const;
const DIAGONALS = diagonalRoads();
/** 10 ta 9-qavatli (36 xonadon) + 7 ta 5-qavatli (20 xonadon) = 500. Bino va hovlisi yo'llarga tegmaydi. */
const planApartments = (s: DistrictSpec, firstId: number, net: readonly NetRoad[]): Building[] => {
  const [x0, z0, x1, z1] = s.rects[0] ?? [0, 0, 0, 0];
  const isNorth = z0 < 0;
  const side = isNorth ? 1 : -1;
  const cells: { readonly x: number; readonly z: number }[] = [];
  for (let x = x0 + APT.w / 2 + APT.margin; x < x1 - APT.w / 2; x += 1) {
    for (let z = z0 + APT.d; z < z1 - APT.d; z += 1) cells.push({ x, z });
  }
  // Bino va uning old hovlisi bitta quti sifatida tekshiriladi.
  const boxOf = (c: { readonly x: number; readonly z: number }): readonly [number, number, number, number] => [c.x, c.z + (side * (COURTYARD.away + COURTYARD.d / 2 - APT.d / 2)) / 2, APT.w / 2 + 3, (APT.d + COURTYARD.away + COURTYARD.d / 2 - APT.d / 2) / 2 + 2];
  const isFree = (c: { readonly x: number; readonly z: number }): boolean => {
    const [x, z, hx, hz] = boxOf(c);
    if (x - hx < x0 || x + hx > x1 || z - hz < z0 || z + hz > z1) return false;
    return !net.some((r) => boxHitsTilted(x, z, hx, hz, r)) && !DIAGONALS.some((r) => boxHitsTilted(x, z, hx, hz, { ...r, d: DIAGONAL.w + 8 })) && !boxInCurves(x, z, hx, hz);
  };
  const free = cells.filter(isFree).sort((a, b) => dist(a.x, a.z) - dist(b.x, b.z) || a.x - b.x);
  const taken = free.reduce<{ readonly x: number; readonly z: number }[]>((done, c) => {
    if (done.length >= COUNT.buildings) return done;
    return done.some((t) => Math.abs(t.x - c.x) < APT.stepX && Math.abs(t.z - c.z) < APT.stepZ) ? done : [...done, c];
  }, []);
  if (taken.length < COUNT.buildings) throw new Error(`tuman ${s.id}: ${taken.length} bino sig'di`);
  return taken.map((c, i): Building => ({ id: firstId + i, districtId: s.id, x: round1(c.x), z: round1(c.z), rot: isNorth ? 0 : 2, floors: i < 10 ? 9 : 5 }));
};

const streetWeight = (key: string): number => {
  const order = ['b', 'a', 'k', 'lake', 'r', 'p', 's', 'c', 'h'];
  return Math.max(0, order.findIndex((o) => key.startsWith(o)));
};
/** Ichki ko'chalar tumanga tegishli, qolganlari tumanlararo (0). */
const resolveStreets = (owners: ReadonlyMap<string, number>): { streets: Street[]; byKey: Map<string, number> } => {
  const sorted = [...owners.keys()].sort((a, b) => streetWeight(a) - streetWeight(b) || (owners.get(a) ?? 0) - (owners.get(b) ?? 0) || (a < b ? -1 : 1));
  const isInner = (k: string): boolean => /^[sch]:/.test(k);
  const streets = sorted.map((k, i): Street => ({
    id: i + 1, districtId: isInner(k) ? owners.get(k) ?? 0 : 0, kind: k.startsWith('a:') ? 'prospekt' : 'kocha', central: k.startsWith('b:'),
  }));
  return { streets, byKey: new Map(sorted.map((k, i) => [k, i + 1])) };
};

/** Ko'cha bo'ylab: bir tomoni toq, ikkinchisi juft raqamlar. */
const assignNumbers = (drafts: readonly Draft[]): Map<Spot, number> => {
  const groups = Map.groupBy(drafts, (d) => `${d.spot.streetKey}|${d.spot.rot >= 2 ? 2 : 1}`);
  const out = new Map<Spot, number>();
  for (const [key, list] of groups) {
    const first = Number(key.at(-1));
    const along = (s: Spot): number => (s.rot % 2 === 0 ? s.x : s.z);
    // Egri ko'chada (ko'l bo'yi) ikki xil yo'nalish bo'lishi mumkin: avval bo'ylama, keyin ko'ndalang.
    [...list].sort((a, b) => (a.spot.rot % 2) - (b.spot.rot % 2) || along(a.spot) - along(b.spot) || a.spot.x - b.spot.x || a.spot.z - b.spot.z)
      .forEach((d, i) => out.set(d.spot, i * 2 + first));
  }
  return out;
};

type RestByDistrict = ReadonlyMap<number, readonly Spot[]>;
/** Bo'sh qolgan qo'shni joy — oldindan belgilangan hovli kengaytirish joyi. */
const buildExpansions = (drafts: readonly Draft[], rest: RestByDistrict, idOf: ReadonlyMap<Spot, string>): { expansions: Expansion[]; left: Spot[] } => {
  const expansions: Expansion[] = [];
  const left: Spot[] = [];
  const used = new Set<string>();
  for (const [districtId, spots] of rest) {
    const own = new Map(drafts.filter((d) => d.districtId === districtId).map((d) => [`${d.spot.row}:${d.spot.index}`, d.spot]));
    for (const s of spots) {
      const plotId = [s.index - 1, s.index + 1]
        .map((i) => own.get(`${s.row}:${i}`))
        .map((n) => (n ? idOf.get(n) : undefined))
        .find((id) => id !== undefined && !used.has(id));
      if (!plotId) { left.push(s); continue; }
      used.add(plotId);
      expansions.push({ id: `E${String(expansions.length + 1).padStart(3, '0')}`, plotId, x: round1(s.x), z: round1(s.z), w: s.w, d: s.d, rot: s.rot });
    }
  }
  return { expansions, left };
};

/** Ko'p qavatli uylar: har 120 m lik qator — bitta ko'cha. */
const apartmentKey = (b: Building): string => `h:${b.districtId}:${Math.round(b.z / 120) + 50}`;

const buildPlots = (drafts: readonly Draft[], buildings: readonly Building[], byKey: ReadonlyMap<string, number>): { plots: Plot[]; idOf: Map<Spot, string> } => {
  const numbers = assignNumbers(drafts);
  const plots: Plot[] = [];
  const idOf = new Map<Spot, string>();
  const houseCount = new Map<string, number>();
  const nextId = (): string => `P${String(plots.length + 1).padStart(4, '0')}`;
  const street = (key: string): number => {
    const id = byKey.get(key);
    if (id === undefined) throw new Error(`Ko'cha topilmadi: ${key}`);
    return id;
  };
  for (const s of SPECS) {
    for (const d of drafts.filter((x) => x.districtId === s.id)) {
      const { spot } = d;
      const id = nextId();
      idOf.set(spot, id);
      plots.push({
        id, districtId: s.id, streetId: street(spot.streetKey), number: numbers.get(spot) ?? 0, unit: 0, type: d.type,
        x: round1(spot.x), z: round1(spot.z), w: spot.w, d: spot.d, rot: spot.rot, building: 0, value: plotValue(d.type, spot.x, spot.z),
      });
    }
    for (const b of buildings.filter((x) => x.districtId === s.id)) {
      const key = apartmentKey(b);
      const number = (houseCount.get(key) ?? 0) + 1;
      houseCount.set(key, number);
      for (let unit = 1; unit <= b.floors * 4; unit++) {
        plots.push({
          id: nextId(), districtId: s.id, streetId: street(key), number, unit, type: 'kvartira',
          x: b.x, z: b.z, w: APT.w, d: APT.d, rot: b.rot, building: b.id, value: plotValue('kvartira', b.x, b.z),
        });
      }
    }
  }
  return { plots, idOf };
};

const greenOf = (s: Spot): Green => {
  const [w, d] = rotatedSize(s.w, s.d, s.rot);
  return [round1(s.x), round1(s.z), w, d];
};
/** Ko'p qavatli uy hovlisi — fasad oldidagi bog'cha. */
const courtyardOf = (b: Building): Green => [b.x, round1(b.z + (b.rot === 0 ? COURTYARD.away : -COURTYARD.away)), COURTYARD.w, COURTYARD.d];
const tidyRoad = ({ x, z, w, d, kind, angle }: NetRoad): Road => ({
  x: round1(x), z: round1(z), w: round1(w), d: round1(d), kind, ...(angle === undefined ? {} : { angle: Math.round(angle * 1e5) / 1e5 }),
});
/** Tuman nomi xaritada shu nuqtada yoziladi. */
const labelOf = (plots: readonly Plot[], s: DistrictSpec): readonly [number, number] => {
  const own = plots.filter((p) => p.districtId === s.id);
  const mean = (f: (p: Plot) => number): number => Math.round(own.reduce((sum, p) => sum + f(p), 0) / Math.max(1, own.length));
  return [mean((p) => p.x), mean((p) => p.z)];
};

export const generateMasterPlan = (): MasterPlan => {
  const net = networkRoads();
  const drafts: Draft[] = [];
  const rest = new Map<number, readonly Spot[]>();
  const inner: NetRoad[] = [];
  for (const s of SPECS) {
    if (s.zone === 'kopqavatli') continue;
    const r = PLANNERS[s.zone](s, net);
    inner.push(...r.roads);
    drafts.push(...r.drafts);
    rest.set(s.id, r.rest);
  }
  const buildings = SPECS.filter((s) => s.zone === 'kopqavatli').reduce<Building[]>((done, s) => [...done, ...planApartments(s, done.length + 1, net)], []);
  const owners = new Map<string, number>();
  for (const d of drafts) if (!owners.has(d.spot.streetKey)) owners.set(d.spot.streetKey, d.districtId);
  for (const b of buildings) owners.set(apartmentKey(b), b.districtId);
  const { streets, byKey } = resolveStreets(owners);
  const { plots, idOf } = buildPlots(drafts, buildings, byKey);
  const { expansions, left } = buildExpansions(drafts, rest, idOf);
  const roads = [...net, ...inner];

  return {
    version: 3,
    districts: SPECS.map((s): District => ({ id: s.id, zone: s.zone, nameUz: s.nameUz, nameRu: s.nameRu, rects: s.rects, label: labelOf(plots, s) })),
    streets, plots, buildings, expansions,
    commerce: planCommerce(roads),
    roads: roads.map(tidyRoad),
    greens: [...left.map(greenOf), ...buildings.map(courtyardOf)],
  };
};
