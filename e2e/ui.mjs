/** Interfeys oqimlari (docs/chat/INTERFEYS-PROMT.md §8): telefon 360×640 va 390×844, kompyuter; uz va ru. `npm run e2e` ichida ham ishlaydi, alohida: node e2e/ui.mjs */
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { helpers, launch, startServers, waitFor } from './harness.mjs';

const SCREENS = [{ width: 360, height: 640 }, { width: 390, height: 844 }, { width: 1280, height: 720 }];
const LANDSCAPE = { width: 640, height: 360 };
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
const MIN_TAP = 44;
const MENU = [['cityWorks'], ['myCars'], ['coins'], ['settings'], ['help'], ['rules'], ['privacy']];
const TABS = ['tabNew', 'tabYard', 'tabGarden', 'tabCar', 'tabLuxe', 'tabPet', 'tabSet', 'tabSpecial'];
/** Do'kon tablari: 2 qator, hammasi ko'rinadi, matn kesilmaydi (360 px va 1280 px). */
const checkTabs = async (page, where) => {
  const tabs = await page.evaluate(() => [...document.querySelectorAll('.sheet .tabs [role=tab]')].map((b) => { const r = b.getBoundingClientRect(); return { name: b.textContent, cut: b.scrollWidth > b.clientWidth + 1, x: r.x, r: r.right, y: r.y }; }));
  const width = page.viewportSize().width;
  for (const t of tabs) {
    assert.ok(!t.cut, `${where}: "${t.name}" tabi kesilgan`);
    assert.ok(t.x >= 0 && t.r <= width + 0.5, `${where}: "${t.name}" tabi ekrandan chiqdi`);
  }
  assert.ok(new Set(tabs.map((t) => Math.round(t.y))).size <= 2, `${where}: tablar 2 qatordan oshdi`);
};
const ENOUGH = 3000;

/** Ekrandagi tugmalar: bir-birini to'smaydi, ekrandan chiqmaydi, barmoqqa yetarli. */
const checkLayout = async (page, where) => {
  const boxes = await page.evaluate(() => [...document.querySelectorAll('.hud button, .hud .joystick, .hud .card')].flatMap((el) => {
    const r = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    if (r.width === 0 || style.visibility === 'hidden') return [];
    return [{ name: el.getAttribute('aria-label') ?? el.textContent.trim() ?? el.className, card: el.closest('.card') !== null, isCard: el.matches('.card'), tap: el.matches('button'), x: r.x, y: r.y, r: r.right, b: r.bottom }];
  }));
  const size = page.viewportSize();
  for (const a of boxes) {
    assert.ok(a.x >= -0.5 && a.y >= -0.5 && a.r <= size.width + 0.5 && a.b <= size.height + 0.5, `${where}: "${a.name}" ekrandan chiqdi`);
    if (a.tap) assert.ok(a.r - a.x >= MIN_TAP - 0.5 && a.b - a.y >= MIN_TAP - 0.5, `${where}: "${a.name}" bosish maydoni kichik (${Math.round(a.r - a.x)}×${Math.round(a.b - a.y)})`);
    assert.ok(!(a.x < size.width / 2 && a.r > size.width / 2 && a.y < size.height / 2 && a.b > size.height / 2), `${where}: "${a.name}" ekran o'rtasini to'sdi`);
    for (const b of boxes) {
      if (a === b || (a.isCard && b.card) || (b.isCard && a.card)) continue;
      assert.ok(a.r <= b.x + 0.5 || b.r <= a.x + 0.5 || a.b <= b.y + 0.5 || b.b <= a.y + 0.5, `${where}: "${a.name}" va "${b.name}" ustma-ust`);
    }
  }
};
const noEmoji = async (page, where) => {
  const text = await page.evaluate(() => document.querySelector('#root').innerText);
  assert.equal(EMOJI.exec(text)?.[0], undefined, `${where}: emoji qolgan`);
};

