/** Yo'l chetidagi daraxt va chiroqlar, bog'chalar, ko'p qavatli uy hovlilari, yopiq tuman belgilari — bir marta hisoblanadi. */
import { CITY_HALF, PARK_R, RESERVED, SpatialIndex, ZONES, boxContains, footprint, fromLocal, hash01, inBox, inLake, inPlaza, inRiverbed, type Box4, type MasterPlan, type Road } from '../../../../packages/shared/src/index.ts';
import { item, type Item } from './item.ts';
import { landscapeItems } from './landscape.ts';
import { isOnRoad } from './roadGrid.ts';

/** Keng yo'llar: yashil yo'lak (daraxt, chiroq) chetdan shuncha ichkarida. */
export const VERGE = 3.2;
const STEP = 17;
const CLEAR = 4;
export const isWide = (r: Road): boolean => r.kind !== 'kocha';

/** Yo'l bo'yi bo'ylab teng nuqtalar: u — o'q bo'ylab, v — ko'ndalang. */
const along = (r: Road): { readonly len: number; readonly half: number; readonly at: (u: number, v: number) => readonly [number, number] } => {
  const isU = r.angle !== undefined || r.w > r.d;
  return { len: isU ? r.w : r.d, half: (isU ? r.d : r.w) / 2, at: (u, v) => (isU ? fromLocal(r, u, v) : [r.x + v, r.z + u]) };
};

const roadItems = (plan: MasterPlan): Item[] => {
  const boards = new SpatialIndex(plan.commerce.filter((c) => c.type === 'bilbord'));
  const isCrossing = (own: Road, x: number, z: number): boolean => isOnRoad(plan, x, z, CLEAR, (r) => r === own || (r.kind === 'halqa' && own.kind === 'halqa'));
  return plan.roads.filter(isWide).flatMap((r) => {
    const { len, half, at } = along(r);
    const step = r.kind === 'halqa' ? len / 2 : STEP;
    const n = Math.max(1, Math.floor(len / step));
    return Array.from({ length: n }, (_, i) => i).flatMap((i) => [-1, 1].flatMap((side) => {
      const [x, z] = at((i + 0.5) * (len / n) - len / 2, side * (half - VERGE));
      const inBulvar = inBox(ZONES.bulvar.rect, x, z) || inBox(ZONES.bulvarKichik.rect, x, z);
      if (inBulvar || inLake(x, z, 12) || isCrossing(r, x, z) || boards.query(x, z, 8).length > 0) return [];
      if ((i + (side > 0 ? 1 : 0)) % 3 === 0) return [item('street_lamp', x, z)];
      const k = 0.75 + hash01(`h${x}${z}`) * 0.3;
      return [item(hash01(`t${x}${z}`) < 0.5 ? 'tree_round' : 'tree_tall', x, z, { yaw: hash01(`y${x}${z}`) * 6, sx: k, sz: k, sy: k })];
    }));
  });
};

