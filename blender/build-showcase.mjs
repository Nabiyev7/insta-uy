/** Ko'rib chiqish uchun blender/shahar.blend: uylar, bezaklar, jonli mahallalar va butun xarita. Joylashuv — saytdagi mantiqning o'zi. */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { CITY_HALF, DECOR, FRAME_COLORS, HILL, LAKE, MIN_TIER, REF_YARD, ROOF_COLORS, TIERS, WALL_COLORS, ZONES, decodePlan, hash01, terrainHeight } from '../packages/shared/src/index.ts';
import { buildingItem, commerceItem, houseItem, plotItems } from '../apps/web/src/logic/placement.ts';
import { staticItems } from '../apps/web/src/logic/streets.ts';
import { toWorld } from '../apps/web/src/logic/item.ts';
import { Ground } from '../apps/web/src/world/ground.ts';
import { findBlender } from './find-blender.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const plan = decodePlan(JSON.parse(readFileSync(path.join(root, 'packages/shared/data/masterplan.json'), 'utf8')));
const ALL_OPEN = { openDistricts: new Set(plan.districts.map((d) => d.id)) };
const TEX = 128;
const TEX_LAYERS = 16;

const state = (plot, tier, wall, roof, decor = []) => ({ plot, nick: null, tier, wall, roof, decor, material: 0, frame: 0, door: 0, label: 'plain', badge: null, status: 'owned', expanded: false });
const demoState = (p) => {
  const h = (k) => hash01(`show${k}${p.id}`);
  const tier = { qasr: h('t') < 0.6 ? 9 : 10, villa: h('t') < 0.6 ? 7 : 8 }[p.type] ?? 1 + Math.floor(h('t') * 3);
  return state(p.id, tier, Math.floor(h('w') * 8), Math.floor(h('r') * 6));
};
const pack = (i) => [i.model, ...[i.x, i.y, i.z, i.yaw, i.sx, i.sy, i.sz].map((v) => Number(v.toFixed(3))), i.wall, i.roof, FRAME_COLORS[Math.floor((i.mat ?? 0) / 16)] ?? '#ffffff'];

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
const sampleOf = (tier) => (tier >= MIN_TIER.qasr ? [40, 56, 'qasr'] : tier >= MIN_TIER.villa ? [30, 42, 'villa'] : [24, REF_YARD.d, 'hovli']);
const BIG = [['apt5', 'K1. 5 qavatli'], ['apt9', 'K2. 9 qavatli'], ['office', 'K3. Ofis minora'], ['office_low', 'K4. Ofis past'], ['shop', "K5. Do'kon"], ['maktab', 'K6. Maktab'], ['kafe', 'K7. Kafe'],
  ['prezident', 'K8. Prezident saroyi'], ['hokimiyat', 'K9. Shahar hokimiyati'], ['sud', 'K10. Shahar sudi'], ['bank', 'K11. Shahar banki'], ['agentlik', 'K12. Agentlik'], ['novostroyka', 'K13. Yangi turar-joy'],
  ['kasalxona', 'K14. Kasalxona'], ['masjid', 'K15. Masjid'], ['otochirish', "K16. O't o'chirish"], ['teatr', 'K17. Teatr va muzey'], ['univermag', 'K18. Univermag'], ['bozor', 'K19. Bozor'], ['sport', 'K20. Sport maydoni'], ['bolalar', 'K21. Bolalar maydonchasi']];
const plain = (model, x, z) => ({ model, x, y: 0, z, yaw: 0, sx: 1, sy: 1, sz: 1, wall: WALL_COLORS[0], roof: ROOF_COLORS[0] });

