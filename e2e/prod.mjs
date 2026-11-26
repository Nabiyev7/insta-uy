/** Ishlab chiqarish saytini tez tekshirish: node e2e/prod.mjs [rasm.png]
 *  QUIC (HTTP/3) o'chiq — ba'zi tarmoqlarda Chrome'ning QUIC ulanishi uziladi; 3 marta urinadi (oxirgisi TLS 1.2 bilan); xatoni aniq yozadi.
 *  Egasining kompyuterida (2026-11-26): IPv6 ishlamaydi va TLS 1.3 ulanishi ERR_CONNECTION_RESET bilan uziladi; TLS 1.2 yoki faqat IPv4 — ochiladi. */
import { chromium } from 'playwright-core';

const SITE = process.env.SITE ?? 'https://citylanduz.pages.dev/';
const TRIES = 3;
const shotPath = process.argv[2] ?? 'prod.png';

const attempt = async (n, isTls12) => {
  const extra = isTls12 ? ['--ssl-version-max=tls1.2'] : [];
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--disable-quic', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', ...extra] });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
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

let isOk = false;
for (let n = 1; n <= TRIES && !isOk; n++) isOk = await attempt(n, n === TRIES);
if (!isOk) {
  console.log(`Sayt ${TRIES} urinishda ochilmadi: ${SITE}`);
  process.exit(1);
}
