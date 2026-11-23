/** Ko'rib chiqish uchun blender/shahar.blend: uylar, bezaklar, jonli mahallalar va butun xarita. Joylashuv — saytdagi mantiqning o'zi. */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { CITY_HALF, DECOR, HILL, LAKE, MIN_TIER, TIERS, decodePlan, hash01, terrainHeight } from '../packages/shared/src/index.ts';
import { buildingItem, commerceItem, houseItem, plotItems, staticItems, toWorld } from '../apps/web/src/logic/placement.ts';
import { Ground } from '../apps/web/src/world/ground.ts';
import { findBlender } from './find-blender.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const plan = decodePlan(JSON.parse(readFileSync(path.join(root, 'packages/shared/data/masterplan.json'), 'utf8')));
const ALL_OPEN = { openDistricts: new Set(plan.districts.map((d) => d.id)) };
const TEX = 256;
const TEX_LAYERS = 16;

const state = (plot, tier, wall, roof, decor = []) => ({ plot, nick: null, tier, wall, roof, decor, label: 'plain', badge: null, status: 'owned', expanded: false });
const demoState = (p) => {
  const h = (k) => hash01(`show${k}${p.id}`);
  const tier = { qasr: h('t') < 0.6 ? 9 : 10, villa: h('t') < 0.6 ? 7 : 8 }[p.type] ?? 1 + Math.floor(h('t') ** 1.5 * 7);
  return state(p.id, tier, Math.floor(h('w') * 8), Math.floor(h('r') * 6));
};
const pack = (i) => [i.model, ...[i.x, i.y, i.z, i.yaw, i.sx, i.sy, i.sz].map((v) => Number(v.toFixed(3))), i.wall, i.roof];

const groundOf = (x, z, radius) => {
  const g = new Ground(plan, ALL_OPEN);
  g.update(x, z, radius, false, Infinity);
  const out = [];
  g.group.traverse((o) => {
    if (!o.isMesh) return;
    const a = (n) => Array.from(o.geometry.getAttribute(n).array, (v) => Number(v.toFixed(3)));
    out.push({ order: o.renderOrder + 6, pos: a('position'), uv: a('uv'), uv1: a('uv1'), col: a('color') });
  });
  return out;
};

const statics = staticItems(plan);
const region = (name, x, z, radius, camera, isLake = false) => {
  const isNear = (o) => Math.abs(o.x - x) < radius && Math.abs(o.z - z) < radius;
  const plots = plan.plots.filter((p) => p.type !== 'kvartira' && isNear(p));
  return {
    name, camera, isLake, ground: groundOf(x, z, radius), clip: [x, z, radius + 30],
    items: [
      ...plots.flatMap((p) => plotItems(p, demoState(p), true)), ...statics.filter(isNear),
      ...plan.commerce.filter(isNear).map(commerceItem), ...plan.buildings.filter(isNear).map((b) => buildingItem(b, false)),
    ].map(pack),
    labels: plots.map((p) => {
      const [lx, lz] = toWorld(p, 0, p.d / 2 + 0.6);
      return [p.id, lx, terrainHeight(lx, lz) + 0.15, lz, (p.rot * Math.PI) / 2, 1.1];
    }),
  };
};

/** Uchastka o'lchami level bo'yicha: oddiy hovli, villa, qasr. */
const sampleOf = (tier) => (tier >= MIN_TIER.qasr ? [42, 60, 'qasr'] : tier >= MIN_TIER.villa ? [32, 44, 'villa'] : [25, 34, 'hovli']);
const BIG = [['apt5', 'K1. 5 qavatli'], ['apt9', 'K2. 9 qavatli'], ['office', 'K3. Ofis minora'], ['office_low', 'K4. Ofis past'], ['shop', "K5. Do'kon"], ['maktab', 'K6. Maktab'], ['choyxona', 'K7. Choyxona']];
const plain = (model, x, z) => ({ model, x, y: 0, z, yaw: 0, sx: 1, sy: 1, sz: 1, wall: '#e8d9c0', roof: '#8a4b38' });

const PER_ROW = 6;
const levelsScene = () => {
  const items = [];
  const labels = [];
  let x = 0;
  TIERS.forEach((t, i) => {
    const isBack = i >= PER_ROW;
    if (i === PER_ROW) x = -8;
    const [w, d, type] = sampleOf(t.id);
    const z = isBack ? -66 : 0;
    x += w / 2 + 3;
    const p = { id: `S${t.id}`, x, z: z - d / 2, w, d, rot: 0, type };
    items.push(...plotItems(p, state(p.id, t.id, [3, 0, 1, 6, 0, 3, 4, 3, 0, 3][i], [0, 4, 1, 3, 0, 2, 2, 3, 0, 0][i]), true));
    labels.push([`LEVEL ${t.id}`, x, 0.1, z + 4.2, 0, 2.6], [t.uz, x, 0.1, z + 7, 0, 1.5]);
    x += w / 2;
  });
  return { name: '1 Levellar', items: items.map(pack), labels, floor: [84, -56, 400], camera: [[88, 98, 116], [88, 0, -34]] };
};
const buildingsScene = () => {
  const items = BIG.map(([model], i) => plain(model, i * 48, 0));
  const labels = BIG.map(([, label], i) => [label, i * 48, 0.1, 18, 0, 4]);
  return { name: '3 Binolar', items: items.map(pack), labels, floor: [144, 0, 300], camera: [[144, 90, 230], [144, 10, 0]] };
};