const PER_ROW = 5;
const LOOK = [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [4, 2], [3, 3], [0, 1], [0, 0], [0, 2]];
const levelsScene = () => {
  const items = [];
  const labels = [];
  let x = 0;
  TIERS.forEach((t, i) => {
    const isBack = i >= PER_ROW;
    if (i === PER_ROW) x = -24;
    const [w, d, type] = sampleOf(t.id);
    const z = isBack ? -64 : 0;
    x += w / 2 + 3;
    const p = { id: `S${t.id}`, x, z: z - d / 2, w, d, rot: 0, type };
    items.push(...plotItems(p, state(p.id, t.id, ...LOOK[i]), true));
    labels.push([`LEVEL ${t.id}`, x, 0.1, z + 4.2, 0, 2.6], [t.uz, x, 0.1, z + 7, 0, 1.5]);
    x += w / 2;
  });
  return { name: '1 Levellar', items: items.map(pack), labels, floor: [84, -56, 400], camera: [[70, 92, 96], [70, 0, -38]] };
};
/** 1–5 level yaqindan (old tomoni) va to'rt tomondan. */
const NEAR_LEVELS = TIERS.slice(0, 5);
const nearPlot = (t, x, z, rot) => ({ id: `F${t.id}${rot}`, x, z, w: 24, d: REF_YARD.d, rot, type: 'hovli' });
const firstScene = () => {
  const list = NEAR_LEVELS.map((t, i) => ({ t, p: nearPlot(t, i * 28, 0, 0) }));
  return {
    name: '8 Levellar 1-5', items: list.flatMap(({ t, p }) => plotItems(p, state(p.id, t.id, 0, 0), true)).map(pack),
    labels: list.flatMap(({ t, p }) => [[`${t.id}. ${t.uz}`, p.x, 0.1, 20.5, 0, 2.2]]), floor: [56, 0, 600], camera: [[58, 66, 122], [56, 0, 2]],
  };
};
const SIDES = [[0, 'old'], [2, 'orqa'], [1, 'chap'], [3, "o'ng"]];
const sidesScene = () => {
  const list = NEAR_LEVELS.flatMap((t, i) => SIDES.map(([rot, side], k) => ({ t, side, p: nearPlot(t, i * 27, k * -28, rot) })));
  return {
    name: '9b Levellar 4 tomon', items: list.map(({ t, p }) => ({ ...houseItem(p, state(p.id, t.id, 0, 0), false), x: p.x, z: p.z })).map(pack),
    labels: list.map(({ t, side, p }) => [`${t.id}-level, ${side}`, p.x, 0.1, p.z + 13, 0, 1.7]), floor: [54, -40, 600], camera: [[54, 108, 76], [54, 0, -36]],
  };
};
/** 5-level: hamma nuqtasi to'la hovli. */
const FULL_YARD = ['garaj_oldi:avto_sedan', 'old_hovli_chap:dam_basseyn', 'old_hovli_ong:dam_stol', 'darvoza_yoni:gul_kamar', 'burchak_1:daraxt_olma', 'burchak_2:daraxt_palma', 'burchak_3:daraxt_archa', 'burchak_4:daraxt_gilos'];
const newDecorScene = () => {
  const fresh = DECOR.slice(DECOR.findIndex((d) => d.id === 'dam_besedka'));
  const items = fresh.map((d, i) => plain(d.model, (i % 5) * 9, 4 - Math.floor(i / 5) * 12));
  const p = nearPlot(TIERS[4], 62, -8, 0);
  return {
    name: '9c Yangi bezaklar', items: [...items, ...plotItems(p, state(p.id, 5, 0, 0, FULL_YARD), true)].map(pack),
    labels: fresh.map((d, i) => [d.uz, (i % 5) * 9, 0.1, 4 - Math.floor(i / 5) * 12 + 4.9, 0, 1.1]), floor: [40, 0, 400], camera: [[36, 54, 66], [36, 0, -6]],
  };
};
/** Yangi jamoat binolari yaqindan. */
const newBuildingsScene = () => {
  const list = [['kasalxona', 'Kasalxona', -62], ['masjid', 'Masjid', 8], ['otochirish', "O't o'chirish", 66]];
  const cars = [['car_ambulance', -80, 24], ['car_ambulance', -44, 24], ['car_fire', 58, 20], ['car_fire', 66, 20]];
  const trees = [-104, -96, -28, -18, 38, 92].flatMap((x, i) => [['tree_round', x, -8], ['tree_chinor', x + 3, 12], [i % 2 ? 'tree_tall' : 'tree_wide', x - 2, 26]]);
  return {
    name: '9 Yangi binolar', items: [...list.map(([m, , x]) => plain(m, x, 0)), ...cars.map((c) => plain(...c)), ...trees.map((t) => plain(...t))].map(pack),
    labels: list.map(([, label, x]) => [label, x, 0.1, 36, 0, 4.5]), floor: [0, 0, 600], camera: [[-2, 84, 162], [-2, 4, 4]],
  };
};
const buildingsScene = () => {
  const at = (i) => [(i % 7) * 70, -Math.floor(i / 7) * 120];
  const items = BIG.map(([model], i) => plain(model, ...at(i)));
  const labels = BIG.map(([, label], i) => [label, at(i)[0], 0.1, at(i)[1] + 34, 0, 5]);
  return { name: '3 Binolar', items: items.map(pack), labels, floor: [210, -80, 900], camera: [[210, 290, 360], [210, 0, -85]] };
};

