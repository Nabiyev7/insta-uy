# Tuzatish 7 — uy surati, ulashish referal bilan, referal tangalari (egasi, 2026-11-27)

> 16–17-qadamlar bajarilgan (Foto rejimi bor). Har banddan keyin `npm test` + `typecheck` + commit + push; tekshiruvchi oxirida bir marta; oxirida `e2e/prod.mjs`.

## 1. "Uyim"da uyni suratga olish
Hozir Foto (kamera) tugmasi faqat piyoda (odamcha) rejimida chiqadi.
- **Uyim** oynasiga (va o'z uyini bosganda chiqadigan oynaga) **"📷 Uyimni suratga olish"** tugmasi.
- Bosilsa — Foto rejimi **uy rejimida** ochiladi: kamera **o'z uyiga**, **yuqori-yon burchakdan** (~35–45° pastga qaragan, uy va hovlisi to'liq kadrda, saytdagi eng chiroyli rakurs).
- Odam **faqat o'z uyi atrofida** aylantira oladi: barmoq bilan 360° aylantirish (orbit), burchakni biroz ko'tarish/tushirish (25°–65°), yaqinlashtirish (cheklangan: hovli kadrdan chiqib ketmasin). Boshqa joyga surib ketib bo'lmaydi.
- Foto rejimidagi hamma narsa ishlaydi: Hozirgi / Oltin soat / Tun, maket effekti, format 9:16 · 4:5 · 1:1, belgi (logo + @nik).
- Bir nechta uyi bo'lsa — qaysi uy (ro'yxatdan).
- Piyoda rejimidagi kamera tugmasi hozirgidek qoladi.

## 2. Rasmni saqlash va ulashish — ishlashi shart
Egasi: saqlash va ulashish ishlamayapti/yaxshi emas. Hamma muhitda tekshir va tuzat:
- **Telegram Mini App** (asosiy): saqlash — `Telegram.WebApp.downloadFile` (Bot API 8.0+), ulashish — `shareToStory` (rasm + `widget_link`: referal havola, "Uyingni ol") va/yoki `shareMessage`/bot orqali rasmni foydalanuvchiga chatda yuborish ("Rasmingiz" + referal havola) — qaysi biri ishlasa; eski Telegram versiyasida — bot chatga rasm yuboradi.
- **Mobil brauzer (Chrome/Safari)**: `navigator.share({ files: [rasm], text, url })` → telefonning ulashish oynasi (Instagram, Telegram, WhatsApp…); fayl ulashish qo'llanmasa — saqlash (`<a download>`) + havola nusxalanadi.
- **Instagram ichki brauzeri**: ulashish ishlamaydi → "Rasmni saqlash" + "Chrome'da ochish" maslahati.
- Test: har muhit uchun yo'l (Playwright mock), xato bo'lsa tushunarli xabar, jim yiqilmasin.

## 3. Ulashganda — referal havola bilan
- Har ulashishda **o'zining referal havolasi** ketadi: matn "Men CityLand UZ'da uy oldim 🏡 Sen ham bepul ol 👉 <havola>" (uz/ru, foydalanuvchi tilida). Havola: `https://t.me/Citylanduz_bot?start=r_<kod>`.
- Rasm ustidagi belgida (ixtiyoriy) qisqa havola/QR — referal kodi bilan.
- Instagram stories'ga havola avtomatik qo'shilmaydi (Instagram ruxsat bermaydi) — ulashish oldidan havola **avtomatik nusxalanadi** va kichik ko'rsatma: "Stories'da «Havola» stikerini qo'shing va joylang".

## 4. Saytda "nusxalash" o'rniga "Ulashish"
- Do'st taklif qilish (Uyim, shkala), uy oynasi, tabrik oynasi va boshqa joylardagi "Havolani nusxalash" → **"Ulashish"** tugmasi: to'g'ridan-to'g'ri ilovaga (Mini App'da Telegram ulashish oynasi — `openTelegramLink('https://t.me/share/url?url=…&text=…')`; brauzerda `navigator.share`). Ulashish yo'q bo'lsa — nusxalash (zaxira).
- Kichik "nusxalash" belgisi (ikonka) yonida qolishi mumkin.

## 5. Do'st taklifi — bezak o'rniga tanga
- `referral_gifts` (gulzor, besedka, sedan) **o'chiriladi** (kod qoladi, bayroqcha `referral_gifts_enabled=false`); allaqachon olinganlar odamlarda qoladi.
- **Har do'st (Telegram + uy olganda): +500 tanga** (hozirgidek).
- **Bosqich bonuslari** (qo'shimcha, bir marta): **3 do'st — +2 000**, **10 do'st — +6 000**, **25 do'st — +15 000**, **50 do'st — +40 000**. Admin "Iqtisod"da o'zgaradi (`coins.referralSteps`).
- Shkala (Uyim, bot "Do'st taklif") — bosqichlar tanga bilan: "3 do'st → +2 000 🪙", keyingi bosqichgacha nechta qolgani; bot bosqichga yetganda tabrik xabari.
- `TANGA-NARXLAR.md` yangilansin.
- **Keyin** (egasi): faqat referal uchun **noyob bezaklar** (hech kimda yo'q, sotilmaydi) — yasaladi va bosqichlarga qo'shiladi (`KEYINGI.md`).

## Qabul sharti
- e2e: Uyim → "Uyimni suratga olish" → orbit faqat uy atrofida → kadr 1080×1920; ulashish matnida referal havola; "Ulashish" tugmasi mock bilan; referal bosqich bonuslari (3/10/25/50) testi, bezak sovg'asi berilmaydi.
- `npm test`, `typecheck`, `e2e`, `screens` (`ui-uy-surat.png`); tekshiruvchi ✅; `ISHLAR.md` [x]; `PLAN.md` "Holat"; push; `HISOBOT.md`.
