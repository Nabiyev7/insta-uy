# PLAN.md — CityLand UZ

> Bu fayl AI agent (Claude Code, Antigravity, Gemini va h.k.) uchun asosiy yo'riqnoma.
> Ishni boshlashdan oldin to'liq o'qi. Har bir bosqich tugagach, "Holat" bo'limini yangila.
> Til: sayt interfeysi — o'zbek (lotin) + rus. Kod izohlari — ingliz yoki o'zbek.

---

## 1. G'oya

Instagram obunachilari uchun **to'liq 3D, ichida yurish mumkin bo'lgan virtual shahar** (veb-sayt).
- Boshida uylar obunachilarga **bepul** tarqatiladi → sahifa o'sadi.
- Keyin uylar, bezaklar, ko'cha nomlari, bilbordlar **sotiladi**.
- Ko'proq pul sarflagan odam **hashamat, joy va sifat** bilan ajralib turadi: uy **ko'pi bilan 2 qavat** (5-leveldan boshlab; egasi qarori, 2026-11-24).
- Videolar (reels) shu 3D shahardan admin panel orqali avtomatik yasaladi.

## 2. Asosiy qoidalar (buzilmasin!)

1. **Bosh reja (master plan) qulflangan.** Butun shahar 5 000 uchastkaga boshidan chiziladi. Uchastka ID, koordinata, ko'cha, tuman — o'zgarmas (DB'da immutable). *(2026-11-24 da, hali hech kim uy olmagan paytda, egasining ruxsati bilan ikki marta qayta chizildi: v2 va v3 (to'rt markaz + yashil bulvar). Har biri bir martalik ruxsat edi; hozir v3 qulflangan.)*
2. Yangilanishlarda faqat **ko'rinish** o'zgaradi (model, bezak), **joy hech qachon** o'zgarmaydi.
3. Tumanlar **markazdan tashqariga** ochiladi → birinchi kelganlar doim markazga yaqin qoladi.
4. Majburiy ko'chirish faqat favqulodda: rozilik + teng/yaxshiroq joy + bonus.
5. Har bir uchastka eng yuqori uy darajasiga (qasr) sig'adigan o'lchamda chiziladi — uy kattalashsa qo'shniga tegmaydi.
6. Kuchsiz telefonlarda ishlashi shart. Har bir funksiya arzon Android'da (Redmi A seriyasi) sinaladi.
7. Xarajat hozircha **0$**. Faqat bepul tariflar.
8. **Uy leveli 1–5, ko'pi bilan 2 qavat** — 1–4-level bir qavat, 5-level ikki qavat. 6–10 keyin (egasi, 2026-11-25). Kuchaytirish tanga bilan: 300 / 1 000 / 2 000 / 3 500.
9. **Egasi yo'q uchastkada uy chizilmaydi**: bo'sh joy — maysa, daraxt va "Bo'sh joy — oling!" taxtachasi. Bezaklar (lyukslar ham) tanga bilan faqat 5-leveldan (nik lavhasi bundan mustasno).
10. **Uy va avatar ranglari tanlanmaydi** — uy har levelda o'z standart rangida; avatarda faqat bosh kiyim va libos. **Shikoyat bo'limi yo'q** (so'z filtri, havola taqiqi, admin bloklashi qoladi). **Nik tasdig'i yo'q** — uy darhol tayyor.
11. **Kirish faqat Telegram bot orqali, nik botda yoziladi va keyin faqat admin o'zgartiradi.** Bitta nik — bitta akkaunt. Bepul uy bittadan (hovli, 1-level, birinchi 100 kishi — "Shahar asoschisi"); qo'shimcha uylar faqat pulga. 3 oy kirmagan odamning bepul uyi bo'shatiladi (2 hafta oldin bot ogohlantiradi), pulga olingani bo'shatilmaydi.

## 3. Shahar (bosh reja)

- Hajm: ~3×3 km, **5 000 uchastka** (hovli 24×34 m, villa 30×42 m, qasr 40×56 m):
  - 3 500 oddiy hovli uy, 1 000 ko'p qavatli kvartira, 400 villa, 100 qasr/maxsus
  - + 100–200 do'kon, ofis, bilbord
