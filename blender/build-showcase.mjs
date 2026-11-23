/** Ko'rib chiqish uchun blender/shahar.blend: uylar, bezaklar, jonli mahallalar va butun xarita. Joylashuv — saytdagi mantiqning o'zi. */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { DECOR, LAKE, TIERS, decodePlan, hash01, terrainHeight } from '../packages/shared/src/index.ts';
import { buildingItem, commerceItem, houseItem, plotItems, staticItems, toWorld } from '../apps/web/src/logic/placement.ts';
import { Ground } from '../apps/web/src/world/ground.ts';
import { findBlender } from './find-blender.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const plan = decodePlan(JSON.parse(readFileSync(path.join(root, 'packages/shared/data/masterplan.json'), 'utf8')));
const ALL_OPEN = { openDistricts: new Set(plan.districts.map((d) => d.id)) };
const TEX = 256;
const TEX_LAYERS = 16;

/** Har daraja uchun namunaviy bezak to'plami. */
const SETS = {
  1: [],
  2: ['fence_wood', 'gate_wood', 'path_stone', 'tree_anor', 'yard_sori'],
  3: ['fence_brick', 'gate_carved', 'path_stone', 'tree_chinor', 'yard_tok', 'car_van', 'pet_dog'],
  4: ['fence_brick', 'gate_carved', 'path_stone', 'tree_archa', 'water_pool', 'car_sedan', 'light_lamps', 'yard_flowers'],
  5: ['fence_ornate', 'gate_gold', 'path_stone', 'tree_chinor', 'tree_archa', 'water_fountain', 'car_sport', 'light_luxe', 'special_peacock', 'special_statue'],
};
const state = (plot, tier, wall, roof, decor = SETS[tier]) => ({ plot, nick: null, tier, wall, roof, decor, label: 'plain', badge: null, status: 'owned', expanded: false });
const hovliTier = (h) => (h < 0.5 ? 1 : h < 0.8 ? 2 : h < 0.95 ? 3 : 4);
const demoState = (p) => {
  const h = (k) => hash01(`show${k}${p.id}`);
  const tier = { qasr: 5, villa: 4 }[p.type] ?? hovliTier(h('t'));
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

const SAMPLE = { 1: [16, 24, 'hovli'], 2: [16, 24, 'hovli'], 3: [16, 24, 'hovli'], 4: [20, 28, 'villa'], 5: [30, 42, 'qasr'] };
const BIG = [['apt5', '6. 5 qavatli'], ['apt9', '7. 9 qavatli'], ['office', '8. Ofis minora'], ['office_low', '9. Ofis past'], ['shop', "10. Do'kon"], ['maktab', '11. Maktab'], ['choyxona', '12. Choyxona']];
const plain = (model, x, z) => ({ model, x, y: 0, z, yaw: 0, sx: 1, sy: 1, sz: 1, wall: '#e8d9c0', roof: '#8a4b38' });

const housesScene = () => {
  const items = [];
  const labels = [];
  let x = 0;
  for (const t of TIERS) {
    const [w, d, type] = SAMPLE[t.id];
    x += w / 2 + 5;
    const p = { id: `S${t.id}`, x, z: -d / 2, w, d, rot: 0, type };
    items.push(...plotItems(p, state(p.id, t.id, t.id - 1, t.id - 1), true));
    labels.push([`${t.id}. ${t.uz}`, x, 0.1, 4, 0, 2]);
    ['old', 'orqa'].forEach((side, i) => {
      const z = -78 - i * 40;
      const bare = houseItem({ ...p, z }, state(p.id, t.id, (t.id + 3 + i) % 8, (t.id + 2 + i) % 6, []), false);
      items.push({ ...bare, yaw: i * Math.PI, z });
      labels.push([`${t.id}-uy (${side})`, x, 0.1, z + 9, 0, 1.6]);
    });
    x += w / 2;
  }
  BIG.forEach(([model, label], i) => {
    const bx = -80 + i * 48;
    items.push(plain(model, bx, -190));
    labels.push([label, bx, 0.1, -171, 0, 4]);
  });
  return { name: '1 Uylar', items: items.map(pack), labels, floor: [70, -60, 300], camera: [[66, 66, 104], [68, 0, -38]] };
};

const EXTRA = [
  ['street_lamp', "Ko'cha chirog'i"], ['bench', "O'rindiq"], ['tree_terak', 'Terak'], ['bozor_stall', "Bozor do'koni"], ['billboard', 'Bilbord'], ['plaza_fountain', 'Katta favvora'],
  ['hero_statue', 'Qahramon haykali'], ['forsale', 'Sotiladi belgisi'], ['foundation', 'Poydevor'], ['barrier', "To'siq"], ['crane', 'Kran'], ['fence_basic', 'Oddiy panjara'], ['gate_basic', 'Oddiy darvoza'], ['stadium', 'Stadion'],
];
const WIDE = new Set(['fence_basic', 'fence_wood', 'fence_brick', 'fence_ornate', 'light_luxe', 'light_lamps', 'plaza_fountain', 'foundation', 'crane', 'billboard', 'hero_statue']);
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
  put(all.filter((d) => WIDE.has(d.model)), 6, 30, 42, -30, 1.8, 15);
  put(all.filter((d) => d.model === 'stadium'), 1, 0, 0, -220, 5, 80);
  return { name: '2 Bezaklar', items: items.map(pack), labels, floor: [40, -80, 330], camera: [[42, 48, 96], [42, 0, 10]] };
};

const mapScene = () => ({
  name: '6 Butun xarita', ground: groundOf(0, 0, 999), isLake: true, clip: [0, 0, 1100], lift: 0.4, camera: [[0, 1750, 1500], [0, 0, 130]],
  items: [
    ...plan.plots.filter((p) => p.type !== 'kvartira').map((p) => houseItem(p, demoState(p), true)),
    ...plan.buildings.map((b) => buildingItem(b, true)), ...plan.commerce.filter((c) => c.type !== 'bilbord').map(commerceItem),
    ...statics.filter((i) => ['tree_chinor', 'tree_terak'].includes(i.model)).map((i) => ({ ...i, model: `${i.model}_lod` })),
  ].map(pack),
  labels: [
    ...plan.districts.map(({ id, nameUz, rect: [a, b, c, d] }) => [`${id}. ${nameUz}`, (a + c) / 2, 60, (b + d) / 2, 0, 46]),
    ['MAYDON', 0, 50, 0, 0, 40],
  ],
});

const dir = mkdtempSync(path.join(tmpdir(), 'shahar-show-'));
const strip = await sharp(path.join(root, 'apps/web/public/assets/tex.webp')).png().toBuffer();
for (let i = 0; i < TEX_LAYERS; i++) await sharp(strip).extract({ left: 0, top: i * TEX, width: TEX, height: TEX }).toFile(path.join(dir, `t${i}.png`));
const scenes = [
  housesScene(), decorScene(),
  region('3 Markaz', 0, 0, 230, [[-150, 120, 250], [-10, 0, 10]]),
  region("4 Ko'l bo'yi", 330, 630, 150, [[200, 70, 480], [370, 0, 680]], true),
  region('5 Tepalik', 770, -770, 160, [[640, 130, -540], [770, 18, -770]]),
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
if (process.argv.includes('--open')) spawn(findBlender(), [out], { detached: true, stdio: 'ignore' }).unref();
