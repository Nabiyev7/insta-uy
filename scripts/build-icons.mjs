/** Logo SVG → PWA ikonkalari. */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
const out = (f) => fileURLToPath(new URL(`../apps/web/public/${f}`, import.meta.url));
const star = (r, fill) => `<g fill="${fill}"><rect x="${-r}" y="${-r}" width="${2 * r}" height="${2 * r}"/><rect x="${-r}" y="${-r}" width="${2 * r}" height="${2 * r}" transform="rotate(45)"/></g>`;
const logo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-256 -256 512 512"><rect x="-256" y="-256" width="512" height="512" fill="#14545f"/>${star(150, '#e9d9b4')}${star(128, '#1f7f8c')}
<path d="M-96 78V-14L0-104 96-14V78Z" fill="#fdf6e6"/><path d="M-124 2 0-118 124 2 104 20 0-82-104 20Z" fill="#b5452f"/><path d="M-26 78V24a26 26 0 0 1 52 0V78Z" fill="#7a4a26"/></svg>`;
writeFileSync(out('logo.svg'), logo);
for (const s of [192, 512]) await sharp(Buffer.from(logo)).resize(s, s).png().toFile(out(`icon-${s}.png`));
