/** Yuklama sinovi (13-qadam, C): N virtual foydalanuvchi (sukut 500) T soniya (sukut 300) — o'z vaqtinchalik serverida (lokal, bepul tarifga taqqoslash uchun).
 *  Har biri: jonli server (socket.io) ga ulanadi va 8 marta/soniya harakat yuboradi (sayt kabi); har daqiqada /snap/city va /snap/boot (ETag bilan).
 *  Ishga tushirish: node e2e/load.mjs [N] [soniya] */
import { io } from 'socket.io-client';
import { startServers } from './harness.mjs';

const USERS = Number(process.argv[2] ?? 500);
const SECONDS = Number(process.argv[3] ?? 300);
const MOVE_MS = 125;
const SNAP_MS = 60_000;

const server = await startServers({ base: 8830, site: 5230 });
const { API } = server;
const lat = [];
const stats = { http: 0, http304: 0, httpErr: 0, connected: 0, connectErr: 0, disconnects: 0, snaps: 0, moves: 0 };
const etags = new Map();
const fetchSnap = async (name) => {
  const t0 = performance.now();
  try {
    const res = await fetch(`${API}/snap/${name}`, { headers: etags.has(name) ? { 'if-none-match': etags.get(name) } : {} });
    lat.push(performance.now() - t0);
    stats.http += 1;
    if (res.status === 304) stats.http304 += 1;
    else if (res.ok) { etags.set(name, res.headers.get('etag')); await res.arrayBuffer(); } else stats.httpErr += 1;
  } catch { stats.httpErr += 1; }
};

const sockets = [];
const timers = [];
const startUser = (i) => {
  const s = io(API, { transports: ['websocket'], reconnection: true, forceNew: true });
  sockets.push(s);
  let x = (i % 50) * 20 - 500;
  let z = Math.floor(i / 50) * 20 - 100;
  s.on('connect', () => { stats.connected += 1; });
  s.on('connect_error', () => { stats.connectErr += 1; });
  s.on('disconnect', () => { stats.disconnects += 1; });
  s.on('snap', () => { stats.snaps += 1; });
  timers.push(setInterval(() => {
    if (!s.connected) return;
    x += Math.random() - 0.5; z += Math.random() - 0.5;
    s.volatile.emit('move', [x, z, 0, 1, 1 + (i % 12)]);
    stats.moves += 1;
  }, MOVE_MS));
  // Har kim snapshotni o'z vaqtida so'raydi (bir vaqtda emas).
  setTimeout(() => { void fetchSnap('city'); void fetchSnap('boot'); timers.push(setInterval(() => { void fetchSnap('city'); void fetchSnap('boot'); }, SNAP_MS)); }, Math.random() * SNAP_MS);
};

const t0 = Date.now();
// 30 soniya ichida asta-sekin ulanadi (bir zumda 500 ta emas).
for (let i = 0; i < USERS; i++) setTimeout(() => startUser(i), (i / USERS) * 30_000);
const rssOf = () => Math.round(process.memoryUsage().rss / 1048576);
const tick = setInterval(() => {
  const live = sockets.filter((s) => s.connected).length;
  console.log(`${Math.round((Date.now() - t0) / 1000)} s: ulangan ${live}/${USERS}, snap ${stats.snaps}, http ${stats.http} (304: ${stats.http304}, xato ${stats.httpErr})`);
}, 30_000);
await new Promise((r) => { setTimeout(r, SECONDS * 1000); });
clearInterval(tick);
const sorted = [...lat].sort((a, b) => a - b);
const pct = (p) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))].toFixed(0) : '—');
const result = {
  foydalanuvchi: USERS, soniya: SECONDS, ulangan_oxirida: sockets.filter((s) => s.connected).length, ulanish_xatosi: stats.connectErr, uzilish: stats.disconnects,
  harakat_yuborildi: stats.moves, snap_qabul: stats.snaps, snap_soniyasiga_bir_kishiga: +(stats.snaps / USERS / SECONDS).toFixed(1),
  http_sorov: stats.http, http_304: stats.http304, http_xato: stats.httpErr, http_p50_ms: pct(50), http_p95_ms: pct(95), http_p99_ms: pct(99), sinov_jarayoni_xotira_mb: rssOf(),
};
console.log('NATIJA', JSON.stringify(result, null, 2));
for (const t of timers) clearInterval(t);
for (const s of sockets) s.close();
await server.stop();
process.exit(0);
