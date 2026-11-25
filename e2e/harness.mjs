/** Sinovlar uchun umumiy: o'z portlarida, o'z (vaqtinchalik) bazasida server + sayt, Chrome va tez-tez kerak bo'ladigan amallar. */
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

export const root = fileURLToPath(new URL('..', import.meta.url));
const GPU = ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'];

export const waitFor = async (fn, what, ms = 30_000) => {
  const end = Date.now() + ms;
  for (;;) {
    const v = await Promise.resolve().then(fn).catch(() => false);
    if (v) return v;
    if (Date.now() > end) throw new Error(`Kutildi: ${typeof what === 'function' ? await what() : what}`);
    await new Promise((r) => { setTimeout(r, 200); });
  }
};

/** base — birinchi port (API); sayt +... `demo` — soxta aholi bilan. */
export const startServers = async ({ base = 8797, site = 5183, hasDemo = true } = {}) => {
  const data = mkdtempSync(path.join(tmpdir(), 'shahar-e2e-'));
  const API = `http://127.0.0.1:${base}`;
  const SITE = `http://localhost:${site}`;
  const ADMIN = `http://localhost:${site + 1}`;
  const children = [];
  const run = (args, cwd, env) => {
    const c = spawn(process.execPath, args, { cwd, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'inherit'] });
    children.push(c);
    return c;
  };
  let log = '';
  const api = run(['server/dev/main.ts'], root, { PORT: String(base), ...(hasDemo ? { DEMO: '1' } : {}), DEV_DATA: data, SITE_URL: SITE, ADMIN_URL: ADMIN, ALLOWED_ORIGINS: `${SITE},${ADMIN}` });
  api.stdout.on('data', (d) => { log += d; });
  await waitFor(() => log.includes('Admin:'), 'API', 60_000);
  const anon = /ANON=(\S+)/.exec(log)[1];
  const service = /SERVICE=(\S+)/.exec(log)[1];
  const env = { VITE_SUPABASE_ANON_KEY: anon, DEV_API: API, VITE_SITE_URL: SITE };
  const vite = path.join(root, 'node_modules/vite/bin/vite.js');
  run([vite, '--port', String(site), '--strictPort'], path.join(root, 'apps/web'), env);
  run([vite, '--port', String(site + 1), '--strictPort'], path.join(root, 'apps/admin'), env);
  await waitFor(async () => (await fetch(SITE)).ok && (await fetch(ADMIN)).ok, 'vite');
  const call = (fn, args, token) => fetch(`${API}/rest/v1/rpc/${fn}`, { method: 'POST', headers: token ? { authorization: `Bearer ${token}` } : {}, body: JSON.stringify(args) }).then((r) => r.json());
  /** Bot bilan lokal suhbat (/dev/telegram): javobdagi kirish tokeni. */
  const tokenIn = (r) => {
    const url = r.sent.flatMap((m) => m.buttons).find((b) => b.url?.includes('kirish='))?.url;
    return url ? new URL(url).searchParams.get('kirish') : null;
  };
  const botPost = (update) => fetch(`${API}/dev/telegram`, { method: 'POST', body: JSON.stringify(update) }).then((x) => x.json());
  /** Matn yuboradi; nik yozilsa — tasdiq ("Ha, to'g'ri") ham bosiladi. Kirish havolasi tokenini qaytaradi. */
  const botSay = async (id, text) => {
    const r = await botPost({ message: { message_id: 1, from: { id, first_name: 'Sinov' }, chat: { id, type: 'private' }, text } });
    const token = tokenIn(r);
    if (token || !r.sent.some((m) => m.buttons.some((b) => b.data === 'nick_ok'))) return token;
    return tokenIn(await botPost({ callback_query: { id: 'n', from: { id, first_name: 'Sinov' }, data: 'nick_ok' } }));
  };
  /** Telegram ID bo'yicha sessiya (akkaunt bo'lmasa nik bilan ochiladi). */
  const tgToken = async (id, nick = `tg_${id}`) => {
    const link = (await botSay(id, '/start')) ?? (await botSay(id, nick));
    const { token_hash: hash } = await fetch(`${API}/auth/telegram/redeem`, { method: 'POST', body: JSON.stringify({ token: link }) }).then((x) => x.json());
    return (await fetch(`${API}/auth/v1/verify`, { method: 'POST', body: JSON.stringify({ token_hash: hash }) }).then((x) => x.json())).access_token;
  };
  const tokenOf = async (login, password) => (await fetch(`${API}/auth/v1/token?grant_type=password`, { method: 'POST', body: JSON.stringify({ email: `${login}@login.citylanduz.uz`, password }) }).then((r) => r.json())).access_token;
  const stop = async () => {
    for (const c of children) c.kill();
    await new Promise((r) => { setTimeout(r, 500); });
    rmSync(data, { recursive: true, force: true, maxRetries: 5 });
  };
  // Sinov bazasida bot nomi bor (haqiqiy sozlama egasi bergunicha bo'sh turadi).
  await call('admin_setting', { p_key: 'telegram_bot', p_value: 'citylanduz_sinov_bot' }, await tokenOf('admin', 'admin12345'));
  return { API, SITE, ADMIN, data, service, call, tokenOf, tgToken, botSay, adminToken: () => tokenOf('admin', 'admin12345'), stop };
};

