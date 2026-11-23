# Katta hovlilar va yangi bosh reja (qulfni bir martalik ochish)

> **Bu promt BIRINCHI bajariladi**: `MARKAZ`, `BEZAK-HARAKAT` va `IQTISOD` promtlaridan oldin, chunki ular yangi uchastka o'lchamlariga tayanadi.
> Avval `PLAN.md` (§2, §3, §12) va `CHAT-UCHUN.md` ni o'qi.

## Ruxsat
**Qulfni ochishga ruxsat beraman.** — loyiha egasi, 2026-11-24.
- Bu **bir martalik** ruxsat. Hali hech kim uy olmagan, shuning uchun bosh rejani qayta chizish xavfsiz.
- Bosh reja yangidan yaratiladi va yana qulflanadi (yangi xesh). Shundan keyin PLAN §2 qoidalari avvalgidek amal qiladi.
- Lokal bazada demo aholi bo'lsa, u yangi rejaga qayta yaratiladi. Haqiqiy foydalanuvchi yo'q.

## Nima uchun
Hovli uchastkasi (16 × 24 m) kichik: uy 10-levelgacha o'sganda hovlida bezak uchun joy qolmaydi. Egasining qarori: **ko'chish bo'lmaydi**. Har bir uy o'z uchastkasida 1-leveldan 10-levelgacha o'sadi, buning uchun **hamma uchastkalar kattalashadi**.

