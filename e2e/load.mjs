/** Yuklama sinovi: N ta o'yinchi bir vaqtda. `node e2e/load.mjs 1000` (server: RT_URL, standart lokal dev). */
import { io } from 'socket.io-client';

const url = process.env.RT_URL ?? 'http://127.0.0.1:8787';
const n = Number(process.argv[2] ?? 1000);
const sockets = [];
let snaps = 0;
let failed = 0;
const open = () => new Promise((r) => {
  const s = io(url, { transports: ['websocket'], forceNew: true, reconnection: false });
  s.once('connect', () => { sockets.push(s); r(); });
  s.once('connect_error', () => { failed += 1; r(); });
  s.on('snap', () => { snaps += 1; });
});
const t0 = Date.now();
for (let i = 0; i < n; i += 50) await Promise.all(Array.from({ length: Math.min(50, n - i) }, open));
process.stdout.write(`ulandi ${sockets.length}/${n}, rad ${failed}, ${Date.now() - t0} ms\n`);
const where = sockets.map(() => [Math.random() * 900 - 450, Math.random() * 900 - 450]);
const timer = setInterval(() => sockets.forEach((s, i) => {
  const p = where[i];
  p[0] += Math.random() - 0.5;
  p[1] += Math.random() - 0.5;
  s.volatile.emit('move', [p[0], p[1], 0, 1, 1]);
}), 250);
await new Promise((r) => { setTimeout(r, 2000); });
snaps = 0;
const t1 = Date.now();
const lat = [];
for (let k = 0; k < 8; k++) {
  const a = performance.now();
  await fetch(`${url}/health`).then((r) => r.text());
  lat.push(performance.now() - a);
  await new Promise((r) => { setTimeout(r, 1000); });
}
const sec = (Date.now() - t1) / 1000;
process.stdout.write(`har o'yinchiga ${(snaps / sec / sockets.length).toFixed(1)} snapshot/s (maqsad ≥5), /health ${Math.round(Math.max(...lat))} ms gacha\n`);
clearInterval(timer);
for (const s of sockets) s.disconnect();
process.exit(0);
