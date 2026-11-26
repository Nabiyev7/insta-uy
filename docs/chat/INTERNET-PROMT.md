# 12-qadam: internetga chiqarish (beta) — CityLand UZ

> Egasi bilan (2026-11-25). **6-qadam (`BOSQICH-2-3-PROMT.md`) to'liq tugagandan keyin** bajariladi. Avval `README.md` "Internetga chiqarish" bo'limini o'qi.
> Maqsad: sayt haqiqiy havolada ochiladi, egasi o'z telefonida sinaydi, keyin 20–50 kishilik beta. Xarajat 0 so'm (faqat bepul tariflar).

## Egasidan olingan ma'lumotlar (2026-11-26)
- Bot: **@Citylanduz_bot** → `TELEGRAM_BOT=Citylanduz_bot` (secret emas; admin sozlamasi `telegram_bot` ham shu).
- Egasining Telegram ID: **680462045** → `ADMIN_TELEGRAM_ID=680462045`.
- Kanal: **@citylanduz** → `TELEGRAM_CHANNEL=citylanduz`.
- Jonli server: Render.com bepul.

## Egasi nima qiladi (faqat shular — qolgani sening ishing)
Akkaunt ochish va parol kiritishni egasi o'zi qiladi. Sen buyruqni ishga tushirasan, brauzerda tasdiqlash oynasi ochilsa — egasiga "brauzerda tasdiqlang" deb aytasan va kutasan.
1. **Cloudflare** akkaunti (bepul) → `npx wrangler login`.
2. **Supabase** akkaunti (bepul) → `npx supabase login`; loyiha yaratishni ham buyruq bilan qil (region: Yevropa, Markaziy Osiyoga eng yaqini).
3. **Telegram bot tokeni** — BotFather'dan, egasi o'zi `wrangler secret put TELEGRAM_TOKEN` ga kiritadi (token chatga yozilmaydi).
4. Bot username, kanal (`@citylanduz`), `ADMIN_TELEGRAM_ID` — egasidan so'ra.
5. **Cloudflare Web Analytics** tokeni (Cloudflare panelida bepul) → `VITE_CF_ANALYTICS`.

## Sen nima qilasan
1. **Supabase**: link → `db push` (hamma migratsiyalar) → Sign ups o'chiq → `supabase/test` sinovlari haqiqiy bazada o'tsin.
2. **Worker**: `wrangler deploy`; maxfiylar (`server/.env.example` ro'yxati) — `HASH_SECRET`, `TELEGRAM_WEBHOOK_SECRET` ni o'zing yarat (`openssl rand -hex 32`); to'lov kalitlari bo'sh (`payments_enabled=false`).
3. **Telegram**: `npm run bot:setup` (muhitda `TELEGRAM_TOKEN`, `SITE_URL`, `API_URL`, `TELEGRAM_WEBHOOK_SECRET`, `ADMIN_TELEGRAM_ID`) — buyruqlar (uz/ru, admin alohida), tavsif, Menu tugmasi (Mini App) va webhook bir yo'la; takror ishga tushirsa bo'ladi. Keyin bot `/start` → nik → «🏙 Shahar» (Mini App) ishlashini tekshir; bot kanalda admin bo'lishi kerakligini egasiga ayt. BotFather'da Mini App domeni (`/setdomain` — sayt manzili) ham kerak bo'lishi mumkin.
4. **Sayt va admin**: Cloudflare Pages (`citylanduz`, `citylanduz-admin`), o'zgaruvchilar README bo'yicha. GitHub'ga ulab **avtomatik deploy** (main'ga push → sayt yangilanadi) — qo'lda yig'ish yo'q.
5. **Realtime (ko'p o'yinchi)** — egasi tanladi: **Render.com bepul** (Web Service, Node, GitHub'dan avtomatik deploy). 15 daqiqa bo'sh tursa uxlaydi — sayt shu paytda yakka rejimda ishlasin va server uyg'ongach avtomatik ulansin ("Jonli rejim ulanmoqda…" kichik yozuv). Egasi Render'ga GitHub bilan kiradi va ruxsat beradi; qolganini (`render.yaml`, env, CORS) sen qil.
6. **Birinchi admin**: egasi botga `/start` yozadi → uning `telegram_id` siga `role='admin'`.
7. **Tozalik**: `server/dev`, `demo_*` niklar, `admin/admin12345` ishlab chiqarishda yo'q; `.env` va tokenlar git'da yo'q (tekshir).
8. **Kuzatuv**: xatolar uchun bepul Sentry (ixtiyoriy) yoki hech bo'lmasa Worker loglari; kunlik zaxira egasining Telegram'iga kelishi tekshirilsin.

## Mini App va bot
- `npm run bot:setup` (6c) — deploy'dan keyin: buyruqlar, tavsif, menyu tugmasi (Mini App = `SITE_URL`), webhook.
- Egasi botni `@citylanduz` kanaliga admin qiladi (post + obunani tekshirish); sen `getChatMember` bilan tekshirib tasdiqla.
- Haqiqiy Telegram'da: `/start` → nik → tasdiq → "🏙 Shahar" Mini App'da ochiladi va **avtomatik kiradi** (SAVOLLAR 6c: pastki menyu tugmasidan `initData` kelmasa — inline `web_app` tugmasiga o'tkaz).

## Telefonda sinov (egasi, Redmi)
Sen `docs/chat/SINOV-TELEFON.md` tayyorla — egasi belgilab chiqadigan oddiy ro'yxat (o'zbekcha, har qator bitta harakat):
- Instagram bio havolasi → bot → "Shaharni ochish" → sayt **Instagram ichki brauzerida** ham, Chrome'da ham ochiladi.
- Birinchi ochilish vaqti (soniya), Shahar / Piyoda / Mashina rejimida qotish bormi (sayt ichidagi FPS ko'rsatkichini `?fps=1` bilan yoq).
- Bepul uy olish → kamera uchadi → tabrik → uy ustida nik.
- Kunlik bonus, kuchaytirish, do'kon, chat, tun rejimi, telefonni yotqizish.
- 10 daqiqa ishlatganda telefon qiziydimi, batareya necha % ketdi.
- Mobil internet (Wi-Fi'siz) ham.
Egasi natijani yozsa — muammolarni tuzat.

## Qabul sharti
- `https://citylanduz.pages.dev` (va admin) ochiladi, bot orqali ro'yxat va kirish ishlaydi, uy olinadi.
- Push → avtomatik deploy ishlaydi.
- To'lov tugmalari "Tez kunda"; maxfiy kalitlar faqat secrets'da.
- README "Internetga chiqarish" amaldagi holatga moslangan; `PLAN.md` "Holat"; commit.