/** Bitta ekran o'lchami va tilda hamma oqim. */
const runFlows = async ({ browser, server, viewport, lang, step }) => {
  const { enter, raise, register } = helpers(server);
  const isPhone = viewport.width < 700;
  const tag = `${viewport.width}×${viewport.height} ${lang}`;
  const login = `ui_${lang}_${viewport.width}`;
  const tgId = (lang === 'uz' ? 6_100_000 : 6_200_000) + viewport.width;
  const errors = [];
  const ctx = await browser.newContext({ viewport, hasTouch: isPhone, isMobile: isPhone, deviceScaleFactor: 1 });
  await ctx.addInitScript((l) => { localStorage.setItem('lang', l); localStorage.setItem('quality', 'low'); }, lang);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errors.push(m.text()); });
  const app = (fn, arg) => page.evaluate(fn, arg);
  const sheet = page.locator('.sheet');
  const nav = page.locator('.nav5');
  const heading = (name) => sheet.getByRole('heading', { name, exact: true, level: 2 }).waitFor();
  const closeAll = async () => { if (await sheet.count()) await page.keyboard.press('Escape'); await waitFor(async () => (await sheet.count()) === 0, 'oyna yopilishi'); };
  let T = {};
  const at = (name, fn) => step(`${tag}: ${name}`, fn);

  await at('1. mehmon: karta → bo‘sh joy → oyna → "qurish" → kirish', async () => {
    await enter(page);
    T = await app((l) => window.__texts(l), lang);
    await page.locator('.card').getByText(T.freeTitle).waitFor();
    assert.ok(await app(() => window.__markers.current !== null), 'mehmonga "+" belgilari qatlami bor');
    assert.equal(await page.locator('.pill.coins, .bell').count(), 0, 'mehmonda tanga va qo‘ng‘iroq bo‘lmasin');
    await checkLayout(page, 'mehmon');
    const id = await app(() => {
      const s = window.__app.getState();
      const p = s.plan.plots.filter((q) => q.districtId === 1 && q.type === 'hovli' && q.rot === 0 && !s.houses.has(q.id))[0];
      Object.assign(window.__city, { view: { x: p.x, z: p.z, yaw: 0, height: 20 }, flight: null });
      return p.id;
    });
    await page.waitForTimeout(900);
    await (isPhone ? page.touchscreen.tap(viewport.width / 2, viewport.height / 2) : page.mouse.click(viewport.width / 2, viewport.height / 2));
    await waitFor(() => app(() => window.__app.getState().panel?.kind === 'plot'), 'bo‘sh joy oynasi');
    assert.equal(await app(() => window.__app.getState().panel.id), id, 'bosilgan joy ochilmadi');
    await sheet.getByText(T.free, { exact: true }).waitFor();
    assert.equal(await page.locator('.facts span').count(), 3);
    await noEmoji(page, 'bo‘sh joy');
    await sheet.getByRole('button', { name: T.buildFree }).click();
    await heading(T.login);
    assert.match(await sheet.getByRole('link', { name: T.viaTelegram }).getAttribute('href'), /^https:\/\/t\.me\/[a-z_]+\?start=login$/);
    assert.equal(await sheet.getByLabel(T.password).isVisible(), false, 'parol maydoni yashirin bo‘lsin (eski akkauntlar uchun)');
  });

  await at('2. kirish → o‘sha joyga qaytadi → uy qurish → tabrik → nik', async () => {
    await register(page, tgId, login);
    await waitFor(() => app(() => window.__app.getState().panel?.kind === 'plot' && window.__app.getState().profile !== null), 'kirgach uchastkaga qaytish');
    await sheet.getByRole('button', { name: T.buildFree }).click();
    assert.equal(await page.getByLabel(T.igNick).count(), 0, 'nik botda yozilgan — qayta so‘ralmasin');
    await sheet.locator(`.nick`, { hasText: `@${login}` }).waitFor();
    await sheet.locator('form button[type=submit]').click();
    await waitFor(() => app(() => window.__app.getState().building !== null), async () => `qurilish: ${await page.locator('.toasts').innerText().catch(() => '')}`);
    await heading(T.congrats);
    await sheet.getByRole('button', { name: T.stories }).waitFor();
    assert.ok(await app((nick) => { const s = window.__app.getState(); return s.houses.get(s.profile.plots[0].plot)?.nick === nick; }, login), 'uyda nik yo‘q');
    await noEmoji(page, 'tabrik');
    await page.goBack();
    await waitFor(async () => (await sheet.count()) === 0, 'orqaga tugmasi oynani yopmadi');
    await page.locator('.card').getByText(T.cheerBuilt).waitFor();
    await page.locator('.card-x').click();
    // Bepul uy olindi: bo'sh joylardagi "+" darhol yo'qoladi (sahifa yangilanmasdan), bo'sh joy oynasida qurish tugmasi yo'q.
    await waitFor(() => app(() => window.__markers.current?.points.visible === false), '"+" belgilari yo‘qolishi');
    const empty = await app(() => { const s = window.__app.getState(); return s.plan.plots.find((q) => q.districtId === 1 && q.type === 'hovli' && !s.houses.has(q.id)).id; });
    await app((id) => window.__app.setState({ panel: { kind: 'plot', id }, trail: [] }), empty);
    await sheet.getByText(T.e_free_used).waitFor();
    assert.equal(await sheet.getByRole('button', { name: T.buildFree }).count(), 0, 'uyi borga qurish tugmasi yo‘q');
    await closeAll();
  });

  await at('3. rejimlar, joystick, mashina tanlash', async () => {
    for (const [key, mode] of [['modeWalk', 'walk'], ['modeDrive', 'drive'], ['modeCity', 'city']]) {
      await page.locator('.modes').getByRole('button', { name: T[key], exact: true }).click();
      await page.locator(`.hud.mode-${mode}`).waitFor();
      assert.equal(await page.locator('.joystick').count(), mode === 'city' ? 0 : 1, `${mode}: joystick`);
      assert.equal(await page.locator('.brake').count(), mode === 'drive' ? 1 : 0, `${mode}: tormoz`);
      await page.waitForTimeout(350);
      await checkLayout(page, mode);
      if (isPhone) {
        await page.setViewportSize(LANDSCAPE);
        await page.waitForTimeout(250);
        await checkLayout(page, `${mode} yotiq`);
        await page.setViewportSize(viewport);
      }
      if (mode === 'walk') {
        await page.locator('.actions').getByRole('button', { name: T.emotes }).click();
        await page.locator('.emotes').getByRole('button', { name: T.wave }).click();
        assert.equal(await app(() => window.__player.emote), 3);
        await page.locator('.actions').getByRole('button', { name: T.photo }).click();
        await page.locator('.photo-bar').waitFor();
        await page.goBack();
        await nav.waitFor();
      }
      if (mode === 'drive') {
        await page.getByRole('button', { name: T.pickCar }).click();
        await heading(T.myCars);
        await sheet.getByRole('button', { name: T.chosen }).click();
        await waitFor(async () => (await sheet.count()) === 0, 'mashina tanlangach yopilishi');
      }
    }
  });

  await at('3b. oyna ochiqda ekran tugmalari ostidan ko‘rinmaydi', async () => {
    for (const size of isPhone ? [viewport, LANDSCAPE, { width: 740, height: 360 }, { width: 844, height: 390 }] : [{ width: 768, height: 1024 }, { width: 1024, height: 768 }, viewport]) {
      await page.setViewportSize(size);
      for (const p of [{ kind: 'me' }, { kind: 'shop' }]) {
        await app((x) => window.__app.setState({ panel: x, trail: [] }), p);
        await page.waitForTimeout(300);
        const hits = await app(() => {
          const s = document.querySelector('.sheet').getBoundingClientRect();
          return [...document.querySelectorAll('.hud button, .hud .joystick')].flatMap((el) => {
            const r = el.getBoundingClientRect();
            const isSeen = r.width > 0 && getComputedStyle(el).visibility !== 'hidden';
            return isSeen && r.left < s.right && r.right > s.left && r.top < s.bottom && r.bottom > s.top ? [el.getAttribute('aria-label') ?? el.textContent] : [];
          });
        });
        assert.deepEqual(hits, [], `${size.width}×${size.height} ${p.kind}: oyna ostida qoldi`);
      }
    }
    await page.setViewportSize(viewport);
    await closeAll();
  });

  await at('4. pastki panel va menyuning har bandi', async () => {
    for (const [label, title] of [['map', 'map'], ['chatShort', 'chatTitle'], ['shop', 'shop'], ['rankShort', 'rank']]) {
      await nav.getByRole('button', { name: new RegExp(`^${T[label]}`) }).click();
      await heading(T[title]);
      await noEmoji(page, title);
      await page.goBack();
      await waitFor(async () => (await sheet.count()) === 0, `${title}: orqaga`);
    }
    await nav.getByRole('button', { name: T.myHouse, exact: true }).click();
    await heading(T.me);
    await closeAll();
    for (const [key] of MENU) {
      await page.locator('.topbar').getByRole('button', { name: T.menu, exact: true }).click();
      await sheet.getByRole('button', { name: T[key], exact: true }).click();
      await heading(T[key]);
      await noEmoji(page, key);
      await sheet.getByRole('button', { name: T.back, exact: true }).click();
      await heading(T.menu);
      await sheet.getByRole('button', { name: T.close, exact: true }).click();
    }
    await page.locator('.topbar').getByRole('button', { name: T.menu, exact: true }).click();
    assert.equal(await sheet.getByRole('link', { name: /@citylanduz/ }).getAttribute('href'), 'https://t.me/citylanduz');
    await closeAll();
    await page.locator('.pill.place').click();
    await sheet.waitFor();
    await closeAll();
  });

  await at('4b. davlat binosi, tijorat, ko‘cha, boshqaning uyi', async () => {
    for (const [panel, check] of [
      [{ kind: 'civic', id: 'hokimiyat' }, () => sheet.getByRole('button', { name: T.cityWorks }).click().then(() => heading(T.cityWorks))],
      [{ kind: 'commerce', id: 'BB' }, null],
      [{ kind: 'plot', id: 'P0001' }, async () => {
        for (const name of [T.closeLook, T.giftTitle]) await sheet.getByRole('button', { name, exact: true }).waitFor();
        assert.equal(await sheet.getByRole('button', { name: T.vote, exact: true }).count(), 0, 'faqat yurak qoladi');
        await sheet.getByRole('link', { name: 'Instagram' }).waitFor();
        assert.equal(await sheet.getByText(T.claimBtn).count(), 0);
        const heart = sheet.locator('.heart').getByRole('button', { name: T.heartIt });
        if (await heart.count()) await heart.click();
        await sheet.locator('.heart').getByRole('button', { name: T.hearted }).waitFor();
      }],
    ]) {
      const real = panel.kind === 'commerce' ? { ...panel, id: await app(() => window.__app.getState().plan.commerce.find((c) => c.type === 'dokon').id) } : panel;
      await app((p) => window.__app.setState({ panel: p, trail: [] }), real);
      await (check ? check() : sheet.getByText(T.notForSale, { exact: true }).waitFor());
      await noEmoji(page, panel.kind);
      await closeAll();
    }
    await app(() => window.__app.setState({ panel: { kind: 'plot', id: 'P0001' }, trail: [] }));
    await sheet.getByRole('button', { name: T.closeLook, exact: true }).click();
    await page.locator('.hud.mode-walk').waitFor();
    await page.locator('.modes').getByRole('button', { name: T.modeCity, exact: true }).click();
  });

  const reload = async (tier) => {
    await page.reload();
    await nav.waitFor({ timeout: 60_000 });
    await page.waitForFunction((t) => window.__app.getState().profile?.plots[0]?.tier === t, tier);
  };
  const goods = (id) => page.locator(`.good[data-id="${id}"]`);
  const openTab = async (key) => {
    // Do'kon oxirgi bo'limni eslaydi: tanga tablari uchun avval "Tanga do'koni".
    const coinsPart = sheet.getByRole('tab', { name: T.shopCoins });
    if (TABS.includes(key) && (await coinsPart.count()) > 0 && (await coinsPart.getAttribute('aria-selected')) !== 'true') await coinsPart.click();
    const tab = sheet.getByRole('tab', { name: T[key], exact: true });
    await tab.scrollIntoViewIfNeeded();
    await tab.click();
    await page.locator('.good').first().waitFor();
  };
  await at('4c. kuchaytirish: tanga yetmasa — qancha kerak, yetsa — tasdiq, qurilish, tabrik', async () => {
    const openMine = async () => {
      await nav.getByRole('button', { name: T.myHouse, exact: true }).click();
      await heading(T.me);
    };
    await openMine();
    const coins = await app(() => window.__app.getState().profile.coins);
    await raise(page, tgId, 1, -coins);
    await reload(1);
    await openMine();
    await sheet.getByText(T.needMore.replace('{n}', '300')).waitFor();
    await sheet.getByRole('button', { name: T.addCoins }).click();
    await heading(T.coins);
    await raise(page, tgId, 1, 300);
    await reload(1);
    await openMine();
    await sheet.locator('.upgrade').click();
    await page.locator('.modal').getByRole('button', { name: T.yes, exact: true }).click();
    await waitFor(() => app(() => window.__app.getState().building !== null), async () => `qurilish effekti: ${await page.locator('.toasts').innerText()}`);
    await heading(T.levelUp);
    assert.equal(await app(() => window.__app.getState().profile.plots[0].tier), 2);
    await closeAll();
  });

  await at('5. do‘kon: tablar, qulf (1, 5-level), sotib olish → hovlida', async () => {
    await nav.getByRole('button', { name: new RegExp(`^${T.shop}`) }).click();
    await checkTabs(page, 'do‘kon');
    for (const key of TABS) await openTab(key);
    assert.equal(await sheet.locator('.goods').getByText(T.som).count(), 0, 'tanga do‘konida so‘m narxi yo‘q');
    await openTab('tabYard');
    await goods('dam_basseyn').getByText(`5-${T.atLevel}`).waitFor();
    await goods('lux_pavilyon').getByText(`5-${T.atLevel}`).waitFor();
    await goods('dam_basseyn').click();
    assert.ok(await sheet.locator('footer .btn:not(.pay-soon)').last().isDisabled(), '1-levelda bezak sotilmasin');
    assert.equal(await sheet.locator('footer .pay-soon').count(), 0, 'to‘lov o‘chiq — so‘m tugmasi yo‘q');
    // Premium bo'limi: 4 tab, bo'sh kategoriyada "Tez kunda" kartasi.
    await sheet.getByRole('tab', { name: T.shopPremium }).click();
    await checkTabs(page, 'premium');
    await sheet.getByRole('tab', { name: T.ptHouses, exact: true }).click();
    await sheet.locator('.premium-soon').getByText(T.premiumSoonHouses).waitFor();
    await sheet.getByRole('tab', { name: T.shopCoins }).click();
    await openTab('tabYard');
    await raise(page, tgId, 5, ENOUGH + 10);
    await reload(5);
    await nav.getByRole('button', { name: new RegExp(`^${T.shop}`) }).click();
    await openTab('tabYard');
    assert.equal(await goods('dam_basseyn').locator('em').count(), 0, '5-levelda basseyn ochiq bo‘lsin');
    assert.equal(await goods('lux_pavilyon').locator('em').count(), 0, '5-levelda lyuks ochiq bo‘lsin');
    await openTab('tabGarden');
    await goods('daraxt_olma').click();
    const before = await app(() => window.__app.getState().profile.coins);
    await sheet.locator('footer .btn:not(.pay-soon)').last().click();
    await waitFor(() => app((n) => window.__app.getState().profile.coins === n, before - 200), 'tanga kamayishi');
    await goods('daraxt_olma').getByText(T.have).waitFor();
    await sheet.getByRole('button', { name: T.putYard }).click();
    await heading(T.decorate);
    const dots = await app(() => [...document.querySelectorAll('.yard .spot')].map((g) => { const r = g.getBoundingClientRect(); return { name: g.getAttribute('aria-label'), x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width }; }));
    for (const a of dots) {
      assert.ok(a.w >= MIN_TAP - 0.5, `hovli nuqtasi kichik: ${a.name} ${a.w}`);
      for (const b of dots) assert.ok(a === b || Math.hypot(a.x - b.x, a.y - b.y) >= MIN_TAP - 1.5, `hovli nuqtalari yaqin: ${a.name} va ${b.name}`);
    }
    await sheet.locator('.yard .spot.free').filter({ has: page.locator('title', { hasText: lang === 'uz' ? 'Old burchak, chapda' : 'Передний угол, слева' }) }).click();
    await sheet.getByRole('button', { name: T.place, exact: true }).first().click();
    await waitFor(() => app((nick) => [...window.__app.getState().houses.values()].some((h) => h.nick === nick && h.decor.includes('burchak_1:daraxt_olma')), login), 'bezak hovlida');
    await closeAll();
    await nav.getByRole('button', { name: new RegExp(`^${T.shop}`) }).click();
    await openTab('tabLuxe');
    await noEmoji(page, 'do‘kon');
    await goods('lux_pavilyon').click();
    await sheet.locator('footer .btn').first().click();
    await page.locator('.preview').waitFor();
    await checkLayout(page, 'sinab ko‘rish');
    await page.locator('.preview').getByRole('button', { name: T.close }).click();
  });

  await at('6. Uyim: har bo‘lim, akkauntni o‘chirish tasdig‘i', async () => {
    const openMe = async () => { await nav.getByRole('button', { name: T.myHouse, exact: true }).click(); await heading(T.me); };
    await openMe();
    for (const [button, title] of [['decorate', 'decorate'], ['bioTitle', 'bioTitle'], ['giftsTitle', 'giftsTitle'], ['settings', 'settings']]) {
      await sheet.getByRole('button', { name: T[button], exact: true }).click();
      await heading(T[title]);
      await noEmoji(page, title);
      await page.goBack();
      await heading(T.me);
    }
    await sheet.getByRole('button', { name: T.bioTitle, exact: true }).click();
    await page.getByLabel(T.bio).fill('Salom');
    await sheet.getByRole('button', { name: T.save, exact: true }).click();
    await waitFor(() => app(() => window.__app.getState().profile.plots[0].bio === 'Salom'), 'yozuv saqlanishi');
    await page.goBack();
    await sheet.getByText(T.maxLevel).waitFor();
    await sheet.getByRole('button', { name: T.deleteAcc }).click();
    await page.locator('.modal').getByRole('button', { name: T.no, exact: true }).click();
    assert.equal(await page.locator('.modal').count(), 0);
    // Orqaga tugmasi avval tasdiq oynasini yopadi, Uyim ochiq qoladi.
    await sheet.getByRole('button', { name: T.deleteAcc }).click();
    await page.locator('.modal').waitFor();
    await page.goBack();
    await waitFor(async () => (await page.locator('.modal').count()) === 0, 'tasdiq oynasi yopilishi');
    await heading(T.me);
    assert.ok(await app(() => window.__app.getState().profile !== null), 'tasdiqsiz o‘chmasin');
    await sheet.getByRole('button', { name: T.goHome }).click();
    await waitFor(() => app(() => window.__app.getState().panel?.kind === 'plot'), 'uyga borish');
    for (const key of ['decorate', 'bioTitle', 'stories', 'share']) await sheet.getByRole('button', { name: T[key], exact: true }).waitFor();
    await closeAll();
  });

  await at('7. tanga, qo‘ng‘iroq, kunlik bonus kartasi', async () => {
    await page.locator('.pill.coins').click();
    await heading(T.coins);
    await sheet.getByText(T.r_founder).waitFor();
    // 6f: xazina ovi vaqtincha o'chiq — bo'lim va "qanday topiladi" qatori yo'q.
    assert.equal(await sheet.getByText(T.treasure, { exact: true }).count(), 0, 'xazina bo‘limi yo‘q');
    assert.equal(await sheet.getByText(T.r_treasure).count(), 0);
    // "Tanga sotib olish" — do'konning Premium → Tangalar tabi.
    await sheet.locator('.buy-coins').click();
    await heading(T.shop);
    // 13-qadam: pulli xarid faqat botda (Stars) — saytda to'lov oynasi yo'q, tugma botga chuqur havola.
    assert.match(await sheet.locator('.packs .bot-buy').first().getAttribute('href'), /^https:\/\/t\.me\/[A-Za-z_]+\?start=buy_pack1$/);
    assert.equal(await sheet.locator('.packs').getByText('500', { exact: true }).count(), 0, 'kichik paket yo‘q');
    await page.goBack();
    await heading(T.coins);
    assert.equal(await sheet.getByText(T.quests ?? 'Topshiriqlar', { exact: true }).count(), 0, 'topshiriqlar yo‘q');
    // 6f: tanga yuborish olib tashlangan.
    assert.equal(await sheet.getByText(T.sendCoins, { exact: true }).count(), 0, 'tanga yuborish bo‘limi yo‘q');
    assert.equal(await sheet.getByLabel(T.sendTo).count(), 0);
    await checkLayout(page, 'tanga oynasi');
    await closeAll();
    await page.locator('.bell').click();
    await heading(T.notes);
    // Xabar bo'lsa o'qiladi (nik tasdig'i yo'q — yangi odamda xabar bo'lmasligi mumkin).
    if (await sheet.getByRole('button', { name: T.readAll }).count()) await sheet.getByRole('button', { name: T.readAll }).click();
    await sheet.getByText(T.notesEmpty).waitFor();
    await closeAll();
    await page.locator('.card').getByText(T.daily).waitFor();
    await checkLayout(page, 'kunlik bonus');
    const before = await app(() => window.__app.getState().profile.coins);
    await page.locator('.card').getByRole('button', { name: T.dailyTake }).click();
    await waitFor(() => app((n) => window.__app.getState().profile.coins === n, before + 100), 'kunlik bonus');
    await page.locator('.card').getByText(T.newDecor).waitFor();
    await page.locator('.card-x').click();
    assert.equal(await page.locator('.card').count(), 0);
  });

  await at('8. ekranni tozalash, tun rejimi, chap qo‘l, sozlamalar saqlanadi', async () => {
    const menu = () => page.locator('.topbar').getByRole('button', { name: T.menu, exact: true }).click();
    await menu();
    await sheet.getByRole('button', { name: T.hideUi }).click();
    await page.locator('.eye').waitFor();
    assert.equal(await nav.count(), 0);
    await page.waitForTimeout(450);
    await page.locator('.eye').click();
    await nav.waitFor();
    await menu();
    await sheet.getByRole('button', { name: T.settings, exact: true }).click();
    // Sozlamalarda faqat Til va Ovoz; interfeys doim to'q.
    for (const gone of [T.dark, T.handLeft, T.low]) assert.equal(await sheet.getByRole('button', { name: gone, exact: true }).count(), 0, `sozlamada ${gone} yo‘q`);
    await sheet.getByRole('button', { name: T.off, exact: true }).first().waitFor();
    assert.equal(await app(() => document.documentElement.dataset.theme), 'dark');
    await checkLayout(page, 'sozlamalar');
    await closeAll();
  });

  await at('9. qidiruv, internet yo‘q, mehmon do‘koni, chiqish', async () => {
    await nav.getByRole('button', { name: new RegExp(`^${T.map}`) }).click();
    await page.getByPlaceholder(T.searchHint).fill(login);
    await sheet.getByRole('button', { name: new RegExp(login) }).first().click();
    await waitFor(() => app(() => window.__app.getState().panel?.kind === 'plot'), 'qidiruv');
    await closeAll();
    await ctx.setOffline(true);
    await page.locator('.banner').getByText(T.offline).waitFor();
    await nav.getByRole('button', { name: new RegExp(`^${T.rankShort}`) }).click();
    await sheet.getByRole('button', { name: T.retry }).waitFor();
    await ctx.setOffline(false);
    await sheet.getByRole('button', { name: T.retry }).click();
    await sheet.getByText('@demo_').first().waitFor();
    await closeAll();
    await page.locator('.topbar').getByRole('button', { name: T.menu, exact: true }).click();
    await sheet.getByRole('button', { name: T.logout }).click();
    await waitFor(() => app(() => window.__app.getState().profile === null), 'chiqish');
    await nav.getByRole('button', { name: new RegExp(`^${T.shop}`) }).click();
    await openTab('tabCar');
    await goods('avto_sedan').click();
    await sheet.locator('footer .btn:not(.pay-soon)').last().click();
    await heading(T.login);
    await register(page, tgId, login);
    await heading(T.shop);
    assert.equal(await goods('avto_sedan').getAttribute('aria-pressed'), 'true', 'kirgach o‘sha tovarga qaytsin');
  });
  // Internet o'chirib ko'rilganda brauzer yozgan tarmoq xatolari hisobga olinmaydi.
  assert.deepEqual(errors.filter((e) => !/ERR_INTERNET_DISCONNECTED|Failed to fetch|net::|NetworkError/.test(e)), [], `${tag}: konsolda xatolar`);
  await ctx.close();
};

const only = process.env.UI_ONLY;
/** Har til uchun alohida server (ro'yxatdan o'tish soatiga 5 ta bilan cheklangan). */
export const runUi = async (step) => {
  const browser = await launch();
  try {
    for (const lang of ['uz', 'ru']) {
      const server = await startServers({ base: 8817, site: 5203 });
      try {
        for (const viewport of SCREENS) if (!only || `${viewport.width}${lang}`.includes(only)) await runFlows({ browser, server, viewport, lang, step });
      } finally {
        await server.stop();
      }
    }
  } finally {
    await browser.close();
  }
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await runUi(async (name, fn) => {
    const t = Date.now();
    await fn();
    process.stdout.write(`  ✓ ${name} (${Date.now() - t} ms)\n`);
  });
  process.stdout.write('Interfeys: hammasi o‘tdi\n');
}
