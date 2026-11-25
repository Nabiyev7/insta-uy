# CityLand UZ

Instagram obunachilari uchun ichida yurish mumkin bo'lgan 3D shahar. Qoidalar va reja: [PLAN.md](PLAN.md).

## Tez boshlash

Kerak: Node 24+, Google Chrome (video va e2e uchun). Docker ham, Supabase akkaunti ham shart emas.

```bash
npm install
npm run dev            # API 8787 · sayt http://localhost:5173 · admin http://localhost:5174
npm run dev -- --host  # telefondan (bir xil Wi-Fi) sinash uchun
```

Lokal admin: `admin` / `admin12345`. Baza `.dev-data/` da saqlanadi (o'chirsangiz noldan boshlanadi; shahar bo'sh ochiladi; sinov uchun demo aholi: `DEMO=1`).
Lokal muhitda haqiqiy Postgres (PGlite) ishlaydi va aynan `supabase/migrations/` qo'llanadi.

## Buyruqlar

| Buyruq | Vazifa |
|---|---|
| `npm test` / `npm run coverage` | Birlik va integratsiya sinovlari |
| `npm run e2e` | Haqiqiy Chrome'da to'liq ssenariy (o'z portlari va bazasi bilan) |
| `npm run typecheck` · `npm run build` | Turlar · ishlab chiqarish yig'ilishi |
| `npm run masterplan` | Bosh reja qulfini (xesh) tekshirish |
| `npm run seed` | Bosh reja → `0010_masterplan_v3.sql` |
| `npm run models` · `npm run textures` | Blender modellari · teksturalar (koddan, deyarli tekis ranglar) |
| `npm run showcase` | Uylar, bezaklar va xaritani Blender'da ko'rish (`blender/shahar.blend`) |
| `npm run video` | Admin paneldagi video navbatini render qilish |
| `npm run carousel` · `npm run og` | Haftalik gazeta rasmlari · ijtimoiy tarmoq rasmi |
| `node e2e/perf.mjs 6` · `node e2e/load.mjs 1000` | FPS o'lchovi · yuklama sinovi (dev server yoniq bo'lsin) |

`npm run video` uchun `SUPABASE_SERVICE_KEY` kerak (lokalda `npm run dev` chiqargan `SERVICE=` qiymati). Ixtiyoriy: `ELEVENLABS_KEY`, `ELEVENLABS_VOICE`.

## Tuzilish

```
apps/web      3D sayt: logic/ (sof hisob, testlangan) · world/ (Three.js) · ui/ (React) · app/ (holat, tarmoq)
apps/admin    Admin panel
packages/shared  Bosh reja (data/masterplan.json — QULFLANGAN), qoidalar, katalog, so'z filtri
server/src    Cloudflare Worker: kirish, Telegram bot, to'lov, cron · realtime/ — ko'p o'yinchi (Node)
server/dev    Faqat lokal: PGlite + Supabase emulyatori
supabase      Migratsiyalar va ularning sinovlari
video         Reels render (Playwright + ffmpeg), karusel
blender       Model generatori (Python) va eksport
```

Asosiy qarorlar:

- **Bosh reja qulfi**: `masterplan.json` xeshi testda, bazada esa trigger bilan himoyalangan.
- **Baza**: jadvallar yopiq (RLS), faqat RPC. Nom = ruxsat: `api_*` hammaga, `my_*` kirganga, `admin_*` rolga, `svc_*` faqat serverga.
- **3D**: bitta material + 16 qatlamli kichik tekstura massivi (tekis ranglar) + instancing; AO Blender'da vertex rangga bake qilingan.
- **Kirish**: login Supabase Auth'da ichki email'ga aylanadi; Telegram orqali kirish — bir martalik token + botda tasdiq tugmasi.
- **To'lov**: `PaymentProvider` interfeysi — `card` (noyob summa), `payme`, `click`. Boshlang'ich holatda **o'chiq** (`payments_enabled=false`).

## Internetga chiqarish (bepul tariflar)

