# Video: "qurilish va yangi egasi" ssenariysi (egasi, 2026-11-27)

> Mavjud admin video generatori (`video/src`, PLAN §7: uy tanlash → kamera uchadi → nik → 9:16) ga **yangi ssenariy** qo'shiladi. Videolar **haqiqiy saytdagi** uylar/obyektlar bilan (ishlab chiqarish ma'lumoti — faqat o'qiladi). `FOTO-PROMT.md` (17-qadam) dagi "oltin soat", "tun" va maket (tilt-shift) grafikasi ishlatiladi — shuning uchun 17-qadamdan **keyin**.
> Egasi qarorlari: video **faqat qo'lda** (admin panelda tanlab), tayyor video **avval egasiga botda** keladi, xaridordan ruxsat **so'ralmaydi** (nik saytda baribir ochiq).

## 1. Ssenariy "Qurilish" (12–18 s, 1080×1920)
1. (0–3 s) Shahar ustidan uchish → tanlangan bo'sh joyga tushish (bo'sh maydon, "+" belgisisiz).
2. (3–8 s) Qurilish: kran, chang, bino yerdan ko'tariladi (saytdagi qurilish effekti, `logic/construction.ts`), sekinroq va chiroyliroq (video uchun 2–3× uzoqroq).
3. (8–12 s) Tayyor bino atrofida kamera yarim aylanadi (orbit), oltin soat yoki tun.
4. (12–15 s) Bino ustida egasining niki (oltin yorliq) paydo bo'ladi + ekranda **"@nik — yangi egasi"** (premium/noyob obyekt bo'lsa — obyekt nomi bilan: "Dengiz yaxtasi · @nik").
5. (15–18 s) Logo + "Sen ham ol · bio'dagi havola".
- Yozuv uslubi — Instagram postlari shabloni (katta qalin oq, bitta oltin so'z, pastda kichik logo).
- Musiqa — mavjud sintez; ixtiyoriy Bekzod ovozi (qisqa: "Shaharimizga yangi qo'shni keldi…") — ovoz qoidasi: filtrsiz, ×1.1, −14 LUFS.

## 2. Admin panel
- "Video" bo'limida: **Ssenariy** tanlash (`Uyga uchish` — mavjud, `Qurilish` — yangi) · uy/obyekt tanlash (qidiruv nik yoki manzil bo'yicha) · **Yorug'lik**: kunduz / oltin soat / tun · **Maket effekti** yoq/o'chiq · ovoz bor/yo'q · davomiylik.
- "Video yasash" → navbat → render (egasining kompyuterida `npm run video`, hozirgidek).
- Bir nechta uyni tanlasa (2–10) — "Yangi qo'shnilar" jamlanma: har uy 3–4 s qurilishi, oxirida hammasi niklari bilan.

## 3. Tayyor bo'lgach — egasiga botda
- Bot egasiga (`ADMIN_TELEGRAM_ID`) videoni yuboradi: video + tugmalar **"📣 Kanalga joylash"** · **"🔁 Qayta yasash"** · **"🗑 O'chirish"**. Kanalga joylanganda izoh matni avtomatik ("@nik — yangi egasi! Sen ham bepul uy ol 👉 …").
- Instagram'ga egasi qo'lda joylaydi; bot video bilan birga **tayyor izoh matnini** (xeshteglar bilan) alohida xabar qilib yuboradi — nusxalab qo'yish oson bo'lsin.

## 4. Tezlik va sifat
- Render: Playwright + ffmpeg (hozirgidek), 30 fps, H.264, ≤ 60 MB; kadr yuqori aniqlikda (Foto rejimidagi supersampling), kamera harakati silliq (easing).
- Ishlab chiqarish ma'lumotlari faqat o'qiladi; render saytning lokal nusxasida ishlab chiqarish snapshot'i bilan (yoki `SITE_URL` + faqat o'qish sessiyasi).

## Qabul sharti
- Admin panelda "Qurilish" ssenariysi; test video `docs/insta/reels/qurilish-namuna.mp4` (demo uy bilan) va jamlanma namuna.
- Bot: video + 3 tugma + izoh matni; "Kanalga joylash" ishlaydi (test kanal yoki mock).
- `npm test`, `typecheck`, `e2e` (video navbati mock bilan); tekshiruvchi oxirida bir marta; `ISHLAR.md` [x]; push; `HISOBOT.md`.