export const launch = () => chromium.launch({ channel: 'chrome', headless: true, args: GPU });

/** Server bilan ishlaydigan qulay amallar. */
export const helpers = ({ SITE, call, tgToken, botSay, adminToken }) => {
  /** Ko'rsatmadan o'tib shaharga kirish. */
  const enter = async (page, url = SITE) => {
    await page.goto(url);
    await page.locator('.guide').waitFor({ timeout: 60_000 });
    await page.locator('.guide .btn').click();
    await page.locator('.guide .btn').click();
    await page.locator('.guide .btn').click();
    await page.locator('.nav5').waitFor({ state: 'attached' });
    await page.waitForFunction(() => Boolean(window.__scene));
    await page.waitForTimeout(600);
  };
  const open = async (page, url = SITE) => {
    await page.goto(url);
    await page.locator('.nav5').waitFor({ state: 'attached', timeout: 60_000 });
    await page.waitForFunction(() => Boolean(window.__scene));
  };
  /** Ochiq kirish oynasida: Telegram tugmasi (t.me ochilmaydi) → bot suhbati → havola → sayt kirgan holda qayta ochiladi. */
  const register = async (page, id, nick) => {
    await page.evaluate(() => {
      const a = document.querySelector('.sheet a[href^="https://t.me/"]');
      a.addEventListener('click', (e) => e.preventDefault(), { once: true });
      a.click();
    });
    const token = (await botSay(id, '/start login')) ?? (await botSay(id, nick));
    if (!token) throw new Error(`bot havola bermadi: ${nick}`);
    await page.goto(`${SITE}/?kirish=${token}`);
    await page.waitForFunction(() => window.__app?.getState().profile !== null && !location.search.includes('kirish='), null, { timeout: 60_000 });
  };
  /** Uyni shu levelgacha ko'taradi va tanga beradi (admin sozlamasi orqali). */
  const raise = async (page, id, tier, coins = 100) => {
    const login = `tg${id}`;
    const token = await adminToken();
    const me = (await call('admin_users', { p_q: login }, token))[0];
    const state = await page.evaluate(() => ({ coins: window.__app.getState().boot.settings.coins, plots: window.__app.getState().profile.plots }));
    await call('admin_setting', { p_key: 'coins', p_value: { ...state.coins, tier: { 2: 1, 3: 1, 4: 1, 5: 1 }, maxTier: 5 } }, token);
    await call('admin_user', { p_id: me.id, p_action: 'coins', p_data: { delta: coins } }, token);
    const plot = state.plots[0];
    const mine = await tgToken(id);
    for (let t = plot.tier; t < tier; t++) await call('my_tier_coins', { p_plot: plot.plot }, mine);
    await call('admin_setting', { p_key: 'coins', p_value: state.coins }, token);
  };
  return { enter, open, register, raise };
};
