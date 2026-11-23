# PLAN.md — "Obunachilar shahri" (vaqtinchalik nom)

> Bu fayl AI agent (Claude Code, Antigravity, Gemini va h.k.) uchun asosiy yo'riqnoma.
> Ishni boshlashdan oldin to'liq o'qi. Har bir bosqich tugagach, "Holat" bo'limini yangila.
> Til: sayt interfeysi — o'zbek (lotin) + rus. Kod izohlari — ingliz yoki o'zbek.

---

## 1. G'oya

Instagram obunachilari uchun **to'liq 3D, ichida yurish mumkin bo'lgan virtual o'zbek shahri** (veb-sayt).
- Boshida uylar obunachilarga **bepul** tarqatiladi → sahifa o'sadi.
- Keyin uylar, bezaklar, ko'cha nomlari, bilbordlar **sotiladi**.
- Ko'proq pul sarflagan odam **bo'yiga emas, hashamat, joy va sifat** bilan ajralib turadi (uyni tepaga qavat qilib qurish YO'Q).
- Videolar (reels) shu 3D shahardan admin panel orqali avtomatik yasaladi.

## 2. Asosiy qoidalar (buzilmasin!)

1. **Bosh reja (master plan) qulflangan.** Butun shahar 5 000 uchastkaga boshidan chiziladi. Uchastka ID, koordinata, ko'cha, tuman — o'zgarmas (DB'da immutable). *(2026-11-24 da, hali hech kim uy olmagan paytda, egasining ruxsati bilan bosh reja bir marta qayta chizildi — v2. Bu bir martalik ruxsat edi.)*
2. Yangilanishlarda faqat **ko'rinish** o'zgaradi (model, bezak), **joy hech qachon** o'zgarmaydi.
3. Tumanlar **markazdan tashqariga** ochiladi → birinchi kelganlar doim markazga yaqin qoladi.
4. Majburiy ko'chirish faqat favqulodda: rozilik + teng/yaxshiroq joy + bonus.
5. Har bir uchastka eng yuqori uy darajasiga (qasr) sig'adigan o'lchamda chiziladi — uy kattalashsa qo'shniga tegmaydi.
6. Kuchsiz telefonlarda ishlashi shart. Har bir funksiya arzon Android'da (Redmi A seriyasi) sinaladi.
7. Xarajat hozircha **0$**. Faqat bepul tariflar.

## 3. Shahar (bosh reja)

- Hajm: ~3×3 km, **5 000 uchastka** (hovli 25×34 m, villa 32×44 m, qasr 42×60 m):
  - 3 500 oddiy hovli uy, 1 000 ko'p qavatli kvartira, 400 villa, 100 qasr/maxsus
  - + 100–200 do'kon, ofis, bilbord
- 10–12 tuman (har biri 400–500 uchastka). Start: 1–2 tuman (300–500 uy).
- Zonalar: markaziy maydon (favvora, baland binolar), mahallalar, ko'p qavatli uylar tumani, ko'l/kanal bo'yida villalar, tepalikda qasrlar, biznes ko'chasi, qurilish maydonlari (yopiq tumanlar — kran, to'siq).
- Manzil tizimi: "<Ko'cha nomi>, <raqam>-uy". Nomlanmagan ko'cha — "1-ko'cha".
- Uslub: **real teksturali low-poly, Farg'ona vodiysi ruhi** — g'isht/suvoq devorlar, naqshli darvozalar, so'ri, tok, anor, chinor, ariq; Damas/Cobalt; uzoqda tog'lar.
- Kun/tun sikli. Tunda hashamatli uylar yoritiladi.

## 4. Funksiyalar — versiyalar bo'yicha

### v1 (MVP) — 6–8 hafta
- 3D shahar (1–2 tuman ochiq, qolgani qurilish maydoni)
- Avatar bilan yurish: telefonda joystick + barmoq bilan qarash; PC'da WASD + sichqoncha; 3-shaxs kamera
- Uyni bosish → egasi niki, Instagram linki, qisqa yozuv
- Qidiruv: nik → o'sha uyga teleport
- Mini-xarita
- Bepul uy olish (1 kishiga 1 ta bepul uy limiti)
- Login: **login+parol** yoki **Telegram orqali kirish**; parol tiklash — Telegram orqali (ro'yxatdan keyin "Telegram'ni ulang" taklifi)
- "Mening uyim" → stories uchun tayyor rasm
- Yuklanish ekrani (logo + progress), ochilishda qisqa yo'riqnoma
- Kun/tun sikli
- So'z filtri, shikoyat tugmasi
- Admin panel (§6), video yasash (§7)
- FAQ + Telegram orqali yordam
- Qoidalar sahifasi (§10)
- Kunlik avtomatik zaxira nusxa
- Link oldindan ko'rinishi (OG image)
- Til: uz + ru

### v2 — +4–6 hafta
- Pullik uylar va uchastkalar (joy qiymati: markaz, ko'l bo'yi, tepalik qimmat)
- To'lov tizimi (§8)
- Uy levellari (10 ta, har biri oldingisidan kuchli): 1 kichik uy → 2 ayvonli uy → 3 hovli → 4 naqshli hovli → 5 katta hovli → 6 boy hovli → 7 villa → 8 hashamatli villa → 9 qasr → 10 shoh saroyi. Level bilan panjara, darvoza, bog' va tungi yoritish ham kuchayadi; villa uchastkasi 7 dan, qasr 9 dan boshlanadi; tangaga 5 gacha
- Bezaklar: bog', daraxt, hovuz, so'ri, darvoza, panjara, yo'lak, mashina/garaj, tungi yoritish, uy hayvoni
- Nik yorlig'i: oddiy / kumush / oltin; nishonlar ("Shahar asoschisi", "Homiy", "Investor")
- Qo'shni bo'sh uchastkani olib hovlini kengaytirish (faqat oldindan belgilangan joylarda)
- Noyob cheklangan bezaklar (masalan 10 dona), mavsumiy sovg'alar
- Ko'cha nomlari (§5)
- Bilbord, do'kon, ofislarni bizneslarga sotish (moderatsiya bilan)
- Avatar sozlash: yuz, soch, kiyim (do'ppi, chopon...), animatsiyalar (salom, raqs, o'tirish)
- Uyni sovg'a qilish / boshqaga o'tkazish
- Taklif tizimi (shaxsiy link, hisoblagich)
- Reyting: eng hashamatli uylar, eng faol mahallalar
- Foto rejim
- PWA (telefonga ilova kabi o'rnatish)
- Fon musiqasi va shahar ovozi (o'chirish tugmasi)

### v3 — +6–8 hafta
- Ko'p o'yinchi: boshqa odamlarni jonli ko'rish (Colyseus yoki Socket.io)
- Mahalla chati (qattiq filtr + shikoyat)
- Tangalar iqtisodi (§9)
- Umumiy loyihalar: aholi tanga yig'ib bog'/stadion/ko'prik quradi
- Shahar hokimi (oylik saylov), mahalla raislari
- Shahar gazetasi: haftalik yangiliklar → avtomatik Instagram karusel
- Ob-havo, fasllar, bayramlar (Navro'z, Yangi yil, Mustaqillik)
- Kunlik bonus, topshiriqlar, xazina ovi
- NPC odamlar, mushuk, kaptarlar; choyxona, bozor, maktab (bezak)
- Eng ko'p hissa qo'shganning haykali maydonda
- Bildirishnomalar Telegram bot orqali
- Instagram kommentlaridan niklarni avtomatik yig'ish (faqat rasmiy Meta Graph API!)

## 5. Ko'cha nomlari

- Admin: shahar nomi, tumanlar, ko'cha chegaralari.
- Yangi ko'cha → birinchi egasi vaqtincha nom qo'yadi.
- Ko'chada 5+ uy egasi bo'lsa → ovoz berish ochiladi (har bir ega 1 taklif, 3 kun, ko'p ovoz yutadi).
- Markaziy ko'chalar → nom pulga sotiladi.
- Qoidalar: so'z filtri + admin tasdig'i, max 25 belgi, takrorlanmaydi, yiliga 1 marta qayta ovoz.
- Ko'cha nomlangan kuni → avtomatik reels.

## 6. Admin panel (faqat admin, parol + rol)

- Uylar: tasdiqlash, egasini o'zgartirish, bo'shatish
- Tumanlarni ochish/yopish, narxlar, chegirmalar
- Xarita muharriri: yangi bino/bezaklarni kodsiz qo'yish (faqat bo'sh joylarga; qulflangan uchastkalarga tegmaydi)
- Xarita versiyalari + sinov rejimi + bir tugma bilan orqaga qaytish
- Buyurtmalar va to'lovlar
- Bilbord reklamalarini yuklash va moderatsiya
- Ko'cha nomlarini tasdiqlash
- Shikoyatlar
- Yordamchi moderatorlar (cheklangan huquq)
- Texnik ishlar rejimi
- Statistika
- Tanga iqtisodi sozlamalari
- Video bo'limi (§7)
- Tashlab ketilgan bepul uylar: egasi 3–6 oy kirmasa → bo'shatish (sozlanadi)

## 7. Video yasash (admin paneldan)

1. Bir yoki bir nechta uyni belgilash (20–30 tagacha birdaniga)
2. Uslub: musiqa, matn, "Bekzod" ovozi (ElevenLabs) bor/yo'q, davomiylik
3. "Video yasash" → kamera uyga uchib boradi → nik chiqadi → 9:16 reels
4. Oldindan ko'rish → tahrirlash → qayta yasash
5. "Telegram'ga yuborish" (tasdiqlash uchun) / post

Texnologiya: **Remotion** yoki headless brauzer (Playwright) bilan 3D sahnani yozib olish. Render — o'z kompyuterda (bepul).

## 8. To'lov (keyinroq hal qilinadi)

- Variant A (hujjatsiz, avtomat): kartaga o'tkazma + **noyob summa** (masalan 50 017 so'm) + bank Telegram xabarnomasini o'qib avtomatik solishtirish. Uy 30 daqiqaga band qilinadi.
- Variant B (rasmiy): Payme/Click biznes — YaTT yoki firma kerak, % komissiya.
- Kod boshidanoq ikkala variantni qo'llashi kerak (payment provider interfeysi).
- Yosh chegarasi qo'yilmaydi.

## 9. Tanga iqtisodi (v3)

- Topish: kunlik kirish, taklif, topshiriqlar.
- Sarflash: bezaklar, uy darajasi, ovoz.
- Barcha narx va mukofotlar admin paneldan sozlanadi (inflyatsiyani oldini olish).
- Hamma operatsiyalar **serverda** tasdiqlanadi (aldashga qarshi).

## 10. Huquqiy va xavfsizlik

- Qoidalar: uy — **virtual narsa**, haqiqiy mulk emas; pul qaytarish siyosati; loyiha yopilsa nima bo'ladi; maxfiylik siyosati; akkaunt/ma'lumotni o'chirish.
- 3D model va musiqa — faqat bepul litsenziyali (CC0: Kenney, Poly Haven va h.k.).
- Bilbordda boshqa brend logotipi — faqat ruxsat bilan.
- Parollar shifrlangan (Supabase Auth).
- Rate limit, bot/spamga qarshi himoya.
- Xatolar monitoringi (Sentry, bepul).
- Daromad va soliq masalasini mutaxassis bilan aniqlash.

## 11. Texnologiyalar (hammasi bepul tarif)

| Qism | Texnologiya |
|---|---|
| 3D | Three.js + React Three Fiber (Unity WebGL — YO'Q) |
| Frontend | React + Vite + TypeScript |
| Modellar | Blender → glTF/GLB + Draco/Meshopt, teksturalar KTX2 |
| Baza + Auth | Supabase (Postgres, Auth, Storage) |
| Hosting | Cloudflare Pages (`<nom>.pages.dev`, domen shart emas) |
| 3D fayllar | Cloudflare R2 |
| Bot / server funksiyalar | Cloudflare Workers / Supabase Edge Functions |
| Ko'p o'yinchi (v3) | Colyseus yoki Socket.io |
| Video | Remotion / Playwright |
| Monitoring | Sentry, Cloudflare Analytics |
| Kod | GitHub |

## 12. Optimallashtirish (kuchsiz telefonlar)

- Yorug'lik/soya **bake** qilinadi (real-time soya yo'q yoki faqat "yuqori" sifatda)
- Instancing: 5–10 xil uy modeli, rang/bezak bilan farqlanadi
- LOD: uzoqdagi uylar oddiy shakl
- Chunk streaming: faqat atrofdagi mahalla yuklanadi
- Fog: uzoq masofa yashiriladi
- Avtomatik sifat: past/o'rta/yuqori; FPS tushsa o'zi pasayadi
- Birinchi yuklanish 3–5 MB, 2–4 soniya; brauzer keshi
- Maqsad: arzon Android'da 30+ FPS

## 13. Ishga tushirish

1. Kutish ro'yxati sahifasi ("Uyingni band qil") — ochilishdan 1–2 hafta oldin
2. Beta sinov: 20–50 kishi
3. Yuklama sinovi (1000 bir vaqtda)
4. Ochilish: birinchi 100 kishiga "Shahar asoschisi" nishoni
5. Instagram: har kuni yangi uylar reels, haftalik gazeta

## 14. Hali hal qilinmagan

- [ ] Shahar nomi (variantlar: Obunachiobod, Hovli, Mahalla.uz, Yangi Shahar, Phantom City, Do'stlar shahri, Orzu shahar)
- [ ] Yakuniy vizual uslub tasdig'i
- [ ] To'lov usuli (A yoki B)
- [ ] Horizo Tour binosi kerakmi (keyin ko'riladi)

## 15. Papka tuzilishi (taklif)

```
obunachilar-shahri/
├─ PLAN.md
├─ apps/
│  ├─ web/          # 3D sayt (React + R3F)
│  └─ admin/        # admin panel
├─ packages/
│  └─ shared/       # turlar, uchastka sxemasi, util
├─ server/          # Workers / Edge Functions, Telegram bot
├─ video/           # Remotion loyihasi
├─ blender/         # .blend manbalar + eksport skriptlari
├─ assets/          # eksport qilingan GLB/KTX2
└─ supabase/        # migratsiyalar, RLS siyosatlari
```

## 16. Ish tartibi (agent uchun)

1. **Birinchi vazifa:** bitta kichik mahalla prototipi — 20–30 uy, avatar bilan yurish, uyni bosganda nik chiqishi. Telefonda tezlikni sinash.
2. Keyin: uchastka sxemasi (5 000 ta, qulflangan) + Supabase baza.
3. Keyin: v1 qolgan funksiyalari → admin → video.
4. Har katta qadamdan keyin "Holat" bo'limini yangila va GitHub'ga commit qil.
5. Shubha bo'lsa — §2 qoidalarini buzmaydigan variantni tanla.

## 17. Agentlar va asboblar

- Ishlatiladigan agentlar: **Claude Code** (VS Code plagini) va **Antigravity/Gemini** — navbatma-navbat, hech qachon bir vaqtda emas.
- Agent almashishdan oldin: oxirgi ishni `git commit` qil, "Holat" bo'limini yangila.
- Papka ildizida `CLAUDE.md`, `GEMINI.md`, `AGENTS.md` bor — hammasi shu PLAN.md ga yo'naltiradi.
- Murakkab 3D sahnalar — imkon bo'lsa Claude bilan.

### Blender bilan ishlash
- **Blender MCP (blender-mcp)** — dizayn va sinov paytida Blender'ni jonli boshqarish (Claude va Antigravity'ga ulanadi).
- **Python skriptlar** — asosiy ish shu orqali (takrorlanuvchan):
  - `blender -b shahar.blend -P blender/scripts/<skript>.py`
  - 5 000 uchastkani bosh reja bo'yicha joylashtirish (uchastka sxemasi `packages/shared` dagi ma'lumotdan o'qiladi — joylar o'zgarmaydi)
  - Modellarni GLB ga eksport + Draco/Meshopt siqish, teksturalarni KTX2 ga
  - Video uchun kamera yo'llari
- Skriptlar `blender/scripts/` da saqlanadi.

## Holat

> Oxirgi yangilanish: 2026-11-24. Ishga tushirish va internetga chiqarish: README.md.

- [x] Reja tuzildi (2026-11-23)
- [x] Mahalla prototipi — kompyuterda tayyor; **haqiqiy Redmi A telefonda hali sinalmagan**
- [x] Bosh reja: 5 000 uchastka, 12 tuman — qulflangan (`packages/shared/data/masterplan.lock`)
- [x] v1 kodi (lokal sinovdan o'tgan)
- [x] v2 kodi (lokal sinovdan o'tgan; to'lov sukut bo'yicha o'chiq)
- [x] v3 kodi (lokal sinovdan o'tgan; saylov sukut bo'yicha o'chiq)
- [x] Bosh reja v2 (2026-11-24): katta hovlilar, shahar 3×3 km, uylar o'z uchastkasida 1–10 level; `0010_masterplan_v2.sql`
- [x] Markaz, 1-bosqich (2026-11-24): prezident saroyi, hokimiyat, sud, 12 burchak minorasi (sotilmaydi); `packages/shared/src/center.ts`, `apps/web/src/logic/plaza.ts`, `0012_center.sql`
- [x] 10 level tizimi (2026-11-23): modellar `blender/scripts/kit_levels.py`, baza `0009_levels.sql`, ko'rish `npm run showcase`
- [ ] Internetga chiqarish (Supabase, Cloudflare, Telegram bot akkauntlari kerak)
- [ ] Haqiqiy xizmatlar bilan sinash: Telegram bot, Payme/Click sandbox, bank xabari, ElevenLabs, Meta API, Turnstile, Sentry
- [ ] Beta 20–50 kishi (§13), qoidalar matnini huquqshunos ko'rishi (§10), §14 qarorlari

Rejadan farqlar (sababi bilan):
- Video: Remotion o'rniga Playwright + ffmpeg (§7 ikkalasiga ruxsat bergan).
- KTX2/R2 ishlatilmadi: barcha 3D fayllar jami ~1 MB, Pages'ning o'zi yetadi.
- Ko'p o'yinchi: Socket.io. Musiqa va tabiat ovozi sintez qilinadi (litsenziya masalasi yo'q).
- Ko'cha/panjara kabi protsedural qismlar koddan, modellar Blender skriptidan (`npm run models`); Blender MCP kerak bo'lmadi.
- `TURNSTILE_SECRET` ishlab chiqarishda majburiy (soxta akkauntlarga qarshi).

Ma'lum cheklovlar: chastota chegarasi xato bilan tugagan urinishlarni sanamaydi; xazina va «3 mahalla» topshirig'ida joylashuv mijozdan olinadi (mukofotlar shuning uchun kichik); parol tiklanganda eski sessiyalar darhol yopilmaydi.