/** Bog'chalarda bitta daraxtga to'g'ri keladigan maydon, m². */
const GREEN_PER_TREE = 190;
const GREEN_TREES = ['tree_chinor', 'tree_round', 'tree_wide', 'tree_tall'] as const;
const greenItems = (plan: MasterPlan): Item[] => plan.greens.flatMap(([x, z, w, d]) => {
  const n = Math.max(1, Math.floor((w * d) / GREEN_PER_TREE));
  const trees = Array.from({ length: n }, (_, i) => item(
    GREEN_TREES[Math.floor(hash01(`gm${x}${z}${i}`) * 4)] ?? 'tree_round', x + (hash01(`gx${x}${z}${i}`) - 0.5) * (w - 6), z + (hash01(`gz${x}${z}${i}`) - 0.5) * (d - 6), { yaw: i },
  ));
  return hash01(`bench${x}${z}`) < 0.4 ? [...trees, item('bench', x, z)] : trees;
});
const buildingItems = (plan: MasterPlan): Item[] => plan.buildings.flatMap((b) => {
  const front = b.rot === 0 ? 1 : -1;
  return [
    ...Array.from({ length: 4 }, (_, i) => item('bench', b.x - 14 + i * 9, b.z + front * 12, { yaw: b.rot === 0 ? Math.PI : 0 })),
    ...(b.id % 3 === 0 ? [item('bolalar', b.x, b.z + front * 25)] : []), item('car_sedan', b.x - 10, b.z - front * 12, { yaw: Math.PI / 2 }), item('car_van', b.x + 8, b.z - front * 12, { yaw: -Math.PI / 2 }),
  ];
});
/** Kvartira zonalarining bo'sh yeri — siyrak daraxtzor; daryo yo'lagi — o'tloq (daraxtsiz). */
const openLand = (plan: MasterPlan): Item[] => ([ZONES.kvartira1.rect, ZONES.kvartira2.rect] as readonly Box4[]).flatMap(([x0, z0, x1, z1]) => {
  const out: Item[] = [];
  for (let x = x0 + 12; x < x1 - 8; x += 26) {
    for (let z = z0 + 12; z < z1 - 8; z += 26) {
      const [px, pz] = [x + (hash01(`ox${x}${z}`) - 0.5) * 14, z + (hash01(`oz${x}${z}`) - 0.5) * 14];
      const isBusy = isOnRoad(plan, px, pz, 4) || plan.buildings.some((b) => Math.abs(b.x - px) < 27 && Math.abs(b.z - pz) < 42);
      if (!isBusy) out.push(item(GREEN_TREES[Math.floor(hash01(`om${x}${z}`) * 4)] ?? 'tree_round', px, pz, { yaw: x }));
    }
  }
  return out;
});

const FREE_STEP = 24;
const FREE_LIMIT = CITY_HALF - 10;
/** Yo'l va uchastkalar orasida qolgan bo'sh yer — siyrak daraxtlar. */
const freeLand = (plan: MasterPlan): Item[] => {
  const plots = new SpatialIndex([...plan.plots.filter((p) => p.unit === 0), ...plan.expansions].map((p) => footprint(p)));
  const zones: readonly Box4[] = [...RESERVED, ZONES.kvartira1.rect, ZONES.kvartira2.rect];
  const out: Item[] = [];
  for (let x = -FREE_LIMIT; x < FREE_LIMIT; x += FREE_STEP) {
    for (let z = -FREE_LIMIT; z < FREE_LIMIT; z += FREE_STEP) {
      const [px, pz] = [x + hash01(`fx${x}${z}`) * 16, z + hash01(`fz${x}${z}`) * 16];
      if (zones.some((b) => inBox(b, px, pz, 2)) || Math.hypot(px, pz) < PARK_R + 8 || inRiverbed(px, pz, 4) || inLake(px, pz, 30)) continue;
      if (isOnRoad(plan, px, pz, 4) || plots.query(px, pz, 46).some((f) => boxContains(f, px, pz, 2.5))) continue;
      out.push(item(GREEN_TREES[Math.floor(hash01(`fm${x}${z}`) * 4)] ?? 'tree_round', px, pz, { yaw: x }));
    }
  }
  return out;
};

export const staticItems = (plan: MasterPlan): Item[] => [...roadItems(plan), ...greenItems(plan), ...buildingItems(plan), ...openLand(plan), ...freeLand(plan), ...landscapeItems()];

const CRANES = 4;
/** Yopiq tuman: kranlar (PLAN §3); to'siq va poydevorlar uchastkalarning o'zida. */
export const closedDistrictItems = (plan: MasterPlan, id: number): Item[] => {
  const own = plan.plots.filter((p) => p.districtId === id);
  return Array.from({ length: CRANES }, (_, i) => own[Math.floor(hash01(`cx${id}${i}`) * own.length)]).flatMap((p, i) => (p && !inPlaza(p.x, p.z, 5) ? [item('crane', p.x, p.type === 'kvartira' ? p.z + 20 : p.z, { yaw: hash01(`cy${id}${i}`) * 6 })] : []));
};