const EXTRA = [
  ['street_lamp', "Ko'cha chirog'i"], ['bench', "O'rindiq"], ['tree_terak', 'Terak'], ['tree_round', 'Yumaloq daraxt'], ['tree_wide', 'Keng daraxt'], ['tree_tall', 'Baland daraxt'], ['tree_slim', 'Ingichka daraxt'], ['hedge', 'Buta qatori'], ['flower_ring', 'Doira gulzor'], ['car_ambulance', 'Tez yordam'], ['car_fire', "O't o'chirish mashinasi"], ['bozor_stall', "Bozor do'koni"], ['billboard', 'Bilbord'], ['plaza_fountain', 'Katta favvora'],
  ['hero_statue', 'Qahramon haykali'], ['forsale', "Bo'sh joy taxtachasi"], ['foundation', 'Poydevor'], ['barrier', "To'siq"], ['crane', 'Kran'], ['fence_low', 'Past panjara (1-level)'], ['fence_basic', 'Suvoq devor (2–3-level)'], ['gate_open', 'Ochiq kirish (1-level)'], ['gate_basic', 'Temir darvoza (2-level)'], ['gate_slat', "Reykali darvoza (4–5-level)"], ['gate_naqsh', 'Naqshli darvoza (7–8-level)'], ['stadium', 'Stadion'],
];
const WIDE = new Set(['gate_wood', 'gate_carved', 'gate_gold', 'gate_basic', 'gate_open', 'gate_slat', 'gate_naqsh', 'fence_low', 'fence_basic', 'fence_wood', 'fence_brick', 'fence_ornate', 'light_luxe', 'light_lamps', 'plaza_fountain', 'foundation', 'crane', 'billboard', 'hero_statue']);
const decorScene = () => {
  const items = [];
  const labels = [];
  const all = [...DECOR.map((d) => [d.model, d.uz]), ...EXTRA].map(([model, label], i) => ({ model, label: `B${i + 1}. ${label}` }));
  const fresh = all.slice(DECOR.findIndex((d) => d.id === 'dam_besedka'), DECOR.length);
  const isFresh = new Set(fresh);
  const put = (list, columns, dx, dz, z0, size, gap) => list.forEach(({ model, label }, i) => {
    const x = (i % columns) * dx;
    const z = z0 - Math.floor(i / columns) * dz;
    items.push(plain(model, x, z));
    labels.push([label, x, 0.1, z + gap, 0, size]);
  });
  put(fresh, 7, 12, 13, 60, 0.9, 5);
  put(all.filter((d) => !isFresh.has(d) && !WIDE.has(d.model) && d.model !== 'stadium'), 8, 11, 13, 0, 0.8, 4);
  put(all.filter((d) => !isFresh.has(d) && WIDE.has(d.model)), 6, 36, 48, -80, 1.8, 20);
  put(all.filter((d) => d.model === 'stadium'), 1, 0, 0, -320, 5, 80);
  return { name: '2 Bezaklar', items: items.map(pack), labels, floor: [40, -80, 400], camera: [[36, 58, 128], [36, 0, 38]] };
};

const MAP_MODELS = {
  ...Object.fromEntries(['tree_chinor', 'tree_terak'].map((m) => [m, `${m}_lod`])), tree_round: 'tree_round_lod', tree_wide: 'tree_round_lod', tree_tall: 'tree_terak_lod',
  ...Object.fromEntries(['prezident', 'hokimiyat', 'sud', 'kasalxona', 'teatr', 'masjid', 'otochirish', 'univermag', 'bozor'].map((m) => [m, `${m}_lod`])),
  ...Object.fromEntries(['maktab', 'kafe', 'shop', 'sport', 'bolalar', 'novostroyka', 'plaza_fountain', 'crane'].map((m) => [m, m])),
};
const mapScene = () => ({
  name: '7 Butun xarita', ground: groundOf(0, 0, CITY_HALF - 1), isLake: true, isMap: true, clip: [0, 0, CITY_HALF + 100], lift: 0.6, camera: [[0, 4350, 1500], [0, 0, 130]],
  items: [
    ...plan.plots.filter((p) => p.type !== 'kvartira').map((p) => houseItem(p, demoState(p), true)),
    ...plan.buildings.map((b) => buildingItem(b, true)), ...plan.commerce.filter((c) => c.type !== 'bilbord').map(commerceItem),
    ...statics.flatMap((i) => { const model = MAP_MODELS[i.model]; return model ? [{ ...i, model }] : []; }),
  ].map(pack),
  labels: [
    ...plan.districts.filter((d) => d.id > 2).map(({ id, nameUz, label: [x, z] }) => [`${id}. ${nameUz.replace(' mahallasi', '')}`, x, 60, z, 0, 82]),
    ['1. Markaz', -300, 60, -330, 0, 76], ['2. Anorzor', 300, 60, 400, 0, 76],
    ...['mamuriy', 'biznes', 'savdo', 'dam'].map((id) => { const [a, b, c, d] = ZONES[id].rect; return [ZONES[id].uz, (a + c) / 2, 75, (b + d) / 2 + 30, 0, 66]; }),
    ['MAYDON', 0, 70, 20, 0, 56],
  ],
});

