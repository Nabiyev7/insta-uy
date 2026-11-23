/** Bosh rejani BIR MARTA yaratadi. Mavjud bo'lsa faqat xeshini tekshiradi (PLAN.md §2.1). */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { encodePlan } from '../src/masterplan/codec.ts';
import { generateMasterPlan } from '../src/masterplan/generate.ts';

const file = new URL('../data/masterplan.json', import.meta.url);
const lock = new URL('../data/masterplan.lock', import.meta.url);
const sha = (s: string): string => createHash('sha256').update(s).digest('hex');

if (existsSync(file)) {
  const isSame = sha(readFileSync(file, 'utf8')) === readFileSync(lock, 'utf8').trim();
  console.log(isSame ? 'Bosh reja qulflangan, xesh mos.' : "XATO: masterplan.json o'zgartirilgan!");
  process.exit(isSame ? 0 : 1);
}
const json = JSON.stringify(encodePlan(generateMasterPlan()));
writeFileSync(file, json);
writeFileSync(lock, `${sha(json)}\n`);
console.log(`Bosh reja yaratildi va qulflandi: ${(json.length / 1024).toFixed(0)} KB`);
