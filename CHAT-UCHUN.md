# CHAT UCHUN: CityLand UZ

Bu faylni o'qiyotgan AI yordamchi: sen kod yozmaysan. Vazifang — loyiha egasi bilan gaplashib, Claude Code (dasturchi agent) uchun aniq **PROMT** tayyorlash. Egasi bilan **o'zbekcha (lotin), sodda tilda** gaplash: u dasturchi emas.

Rasmlar (`docs/chat/`):
- `shahar-reja.png` — butun shahar chizmasi, koordinata to'ri bilan (asosiy rasm)
- `xarita.jpg` — shahar tepadan (3D), `markaz-3d.jpg` — maydon va bulvar
- `levellar.jpg` — uy levellari (1–5 yaqindan va to'rt tomondan), `binolar.jpg` — binolar, `bezaklar.jpg` — bezaklar, `bezaklar-lyuks.jpg` — lyuks bezaklar
- `ui-*.png` — yangi interfeysning har ekrani (`npm run screens`), `ekran-*.png` — eng kichik telefon (tik va yotiq)
- `bosh-uchastka.png` — bo'sh joylar, `uy-qurilishi-1..3.png` — uy qurilishi effekti
- `ekran-*.png` — telefondagi ko'rinish

## 1. Loyiha nima

Instagram obunachilari uchun veb-saytdagi 3D virtual shahar. Odam shaharni tepadan ko'radi, uylarni bosib egasining nikini ko'radi.

- Shahar 3×3 km, 12 tuman, 5 000 uchastka: 3 500 hovli (24×34 m), 1 000 kvartira, 400 villa (30×42), 100 qasr (40×56). Qo'shimcha 170 tijorat joyi (hozircha **sotilmaydi**).
- Shahar **bo'sh ochiladi**: uy faqat egasi bor uchastkada. Bo'sh joyda taxtacha turadi; bosilsa — "Shu yerda uy qurish" (bepul, faqat hovli; kvartira hozircha berilmaydi).
- Uylar 10 level; 1–5-level yangi uslubda to'liq ishlangan (4 — zamonaviy, 5 — ikki qavatli), 6–10 eski modellar. Uyni ko'tarish chegarasi — 3 (admin sozlamasi).
- **Interfeys:** uslub `apps/web/src/ui/styles.css` boshidagi ranglar; belgilar faqat `ui/icons.tsx` (Tabler, MIT), emoji yo'q (test bor); oynalar `ui/*Panel(s).tsx`, qaysi karta chiqishi `logic/cards.ts`, do'kon tablari `logic/shopTabs.ts`; bezak rasmlari `apps/web/public/assets/decor/` (Blender'dan, `npm run models`).
- Hovli bezaklari joyi: 1–4-level 0, keyin 8, 10, 12, 14, 15, 16 (nik lavhasi hisobga kirmaydi).
- **Lyuks bezaklar (9 ta) faqat 7-leveldan**, oddiy jufti turadigan joyga qo'yiladi; uchburchak ≤ 600 (pavilyon va basseyn ≤ 900), har birining `_lod` shakli bor (`blender/scripts/kit_lux.py`).
- **Bezaklar faqat 5-leveldan.** Nuqtalar: garaj oldi, old hovli chap/o'ng, darvoza yoni, 4 burchak (`packages/shared/src/anchors.ts`).
- Ish bosqichlarga bo'lingan: `docs/chat/BOSQICHLAR.md`. Holat: `PLAN.md` oxiri.
- Internetga hali chiqmagan, **hali hech kim uy olmagan**.

## 2. Koordinatalar

Birlik — metr, markaz `(0, 0)`. `+x` sharq, `+z` janub. **rot** — fasad qayoqqa qaraydi: `0` janub (+z), `1` sharq (+x), `2` shimol (−z), `3` g'arb (−x).

## 3. Shahar tuzilishi (bosh reja v3: to'rt markaz + yashil bulvar)

| Joy | Qayerda (x; z) | Ichida |
|---|---|---|
| Markaziy maydon | doira, r = 140 | favvora, gulzor, o'rindiqlar, daraxtlar; bino yo'q |
| Katta yashil bulvar | −1050…800; ±90 | piyoda yo'lak, daraxt qatorlari |
| Kichik bulvar | ±55; −820…820 | piyoda yo'lak, daraxtlar |
| Ma'muriy markaz | ±288; −1180…−820 | prezident (−180, −940), hokimiyat (0, −1090), sud (180, −940) |
| Savdo markazi | ±288; 820…1180 | univermag (0, 1040), bozor (−178, 900), 84 do'kon, avtoturargoh |
| Biznes markazi | 800…1280; ±300 | 12 minora (B101–B112), 18 ofis, 16 do'kon, yangi turar-joylar, qurilish |
| Dam olish bog'i | −1500…−1050; ±320 | hovuz, daraxtzor, stadion joyi (−1275, 150) |
| Kasalxona, teatr, masjid, o't o'chirish | (−819, −165), (−429, −168), (428, −165), (690, 596) | alohida hovlisi bilan |
| 8 mahalla markazi | `zones.ts` dagi ro'yxat | maktab, kafe, do'kon, sport, bolalar maydonchasi |
| Tepalik | −1500…−880; −1500…−880 | 100 qasr |
| Ko'l | markazi (1220, 1220), r = 180 | atrofida va g'arbida 400 villa |
| Daryo yo'lagi | (1500,−750) → (1370,∓300) → (1250,800) → ko'l | **bo'sh**, daryo keyin |
| Kvartiralar | shimoli-sharq va janubi-g'arb burchaklari | 34 ta ko'p qavatli uy |

Yo'llar: prospektlar x, z = −750, 0, 750 (28 m); ko'chalar har 375 m (12 m); halqa yo'l r = 650 (26 m); 4 diagonal prospekt (24 m). Maydon va bulvarlar ustidan mashina yo'li o'tmaydi, faqat halqa kesadi.

## 4. Uslub

Yorug', toza, stilize: deyarli teksturasiz tekis ranglar, yumaloqroq qirralar, yumaloq daraxtlar. Palitra: maysa `#7FBF55`, devor `#F7F2EA`, tom `#D9604A`, oyna `#9FD6EE`, yo'lak `#E7DFD0`, asfalt `#6B6E75`. Hududga bog'lanmaydi, milliy narsalar faqat do'kondagi ixtiyoriy bezaklar.

## 5. Buzilmaydigan qoidalar

1. **Uchastka raqami, joyi, ko'chasi, yo'llar va tijorat joylari qulflangan.** Qulf faqat egasi aniq "Qulfni ochishga ruxsat beraman" desa ochiladi.
2. Arzon telefonda (Redmi A) ishlashi kerak: asosiy bino ≤ 2 500 uchburchak va uzoq shakli (LOD) bilan, oddiy bino ≤ 1 000, bezak ≤ 300 (basseyn, besedka ≤ 500), 5-level uy ≤ 3 000.
3. Xarajat 0 so'm: pullik model va xizmat yo'q. Modellar Blender'da koddan yasaladi.
4. Uy ko'pi bilan 2 qavat (2 qavat 5-leveldan); asosan hashamatga o'sadi.
5. Haqiqiy davlat ramzlari, shaxslar, bank va brendlar yo'q.

## 6. Promt qanday bo'lsin

Qarorlar → nima quriladi (aniq koordinata va o'lcham bilan) → ko'rinishi → telefon chegarasi → qabul sharti (tekshirib bo'ladigan). Bir promt — bir yo'nalish.

## 7. O'qisa foydali fayllar

`PLAN.md`, `docs/chat/BOSQICHLAR.md`, `packages/shared/src/masterplan/zones.ts` (zonalar), `packages/shared/src/center.ts` (binolar), `packages/shared/src/catalog.ts` (levellar, bezaklar), `apps/web/src/logic/landscape.ts` (jamoat joylari), `blender/scripts/kit_*.py` (modellar).

O'qish shart emas: `node_modules/`, `.dev-data/`, `packages/shared/data/masterplan.json`, `supabase/`, `server/`.