- 10–12 tuman (har biri 400–500 uchastka). Start: 1–2 tuman (300–500 uy).
- Zonalar: o'rtada kichik maydon, undan to'rt tomonga yashil bulvarlar; to'rt markaz — ma'muriy (shimol), biznes (sharq), savdo (janub), dam olish bog'i (g'arb); 8 mahalla markazi, halqa yo'l, 4 diagonal prospekt, ko'l bo'yida villalar, tepalikda qasrlar, kvartiralar, daryo uchun bo'sh yo'lak, qurilish maydonlari (yopiq tumanlar — kran, to'siq). Batafsil: `packages/shared/src/masterplan/zones.ts`, `docs/chat/shahar-reja.png`.
- Manzil tizimi: "<Ko'cha nomi>, <raqam>-uy". Nomlanmagan ko'cha — "1-ko'cha".
- Uslub: **yorug', toza, stilize** (2026-11-24, 1-bosqich): deyarli teksturasiz tekis ranglar, qirralari yumaloqroq, yumaloq daraxtlar; kunduzi oq-iliq quyosh, tun qisqa va ochiq. Umumiy va universal — hech bir hududga bog'lanmaydi; uzoqda tog'lar. Milliy narsalar (so'ri, tandir, tok) faqat do'kondagi ixtiyoriy bezaklarning bir qismi.
- Kun/tun sikli. Tunda hashamatli uylar yoritiladi.

## 4. Funksiyalar — versiyalar bo'yicha

### v1 (MVP) — 6–8 hafta
- 3D shahar (1–2 tuman ochiq, qolgani qurilish maydoni)
- Uch rejim: **Shahar** (erkin kamera, boshlang'ich), **Piyoda** (avatar, 3-shaxs kamera), **Mashina**
- Uyni bosish → egasi niki, Instagram linki, qisqa yozuv
- Qidiruv: nik → o'sha uyga teleport
- Mini-xarita
- Bepul uy olish (1 kishiga 1 ta bepul uy limiti)
- Kirish **faqat Telegram bot orqali**: bot nik so'raydi → bir martalik havola (15 daqiqa) → sayt kirgan holda ochiladi. Parol va ro'yxat formasi yo'q; eski parolli akkauntlar Telegram ulamaguncha faqat ko'radi
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
- Uy levellari (10 ta, har biri oldingisidan kuchli): 1 kichik uy → 2 shinam uy → 3 hovli uy → 4 bezakli uy → 5 katta uy → 6 boy uy → 7 villa → 8 hashamatli villa → 9 qasr → 10 saroy. Level bilan panjara, darvoza, bog' va tungi yoritish ham kuchayadi; villa uchastkasi 7 dan, qasr 9 dan boshlanadi; tangaga hozircha 3 gacha
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
- Kunlik bonus, kanal bonusi, xazina ovi (kuniga 3 ta), tanga o'tkazish
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

## 6. Admin panel (faqat admin/moderator; kirish — botga /admin, havola orqali)

- Uylar: egasini o'zgartirish, levelini o'rnatish, bo'shatish
- Tumanlarni ochish/yopish, narxlar, chegirmalar
- Xarita muharriri: yangi bino/bezaklarni kodsiz qo'yish (faqat bo'sh joylarga; qulflangan uchastkalarga tegmaydi)
- Xarita versiyalari + sinov rejimi + bir tugma bilan orqaga qaytish
- Buyurtmalar va to'lovlar
- Bilbord reklamalarini yuklash va moderatsiya
- Ko'cha nomlarini tasdiqlash
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

