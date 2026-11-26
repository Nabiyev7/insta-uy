# 6c-qadam: Telegram botni mukammallashtirish (egasi bilan, 2026-11-26)

> 12-qadamdan (internet) **oldin**. Avval `server/src/telegram.ts`, `shop.ts`, `support.ts`, `apps/web/src/app/login.ts` ni o'qi.
> Bot hozir ishlaydi, lekin: har xabar ikki tilda, tugmalar har safar xabar ichida, "Shaharni ochish" va "Mening uyim" bir xil, buyruqlar ro'yxati va bot tavsifi yo'q, olib tashlangan funksiyalar xabarlari qolgan.

## 1. Sayt Telegram ichida ochiladi (Mini App)
- Bot tugmalari saytni **Telegram Mini App** (`web_app`) sifatida ochadi: bot ichida, to'liq ekranda. Bot profilidagi **Menu tugmasi** ham "🏙 Shahar" (`setChatMenuButton`).
- **Avtomatik kirish:** sayt `Telegram.WebApp.initData` ni serverga yuboradi → server uni **bot tokeni bilan HMAC tekshiradi** (Telegram hujjatidagi tartib, `auth_date` ≤ 24 soat) → sessiya. Havola va 15 daqiqa kerak emas. Akkaunt yo'q bo'lsa (nik yozilmagan) — Mini App "Avval botda nikingizni yozing" deb botga qaytaradi.
- Mini App sozlamalari: `ready()`, `expand()`, iloji bo'lsa `requestFullscreen()`; **`disableVerticalSwipes()`** (shaharni barmoq bilan surganda ilova yopilib ketmasin); Telegram **BackButton** saytdagi "Orqaga" bilan bog'lansin; haptic (tebranish) Telegram API orqali; mavzu doim to'q (11-band, TUZATISH-1).
- **Stars to'lovi** Mini App ichida `openInvoice` bilan (botga chiqib ketmasdan).
- Brauzer yo'li qoladi: bot "🌐 Brauzerda ochish" (bir martalik havola, hozirgidek) — Mini App ishlamaydigan telefonlar uchun.
- Instagram bio havolasi: `t.me/<bot>?start=...` (hozirgidek) — yangi odam avval nik yozadi, keyin "🏙 Shahar" Mini App.
- Lokal sinov: `initData` tekshiruvi uchun birlik testlari (to'g'ri, soxta imzo, eskirgan); haqiqiy Mini App sinovi 12-qadamda (HTTPS kerak) — `SINOV-TELEFON.md` ga qo'sh.

