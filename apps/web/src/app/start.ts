/** Yuklash ketma-ketligi va fon ishlari. */
import { frontOf } from '../../../../packages/shared/src/index.ts';
import { loadKit } from '../world/kit.ts';
import { onSession, rpc } from './api.ts';
import { startAudio } from './audio.ts';
import { connectMultiplayer } from './multiplayer.ts';
import { teleport } from './runtime.ts';
import { getApp, loadPlan, openPanel, refreshBoot, refreshHouses, refreshProfile, setApp } from './store.ts';
import { exposeVideoApi } from './videoMode.ts';

const REFRESH_MS = 60_000;
const PING_MS = 45_000;

const hasWebgl2 = (): boolean => document.createElement('canvas').getContext('webgl2') !== null;

const bump = (share: number): void => setApp((s) => ({ progress: Math.min(1, s.progress + share) }));

const params = new URLSearchParams(location.search);
export const isVideoMode = params.has('video');

/** ?uy=P0001 — o'sha uyga teleport; ?ref= — taklif kodi. */
const applyLink = (): void => {
  const ref = params.get('ref');
  if (ref && /^[0-9a-f]{6,16}$/.test(ref)) {
    try {
      sessionStorage.setItem('ref', ref);
    } catch {
      // maxfiy rejim: taklif kodi shu seansda saqlanmaydi
    }
  }
  const plot = getApp().plotById.get(params.get('uy') ?? '');
  if (!plot) return;
  const f = frontOf(plot, 4);
  teleport(f.x, f.z, f.yaw + Math.PI);
  openPanel({ kind: 'plot', id: plot.id });
};

/** Sinov rejimi: admin qoralama xaritani ko'radi (?xarita=ID). */
const applyDraftMap = async (): Promise<void> => {
  const draft = Number(params.get('xarita'));
  const boot = getApp().boot;
  if (!Number.isInteger(draft) || draft <= 0 || !boot) return;
  const objects = await rpc<NonNullable<typeof boot>['objects']>('admin_map_objects', { p_version: draft });
  setApp({ boot: { ...boot, objects } });
};

export const start = async (): Promise<void> => {
  setApp({ stage: 'loading', progress: 0, error: '' });
  if (!hasWebgl2()) {
    setApp({ stage: 'error', error: 'webgl' });
    return;
  }
  try {
    const [kit] = await Promise.all([
      loadKit(() => bump(0.28)), loadPlan().then(() => bump(0.16)), refreshBoot().then(() => bump(0.12)), refreshHouses().then(() => bump(0.16)),
    ]);
    applyLink();
    let seen = false;
    try {
      seen = localStorage.getItem('intro') === '1';
    } catch {
      // maxfiy rejim: yo'riqnoma har safar ko'rinadi
    }
    setApp({ kit, stage: isVideoMode || seen ? 'play' : 'intro' });
    if (isVideoMode) { exposeVideoApi(); return; }
    await runBackground();
  } catch (error: unknown) {
    setApp({ stage: 'error', error: error instanceof Error ? error.message : 'load' });
  }
};

let isRunning = false;
const runBackground = async (): Promise<void> => {
  if (isRunning) return;
  isRunning = true;
  onSession((s) => {
    // Supabase qulfi ichida so'rov yubormaslik uchun navbatga qo'yiladi.
    setTimeout(() => {
      void (s ? refreshProfile() : Promise.resolve(setApp({ profile: null }))).then(() => applyDraftMap().catch(() => undefined));
      void connectMultiplayer().catch(() => undefined);
    }, 0);
  });
  setInterval(() => { if (!document.hidden) void Promise.allSettled([refreshHouses(), refreshBoot().then(applyDraftMap)]); }, REFRESH_MS);
  setInterval(() => {
    const s = getApp();
    if (s.profile && !document.hidden) void rpc('my_ping', { p_district: s.district }).catch(() => undefined);
  }, PING_MS);
  if (getApp().isSound) addEventListener('pointerdown', startAudio, { once: true });
};
