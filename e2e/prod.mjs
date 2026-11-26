/** Ishlab chiqarish saytini tez tekshirish: node e2e/prod.mjs [rasm.png]
 *  QUIC (HTTP/3) o'chiq — ba'zi tarmoqlarda Chrome'ning QUIC ulanishi uziladi; 3 marta urinadi (oxirgisi TLS 1.2 bilan); xatoni aniq yozadi.
 *  Egasining kompyuterida (2026-11-26): IPv6 ishlamaydi va TLS 1.3 ulanishi ERR_CONNECTION_RESET bilan uziladi; TLS 1.2 yoki faqat IPv4 — ochiladi.
 *  14-qadam: "+" ssenariysi — mehmon → belgilar bor; uyi bor akkaunt → yo'q (rasm `docs/chat/ui-uyi-bor.png`).
 *  Akkaunt: `.env.render` dagi kalit bilan bir martalik kirish havolasi (sukut — egasi, `PROD_TG=<telegram id>`); hech narsa o'zgartirilmaydi.
 *  Akkauntda haqiqiy uy hali bo'lmasa — profil javobiga bitta uy qo'shib (faqat brauzerda) sayt mantiqi tekshiriladi. */
import { existsSync, readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const SITE = process.env.SITE ?? 'https://citylanduz.pages.dev/';
const TRIES = 3;
const shotPath = process.argv[2] ?? 'prod.png';
const HOUSE_SHOT = 'docs/chat/ui-uyi-bor.png';
const OWNER_TG = process.env.PROD_TG ?? '680462045';
const PHONE = { width: 390, height: 844 };

const argsOf = (isTls12) => ['--disable-quic', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', ...(isTls12 ? ['--ssl-version-max=tls1.2'] : [])];

const attempt = async (n, isTls12) => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: argsOf(isTls12) });
  try {
    const page = await browser.newPage({ viewport: PHONE });
    const errors = [];
    page.on('pageerror', (e) => errors.push(`sahifa: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`konsol: ${m.text().slice(0, 160)}`); });
    page.on('requestfailed', (r) => errors.push(`so'rov: ${r.url().slice(0, 90)} — ${r.failure()?.errorText ?? '?'}`));
    const t0 = Date.now();
    const res = await page.goto(SITE, { timeout: 60_000 });
    if (!res?.ok()) throw new Error(`HTTP ${res?.status() ?? 'javob yo‘q'}`);
    await page.locator('.guide, .nav5').first().waitFor({ timeout: 90_000 });
    console.log(`${n}-urinish${isTls12 ? ' (TLS 1.2 — oddiy ulanish shu tarmoqda uzildi)' : ''}: ochildi ${((Date.now() - t0) / 1000).toFixed(1)} s`);
    await page.waitForTimeout(3000);
    console.log('xatolar:', errors.length ? errors.slice(0, 8) : 'yo‘q');
    await page.screenshot({ path: shotPath });
    return true;
  } catch (error) {
    // net::ERR_QUIC_PROTOCOL_ERROR, ERR_CONNECTION_RESET, ERR_NAME_NOT_RESOLVED va h.k. — aynan shu matn chiqadi.
    console.log(`${n}-urinish: XATO — ${error instanceof Error ? error.message.split('\n')[0] : String(error)}`);
    return false;
  } finally {
    await browser.close();
  }
};

/** `.env.render` dan (gitda yo'q) — ekranga chiqarilmaydi. */
const envOf = () => {
  if (!existsSync('.env.render')) return null;
  const pairs = readFileSync('.env.render', 'utf8').split(/\r?\n/).map((l) => /^([A-Z_]+)=(.*)$/.exec(l)).filter(Boolean);
  const env = Object.fromEntries(pairs.map((m) => [m[1], m[2].trim()]));
  return env.SUPABASE_URL && env.SUPABASE_SERVICE_KEY ? { url: env.SUPABASE_URL, key: env.SUPABASE_SERVICE_KEY } : null;
};
/** Bir martalik kirish havolasi (magic link token) — sayt `?kirish=` bilan kiradi. */
const loginToken = async ({ url, key }, telegram) => {
  const headers = { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json' };
  const rows = await fetch(`${url}/rest/v1/profiles?telegram_id=eq.${encodeURIComponent(telegram)}&select=user_id`, { headers }).then((r) => r.json());
  const uid = rows?.[0]?.user_id;
  if (!uid) throw new Error('akkaunt topilmadi');
  const user = await fetch(`${url}/auth/v1/admin/users/${uid}`, { headers }).then((r) => r.json());
  const link = await fetch(`${url}/auth/v1/admin/generate_link`, { method: 'POST', headers, body: JSON.stringify({ type: 'magiclink', email: user.email }) }).then((r) => r.json());
  const hash = link.hashed_token ?? link.properties?.hashed_token;
  if (!hash) throw new Error('kirish havolasi olinmadi');
  return hash;
};

const marks = (page) => page.evaluate(() => window.__belgilar?.() ?? null);
const waitAuth = (page, auth) => page.waitForFunction((a) => window.__belgilar?.().auth === a, auth, { timeout: 90_000 });
/** Belgilar yangilanishi uchun bir oz kutiladi (kamera, profil, uylar). */
const settle = (page) => page.waitForTimeout(6000);

const plusScenario = async (isTls12) => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: argsOf(isTls12) });
  const results = [];
  const check = (name, ok, info) => { results.push(ok); console.log(`${ok ? '✅' : '❌'} ${name}:`, JSON.stringify(info)); };
  try {
    const guest = await browser.newPage({ viewport: PHONE });
    await guest.goto(SITE, { timeout: 60_000 });
    await waitAuth(guest, 'guest');
    await settle(guest);
    const g = await marks(guest);
    check('mehmon — bo‘sh joy belgilari bor', g !== null && (g.plus > 0 || g.kutyapti), g);
    await guest.close();

    const env = envOf();
    if (!env) { console.log('… uyi bor akkaunt: .env.render yo‘q — o‘tkazib yuborildi'); return results.every(Boolean); }
    const open = async (fakeHouse) => {
      const page = await browser.newPage({ viewport: PHONE });
      if (fakeHouse) {
        // Faqat shu brauzerda: profil javobiga bitta uy (bazaga hech narsa yozilmaydi).
        await page.route('**/rest/v1/rpc/my_profile', async (route) => {
          const res = await route.fetch();
          const body = await res.json();
          const plots = [{ plot: 'P0001', status: 'owned', address: '', instagram: body.instagram, bio: '', tier: 1, wall: 0, roof: 0, decor: [], places: {}, material: 0, frame: 0, door: 0, label: '', has_expansion: false, expansion: null }];
          await route.fulfill({ response: res, json: { ...body, free_used: true, plots } });
        });
      }
      await page.goto(`${SITE}?kirish=${await loginToken(env, OWNER_TG)}`, { timeout: 60_000 });
      await waitAuth(page, 'user');
      await settle(page);
      return page;
    };
    const real = await open(false);
    const r = await marks(real);
    if ((r?.uylar ?? 0) > 0) {
      check('uyi bor akkaunt (haqiqiy) — "+" va "kutyapti" yo‘q', r.plus === 0 && !r.kutyapti, r);
      await real.screenshot({ path: HOUSE_SHOT });
    } else {
      check('uysiz akkaunt — belgilar bor (bepul uy olishi mumkin)', r !== null && (r.plus > 0 || r.kutyapti), r);
      await real.close();
      const fake = await open(true);
      const f = await marks(fake);
      check('uyi bor akkaunt (profilga 1 uy qo‘shildi) — "+" va "kutyapti" yo‘q', f !== null && f.uylar === 1 && f.plus === 0 && !f.kutyapti, f);
      await fake.screenshot({ path: HOUSE_SHOT });
    }
    return results.every(Boolean);
  } catch (error) {
    console.log(`❌ "+" ssenariysi: ${error instanceof Error ? error.message.split('\n')[0] : String(error)}`);
    return false;
  } finally {
    await browser.close();
  }
};

let okAt = 0;
for (let n = 1; n <= TRIES && !okAt; n++) if (await attempt(n, n === TRIES)) okAt = n;
if (!okAt) {
  console.log(`Sayt ${TRIES} urinishda ochilmadi: ${SITE}`);
  process.exit(1);
}
if (process.env.PLUS !== '0' && !(await plusScenario(okAt === TRIES))) process.exit(1);