## 1. Uchastka o'lchamlari
| Tur | Hozir | Yangi (mo'ljal) | Soni |
|---|---|---|---|
| Hovli | 16 × 24 | **24 × 34** | 3 500 |
| Villa | 20 × 28 | **30 × 42** | 400 |
| Qasr | 30 × 42 | **40 × 56** | 100 |
| Kvartira | — | o'zgarmaydi (ko'p qavatli uylar ichida) | 1 000 |
| Tijorat (do'kon/ofis/bilbord) | — | o'zgarmaydi | 170 (sotuvda emas) |

- O'lchamlar ±10% ga o'zgarishi mumkin, agar reja chiroyliroq tushsa. Asosiy shart: **10-leveldagi uy (shoh saroyi) hovli uchastkasiga bemalol sig'sin** va uydan oldinda kamida **10 m chuqurlikdagi hovli** qolsin. Uy izi uchastka maydonining ~45% idan oshmasin.
- Villa va qasr uchastkalari hovlidan sezilarli katta bo'lib qolsin: ular joyi (ko'l bo'yi, tepalik) va hovli kattaligi bilan qimmat.
- PLAN §2.5 ("har bir uchastka eng yuqori uy darajasiga sig'adi") endi hovlilar uchun ham to'liq bajariladi.

## 2. Shahar hajmi
- Shahar **~3 × 3 km** ga kattalashadi (`CITY_HALF` 1000 → ~1500). Kerak bo'lsa 3,2 km gacha. Hamma 5 000 uchastka va 170 tijorat joyi sig'sin.
- **O'zgarmaydigan narsalar:**
  - Markaziy maydon 250 × 250 m, (0,0) da, 4 prospekt kirishi va **B101–B112 joylari** (koordinata va 28 × 28 izi) aynan hozirgidek qoladi. `MARKAZ-PROMT.md` dagi koordinatalar shunga tayanadi.
  - Prospekt eni 28 m, ko'cha 12 m.
  - Zonalar mantig'i: markaz atrofida mahallalar, ko'l bo'yida villalar, tepalikda qasrlar, ko'p qavatli uylar tumani, biznes tumani, park va stadion joyi.
  - 12 tuman, ular markazdan tashqariga qarab ochiladi (§2.3).
  - Hovlilar maydon chetidan ~3 m narida boshlanadi, "birinchi 100 kishi" uchun markazga yaqin joylar yetarli bo'lsin.
- Ko'l, tepalik, park va biznes zonalari yangi o'lchamga mos ravishda proporsional kattalashadi.
- `npm run masterplan` → yangi `masterplan.json` + `masterplan.lock`; `npm run seed` → yangi seed migratsiya (eski `0007` ni o'zgartirish o'rniga yangi migratsiya ma'qul, agar migratsiya tarixi buzilmasa; lokal baza baribir noldan).

## 3. Uy modellari (levellar)
**1–6-level (hovli):** uylar ~20–30% kattaroq va boyroq, lekin bo'yiga o'smaydi (qavat qo'shilmaydi, faqat 7+ da ikkinchi qavat bor bo'lsa, u qolaveradi).
- Har bir levelda ko'proq detal: derazalar soni, mo'ri, tom shakli (ayvonga alohida tom, yon xona), eshik oldi zinapoyasi, deraza qopqalari.
- **1 va 2-level farqi tepadan ham aniq ko'rinsin** (tom shakli/ hajmi bilan).
- Uchastka kattalashgani sababli hovli juda bo'm-bo'sh ko'rinmasin: 1-leveldan 1 ta daraxt va tosh yo'lak.

**Panjara va darvoza tartibi** (`LEVEL_YARD`), har level oldingisidan **yomon ko'rinmasin**:
| Level | Panjara | Darvoza |
|---|---|---|
| 1 | past yog'och panjara | oddiy temir |
| 2–3 | suvoq devor | yog'och |
| 4 | g'isht devor | yog'och naqshli |
| 5–6 | g'isht devor | soyabonli naqshli |
| 7–8 | naqshli panjara | naqshli |
| 9–10 | naqshli panjara | oltin |

- **Oltin rang** (qubba, darvoza, hoshiya) faqat **7-leveldan** boshlab. 4- va 6-leveldagi oltin qubbalar boshqa rangga (masalan mis/terrakota) almashtiriladi.

**7–10-level:** endi hovli uchastkasida ham turadi. Model 24 × 34 uchastkaga sig'ishi va hovlida joy qolishi tekshirilsin. Villa/qasr uchastkasida ular kattaroq hovli bilan, xuddi hozirgidek turadi.

**Chegaralar:** har level modeli ≤ 2 500 uchburchak (9–10: ≤ 3 500), har biriga LOD; modellar fayli jami +300 KB dan oshmasin.

## 4. Telefon tezligi
- Shahar maydoni ~2,25 baravar katta: chunk streaming, tuman (fog) va LOD masofalari shunga moslansin. Bir vaqtda yuklangan uylar soni **oshmasin**.
- `node e2e/perf.mjs` natijasi oldingidan yomon bo'lmasin (past sifatda draw call va uchburchaklar). Bo'lsa, LOD masofasini qisqartir.
- Birinchi yuklanish hajmi 3–5 MB chegarasida qolsin.

## 5. Yangilanadigan hujjatlar
- `PLAN.md`: §3 (hajm ~3 × 3 km, uchastka o'lchamlari), §2 ga eslatma: "2026-11-24 da egasining ruxsati bilan bosh reja bir marta qayta chizildi". "Holat" bo'limi.
- `CHAT-UCHUN.md`: §1, §4 (maydon atrofi), §6A (bo'sh joylar koordinatalari) yangi rejaga moslansin.
- `docs/chat/xarita.jpg`, `docs/chat/levellar.jpg` yangi rasmlar bilan almashtirilsin (`npm run showcase`, `npm run chat-images`).

## Qabul sharti
- `npm run masterplan` — yangi xesh, qulf yopiq; uchastkalar bir-biriga, yo'llarga va ko'lga tegmaydi (test).
- 3 500 / 1 000 / 400 / 100 / 170 sonlari aniq.
- B101–B112 va markaziy maydon koordinatalari o'zgarmagan (test).
- 10-level uy hovli uchastkasida: uy uchastkadan chiqmaydi, old hovli ≥ 10 m (test).
- Panjara/darvoza har levelda oldingisidan past emas (yuqoridagi jadval).
- `npm test`, `npm run typecheck`, `npm run e2e` o'tadi; perf yomonlashmagan.
- Git commit: "Bosh reja v2: katta hovlilar (egasi ruxsati bilan)".
