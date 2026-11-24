# Yuklamani taqsimlash (bitta joyga og'irlik tushmasin, lekin tez ishlasin)

> Egasi bilan kelishilgan (2026-11-24). Avval `PLAN.md`, `README.md` (arxitektura) ni o'qi.
> Maqsad: odamlar soni oshganda (1 000+ bir vaqtda) **hech bir qism bo'g'ilmasin** va hammasi **bepul tariflarda** qolsin. Tezlik pasaymasin — iloji bo'lsa oshsin.

## Hozirgi holat (kodni o'qib topilgan)
- Har bir mijoz **har 60 soniyada** `api_city` (butun shahar uylari ro'yxati) va `api_boot` ni **to'g'ridan-to'g'ri Supabase'dan** so'raydi (`apps/web/src/app/start.ts`, `store.ts`). Kirgan har odam yana **har 45 soniyada** `my_ping`.
  → 1 000 kishi bo'lsa: Supabase'ga soatiga ~140 000 so'rov va uylar ko'paygan sari har so'rov o'nlab KB. **Asosiy og'irlik Supabase'ga tushadi** (bepul tarifda trafik va ulanishlar cheklangan).
- Realtime server (`server/src/realtime/`): 8 Hz, faqat yaqindagi o'yinchilar yuboriladi (yaxshi). Lekin chat `io.emit` bilan **hammaga**; onlayn holat Supabase'ga alohida ping bilan yoziladi.
- Telefon: 3D chizish — eng og'ir qism, chegaralar PLAN §12 da.

## Taqsimlash tamoyili — har ma'lumot o'z qatlamida
| Ma'lumot turi | Qayerdan beriladi | Supabase'ga yuk |
|---|---|---|
| O'zgarmas (bosh reja, modellar, teksturalar, rasmlar) | Cloudflare Pages CDN (hozirgidek), uzoq kesh | yo'q |
| Kam o'zgaradigan umumiy (uylar holati, boot, katalog, reyting) | **Bitta umumiy nusxa (snapshot)** — chekka keshdan (Cloudflare) | daqiqasiga 1–2 so'rov, **odamlar soniga bog'liq emas** |
| Jonli (joylashuv, chat, onlayn ro'yxati) | Faqat realtime server | yo'q (davriy to'plab yoziladi) |
| Yozish (uy olish, bezak, tanga, ovoz) | Supabase RPC (to'g'rilik uchun) | faqat haqiqiy harakatlar |
| Hisoblash (joylashtirish, LOD) | Telefon, iloji bo'lsa Web Worker'da | yo'q |

## 1. Umumiy ma'lumot — snapshot + o'zgarishlar
- Worker'da (yoki cron'da) **daqiqasiga bir marta** Supabase'dan `api_city` + `api_boot` + `api_catalog` olinadi va **versiya raqami** bilan bitta snapshot sifatida saqlanadi (Cloudflare Cache API / KV / R2 — bepul tarif limitlariga eng mosini tanla va README'da sababini yoz).
- Mijozlar snapshot'ni Supabase'dan emas, **Cloudflare chekkasidan** oladi (gzip/brotli, `ETag` / `If-None-Match` → o'zgarmagan bo'lsa 304, deyarli 0 bayt).
- **O'zgarishlar (delta):** mijoz `?since=<versiya>` yuboradi va faqat o'zgargan uylarni oladi. To'liq ro'yxat faqat birinchi kirishda yoki versiya juda eski bo'lsa.
- Yangilanish oralig'i: 60 soniya qoladi, lekin ekran yopiq/fonda bo'lsa so'ramaydi (hozirgidek), va hammasi bir soniyada urilmasligi uchun tasodifiy ±10 s siljish (jitter).
- **O'z harakati darhol ko'rinsin:** odam uy olsa/bezak qo'ysa, javob kelishi bilan faqat **o'z uyi** lokal yangilanadi (snapshot'ni kutmaydi).
- Cloudflare Workers bepul limitini (kunlik so'rovlar) hisobla: 1 000 bir vaqtdagi foydalanuvchi uchun kunlik taxminiy so'rovlar sonini README'ga yoz; limitga yaqin bo'lsa oraliqni moslashtir yoki statik fayl yo'lini tanla.

## 2. Onlayn holat va ping
- `my_ping` (har 45 s Supabase'ga) olib tashlanadi. Kim onlayn ekanini **realtime server** biladi; u `last_seen` va tuman ma'lumotini **har 2–5 daqiqada bitta to'plam** (batch) qilib Supabase'ga yozadi (`svc_*` RPC).
- Realtime server bo'lmasa (yakka rejim) — ping juda siyrak (masalan 5 daqiqada bir) ishlaydi.
- Kunlik bonus, 3 oylik qoida va statistika shu ma'lumotdan to'g'ri ishlashi tekshirilsin.

## 3. Realtime server
- **Chat xonalari:** `io.emit` o'rniga Socket.io xonalari — `umumiy` va har tuman uchun `mahalla-N`. Odam faqat o'zi ochgan xona xabarlarini oladi.
- Joylashuv yangilanishi hozirgidek faqat yaqindagilarga (`VIEW_RADIUS`, `MAX_VISIBLE`). Mashina rejimida tezlik katta bo'lgani uchun yaqinlik radiusi va chastota moslashtirilsin (uzoqdagilar kamroq yangilanadi).
- Paketlar ixcham (raqamlar massivi, hozirgidek), keraksiz maydonlar yo'q.
- Kelajak uchun: kod shunday bo'lsin-ki, odam ko'paysa server **tumanlar bo'yicha bir nechta jarayonga** bo'linishi mumkin bo'lsin (hozir bo'lish shart emas, faqat yo'l ochiq qolsin; README'ga yoz).
- Server yiqilsa — sayt yakka rejimda ishlashda davom etadi (hozirgidek), qayta ulanish avtomatik va tasodifiy kechikish bilan (hamma bir vaqtda urilmasin).

## 4. Telefon (mijoz)
- Og'ir hisoblashlar (uchastka elementlarini yig'ish, LOD tanlash, chunk tayyorlash) asosiy oqimni qotirmasin: iloji bo'lsa **Web Worker**'ga o'tkaz yoki kadrlar orasida bo'lib bajar.
- Shahar ochilganda avval yaqin atrof va sodda LOD, keyin qolgani (bosqichli yuklanish) — birinchi ko'rinish 2–4 s ichida.
- Avtomatik sifat (FPS tushsa pasayadi) hozirgidek.

## 5. Navbatlar
- Telegram xabarlari (bildirishnoma, ommaviy xabar, kutish ro'yxati), video navbati, zaxira — hammasi navbat orqali, cron'da bo'laklab. Hech biri foydalanuvchi so'rovini kutdirmasin.

## 6. O'lchov va sinov
- `e2e/load.mjs` ni kengaytir: 1 000 virtual foydalanuvchi 10 daqiqa davomida. Hisobot: Supabase'ga ketgan so'rovlar soni (oldin/keyin), Worker so'rovlari, realtime server CPU/xotira, o'rtacha javob vaqti.
- Maqsad: Supabase so'rovlari **foydalanuvchilar soniga deyarli bog'liq emas** (snapshot uchun daqiqasiga 1–2 + haqiqiy yozishlar).
- Natijalar `docs/chat/YUKLAMA-HISOBOT.md` ga (sodda tilda, jadval bilan).

## Qabul sharti
- Mijoz kodida `api_city`/`api_boot` ni davriy ravishda to'g'ridan-to'g'ri Supabase'dan so'rash yo'q.
- `my_ping` davriy Supabase chaqiruvi yo'q (realtime bor bo'lsa).
- Chat xonalarga bo'lingan.
- Yuk sinovi hisoboti bor, raqamlar maqsadga mos.
- `npm test`, `npm run typecheck`, `npm run e2e` o'tadi; perf yomonlashmagan.
