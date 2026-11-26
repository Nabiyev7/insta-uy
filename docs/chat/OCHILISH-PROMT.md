# 13-qadam: haqiqiy ochilish (egasi, 2026-11-26)

> Sinov yaxshi o'tdi. Egasi qarori: **darhol hammaga** ochiladi; **faqat Telegram Stars yoqiladi** (karta keyin); kichik paketlar olib tashlanadi; **hamma pulli xarid botda**.
> Avval `DAVOM.md`, `INTERNET-PROMT.md`, `TOLOV.md`, `SAVOLLAR.md` (6f bo'limi) ni o'qi. Har bo'limdan keyin `npm test` + `typecheck` + commit + push; tekshiruvchi oxirida bir marta.

## A. To'lov — faqat Stars, faqat botda
1. Sozlamalar: `payments_enabled=true`, lekin **provayder faqat Stars** (`payments_stars=true`, `payments_card=false`). Karta yo'li kodda qoladi, o'chiq.
2. **Kichik paketlar olib tashlanadi** (500 va 1 200 tanga). Qoladi: 3 000 (60 ⭐), 7 000 (125 ⭐, "Ommabop"), 16 000 (250 ⭐, "Eng foydali"). Migratsiya bilan.
3. **Hamma pulli xarid botda** (SAVOLLAR 6f, 2-savol): salyut, tanga paketlari, premium tovarlar — saytda faqat ko'rinadi, tugma "Botda sotib olish" (`?start=buy_<id>`). Saytda pul to'lovi komponenti qolmasin (test bilan isbotla). Tanga bilan xaridlar saytda — hozirgidek.
4. Telegram talabi: bot **`/paysupport`** (to'lov muammosi → "Adminga yozish" murojaati, "to'lov" belgisi bilan) va **`/terms`** (Qoidalar sahifasiga havola, to'lov va qaytarish bandi bilan). Qoidalar matniga: "Stars bilan to'lov — raqamli tovar; muammo bo'lsa /paysupport; asossiz qaytarish yo'q, xato bo'lsa admin qaytaradi". Admin panelda Stars to'lovini qaytarish (refund) — bor, tekshir.
5. Premium tab: hozir faqat **Tanga paketlari** va **Salyut** ishlaydi; Uylar/Bezaklar/Mashinalar — "Tayyorlanmoqda" kartasi (hozirgidek).
6. Sinov: Telegram Stars **test muhitida** to'liq yo'l (invoice → `pre_checkout` → `successful_payment` → tanga qo'shildi → refund); haqiqiy muhitda egasi 60 ⭐ lik paketni o'zi bir marta sotib olib tekshiradi (keyin xohlasa admin refund).

## B. Sinov ma'lumotlarini tozalash
1. Admin panel "Sinov ma'lumotlarini tozalash" ni ishlab chiqarish bazasida bajarish **egasining tugmasi bilan** (sen buyruqni tayyorlab, egasiga ayt). Undan oldin zaxira.
2. Tekshir: "Shahar asoschisi" hisoblagichi 0 dan boshlanadi (admin sinov uylari hisobga kirmaydi), demo/test nik yo'q, reyting bo'sh, kanal postlari sinov uylarini e'lon qilmaydi.
3. Admin sinov rejimi tozalashdan keyin **o'chiq**; egasi keyin oddiy foydalanuvchi sifatida bepul uyini oladi (asoschi №1 bo'lishi mumkin — egasi o'zi hal qiladi).

## C. Yuklama — ochilishdan oldin minimal (`YUKLAMA-PROMT.md` dan)
"Darhol hammaga" bo'lgani uchun kamida:
1. **Snapshot**: `api_city` / `api_boot` / `api_catalog` — Worker'da daqiqasiga 1 marta yangilanadigan kesh (Cache API), mijoz shundan oladi (ETag/304). Supabase'ga yuk odamlar soniga bog'liq bo'lmasin.
2. **`my_ping`** davriy chaqiruvi — realtime bo'lsa yo'q, bo'lmasa 5 daqiqada bir.
3. Chat xonalarga bo'lingan (umumiy / mahalla) — tekshir.
4. `e2e/load.mjs` — 500 virtual foydalanuvchi 5 daqiqa, natija `docs/chat/YUKLAMA-HISOBOT.md` (bepul tarif limitlariga nisbatan: Workers kunlik so'rov, Supabase, Render).
`YUKLAMA-PROMT.md` ning qolgani — ochilishdan keyin.

## D. Ishonchlilik va kuzatuv (hammasi bepul)
1. **Render uxlamasin**: Worker cron har 10 daqiqada realtime serverga ping (`/health`). Render bepul soatlari bitta servisga yetishini README'da hisobla.
2. **Sog'liq tekshiruvi**: Worker cron har 15 daqiqada sayt, API, Supabase, realtime'ni tekshiradi; 2 marta ketma-ket xato bo'lsa — egasiga botda "⚠️ X ishlamayapti" (ko'pi bilan soatiga 1 ta).
3. **Zaxira**: kunlik zaxira egasining Telegram'iga kelayotganini tekshir; qayta tiklash yo'riqnomasi `README.md` da (bir buyruq).
4. **Xatolar**: mijoz xatolari Worker'ga yuboriladi (`/log`, kuniga chegarali), admin panel "Xatolar" bo'limida oxirgi 100 ta. Sentry — ixtiyoriy, token bo'lsa.
5. Supabase bepul tarifi: hajm va so'rovlarni `/stat` ga qo'sh (bazaning hajmi MB, chegaraga necha %).

## E. Ochilish kuni
1. Kutish ro'yxatidagilarga bot xabari (`/hammaga` → kutish ro'yxati) — matnni egasi tasdiqlaydi.
2. Kanalga e'lon posti (rasm `og.png` + matn + bot havolasi) — egasi tasdiqlaydi.
3. Instagram bio havolasi: `https://t.me/Citylanduz_bot?start=from_bio` (manba hisobga olinadi); reels uchun `?start=from_reels`. Bot `start` parametridagi `from_*` ni saqlasin (8-band, TUZATISH-2).
4. Tumanlar: hozirgi qoida (markazdan ochiladi, to'lsa keyingisi) — tekshir, avtomatik ochilish ishlasin va egasiga bot xabar bersin.
5. `docs/chat/OCHILISH-ROYXAT.md` — egasi uchun bir sahifali ro'yxat: ochilishdan oldin / ochilish kuni / birinchi hafta (sodda o'zbekcha, belgilab chiqiladigan).

## Qabul sharti
- A–E bajarilgan; Stars test muhitida to'liq yo'l testdan o'tgan; saytda pul to'lovi komponenti yo'q; kichik paketlar yo'q.
- Yuklama hisoboti bor; sog'liq tekshiruvi va Render ping ishlaydi (cron loglari).
- `npm test`, `typecheck`, `e2e`, `e2e/prod.mjs` (ishlab chiqarish); tekshiruvchi ✅ (oxirida bir marta); `PLAN.md` "Holat"; `ISHLAR.md` [x]; push.
- Hisobot `HISOBOT.md` da: egasi bosishi kerak bo'lgan tugmalar ro'yxati bilan.
