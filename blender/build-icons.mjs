/** Do'kon rasm-ikonkalari: har bezak modelidan 128 px webp (`npm run models` oxirida chaqiriladi). */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { DECOR } from '../packages/shared/src/index.ts';
import { findBlender } from './find-blender.mjs';

const TEX = 128;
const TEX_LAYERS = 16;
const SIZE = 128;
const root = fileURLToPath(new URL('..', import.meta.url));
const out = path.join(root, 'apps/web/public/assets/decor');
const dir = mkdtempSync(path.join(tmpdir(), 'shahar-icons-'));
const strip = await sharp(path.join(root, 'apps/web/public/assets/tex.webp')).png().toBuffer();
for (let i = 0; i < TEX_LAYERS; i++) await sharp(strip).extract({ left: 0, top: i * TEX, width: TEX, height: TEX }).toFile(path.join(dir, `t${i}.png`));
const names = [...new Set(DECOR.map((d) => d.model))];
writeFileSync(path.join(dir, 'icons.json'), JSON.stringify(names));
const log = execFileSync(findBlender(), ['-b', '--factory-startup', '-P', path.join(root, 'blender/scripts/render_icons.py'), '--', dir, dir], { encoding: 'utf8', maxBuffer: 1e8 });
process.stdout.write(`${log.split('\n').filter((l) => /^KIT|Error|Traceback|File "/.test(l)).join('\n')}\n`);
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
let bytes = 0;
for (const name of names) bytes += (await sharp(path.join(dir, `${name}.png`)).resize(SIZE).webp({ quality: 82, alphaQuality: 80 }).toFile(path.join(out, `${name}.webp`))).size;
process.stdout.write(`${out}: ${names.length} ta rasm, ${(bytes / 1024).toFixed(0)} KB\n`);
rmSync(dir, { recursive: true });
