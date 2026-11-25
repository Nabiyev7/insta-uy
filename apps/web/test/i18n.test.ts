import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

const src = fileURLToPath(new URL('../src', import.meta.url));
const files = (dir: string): string[] => readdirSync(dir).flatMap((f) => {
  const full = path.join(dir, f);
  return statSync(full).isDirectory() ? files(full) : /\.(ts|tsx)$/.test(f) ? [full] : [];
});

describe('tarjimalar', () => {
  test('kodda ishlatilgan har bir t(…) kaliti ikkala tilda bor', () => {
    const keys = new Set<string>();
    for (const f of files(src)) for (const m of readFileSync(f, 'utf8').matchAll(/\b(?:t|translate)\('([A-Za-z0-9_]+)'/g)) keys.add(m[1]!);
    expect(keys.size).toBeGreaterThan(100);
    // Lug'at: `kalit: ['uz', 'ru']` — ikkala matn bo'sh emas.
    const dict = readFileSync(path.join(src, 'app/i18n.ts'), 'utf8');
    const known = new Set([...dict.matchAll(/(?:^|[\s{,])([A-Za-z0-9_]+): \[(?:"[^"]+"|'[^']+'), (?:"[^"]+"|'[^']+')\]/gm)].map((m) => m[1]!));
    expect([...keys].filter((k) => !known.has(k))).toEqual([]);
  });
});