1. **Supabase**: yangi loyiha → `npx supabase link` → `npx supabase db push`. Authentication → Sign ups: **o'chiring** (ro'yxat faqat Worker orqali).
2. **Worker**: `cd server && npx wrangler deploy`; maxfiylar `npx wrangler secret put …` ([ro'yxat](server/.env.example)).
   Ro'yxat va kirish **faqat Telegram bot** orqali: bot nik so'raydi va bir martalik kirish havolasini yuboradi (parol yo'q).
3. **Telegram**: BotFather'da bot → `https://api.telegram.org/bot<TOKEN>/setWebhook?url=<WORKER>/telegram/webhook&secret_token=<SIR>`.
4. **Sayt/admin**: Cloudflare Pages. Build: `npm run build -w @shahar/web` → `apps/web/dist`; `npm run build -w @shahar/admin` → `apps/admin/dist`.
   O'zgaruvchilar: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL` (Worker), `VITE_REALTIME_URL`, `VITE_SITE_URL` (admin), ixtiyoriy `VITE_SENTRY_DSN`, `VITE_PAYME_MERCHANT`, `VITE_CLICK_MERCHANT`, `VITE_CLICK_SERVICE`.
5. **Ko'p o'yinchi**: istalgan bepul Node xost → `node server/src/realtime/main.ts`. Bo'lmasa sayt yakka rejimda ishlayveradi.
6. **Birinchi admin**: botga /start yozib akkaunt oching, so'ng SQL Editor'da: `update profiles set role='admin' where telegram_id=<TELEGRAM_ID>;`
7. Admin → Sozlamalar: `telegram_bot` (bot nomi, @ siz); keyin Tumanlar.

## Ochilishdan oldin

- Haqiqiy Redmi A telefonda sinash (kompyuterdagi o'lchov GPU'ni ko'rsatmaydi).
- `server/dev` va `demo_*` niklar ishlab chiqarishga tushmaydi — tekshiring.
- Qoidalar/maxfiylik matnini ([legal.ts](apps/web/src/ui/legal.ts)) huquqshunos ko'rsin; to'lov yoqishdan oldin soliq masalasi.
- To'lov provayderlarini sinov muhitida (Payme/Click sandbox) tekshirish.

## Zaxiradan tiklash

Har kuni soat 22:10 (UTC) zaxira ikki joyga yoziladi: Supabase Storage `backups/<sana>.json` va adminning shaxsiy Telegramiga (`ADMIN_TELEGRAM_ID`) `cityland-<sana>.json.gz`. 45 MB dan katta bo'lsa, `.part1`, `.part2` … bo'laklari keladi.

1. Telegramdagi faylni yuklab oling. Bo'laklar bo'lsa, birlashtiring: `cat cityland-<sana>.json.gz.part* > cityland-<sana>.json.gz`.
2. Oching: `gunzip cityland-<sana>.json.gz` → `cityland-<sana>.json` (ichida `settings`, `profiles`, `plot_state`, `owned_decor`, `orders`, `payments` va boshqa jadvallar).
3. Bo'sh bazaga migratsiyalarni qo'llang (`supabase db push`), so'ng har jadvalni JSON'dan yuklang, masalan `psql`da:
   `insert into public.plot_state select * from jsonb_populate_recordset(null::public.plot_state, '<fayldagi plot_state massivi>'::jsonb);`
   `id` avtomatik raqamlanadigan jadvallarda (`payments`, `projects`, `map_versions`, `map_objects`, `ownership_log`, `project_contributions` va h.k.) `insert into ... overriding system value select ...` deb yozing.
   Tartib: `settings` → `districts` → `profiles` → `plot_state` → `owned_decor` → `orders` → `payments` → qolganlari.
4. Zaxirada hamma jadval yo'q (masalan `hearts`, `coin_transfers`, `channel_bonus`, `salutes`, `polls`) — ular bo'sh boshlanadi.
5. Diqqat: kirish akkauntlari (`auth.users`) bu zaxirada yo'q. Ularni Supabase'ning o'z kunlik zaxirasidan tiklang (pullik tarifda) yoki `auth.users` ni alohida eksport qilib qo'ying — aks holda profillar tiklanadi, lekin bot bergan kirish havolasi ishlamaydi.

Tiklashni avval sinov bazasida sinab ko'ring.