- Pul birligi: **Tanga** / «Монеты». Topish faqat shulardan: birinchi 100 kishi 1 000; kunlik kirish 100 (7-kuni +300, bir kun o'tkazilsa seriya noldan); Telegram kanalga obuna 300 (bir marta, bot `getChatMember` bilan tekshiradi); do'st taklifi 500 (do'st uy olganda); "Haftaning hovlisi" g'olibi 2 000; xazina 50 (kuniga 3 ta). Topshiriqlar yo'q.
- Tanga o'tkazish: kuniga yuborish ≤ 500, qabul ≤ 1 000, komissiya yo'q, faqat uyi va Telegrami bor akkauntlar orasida, o'ziga yo'q; admin "Iqtisod" sahifasida ro'yxat.
- Chatga yozish tekin.
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

- [x] Shahar nomi: **CityLand UZ** (Telegram va Instagram: `citylanduz`)
- [ ] Yakuniy vizual uslub tasdig'i (1-bosqich uslubi tayyor, egasi ko'rib chiqadi)
- [ ] To'lov usuli (A yoki B)
- [ ] Horizo Tour binosi kerakmi (keyin ko'riladi)

## 15. Papka tuzilishi (taklif)

```
cityland-uz/
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

> Oxirgi yangilanish: 2026-11-25. Ishga tushirish va internetga chiqarish: README.md.

- [x] **6-qadam, D (2026-11-25): tanga** — topish: asoschi 1 000, kunlik 100 (7-kuni +300, seriya 1..7, bir kun o'tkazilsa noldan), kanalga obuna 300 (sayt "Obunani tekshirish" → `POST /coins/channel`, botda "Obuna bo'ldim"; `getChatMember`; bir Telegramga bir marta), do'st taklifi 500, haftaning hovlisi 2 000, xazina 50 × 3 (har biri boshqa joyda). Topshiriqlar olib tashlandi. Tanga o'tkazish (`my_send_coins`: ≤500 yuborish, ≤1 000 qabul, komissiyasiz). Admin "Iqtisod": qiymatlar, 7 kunlik kirim/chiqim, o'tkazmalar ro'yxati. Mavsumiy bezaklar 500–600, mangal/it uyi 400, maydoncha 1 000, nik lavhasi 200 (`0021_coins.sql`).
- [x] **6-qadam, B+C (2026-11-25): kirish faqat bot orqali, uy olish** — bot: /start → nik (format, so'z filtri, band emas; bir nik — bir akkaunt, bazada noyob indeks) → bir martalik havola `?kirish=` (15 daqiqa, bir marta; manzildan darhol o'chiriladi, Telegramga o'tishdan oldingi oyna qaytadi). Saytdagi tugma botga (`?start=login` yoki `r_<taklif>`); bot nomi bo'sh bo'lsa "Tez kunda". Ro'yxat, parol va kod bilan tiklash olib tashlandi; eski parolli akkaunt Telegram ulamaguncha faqat ko'radi (`telegram_required`). Nikni faqat admin o'zgartiradi (Foydalanuvchilar → Nik). Admin panelga kirish — botga `/admin` (faqat admin/moderator). Lokal sinov uchun kirish oynasida "Sinov kirish" (faqat `npm run dev`). Uy olish: nik profildan; asoschi nishoni navbat bilan (aniq 100); 3 oy kirmagan bepul uy bo'shaydi, pullik — yo'q. Bot: `/start wait` — kutish ro'yxati.
- [x] **6-qadam, A (2026-11-25): tozalash va qoidalar** — uy leveli 1–5 (`MAX_TIER`, bazada `private.max_tier()`, `kit_levels.py` `MAX_LEVEL`; 6–10 modellari kodda qoladi), kuchaytirish 300/1 000/2 000/3 500 tanga va katta "Kuchaytirish" tugmasi (tasdiq → qurilish → tabrik), lyuks 5-leveldan, villa/qasrda ham 1–5-level uylar; uy/avatar ranglari, shikoyat va nik tasdig'i olib tashlandi (`0019_levels5.sql`)
- [x] Reja tuzildi (2026-11-23)
- [x] Mahalla prototipi — kompyuterda tayyor; **haqiqiy Redmi A telefonda hali sinalmagan**
- [x] Bosh reja: 5 000 uchastka, 12 tuman — qulflangan (`packages/shared/data/masterplan.lock`)
- [x] v1 kodi (lokal sinovdan o'tgan)
- [x] v2 kodi (lokal sinovdan o'tgan; to'lov sukut bo'yicha o'chiq)
- [x] v3 kodi (lokal sinovdan o'tgan; saylov sukut bo'yicha o'chiq)
- [x] Bosh reja v2 (2026-11-24): katta hovlilar, shahar 3×3 km, uylar o'z uchastkasida 1–10 level; keyin v3 bilan almashdi
- [x] Davlat binolari va 12 minora (2026-11-24); v3 dan keyin joylari: `packages/shared/src/center.ts`, jamoat joylari `apps/web/src/logic/landscape.ts`, `0012_center.sql`
- [x] Harakat va ekran (2026-11-24): Shahar / Piyoda / Mashina rejimlari, pastki panel, uch bo'limli chat (`0013_chat.sql`); `npm run screens`
- [x] Bezaklar tizimi (2026-11-24; nuqtalar 9-qadamda yangilandi: 17 ta nuqta, 5-leveldan 8–17 joy): katalog bazada va adminda, devor materiali/ramka/eshik rangi, nik lavhasi; `0014_decor.sql`, `packages/shared/src/anchors.ts`
- [x] Umumiy uslub (2026-11-24): uylar, saroylar, davlat binolari klassik/zamonaviy; ekranni tozalash, akkauntni o'chirish
- [x] Yangi bezaklar va sotuv (2026-11-24): 26 model (`kit_decor.py`), noyob raqamlar, to'plamlar, sinab ko'rish, sovg'a, yangilik xabari, haftaning hovlisi; `0015_shop.sql`
- [x] **1-bosqich: shaharni qurish, CityLand UZ (2026-11-24)** — egasi "Qulfni ochishga ruxsat beraman" dedi; bosh reja v3 chizildi va yana qulflandi (to'rt markaz + yashil bulvar, halqa va diagonal yo'llar, daryo yo'lagi bo'sh, 8 mahalla markazi); `0010_masterplan_v3.sql`. Yorug' uslub, 1–3-level yangi uylar (`kit_first.py`), kasalxona, masjid, o't o'chirish, teatr, univermag, bozor (`kit_city.py`). Tijorat joylarining hammasi sotuvdan olingan
- [x] **11-qadam: yangi interfeys (2026-11-24)** — "oyna" panellar, o'ng ustunda rejimlar, pastda bitta karta (bepul uy / tabrik / kunlik bonus / xazina / yangi bezak), qo'ng'iroq (`notes`), guruhli menyu, Uyim bo'limlari, do'konda 9 tab va 3D rasm-ikonkalar (`npm run models` ichida), orqaga tugmasi (`app/history.ts`), kirgach o'sha joyga qaytish, tun rejimi, chap qo'l, 3 qadamli ko'rsatma, bo'sh joyda sariq "+" va ramka (`world/markers.ts`), emoji o'rniga Tabler belgilari; bezak joylari bitta manbada (1–4-levelda 0, `0018_interface.sql`); e2e: 3 ekran × 2 til (`e2e/ui.mjs`)
- [x] **10-qadam: lyuks bezaklar (2026-11-24)** — 9 ta lyuks bezak faqat 7-leveldan (`LUXE_LEVEL`, `kit_lux.py`, `0017_luxe.sql`): pavilyon, gril oshxona, lyuks basseyn, marmar favvora, fransuz bog'i, limuzin, superkar, jip, tuvakdagi daraxt; oddiy jufti bilan bir joyda, uzoq shakli (`_lod`) bor, uchta mashina haydaladi
- [x] **9-qadam: bo'sh uchastkalar, yangi uylar 1–5, bezaklar (2026-11-24)** — shahar uysiz ochiladi (demo aholi faqat `DEMO=1`), bo'sh joy taxtachasi va "Shu yerda uy qurish", qurilish effekti (`apps/web/src/logic/construction.ts`); 2–3-level tuzatildi (karport/garaj, yo'l, ustunchali devor), 4–5-level yangi (`kit_modern.py`); 15 ta yangi bezak (`kit_yard.py`), 5–10-level uchun bir xil joy nuqtalari, bezak faqat 5-leveldan; bepul uy faqat hovli; `0016_yard.sql`
- [x] 10 level tizimi (2026-11-23): modellar `blender/scripts/kit_levels.py`, baza `0009_levels.sql`, ko'rish `npm run showcase`
- [ ] Internetga chiqarish (Supabase, Cloudflare, Telegram bot akkauntlari kerak)
- [ ] Haqiqiy xizmatlar bilan sinash: Telegram bot, Payme/Click sandbox, bank xabari, ElevenLabs, Meta API, Turnstile, Sentry
- [ ] Beta 20–50 kishi (§13), qoidalar matnini huquqshunos ko'rishi (§10), §14 qarorlari

Rejadan farqlar (sababi bilan):
- Video: Remotion o'rniga Playwright + ffmpeg (§7 ikkalasiga ruxsat bergan).
- KTX2/R2 ishlatilmadi: barcha 3D fayllar jami ~2,3 MB, Pages'ning o'zi yetadi.
- Ko'p o'yinchi: Socket.io. Musiqa va tabiat ovozi sintez qilinadi (litsenziya masalasi yo'q).
- Ko'cha/panjara kabi protsedural qismlar koddan, modellar Blender skriptidan (`npm run models`); Blender MCP kerak bo'lmadi.
- Soxta akkauntlarga qarshi: akkaunt faqat Telegram bot orqali ochiladi (bitta Telegram — bitta akkaunt, bitta nik — bitta akkaunt).

Ma'lum cheklovlar: chastota chegarasi xato bilan tugagan urinishlarni sanamaydi; xazina va «3 mahalla» topshirig'ida joylashuv mijozdan olinadi (mukofotlar shuning uchun kichik); kirish havolasi 15 daqiqa amal qiladi (kim ko'rsa — kiradi), shuning uchun bot uni faqat shaxsiy chatga yuboradi.
