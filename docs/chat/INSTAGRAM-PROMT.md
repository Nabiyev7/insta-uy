# Instagram: ochilish postlari va reels (egasi bilan, 2026-11-27)

> Sahifa: **@citylanduz**. Bot havolasi: `https://t.me/Citylanduz_bot?start=from_bio` (reels izohlarida `?start=from_reels`).
> Natija papkasi: `docs/insta/` (`postlar/01/…png`, `reels/*.mp4`, `matnlar.md`). Hammasi **lokal demo nusxada** (`DEMO=1`) yaratiladi — ishlab chiqarish bazasiga tegilmaydi.
> Mavjud vositalardan foydalan: `video/src` (Playwright + ffmpeg render, karusel), sayt kamerasi va rejimlari.

## 0. Uslub (egasi: "zamonaviy, sodda, minimalistik")
- **Kadr — 3D shahar** (saytdan, eng yuqori sifat, UI yashirin — "ekranni tozalash" rejimi). Har slaydda bitta aniq kadr.
- **Yozuv**: 1 ta katta sarlavha (2–6 so'z) + ixtiyoriy 1 qator kichik matn. Ko'p bo'sh joy. Matn kadrning tinch joyida (osmon yoki maysa), kerak bo'lsa juda yengil qoraytirish (gradient 0→25%).
- **Shrift**: sayt shrifti (bitta oila, 2 qalinlik). Sarlavha oq yoki to'q (kadrga qarab), **bitta urg'u rangi — saytdagi sariq-oltin**, faqat 1–2 so'zda.
- **Logo**: kichik "CityLand UZ" pastki chap burchakda, har slaydda bir xil joyda. Oxirgi slaydda: "Uyingni ol → bio'dagi havola".
- **Format**: karusel **1080 × 1350 (4:5)**, har post 3–5 slayd, **faqat o'zbekcha**. Emoji yo'q (matnda), belgilar faqat saytdagi Tabler ikonalari.
- **Halollik**: demo uylar niklari umumiy (`sening_niking`, `dostim_uyi`, `qoshnim`…), haqiqiy odam nikiga o'xshamasin; matnda "allaqachon N kishi yashaydi" kabi da'vo yo'q.
- Shablon: HTML/CSS (1080×1350) → Playwright skrinshot; kadrlar alohida render qilinib shablonga qo'yiladi. Shablon bitta faylda, matnlar `matnlar.md` dan — egasi matnni o'zgartirsa qayta yig'iladi (`npm run insta`).

## 0.1 Grafika sifati — kuchaytirilgan (egasi, 2026-11-27)
Ikki manba, ikkalasi ham **o'yindagi uslub, uylar va ranglar bilan bir xil** (yo'q narsa qo'shilmaydi — odam saytga kirib hafsalasi pir bo'lmasin):
1. **Saytdan yuqori sifatli kadr** ("qanday ishlaydi" slaydlari, reels): Playwright `deviceScaleFactor` 3–4 (≈4K) → 1080 ga kichraytirish (supersampling); sifat "Yuqori" majburiy, soyalar, to'liq LOD (uzoq uylar ham to'liq shaklda), daraxt zichligi maksimal, FXAA/MSAA; vaqt — "oltin soat" (iliq past quyosh) va tun; kamera tekis (silkinishsiz). `?kadr=1` kabi yashirin rejim (faqat lokal) — UI yashirin, kamera aniq koordinataga.
2. **Blender render** (postlarning bosh slaydi, promo video boshlanishi): mavjud shahar modellari (`blender/` kit, `npm run showcase` sahnasi, demo aholi bilan) — Cycles (yoki EEVEE yuqori sozlamada): yumshoq soya, ambient occlusion, "oltin soat" quyosh + osmon, **tilt-shift** (fokus markazda, old va orqa xira — maket effekti), tunda derazalar/chiroqlar atrofida yengil bloom, AgX ranglar. 1080×1350 va 1080×1920, kadr uchun ≤ 2 daqiqa render.
- **Egasi tanladi: A — "Oltin soat + maket"** (namuna: `docs/insta/namuna/uslub-A-oltin.png`): past iliq quyosh (rang ~(1, 0.78, 0.5)), uzun soyalar, kuchli tilt-shift (fokus — kadr markazidagi uy/ko'cha, oldi va orqasi xira), `Standard` rang o'zgartirish (to'yingan ranglar, AgX emas), osmon och ko'k. Hamma Blender kadrlari shu uslubda; tungi kadrlar — shu uslubning tun varianti (`uslub-D-tun.png` kabi, derazalar iliq yonadi). Kadrlar **yangi** 1–5-level uylar va bezaklar bilan (eski namuna faylidagi emas), mahalla demo aholi bilan to'ldirilgan.
- **Egasi tanlagan render uslublari (2026-11-27)**: **A — "oltin soat + maket"** (iliq past quyosh, uzun soyalar, kuchli tilt-shift, Standard ranglar — AgX emas, u rangni xiralashtiradi) va **D — "tun"** (to'q ko'k osmon, derazalar iliq sariq yonadi, chiroqlar, yengil tilt-shift). Ssenariyga qarab: kunduzgi mavzular — A, "kechasi shahar" va kun→tun kadrlar — D. Namunalar: `docs/insta/namuna/uslub-A-oltin.png`, `uslub-D-tun.png` (eski uy modellari bilan — sen yangi 1–5-level uylar va bezaklar bilan qil). B (izometrik) va C (pastel) — ishlatilmaydi.
- Qaysi slaydda qaysi manba — `matnlar.md` da belgilansin; egasi taqqoslashi uchun 1-post bosh slaydi ikkala variantda (`01-1-sayt.png`, `01-1-blender.png`).
- Shablon namunasi: `docs/insta/namuna/01-*.jpg` (egasi ko'rgan uslub: katta qalin oq sarlavha, bitta oltin so'z, yengil qoraytirish, pastda kichik logo va nuqtalar).

## 1. Ochilish postlari (9 ta, sahifa to'ri 3×3)
Har post: slaydlar (sarlavha / kichik matn → kadr) + **izoh (caption)** + 5–8 xeshteg (#citylanduz #3dshahar #uzbekistan …).
1. **CityLand UZ ochildi** — (1) "Obunachilar shahri ochildi" / shahar tepadan, kechqurun; (2) "Har bir uy — bitta obunachi" / mahalla yaqindan, uylar ustida niklar; (3) "Seniki qaysi?" / bo'sh joy "+" bilan; (4) "Bepul ol → bio'dagi havola".
2. **Bepul uy 3 qadamda** — (1) "Bepul uy — 3 qadam"; (2) "1. Botga kir" / bot ekrani (telefon ramkasida); (3) "2. Instagram nikingni yoz"; (4) "3. Joyni tanla — uy tayyor" / qurilish effekti kadri.
3. **Uy ustida sening niking** — (1) "Niking — uyingning ustida"; (2) yaqindan oltin/oq yorliq; (3) "Do'stlaring seni shahar ichida topadi".
4. **5 level** — (1) "Kichik uydan — katta uygacha"; (2–5) 1→5-level bir xil burchakdan (levellar); (5) "Tanga bilan kuchaytir".
5. **Hovlingni beza** — (1) "Hovli — sening didingda"; (2) bezaksiz → (3) bezakli (shu uy, shu burchak); (4) "60+ bezak, mashina, basseyn".
6. **Tanga qanday topiladi** — (1) "Tanga — har kuni"; (2) "Har kuni kir · +100"; (3) "Do'st taklif qil · +500"; (4) "Kanalga obuna · +300".
7. **Shahar asoschilari** — (1) "Birinchi 100 kishi"; (2) "«Shahar asoschisi» nishoni + 1 000 tanga"; (3) "Joylar soni cheklangan".
8. **Kechasi shahar** — (1) "Shahar kechasi"; (2–3) tungi kadrlar (derazalar, chiroqlar); (4) "Uying ham shunday yonadi".
9. **Do'stingni qo'shni qil** — (1) "Do'stingni qo'shni qil"; (2) shkala 1 → 3 → 10 sovg'alar (gulzor, besedka, sedan) 3D ikonalari; (3) "Havolangni ulash — sovg'a ol".
Izohlar: qisqa (2–4 qator), oxirida chaqiriq "Bio'dagi havola orqali bepul uyingni ol".

## 2. Promo video — "CityLand UZ imkoniyatlari" (9:16, 30–40 s, 1080×1920)
Demo shahar to'ldiriladi (`DEMO=1`, niklar umumiy). Kadrlar (kamera traektoriyasi `video/src`):
1. (0–4 s) Bulutlar ustidan shaharga sho'ng'ish → markaziy maydon. Yozuv: **"Obunachilar shahri"**
2. (4–9 s) Mahalla ustidan sekin uchish, uylar ustida niklar. **"Har bir uy — bitta obunachi"**
3. (9–14 s) Bo'sh joy → "+" → uy yerdan ko'tariladi (qurilish effekti). **"Bepul uyingni ol"**
4. (14–19 s) Uy 1 → 5-level (har level 1 s). **"Kuchaytir"**
5. (19–24 s) Hovliga bezaklar paydo bo'ladi (basseyn, besedka, mashina). **"Beza"**
6. (24–29 s) Piyoda rejimi: odamcha ko'chada yuradi, keyin mashina. **"Shaharda sayr qil"**
7. (29–34 s) Kun → tun, chiroqlar yonadi. **"Kechasi ham jonli"**
8. (34–38 s) Logo + **"Uyingni hozir ol · bio'dagi havola"**
**Ovoz — "Bekzod" (ElevenLabs)**, matn (≈ 30 s):
> "Bu — CityLand UZ. Instagram obunachilari uchun 3D shahar. Bu yerda har bir uy — bitta odamning uyi, ustida esa uning niki. Bepul uyingni ol, uni tanga bilan kuchaytir va hovlingni o'zingcha beza. Shahar bo'ylab piyoda yoki mashinada sayr qil, do'stlaringni qo'shni qil. Birinchi yuz kishi — shahar asoschisi. Uyingni hozir ol — havola bio'da."
- Ovoz qoidasi (egasi): **filtrsiz** (EQ, kompressor, shovqin tozalash, limiter yo'q), **×1.1 tezlik**, **−14 LUFS**. Ovoz faylini egasi beradi yoki `ELEVENLABS_KEY` + `ELEVENLABS_VOICE` bo'lsa avtomatik; subtitrlar ovoz vaqtiga (Whisper JSON bo'lsa — shundan) moslanadi.
- Musiqa: mavjud sintez musiqa (litsenziyasiz muammo yo'q), ovoz ostida −20 dB atrofida.
- Subtitr: har jumla ekranning pastki uchdan birida, oq, qalin, 2 qatordan oshmasin.

## 3. Qisqa reels (har biri 7–15 s, 9:16)
1. **Shahar ustidan uchish** — tepadan pastga, bitta uy ustiga tushadi, nik ko'rinadi. Yozuv: "Uying shu yerda bo'lishi mumkin".
2. **30 soniyada uy oldim** — telefon ekrani yozuvi: bot → nik → tasdiq → Mini App → "Uy qurish" → tabrik (demo akkaunt).
3. **1 → 5-level** — bitta uy bir burchakdan o'sadi (timelapse).
4. **Kechasi shahar** — kun → tun, derazalar yonadi.
5. **Qo'shnimni topdim** — piyoda ko'chada yurish, uylar ustida niklar.
Har birida oxirgi 1,5 s: logo + "Bio'dagi havola". Izoh matnlari `matnlar.md` da.

## Qabul sharti
- `docs/insta/postlar/01..09/` — har postning slaydlari (PNG 1080×1350) + `matnlar.md` (har post: izoh, xeshteglar).
- `docs/insta/reels/promo.mp4` (+ ovozsiz nusxa `promo-ovozsiz.mp4`), `reels/01..05.mp4` (1080×1920, H.264, ≤ 60 MB).
- `npm run insta` — hammasini qayta yig'adi; README'da qanday ishlatish.
- Egasiga oldindan ko'rish uchun `docs/insta/korinish.png` — 9 postning birinchi slaydlari 3×3 to'r ko'rinishida.
- Ishlab chiqarish bazasi va sayt o'zgarmaydi; commit (katta media fayllar `.gitignore` da bo'lsa — README'da qayerdaligi).