const EXTRA = [
  ['street_lamp', "Ko'cha chirog'i"], ['bench', "O'rindiq"], ['tree_terak', 'Terak'], ['bozor_stall', "Bozor do'koni"], ['billboard', 'Bilbord'], ['plaza_fountain', 'Katta favvora'],
  ['hero_statue', 'Qahramon haykali'], ['forsale', 'Sotiladi belgisi'], ['foundation', 'Poydevor'], ['barrier', "To'siq"], ['crane', 'Kran'], ['fence_low', 'Past panjara (1-level)'], ['fence_basic', 'Suvoq devor (2–3-level)'], ['gate_basic', 'Temir darvoza (1-level)'], ['gate_wood_carved', "Yog'och naqshli darvoza (4-level)"], ['gate_naqsh', 'Naqshli darvoza (7–8-level)'], ['stadium', 'Stadion'],
];
const WIDE = new Set(['fence_low', 'fence_basic', 'fence_wood', 'fence_brick', 'fence_ornate', 'light_luxe', 'light_lamps', 'plaza_fountain', 'foundation', 'crane', 'billboard', 'hero_statue']);
const decorScene = () => {
  const items = [];
  const labels = [];
  const all = [...DECOR.map((d) => [d.id, d.uz]), ...EXTRA].map(([model, label], i) => ({ model, label: `B${i + 1}. ${label}` }));
  const put = (list, columns, dx, dz, z0, size, gap) => list.forEach(({ model, label }, i) => {
    const x = (i % columns) * dx;
    const z = z0 - Math.floor(i / columns) * dz;
    items.push(plain(model, x, z));
    labels.push([label, x, 0.1, z + gap, 0, size]);
  });
  put(all.filter((d) => !WIDE.has(d.model) && d.model !== 'stadium'), 8, 11, 13, 40, 0.8, 4);
  put(all.filter((d) => WIDE.has(d.model)), 6, 36, 48, -30, 1.8, 20);
  put(all.filter((d) => d.model === 'stadium'), 1, 0, 0, -260, 5, 80);
  return { name: '2 Bezaklar', items: items.map(pack), labels, floor: [40, -80, 330], camera: [[42, 48, 96], [42, 0, 10]] };
};

const LEVEL_RANGE = { mahalla: 'Level 1 dan', kol: 'Level 7 dan', tepalik: 'Level 1 dan / qasr 9 dan', kopqavatli: 'kvartiralar' };
const mapScene = () => ({
  name: '7 Butun xarita', ground: groundOf(0, 0, CITY_HALF - 1), isLake: true, clip: [0, 0, CITY_HALF + 100], lift: 0.6, camera: [[0, 4050, 2250], [0, 0, 225]],
  items: [
    ...plan.plots.filter((p) => p.type !== 'kvartira').map((p) => houseItem(p, demoState(p), true)),
    ...plan.buildings.map((b) => buildingItem(b, true)), ...plan.commerce.filter((c) => c.type !== 'bilbord').map(commerceItem),
    ...statics.filter((i) => ['tree_chinor', 'tree_terak'].includes(i.model)).map((i) => ({ ...i, model: `${i.model}_lod` })),
  ].map(pack),
  labels: [
    ...plan.districts.flatMap(({ id, zone, nameUz, rect: [a, b, c, d] }) => [[`${id}. ${nameUz}`, (a + c) / 2, 60, (b + d) / 2, 0, 69], [LEVEL_RANGE[zone], (a + c) / 2, 60, (b + d) / 2 + 90, 0, 51]]),
    ['MAYDON', 0, 70, 0, 0, 52], ['Park va stadion joyi', -1125, 60, -1125, 0, 60], ['Biznes', -375, 60, 1125, 0, 69],
  ],
});

const dir = mkdtempSync(path.join(tmpdir(), 'shahar-show-'));
const strip = await sharp(path.join(root, 'apps/web/public/assets/tex.webp')).png().toBuffer();
for (let i = 0; i < TEX_LAYERS; i++) await sharp(strip).extract({ left: 0, top: i * TEX, width: TEX, height: TEX }).toFile(path.join(dir, `t${i}.png`));
const scenes = [
  levelsScene(), decorScene(), buildingsScene(),
  region('4 Markaz', 0, 0, 230, [[-150, 120, 250], [-10, 0, 10]]),
  region("5 Ko'l bo'yi", LAKE.x - LAKE.rx * 0.6, LAKE.z - LAKE.rz - 40, 190, [[310, 90, 720], [530, 0, 980]], true),
  region('6 Tepalik', HILL.x, HILL.z, 220, [[970, 180, -830], [HILL.x, 20, HILL.z]]),
  mapScene(),
];
writeFileSync(path.join(dir, 'show.json'), JSON.stringify({ lake: LAKE, scenes }));

const out = path.join(root, 'blender/shahar.blend');
// Qo'lda qilingan o'zgarishlar yo'qolmasin: eskisi yonida qoladi.
if (existsSync(out)) renameSync(out, path.join(root, 'blender/shahar.oldingi.blend'));
const shouldRender = process.argv.includes('--render');
const log = execFileSync(findBlender(), ['-b', '--factory-startup', '-P', path.join(root, 'blender/scripts/build_showcase.py'), '--', dir, out, ...(shouldRender ? ['--render'] : [])], { encoding: 'utf8', maxBuffer: 1e8 });
process.stdout.write(`${log.split('\n').filter((l) => /^SHOW|Error|Traceback|File "/.test(l)).join('\n')}\n`);
if (shouldRender) process.stdout.write(`Rasmlar: ${dir}\n`);
else rmSync(dir, { recursive: true });
const open = process.argv.find((a) => a.startsWith('--open'));
// --open yoki --open="7 Butun xarita"
if (open) spawn(findBlender(), [out, ...(open.includes('=') ? ['-S', open.split('=')[1]] : [])], { detached: true, stdio: 'ignore' }).unref();
