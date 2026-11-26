# Ochilish ro'yxati — CityLand UZ (egasi uchun)

> Har qatorni bajaring va ✅ qo'ying. Qaytarib bo'lmaydigan ishlarni (tozalash, hammaga xabar, kanal posti) **siz** bosasiz — matnlar tayyor.

## 1. Ochilishdan oldin (bugun)
- [ ] **Botni kanalga admin qiling:** @citylanduz → Sozlamalar → Administrators → Add Admin → @Citylanduz_bot. "Post messages" ruxsati yoqilgan bo'lsin.
- [ ] **Supabase'da ro'yxatdan o'tishni o'chiring:** supabase.com → citylanduz loyihasi → Authentication → Sign In / Providers → **"Allow new users to sign up"** — o'chiq (ro'yxat faqat bot orqali).
- [ ] **`nabiyev_7` akkaunti haqida qaror qiling** (u sizning sinov akkauntingizmi?). Unda haqiqiy bepul uy (P0003, 5-level), "Asoschi" nishoni №1 va 41 100 tanga bor. Tozalash tugmasi unga tegmaydi.
  - **A.** Sinov akkaunti — o'chiramiz: shu Telegram'dan saytga kiring → Uyim → **"Akkauntni o'chirish"**. Uy bo'shaydi, asoschi hisoblagichi 0 dan boshlanadi.
  - **B.** Bu haqiqiy akkauntingiz — qoldiramiz (asoschi №1 bo'lib qoladi).
- [ ] **Sinov ma'lumotlarini tozalang:** admin panel (botga `/admin`) → **Iqtisod** → **"Sinov ma'lumotlarini tozalash"**.
  - Zaxira olingan: `.zaxira/oldin-tozalash-20261126-1610.json`.
  - Natijada sinov uyi P0001, sinov bezaklari va 3 ta sinov buyurtmasi o'chadi, sinov rejimi o'chadi.
- [ ] **Bitta haqiqiy xarid bilan tekshiring:** botga `/dokon` → "🪙 3 000 tanga — 60⭐" → to'lang. Tanga darhol qo'shilishi kerak. Xohlasangiz, keyin admin panel → **Buyurtma va to'lov** → shu to'lovda **"Qaytarish (Stars)"** — yulduzlar qaytadi, tanga olinadi.
- [ ] **O'zingizning bepul uyingiz:** endi oddiy foydalanuvchi sifatida "🏡 Uy olish" (asoschi bo'lasiz).
- [ ] (Ixtiyoriy) **Cloudflare Web Analytics:** dash.cloudflare.com → Web Analytics → citylanduz.pages.dev ni qo'shing → tokenni menga ayting (`VITE_CF_ANALYTICS`).

## 2. Ochilish kuni
- [ ] **Instagram bio havolasi:** `https://t.me/Citylanduz_bot?start=from_bio`
- [ ] **Reels havolasi:** `https://t.me/Citylanduz_bot?start=from_reels`. Kim qayerdan kelgani admin → Umumiy'da ko'rinadi.
- [ ] **Kutish ro'yxatiga xabar:** botga `/hammaga` → matnni yuboring → ko'rinishini tekshiring → **"⏳ Kutish ro'yxatiga"** → **"Yuborish"**. Tayyor matn (o'zgartirishingiz mumkin):

  > 🏙 CityLand UZ ochildi! Siz kutish ro'yxatida edingiz — hozir bepul uyingizni oling: pastdagi «🏙 Shahar» tugmasini bosing yoki /start. Birinchi 100 kishi «Shahar asoschisi» nishoni va 1 000 tanga oladi!
- [ ] **Kanalga e'lon** (o'zingiz joylaysiz). Rasm — saytdagi `og.png` (https://citylanduz.pages.dev/og.png). Matn:

  > 🏙 **CityLand UZ ochildi!**
  > Instagram obunachilari uchun 3D shahar: bepul uy oling, uni bezang, do'stlaringizni qo'shni qiling.
  > 🎁 Birinchi 100 kishiga — «Shahar asoschisi» nishoni va 1 000 tanga.
  > 👉 https://t.me/Citylanduz_bot?start=from_bio
- [ ] Botga `/stat` — birinchi soatda yangi odamlar va uylarni kuzating.

## 3. Birinchi hafta
- [ ] Har kuni `/stat`: yangi odam, uy, baza hajmi (% — 80% ga yetsa menga ayting).
- [ ] Har kuni `/murojaatlar` va `/nizolar` — javob bering (botda "Javob berish" yoki admin panel).
- [ ] Har kuni tunda zaxira Telegram'ingizga keladi (`cityland-<sana>.json.gz`). Birinchisi bugun kechasi, soat 03:10 da — kelganini tekshiring.
- [ ] Botda "⚠️ … ishlamayapti" xabari kelsa — menga ayting (server o'zi 10 daqiqada tekshiradi).
- [ ] Admin panel → **Xatolar** — bir xil xato ko'p takrorlansa, menga ayting.
- [ ] Tuman 80% to'lsa, keyingisi o'zi ochiladi. Botga "🏘 Yangi tuman o'zi ochildi" xabari keladi.
- [ ] Haftalik: Render panelida **Bandwidth** (100 GB/oy) va Cloudflare'da Workers so'rovlari (kuniga 100 000) — 70–80% ga yetsa, menga ayting (YUKLAMA-HISOBOT.md).
