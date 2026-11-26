/** 6d: ishlab chiqarish yig'ilishida admin panelda login + parol shakli yo'q (faqat DEV). */
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { afterAll, expect, test } from 'vitest';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const out = mkdtempSync(path.join(tmpdir(), 'admin-build-'));
afterAll(() => rmSync(out, { recursive: true, force: true }));

test('production build: parol maydoni va "Kirish" shakli yo‘q, faqat "Telegram botda /admin yozing"', async () => {
  // Vitest NODE_ENV=test qo'yadi — haqiqiy ishlab chiqarish yig'ilishi uchun vaqtincha production.
  const before = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    await build({ root, logLevel: 'silent', mode: 'production', build: { outDir: out, emptyOutDir: true, minify: false } });
  } finally {
    process.env.NODE_ENV = before;
  }
  const js = readdirSync(path.join(out, 'assets')).filter((f) => f.endsWith('.js')).map((f) => readFileSync(path.join(out, 'assets', f), 'utf8')).join('\n');
  expect(js).toContain('Telegram botda');
  expect(js).not.toContain('current-password');
  expect(js).not.toMatch(/placeholder: "Parol"/);
}, 120_000);