## 2. Til — bir marta tanlanadi, Sozlamalarda o'zgaradi
- Birinchi `/start`: Telegram `language_code` bo'yicha taxmin (ru/uk/kk/be → ruscha, qolgani o'zbekcha) va birinchi xabarda **"🇺🇿 O'zbekcha / 🇷🇺 Русский"** tugmalari. Tanlangandan keyin **hamma xabar faqat shu tilda** (hozirgi "uz / ru" qo'shma matnlar yo'q).
- Bot **"⚙️ Sozlamalar"**: Til, Xabarlar (yoqish/o'chirish — `/stop`, `/xabar` o'rniga; buyruqlar ham ishlayversin).
- Bot tili = sayt tili (profilda bitta maydon; birida o'zgarsa ikkinchisida ham).
- Barcha bot matnlari bitta joyda (`server/src/botText.ts`), uz va ru; test: har kalit ikkala tilda.

## 3. Pastda doimiy menyu (reply keyboard)
Doim turadigan 6 tugma (2 × 3):
| 🏙 Shahar | 🏠 Uyim | 🛍 Do'kon |
|---|---|---|
| 👥 Do'st taklif | ✍️ Adminga yozish | ⚙️ Sozlamalar |
- Shahar, Uyim, Do'kon — Mini App (`?panel=uyim`, `?panel=dokon` — sayt o'sha oynani ochadi). Uyi yo'q odamda "Uyim" o'rniga "🏡 Uy olish" (bo'sh joylar xaritasi).
- Noma'lum matn yozilsa — qisqa "Menyudan tanlang" (har safar uzun xabar va tugmalar emas).
- Eski xabar ichidagi tugmalar faqat kerakli joyda (tasdiq, to'lov, nizo).

## 4. Do'st taklif qilish
- "👥 Do'st taklif" → xabar: shaxsiy havola, shkala (1 → 3 → 10, har bosqich sovg'asi, hozirgi son), va **"📤 Do'stga yuborish"** tugmasi (`t.me/share/url` — tayyor matn: "Men CityLand UZ'da uy oldim — sen ham bepul ol 👉 <havola>", tanlangan tilda).
- Do'st uy olganda — hozirgidek xabar (+500), shkala holati bilan.

## 5. Kanalga avtomatik post (`@citylanduz`)
Bot kanalda admin bo'ladi (12-qadamda egasi qo'shadi). Admin panelda har tur alohida yoqiladi/o'chiriladi:
1. **Kunlik:** "Bugun shaharda N ta yangi uy" + 3–5 ta yangi nik (uyga havola bilan), kuniga 1 marta (20:00), 0 bo'lsa yuborilmaydi.
2. **Haftaning hovlisi:** g'olib — uy rasmi (stories rasmi generatori) + nik + havola.
3. **Shahar loyihasi to'ldi:** "Stadion qurildi! Rahmat: @a, @b, @c".
4. **Milestone:** 100, 500, 1 000, 5 000 … uy.
- Navbat orqali, xato bo'lsa keyingi cron'da qayta; post matnlari o'zbekcha (kanal tili — sozlama).

## 6. Admin buyruqlari (faqat `ADMIN_TELEGRAM_ID` va admin roli)
- `/stat` — bugun va 7 kun: yangi foydalanuvchi, yangi uy, faol odam, tanga berildi/sarflandi, ochiq murojaat, ochiq nik nizosi, (to'lov yoqiq bo'lsa) tushum.
- `/hammaga` — bot matn (yoki rasm + matn) so'raydi → **ko'rinishi** (preview) → "Yuborish / Bekor" → mavjud xabar navbati (`broadcasts`) orqali. Kimga: hammaga / tumanga / kutish ro'yxatiga (tugmalar).
- `/murojaatlar`, `/nizolar` — ochiqlari soni va admin panel havolasi.
- `/admin` — hozirgidek. Admin buyruqlari oddiy foydalanuvchiga ko'rinmaydi (`setMyCommands` scope: faqat admin chat).

## 7. Tozalash
- Olib tashlangan funksiyalar xabarlari: `transfer`, `transfer_done` (uy sovg'asi yo'q), `ad_live`, `ad_rejected` (reklama yashirin) — o'chiriladi yoki bayroqcha bilan; `/parol` va `start=reset` — faqat `password_login=true` bo'lsa.
- `HELP` dagi eski `/yordam matn` yozuvi olib tashlanadi.
- Bir xil ishlaydigan ikki tugma qolmasin.

## 8. Bot profili — avtomatik sozlash
- `npm run bot:setup` (12-qadamda deploy'dan keyin ishga tushadi): `setMyCommands` (uz va ru, `language_code` bilan; foydalanuvchi va admin uchun alohida), `setMyDescription` va `setMyShortDescription` (uz + ru), `setChatMenuButton` (Mini App), webhook. Takror ishga tushirilsa xavfsiz.
- Tavsif matni (uz): "CityLand UZ — Instagram obunachilari shahri. Bepul uy oling, uni bezang va do'stlaringizni qo'shni qiling 🏡". Qisqa tavsif: "Instagram obunachilari uchun 3D shahar". Ruschasi ham.
- Bot avatari — egasi BotFather'da o'zi qo'yadi (`docs/chat/SINOV-TELEFON.md` ga eslatma).

## Qabul sharti
- Testlar: `initData` imzosi, til tanlash va almashish, menyu tugmalari, taklif xabari, kanal postlari (har tur + o'chiq holat), admin buyruqlari faqat adminga, `/hammaga` preview → yuborish, olib tashlangan xabarlar yo'q.
- Bot matnlarida bir xabarda ikki til yo'q (test).
- `npm test`, `npm run typecheck`, `npm run e2e`; tekshiruvchi bir marta oxirida; `PLAN.md` "Holat"; `ISHLAR.md` [x]; commit: `feat: 6c — bot: Mini App, til, doimiy menyu, taklif, kanal postlari, admin buyruqlari`.
