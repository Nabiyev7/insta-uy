/** 16 qatlamli tekstura tasmasi: Poly Haven (CC0) + protsedural SVG. Natija: apps/web/public/assets/tex.webp */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const SIZE = 256;
const root = fileURLToPath(new URL('..', import.meta.url));
const cache = process.env.TEX_CACHE ?? path.join(tmpdir(), 'shahar-tex-cache');
const outDir = path.join(root, 'apps/web/public/assets');

/** gray: rang olib tashlanadi (instance rangi bilan bo'yaladi). mean: maqsad yorqinlik. */
const photo = (id, opts = {}) => ({ kind: 'photo', id, gray: false, mean: 150, ...opts });
const svg = (body) => ({ kind: 'svg', body });

const windowSvg = `<rect width="256" height="256" fill="#efe8da"/><rect x="18" y="14" width="220" height="228" fill="#1b2a38"/>
<rect x="18" y="14" width="220" height="60" fill="#26394a"/><g fill="#f2ede2"><rect x="122" y="14" width="12" height="228"/><rect x="18" y="84" width="220" height="10"/></g>
<rect x="0" y="244" width="256" height="12" fill="#b9a98c"/>`;
const facadeSvg = `<rect width="256" height="256" fill="#d8d0c2"/><rect y="236" width="256" height="20" fill="#b7ad9c"/>
<rect x="34" y="56" width="78" height="128" fill="#1d2b38"/><rect x="144" y="56" width="78" height="128" fill="#1d2b38"/>
<g fill="#eee7da"><rect x="69" y="56" width="7" height="128"/><rect x="179" y="56" width="7" height="128"/><rect x="28" y="184" width="90" height="9"/><rect x="138" y="184" width="90" height="9"/></g>`;
const glassSvg = `<rect width="256" height="256" fill="#24384a"/>${Array.from({ length: 4 }, (_, i) => `<rect x="${i * 64}" y="0" width="64" height="256" fill="${['#213446', '#2a4157', '#263b4f', '#2d475e'][i]}"/>`).join('')}
<g fill="#c5cfd6">${[0, 64, 128, 192].map((x) => `<rect x="${x}" width="4" height="256"/>`).join('')}<rect y="0" width="256" height="18"/></g>`;
const star = (cx, cy, r, fill) => `<g transform="translate(${cx} ${cy})" fill="${fill}"><rect x="${-r}" y="${-r}" width="${2 * r}" height="${2 * r}"/><rect x="${-r}" y="${-r}" width="${2 * r}" height="${2 * r}" transform="rotate(45)"/></g>`;
const naqshSvg = `<rect width="256" height="256" fill="#1f7f8c"/>${[[0, 0], [256, 0], [0, 256], [256, 256], [128, 128]].map(([x, y]) => star(x, y, 60, '#e8dcc0') + star(x, y, 46, '#175f7a') + star(x, y, 24, '#d8a840')).join('')}
${[[128, 0], [0, 128], [256, 128], [128, 256]].map(([x, y]) => star(x, y, 30, '#e8dcc0') + star(x, y, 18, '#b5452f')).join('')}`;
const carvedSvg = `<rect width="256" height="256" fill="#7a4a26"/><g fill="none" stroke="#4d2c14" stroke-width="8"><rect x="14" y="14" width="228" height="228"/>${[0, 1, 2, 3].map((i) => `<circle cx="${64 + (i % 2) * 128}" cy="${64 + Math.floor(i / 2) * 128}" r="38"/>`).join('')}</g>${[[64, 64], [192, 64], [64, 192], [192, 192], [128, 128]].map(([x, y]) => star(x, y, 16, '#a8703c')).join('')}`;

const LAYERS = [
  svg('<rect width="256" height="256" fill="#fff"/>'), // 0 tekis
  photo('painted_plaster_wall', { gray: true, mean: 218, contrast: 0.7 }), // 1 suvoq
  photo('red_brick_03', { mean: 150 }), // 2 g'isht
  photo('clay_roof_tiles_02', { gray: true, mean: 190 }), // 3 tom
  photo('wood_planks_grey', { gray: true, mean: 190 }), // 4 yog'och
  photo('asphalt_02', { mean: 105, gray: true, contrast: 0.7 }), // 5 asfalt
  photo('leafy_grass', { mean: 135, contrast: 0.75 }), // 6 maysa
  photo('concrete_floor_worn_001', { gray: true, mean: 190, contrast: 0.6 }), // 7 beton
  photo('leafy_grass', { gray: true, mean: 190, contrast: 1.1 }), // 8 barg
  svg(windowSvg), // 9 deraza
  svg(naqshSvg), // 10 naqsh
  svg(carvedSvg), // 11 o'yma yog'och
  svg(facadeSvg), // 12 ko'p qavatli fasad
  svg(glassSvg), // 13 shisha fasad
  photo('brown_mud_leaves_01', { mean: 120, contrast: 0.7 }), // 14 tuproq
  photo('cobblestone_floor_04', { gray: true, mean: 175 }), // 15 tosh plitka
];

const download = async (id) => {
  const file = path.join(cache, `${id}.jpg`);
  if (existsSync(file)) return readFile(file);
  const headers = { 'User-Agent': 'asset-fetch/1.0' };
  const meta = await fetch(`https://api.polyhaven.com/files/${id}`, { headers });
  if (!meta.ok) throw new Error(`Poly Haven ${id}: ${meta.status}`);
  const url = (await meta.json()).Diffuse['1k'].jpg.url;
  const img = await fetch(url, { headers });
  if (!img.ok) throw new Error(`${url}: ${img.status}`);
  const buf = Buffer.from(await img.arrayBuffer());
  await mkdir(cache, { recursive: true });
  await writeFile(file, buf);
  return buf;
};

const render = async (layer) => {
  if (layer.kind === 'svg') return sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}">${layer.body}</svg>`)).removeAlpha().raw().toBuffer();
  let img = sharp(await download(layer.id)).resize(SIZE, SIZE).removeAlpha().toColourspace('srgb');
  if (layer.gray) img = img.modulate({ saturation: 0.12 });
  const { data } = await img.raw().toBuffer({ resolveWithObject: true });
  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  const c = layer.contrast ?? 1;
  return Buffer.from(data.map((v) => Math.max(0, Math.min(255, (v - mean) * c * (layer.mean / mean) ** 0.5 + layer.mean))));
};

const strips = await Promise.all(LAYERS.map(render));
await mkdir(outDir, { recursive: true });
await sharp(Buffer.concat(strips), { raw: { width: SIZE, height: SIZE * LAYERS.length, channels: 3 } }).webp({ quality: 78 }).toFile(path.join(outDir, 'tex.webp'));