const dir = mkdtempSync(path.join(tmpdir(), 'shahar-show-'));
const strip = await sharp(path.join(root, 'apps/web/public/assets/tex.webp')).png().toBuffer();
for (let i = 0; i < TEX_LAYERS; i++) await sharp(strip).extract({ left: 0, top: i * TEX, width: TEX, height: TEX }).toFile(path.join(dir, `t${i}.png`));
const scenes = [
  levelsScene(), decorScene(), buildingsScene(),
  region('4 Markaz', 0, 0, 300, [[-150, 190, 330], [0, 0, -20]]),
  region("5 Ko'l bo'yi", 1000, 1120, 230, [[800, 140, 1390], [1060, 0, 1140]], true),
  region('6 Tepalik', HILL.x, HILL.z, 240, [[-930, 190, -870], [HILL.x, 10, HILL.z]]),
  mapScene(), firstScene(), newBuildingsScene(), sidesScene(), newDecorScene(),
];
writeFileSync(path.join(dir, 'show.json'), JSON.stringify({ lake: LAKE, scenes }));

const out = path.join(root, 'blender/shahar.blend');
// Qo'lda qilingan o'zgarishlar yo'qolmasin: eskisi yonida qoladi.
if (existsSync(out)) renameSync(out, path.join(root, 'blender/shahar.oldingi.blend'));
const shouldRender = process.argv.includes('--render');
const log = execFileSync(findBlender(), ['-b', '--factory-startup', '-P', path.join(root, 'blender/scripts/build_showcase.py'), '--', dir, out, ...(shouldRender ? ['--render'] : [])], { encoding: 'utf8', maxBuffer: 1e8 });
process.stdout.write(`${log.split('\n').filter((l) => /^SHOW|Error|Traceback|File "/.test(l)).join('\n')}\n`);
/** --docs: hujjatlardagi rasmlar (docs/chat) ham yangilanadi. */
const saveDocs = async () => {
  const shot = (i) => path.join(dir, `r${i}.png`);
  const docs = (name) => path.join(root, 'docs/chat', name);
  const jpg = (img, name) => img.jpeg({ quality: 86 }).toFile(docs(name));
  const [W, H] = [1920, 1080];
  // Bo'sh yashil joylar kesiladi: [ko'rsatma tartibi, yuqori, balandlik]
  const stack = async (parts) => {
    const cuts = await Promise.all(parts.map(([i, top, height]) => sharp(shot(i)).extract({ left: 0, top, width: W, height }).toBuffer()));
    const tops = parts.map((_, k) => parts.slice(0, k).reduce((n, p) => n + p[2], 0));
    return sharp({ create: { width: W, height: parts.reduce((n, p) => n + p[2], 0), channels: 3, background: '#fff' } }).composite(cuts.map((input, k) => ({ input, left: 0, top: tops[k] })));
  };
  await jpg(await stack([[7, 300, 480], [9, 60, 1000], [0, 40, 980]]), 'levellar.jpg');
  await jpg(sharp(shot(6)), 'xarita.jpg');
  await jpg(sharp(shot(3)), 'markaz-3d.jpg');
  await jpg(sharp({ create: { width: W, height: H * 2, channels: 3, background: '#fff' } }).composite([{ input: shot(8), left: 0, top: 0 }, { input: shot(2), left: 0, top: H }]), 'binolar.jpg');
  await jpg(await stack([[10, 160, 760]]), 'bezaklar.jpg');
};
if (shouldRender && process.argv.includes('--docs')) await saveDocs();
if (shouldRender) process.stdout.write(`Rasmlar: ${dir}\n`);
else rmSync(dir, { recursive: true });
const open = process.argv.find((a) => a.startsWith('--open'));
// --open yoki --open="7 Butun xarita"
if (open) spawn(findBlender(), [out, ...(open.includes('=') ? ['-S', open.split('=')[1]] : [])], { detached: true, stdio: 'ignore' }).unref();
