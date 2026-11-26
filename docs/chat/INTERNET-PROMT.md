# 12-qadam: internetga chiqarish (beta) — CityLand UZ

> Egasi bilan (2026-11-25). **6-qadam (`BOSQICH-2-3-PROMT.md`) to'liq tugagandan keyin** bajariladi. Avval `README.md` "Internetga chiqarish" bo'limini o'qi.
> Maqsad: sayt haqiqiy havolada ochiladi, egasi o'z telefonida sinaydi, keyin 20–50 kishilik beta. Xarajat 0 so'm (faqat bepul tariflar).

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
3. **Telegram**: webhook o'rnat, bot `/start` → nik → bir martalik havola ishlashini tekshir; bot kanalda admin bo'lishi kerakligini egasiga ayt.
4. **Sayt va admin**: Cloudflare Pages (`citylanduz`, `citylanduz-admin`), o'zgaruvchilar README bo'yicha. GitHub'ga ulab **avtomatik deploy** (main'ga push → sayt yangilanadi) — qo'lda yig'ish yo'q.
5. **Realtime (ko'p o'yinchi)**: bepul Node xost tanla (uxlab qolsa ham sayt yakka rejimda ishlayveradi). Tanlov va sababini `SAVOLLAR.md` ga yoz. Bepul xost topilmasa — beta realtime'siz.
6. **Birinchi admin**: egasi botga `/start` yozadi → uning `telegram_id` siga `role='admin'`.
7. **Tozalik**: `server/dev`, `demo_*` niklar, `admin/admin12345` ishlab chiqarishda yo'q; `.env` va tokenlar git'da yo'q (tekshir).
8. **Kuzatuv**: xatolar uchun bepul Sentry (ixtiyoriy) yoki hech bo'lmasa Worker loglari; kunlik zaxira egasining Telegram'iga kelishi tekshirilsin.

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
