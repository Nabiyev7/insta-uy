# Markazni qurish — 1-bosqich (asosiy narsalar)

> **Diqqat:** avval `UYLAR-PROMT.md` (yangi bosh reja) bajarilgan bo'lishi kerak. Markaziy maydon va B101–B112 u yerda o'zgarmaydi, shuning uchun quyidagi koordinatalar amal qiladi.

> Egasi bilan kelishilgan (2026-11-23). Avval `PLAN.md` va `CHAT-UCHUN.md` ni o'qi.
> Koordinata: metr, markaz (0,0), +x sharq, +z janub. rot: 0 janubga, 1 sharqqa, 2 shimolga, 3 g'arbga qaraydi. O'lcham: eni × chuqurligi, joy — markazi.
> Bu **birinchi bosqich**: faqat asosiy binolar. Mayda ishlar (bog', bezak, narx tizimi) keyingi bosqichlarda bo'ladi, hozir qilinmaydi.

## G'oya
Haqiqiy shahardagidek: **o'rtasi keng va ochiq maydon** (favvora, bulvarlar), muhim binolar **chetlarida** turadi. Hammasini o'rtaga tiqib qo'ymaslik kerak.
- Maydon chetlarida, burchaklar yonida — 3 ta davlat binosi (klassik uslub).
- Eng chetda, 12 ta burchak minorasi — biznes ko'rinishida (zamonaviy shisha), hozircha faqat bezak.
- O'rta (|x|, |z| < 32) va 4 prospekt davomi — bo'sh, keng, piyodalar uchun.

## Qarorlar
- Maydon 250 × 250 m ichida (A2). **Qulf ochilmaydi**: `masterplan.json` va xeshi o'zgarmaydi, B101–B112 joyi va 28 × 28 m izi o'zgarmaydi.
- Stadion markazga kelmaydi — parkda umumiy loyiha bo'lib qoladi (tegilmaydi).
- Uslub **umumiy**, hech bir hududga bog'lanmaydi: davlat binolari klassik (oq-krem tosh, ustunlar, gumbaz — oq yoki mis rangida, frontonlar), biznes binolari zamonaviy (shisha + beton). Milliy naqsh va ko'k gumbaz ishlatilmaydi.
- Haqiqiy gerb, bayroq, brend, bank nomi, shaxs yo'q (§5.6).

## 1. Uchta davlat binosi (yangi, sotilmaydi, `plazaItems` ichida)

| № | Nomi (uz) | Nomi (ru) | model_id | x | z | eni×chuq., m | balandlik, m | rot | bossa nima ochiladi |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Prezident saroyi | Президентский дворец | prezident | −59 | −59 | 50 × 36 | 22 (gumbaz bilan 34) | 0 | gazeta |
| 2 | Shahar hokimiyati | Мэрия города | hokimiyat | 59 | −59 | 46 × 32 | 18 (soat minorasi 30) | 0 | shahar (saylov, umumiy loyihalar) |
| 3 | Shahar sudi | Городской суд | sud | −59 | 59 | 44 × 30 | 16 | 2 | qoidalar |

Ko'rinishi:
1. **Prezident saroyi**: 3 qavat, oq-krem suvoq, old tomonda 8 ta baland oq ustun va fronton, o'rtada katta oq/mis gumbaz (~16 m), gumbaz ostida ustunli baraban, oldida keng zinapoya. Tunda derazalar va gumbaz yonadi.
2. **Shahar hokimiyati**: 3 qavat, och qumrang g'isht, o'rtada soat minorasi (tepasida kichik shpil yoki gumbaz), 6 ustunli kirish portiki, derazalar ustida oddiy karniz. Tunda soat va derazalar yonadi.
3. **Shahar sudi**: 2 qavat, oq tosh, old tomon bo'ylab 10 ta ustun, tekis tom ustida fronton va karniz, zinapoya.

Har biri ≤ 2 500 uchburchak, uzoqdan ko'rinadigan sodda LOD bilan.

## 2. 12 ta burchak minorasi — yangi ko'rinish (joyi o'zgarmaydi)

| Joy | Yangi ko'rinish | Nomi (uz / ru) | balandlik, m |
|---|---|---|---|
| B101 (−108,−108), B104 (108,−108), B112 (−74,108) | bank | Shahar banki / Городской банк | 48 / 52 / 44 |
| B103 (−74,−108), B106 (74,−108), B109 (74,108) | agentlik | Agentlik / Агентство | 32 / 30 / 34 |
| B107 (108,108), B110 (−108,108) | novostroyka | Yangi turar-joy / Новостройка | 56 / 52 |
| B102 (−108,−74), B105 (108,−74), B108 (108,74), B111 (−108,74) | ofis | Ofis markazi / Офисный центр | 36 / 40 / 44 / 32 |

- **Bank**: shisha fasad (to'q ko'k-yashil), pastki 2 qavat tosh asos, kirish ustida soyabon, tepada pog'onali toj. ≤ 1 000 uchburchak.
- **Agentlik**: past-o'rta bino, beton ramka + shisha, yonida vertikal rangli panel. ≤ 1 000.
- **Novostroyka**: ko'p qavatli turar-joy fasadi, balkon chiziqlari, pastki qavatda vitrina. ≤ 1 000.
- **Ofis**: mavjud `office` modeli, lekin har biri boshqa shisha rangi va balandlikda.
- Ko'rinish turi masterplan'ga yozilmaydi (alohida konfiguratsiya, masalan `packages/shared` da yoki yangi migratsiyada).
- **Bu 12 bino hozircha faqat ko'rinish uchun.** Sotuvdan olinadi (o'chirib qo'yiladi, o'chirilmaydi): saytda "sotib olish/ijara" tugmasi chiqmaydi, bosganda faqat nomi ko'rinadi. B101–B112 joylari bazada qolaveradi — keyin ular uchun alohida vazifa o'ylab topiladi.

