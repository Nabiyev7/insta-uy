/** Yuklash ketma-ketligi va fon ishlari. */
import { loadKit } from '../world/kit.ts';
import { goToPlot } from './actions.ts';
import { onSession, rpc, supabase } from './api.ts';
import { startAudio } from './audio.ts';
import { applyLoginLink } from './login.ts';
import { connectMultiplayer } from './multiplayer.ts';
import { getApp, loadPlan, refreshBoot, refreshCatalog, refreshHouses, refreshProfile, setApp } from './store.ts';
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
  goToPlot(params.get('uy') ?? '', true);
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
  document.documentElement.lang = getApp().lang;
  setApp({ stage: 'loading', progress: 0, error: '' });
  if (!hasWebgl2()) {
    setApp({ stage: 'error', error: 'webgl' });
    return;
  }
  try {
    const [kit] = await Promise.all([
      loadKit(() => bump(0.28)), loadPlan().then(() => bump(0.16)), refreshBoot().then(() => bump(0.08)), refreshCatalog().then(() => bump(0.04)), refreshHouses().then(() => bump(0.16)),
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
    void applyLoginLink();
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
    if (!s.profile && !document.hidden) void supabase.auth.getSession().then(({ data }) => (data.session ? refreshProfile() : undefined)).catch(() => undefined);
    if (s.profile && !document.hidden) void rpc('my_ping', { p_district: s.district }).catch(() => undefined);
  }, PING_MS);
  if (getApp().isSound) addEventListener('pointerdown', startAudio, { once: true });
};
