/** Hammasini bitta buyruq bilan: API (8787) + sayt (5173) + admin (5174). Telefon uchun: npm run dev -- --host */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const vite = path.join(root, 'node_modules/vite/bin/vite.js');
const extra = process.argv.slice(2).filter((a) => a === '--host');
const children = [];
const start = (args, cwd, env = {}) => {
  const child = spawn(process.execPath, args, { cwd, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'inherit'] });
  children.push(child);
  child.stdout.on('data', (d) => process.stdout.write(d));
  child.on('exit', (code) => { if (code) stop(code); });
  return child;
};
const stop = (code = 0) => {
  for (const c of children) c.kill();
  process.exit(code);
};
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());

const api = start(['server/dev/main.ts'], root);
let buffer = '';
api.stdout.on('data', (d) => {
  buffer += d;
  const anon = /ANON=(\S+)/.exec(buffer)?.[1];
  if (!anon || children.length > 1 || !buffer.includes('Admin:')) return;
  const env = { VITE_SUPABASE_ANON_KEY: anon };
  start([vite, '--port', '5173', '--strictPort', ...extra], path.join(root, 'apps/web'), env);
  start([vite, '--port', '5174', '--strictPort', ...extra], path.join(root, 'apps/admin'), env);
});
