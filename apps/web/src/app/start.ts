/** Yuklash ketma-ketligi va fon ishlari. */
import { loadKit } from '../world/kit.ts';
import { goToPlot, nearestFree } from './actions.ts';
import { startMiniApp } from './telegram.ts';
import { onSession, rpc, supabase } from './api.ts';
import { startAudio } from './audio.ts';
import { applyLoginLink } from './login.ts';
import { connectMultiplayer } from './multiplayer.ts';
import { getApp, loadPlan, openPanel, refreshBoot, refreshCatalog, refreshHouses, refreshProfile, setApp, setting, toast, write } from './store.ts';
import { newNeighbourNick } from '../logic/lively.ts';
import { translate } from './i18n.ts';
import { exposeVideoApi } from './videoMode.ts';

/** Uylar 2 daqiqada, umumiy sozlamalar 5 daqiqada (bepul tarif: Workers kuniga 100 000 so'rov — YUKLAMA-HISOBOT.md). */
const REFRESH_MS = 120_000;
const BOOT_EVERY = 3;
let ticks = 0;
const PING_MS = 45_000;

const hasWebgl2 = (): boolean => document.createElement('canvas').getContext('webgl2') !== null;

const bump = (share: number): void => setApp((s) => ({ progress: Math.min(1, s.progress + share) }));

import { rememberSource, sendSource, startAnalytics } from './analytics.ts';
import { countVisit } from './install.ts';
import { playIntro } from './intro.ts';

const params = new URLSearchParams(location.search);
export const isVideoMode = params.has('video');

/** Bot havolalari: ?til=uz|ru — bot tili (sayt tili shu bo'ladi). */
const applyLang = (): void => {
  const til = params.get('til');
  if (til !== 'uz' && til !== 'ru') return;
  write('lang', til);
  document.documentElement.lang = til;
  setApp({ lang: til });
};
/** Bot menyusidagi Mini App tugmalari: ?panel=uyim | dokon | uyolish. */
const openWanted = (): void => {
  const wanted = params.get('panel');
  const s = getApp();
  if (wanted === 'dokon') openPanel({ kind: 'shop' });
  if (wanted === 'qoidalar') openPanel({ kind: 'rules' });
  if (wanted === 'uyim') {
    const plot = s.profile?.plots[0]?.plot;
    if (plot) goToPlot(plot);
    else openPanel({ kind: 'me' });
  }
  // Uyi yo'q odam: bo'sh joylar xaritasi (eng yaqin bo'sh joy belgilangan).
  if (wanted === 'uyolish') {
    const id = nearestFree();
    if (id) goToPlot(id, true);
    openPanel({ kind: 'map' });
  }
};

/** ?uy=P0001 — o'sha uyga teleport; ?ref= — taklif kodi. */
const applyLink = (): void => {
  applyLang();
  const ref = params.get('ref');
  if (ref && /^[0-9a-f]{6,16}$/.test(ref)) {
    try {
      sessionStorage.setItem('ref', ref);
    } catch {
      // maxfiy rejim: taklif kodi shu seansda saqlanmaydi
    }
  }
  goToPlot(params.get('uy') ?? '', true);
  if (!isVideoMode) playIntro(params.get('uy'));
  countVisit();
  rememberSource(params.get('from'));
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
      loadKit(() => bump(0.28)), loadPlan().then(() => bump(0.16)), refreshBoot().then(() => bump(0.08)), refreshCatalog().then(() => bump(0.04)), refreshHouses('snap').then(() => bump(0.16)),
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
    // Telegram ichida (Mini App) — avtomatik kirish; keyin bot tugmasidagi oyna ochiladi.
    void startMiniApp(() => { void supabase.auth.getSession().then(({ data }) => (data.session ? refreshProfile() : undefined)).then(openWanted); });
    startAnalytics();
    await runBackground();
  } catch (error: unknown) {
    setApp({ stage: 'error', error: error instanceof Error ? error.message : 'load' });
  }
};

let newsAt = 0;
/** "@nik hozirgina uy oldi" — 3 soniya. */
const NEWS_SHOW_MS = 3000;
/** Yangi uy qurilganda boshqalar ekranida qisqa xabar (daqiqasiga ko'pi bilan 1 ta; admin sozlamasida o'chadi). */
const refreshCity = async (): Promise<void> => {
  const before = getApp().houses;
  await refreshHouses('snap');
  const s = getApp();
  if (!setting('lively_start', true) || s.isClean || s.isPhoto) return;
  const nick = newNeighbourNick(before, s.houses, new Set(s.profile?.plots.map((p) => p.plot) ?? []), newsAt, Date.now());
  if (!nick) return;
  newsAt = Date.now();
  toast(translate('justClaimed', s.lang).replace('{nick}', nick), false, NEWS_SHOW_MS);
};

const pinged = new Set<string>();
const pingOnce = (district: number): void => {
  const key = `${new Date().toISOString().slice(0, 10)}:${district}`;
  if (pinged.has(key)) return;
  pinged.add(key);
  void rpc('my_ping', { p_district: district }).catch(() => { pinged.delete(key); });
};

let isRunning = false;
const runBackground = async (): Promise<void> => {
  if (isRunning) return;
  isRunning = true;
  onSession((s) => {
    // Supabase qulfi ichida so'rov yubormaslik uchun navbatga qo'yiladi.
    setTimeout(() => {
      // Kirgan odamga uylar bir marta bazadan to'g'ridan-to'g'ri (o'z uyi darhol ko'rinsin); mehmon — snapshotdan.
      void (s ? refreshProfile().then(sendSource).then(() => refreshHouses('live')) : Promise.resolve(setApp({ profile: null }))).then(() => applyDraftMap().catch(() => undefined));
      void connectMultiplayer().catch(() => undefined);
    }, 0);
  });
  setInterval(() => {
    if (document.hidden) return;
    ticks += 1;
    void Promise.allSettled([refreshCity(), ...(ticks % BOOT_EVERY === 0 ? [refreshBoot().then(applyDraftMap)] : [])]);
  }, REFRESH_MS);
  setInterval(() => {
    const s = getApp();
    if (!s.profile && !document.hidden) void supabase.auth.getSession().then(({ data }) => (data.session ? refreshProfile() : undefined)).catch(() => undefined);
    // Kunlik faollik: bir kunda har tuman uchun bir marta (yuklama — odamlar soniga qarab baza so'rovi o'smaydi).
    if (s.profile && !document.hidden) pingOnce(s.district);
  }, PING_MS);
  if (getApp().isSound) addEventListener('pointerdown', startAudio, { once: true });
};