## 3. Maydonni bo'shatish (to'qnashmasligi uchun)
Yangi binolarga tegadigan narsalar maydon chetiga ko'chadi:
- Qahramon haykali: (0, −55) → (−24, −24) (prospekt o'qi ochiq bo'lsin).
- Avtoturargoh: (−38, −76) → (−36, −107), rot 0.
- Maktab: (40, −82) → (36, −107), 30 × 16 ga kichraytiriladi.
- Choyxona: (−40, 62) → (36, 108), rot 2.
- Bozor (37, 54) — joyida qoladi.
- Daraxt, chiroq, o'rindiq, gulzorlar binolar ichida qolib ketsa — yaqin bo'sh joyga suriladi. |x| < 14 va |z| < 14 yo'laklarida hech narsa bo'lmasin.
- `PLAZA_SOLIDS` (to'qnashuv) yangilansin.

## Qabul sharti
- Binolar orasi ≥ 8 m, maydon ichida, 4 kirish ochiq (koordinatalar oldindan tekshirilgan).
- `npm run masterplan` — qulf xeshi o'zgarmagan.
- Yangi noyob modellar: 6 ta (prezident, hokimiyat, sud, bank, agentlik, novostroyka). Modellar fayli +400 KB gacha, markaz ≤ 40 ming uchburchak.
- `npm test`, `npm run typecheck` o'tadi; `node e2e/perf.mjs` oldingidan sezilarli yomon emas.
- `npm run showcase` da ko'rsatilsin va `docs/chat/markaz-3d.jpg` yangi rasm bilan almashtirilsin.
- `PLAN.md` "Holat" yangilansin, git commit.

## Keyingi bosqichlar (HOZIR QILINMAYDI, faqat ma'lumot uchun)
- 2-bosqich: bulvarlarda chinor qatorlari va chiroqlar, markaziy bog' (59, 59), bozorni (−36, 108) ga ko'chirish, gulzorlar.
- 3-bosqich: qurilish maydoni + kran (107, −36); davlat binolarini bosganda oyna ochilishi.
- Keyinroq: baland binolar uchun vazifa (hozircha hal qilinmagan).
