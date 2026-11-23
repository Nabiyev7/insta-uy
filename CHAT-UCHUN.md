# CHAT UCHUN: "Obunachilar shahri" — markazni loyihalash

Bu faylni o'qiyotgan AI yordamchi: sen kod yozmaysan. Vazifang — loyiha egasi bilan gaplashib, shahar **markazi** uchun aniq **PROMT** tayyorlash. Promtni keyin Claude Code (dasturchi agent) shu papkada bajaradi.

Loyiha egasi bilan **o'zbekcha (lotin), sodda til**da gaplash. U dasturchi emas.

Ilova qilingan rasmlar (`docs/chat/` ichida):
- `markaz-reja.png` — markazning yuqoridan chizmasi, koordinata to'ri bilan (asosiy rasm)
- `markaz-3d.jpg` — markazning hozirgi ko'rinishi
- `xarita.jpg` — butun shahar
- `levellar.jpg` — uy levellari va uslub

---

## 1. Loyiha nima

Instagram obunachilari uchun veb-saytdagi 3D o'zbek shahri. Odam avatar bilan ko'chada yuradi, uylarni bosib egasining nikini ko'radi.

- Oddiy hovlilar **bepul** tarqatiladi. Keyin qimmat joylar, levellar, bezaklar, do'kon, ofis va bilbordlar **sotiladi**.
- Shahar 2×2 km, 12 tuman, 5 000 uchastka: 3 500 hovli, 1 000 kvartira, 400 villa, 100 qasr. Qo'shimcha 170 tijorat joyi: 100 do'kon, 30 ofis, 40 bilbord.
- Uylar 10 level: kichik uydan shoh saroyigacha.
- Kun/tun, fasl, ob-havo, yuradigan odamlar va mashinalar, chat, tanga, hokim saylovi, gazeta bor.
- Uslub: **real teksturali low-poly, Farg'ona vodiysi ruhi** — g'isht, suvoq, naqsh, o'yma yog'och, ayvon, chinor, ariq.
- Holat: kod tayyor, egasining kompyuterida ishlaydi. Internetga hali chiqmagan, **hali hech kim uy olmagan**.

## 2. Egasi nima xohlaydi

> Maydon keng va bo'm-bo'sh qolgan, uni to'ldirish kerak. O'rtasi shaharning asosiy markazi ko'rinishida bo'lsin. Markaz juda qimmat joy bo'ladi. U yerda har xil narsa quriladi: stadion, prezident binosi, hokimiyat, sud binosi, banklar, novostroykalar, agentliklar va hokazo.

Maqsad: markazga kirgan odam "bu haqiqiy poytaxt markazi" desin, biznes egasi u yerdan joy olishni xohlasin.

## 3. Koordinatalar

- Birlik — **metr**. Markaz nuqtasi `(x=0, z=0)`.
- `+x` sharq, `-x` g'arb, `+z` janub, `-z` shimol. `y` balandlik.
- **rot** — binoning old tomoni qayoqqa qaraydi: `0` janubga (+z), `1` sharqqa (+x), `2` shimolga (-z), `3` g'arbga (-x).
- O'lcham doim `eni × chuqurligi`, bino joyi uning **markazi** bilan beriladi.

## 4. Markaz hozir

**Maydon:** x va z bo'yicha −125 dan +125 gacha, ya'ni **250 × 250 m** (62 500 m²). Yer tekis, tosh plitka. Ichida yo'l yo'q, faqat piyodalar.

**4 ta prospekt** (eni 28 m) maydon chetida tugaydi: shimol `(0,−126)`, janub `(0,126)`, g'arb `(−126,0)`, sharq `(126,0)`. Bu to'rtta kirish joyini yopib qo'yma.

| Nima | Markazi (x, z) | O'lchami, m | Izoh |
|---|---|---|---|
| Katta favvora | 0, 0 | 22 × 22 | shahar ramzi, qolsa yaxshi |
| Qahramon haykali | 0, −55 | 5 × 5 | hafta qahramoni niki chiqadi |
| Choyxona | −40, 62 | 14 × 18 | |
| Bozor (12 rasta) | 37, 54 | 34 × 22 | kichik |
| Maktab | 40, −82 | 40 × 18 | markazga mos emas, ko'chirsa bo'ladi |
| Avtoturargoh (4 mashina) | −38, −76 | 20 × 18 | |
| 12 ofis minorasi | burchaklarda, pastda | 28 × 28, balandligi 28–56 m | **hammasi bir xil ko'rinadi** |

Ofis joylari:
- Shimoli-g'arb: B101 (−108,−108), B102 (−108,−74), B103 (−74,−108)
- Shimoli-sharq: B104 (108,−108), B105 (108,−74), B106 (74,−108)
- Janubi-sharq: B107 (108,108), B108 (108,74), B109 (74,108)
- Janubi-g'arb: B110 (−108,108), B111 (−108,74), B112 (−74,108)

Yana 26 chinor, 14 archa, 16 chiroq, 12 o'rindiq, 28 gulzor bor. Ularni bemalol surish mumkin.

**Bo'sh joy shakli — xoch (+):** burchaklar ofislarda band. `|x| < 60` yo'lagi (120 m) shimoldan janubgacha, `|z| < 60` yo'lagi g'arbdan sharqqacha ochiq.

**Atrofi:** maydon chetidan 3 m narida hovlilar boshlanadi (16 × 24 m). ±250 m kvadrat ichida 336 ta hovli bor.

## 5. Buzilmaydigan qoidalar

1. **5 000 uchastkaning raqami, joyi va ko'chasi qulflangan.** Ofis, do'kon va bilbord joylari (B001–B170), yo'llar va binolar ham shu qulf ichida. Binoning **ko'rinishini** o'zgartirish erkin, **joyini** emas.
2. Hali hech kim uy olmagani uchun qulfni ochish mumkin, lekin faqat egasi **aniq aytsa**. Kerak bo'lsa, promtda alohida yozilsin: "Qulfni ochishga ruxsat beraman".
3. Arzon telefonda (Redmi A) ishlashi kerak. 7-bo'limdagi chegaralarga amal qil.
4. Xarajat 0 so'm: pullik model, pullik xizmat yo'q. Modellar Blender'da koddan yasaladi.
5. Oddiy **uylar** bo'yiga o'smaydi (faqat hashamat). Markazdagi jamoat va biznes binolariga bu tegishli emas, ular baland bo'lishi mumkin.
6. Haqiqiy davlat ramzlari, gerb, haqiqiy shaxslar, haqiqiy bank va brend nomi yoki logotipi bo'lmasin. Bular **virtual shahar** binolari: "Shahar hokimiyati", "Shahar banki" kabi nomlar ishlatilsin. Haqiqiy brend faqat egasi joy olib, reklama moderatsiyadan o'tsa chiqadi.

## 6. Egasi bilan hal qilinadigan savollar

Promt yozishdan oldin shularni **birma-bir** so'ra. Har biriga variant va tavsiyang bo'lsin.

**A. Joy yetadimi?** Egasi sanagan narsalar 250 × 250 m ga to'liq sig'maydi.

| Variant | Nima bo'ladi | Qulf |
|---|---|---|
| A1 | Faqat 250 × 250 m ichida, zich va chiroyli | ochilmaydi |
| A2 | Markaz 250 × 250 m, katta narsalar boshqa bo'sh joyga | ochilmaydi |
| A3 | Markaz 500 × 500 m ga kengayadi, 336 hovli boshqa joyga ko'chadi | **ochiladi** |

Bo'sh joylar: shimoli-g'arbiy burchak (x −986…−514, z −986…−514, 472 × 472 m, bog' va stadion uchun ajratilgan), biznes tumanining pasti (x −486…−14, z 750…986, taxminan), 9- va 12-tumanlardagi binolar orasi.

**B. Stadion.** Hozirgi modeli **143 × 106 m**, balandligi 16 m. U maydonning yarmidan ko'p eniga cho'ziladi va favvora o'rnini oladi. Variantlar: kichikroq stadion (taxminan 80 × 60 m) maydon ichida; katta stadion shimoli-g'arbiy burchakda; A3 bo'lsa markazda. Eslatma: stadion hozir **umumiy loyiha**, odamlar tanga yig'ib qurishi kerak (−750, −850). Markazga ko'chsa, shu ham o'zgaradimi?

**C. Novostroyka.** Yangi sotiladigan kvartira 5 000 talik ro'yxatga kirmaydi. Variantlar: biznesga ijaraga beriladigan bino; faqat ko'rinish uchun (kran, qurilish); mavjud 1 000 kvartiraning bir qismini markazga ko'chirish (qulf ochiladi).

**D. Nima sotiladi, nima sotilmaydi?** Masalan hokimiyat, sud, prezident binosi sotilmaydi; bank, agentlik, novostroyka joylari sotiladi.

**E. Narx.** Hozir tijorat joyi **30 kunlik ijara**, narxi faqat turiga qarab: do'kon 100 000, ofis 250 000, bilbord 150 000 so'm. Markaz qimmat bo'lishi uchun har joyga alohida narx kerak. Egasi narx oralig'ini, ijara yoki bir martalik ekanini va auksion kerak-kerakmasligini aytsin.

**F. Binolarning vazifasi.** Binoga kirib bo'lmaydi, lekin **bossa oyna ochilishi** mumkin. Saytda bor oynalar: shahar (saylov va umumiy loyihalar), gazeta, tanga, reyting, xarita, reklama joyi, qoidalar, maxfiylik, yordam. Boshqa oyna kerak bo'lsa, bu yangi ish, promtda alohida yozilsin. Masalan: hokimiyat → shahar (saylov), sud → qoidalar, bank → tanga, stadion → shahar (umumiy loyiha), agentlik → reklama joyi. Auksion hozir yo'q.

**G. Uslub.** Milliy (naqsh, gumbaz, ayvon), zamonaviy (shisha), yoki aralash: davlat binolari milliy, biznes shisha. Egasiga rasm yoki misol so'ra.

## 7. Texnik chegaralar

Hozir (kompyuterda, levellardan oldin o'lchangan) past sifatda 44 draw call va 23 ming uchburchak. Modellar fayli 954 KB. Markaz uchun tavsiya:

| Nima | Chegara |
|---|---|
| Yangi **noyob** model | 15 tagacha (har biri +1 draw call); bir modelni rang yoki balandlik bilan qayta ishlatish bepul |
| Asosiy bino (prezident, hokimiyat, stadion) | 2 500 uchburchakkacha |
| Oddiy bino (bank, agentlik, novostroyka) | 1 000 uchburchakkacha |
| Markazdagi hamma narsa birga | 40 ming uchburchakkacha |
| Yangi modellar fayli | +400 KB gacha |
| Har katta binoga | uzoqdan ko'rinadigan sodda shakl (LOD) |

Mavjud teksturalar, 16 ta (yangi qo'shilmaydi): tekis rang, suvoq, g'isht, cherepitsa tom, yog'och, asfalt, maysa, beton, barg, deraza, ko'k naqsh, o'yma yog'och, ko'p qavatli fasad, shisha fasad, tuproq, tosh plitka. Rangni xohlagancha o'zgartirsa bo'ladi. Derazalar va chiroqlar tunda yonadi.

Shakllar: quti, silindr/ustun, gumbaz, konus, ikki nishabli va to'rt nishabli tom, notekis shar (daraxt), tekis panel, ustunli ayvon, naqsh tasma. Egri murakkab shakl (masalan to'lqinli tom) qiyin.

Mavjud modellar, qayta ishlatish mumkin: 5 va 9 qavatli uy, ofis minorasi, past ofis, do'kon, maktab, choyxona, stadion, ko'prik, kran, bilbord, favvora (katta/kichik), haykallar, bozor rastasi, chinor/terak/anor/archa, gulzor, o'rindiq, chiroq, furgon/sedan/sport mashina, o'tov.

Joylashtirish qoidasi: binolar orasi kamida 8 m, asosiy piyoda yo'lak kamida 14 m, 4 prospektning davomi (eni 28 m) favvoragacha ochiq ko'rinsin.

## 8. Natija: promt qanday bo'lishi kerak

Savollar tugagach, egasiga **bitta tayyor promt** ber. Claude Code'ga shu ko'rinishda kerak:

```
# Markazni qurish

## Qarorlar
- Maydon: A1 / A2 / A3. Qulf: ochilmaydi / "Qulfni ochishga ruxsat beraman"
- Stadion: …   Novostroyka: …   Uslub: …

## Binolar
| № | Nomi (uz) | Nomi (ru) | model_id | x | z | eni×chuq., m | balandlik, m | rot | sotiladimi | narx | bossa nima ochiladi |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Shahar hokimiyati | Мэрия | hokimiyat | … | … | … | … | … | yo'q | – | saylov |

## Har bir binoning ko'rinishi
1. Shahar hokimiyati: qavatlar, devor materiali va rangi, kirish, tom, ustunlar, naqsh qayerda, tunda nima yonadi.
…

## B101–B112 ofislari
Har birining yangi ko'rinishi (joyi o'zgarmaydi).

## Maydonning o'zi
Yo'laklar, suv, yashil joylar, chiroqlar, o'rindiqlar, bozor, parking — koordinatasi bilan.

## Olib tashlanadi yoki ko'chiriladi
Eski narsa → yangi joy yoki yo'q.

## Qabul sharti
- Binolar bir-biriga va prospektlarga tegmaydi
- Telefon chegaralari saqlangan
- Blender'da ko'rsatilsin (npm run showcase)
```

Promtni topshirishdan oldin o'zing tekshir:
- [ ] har binoning `x ± eni/2`, `z ± chuqurlik/2` chegarasi maydon ichida (rot 1 yoki 3 bo'lsa eni va chuqurligi almashadi)
- [ ] hech bir bino boshqasiga, ofis joyiga yoki 4 ta kirishga tushmaydi
- [ ] noyob modellar 15 tadan oshmaydi
- [ ] 6-bo'limdagi savollarning hammasiga javob bor

## 9. Papka bilan birga o'qilsa

Muhim fayllar:
- `PLAN.md` — asosiy qoidalar va holat
- `packages/shared/src/masterplan/geometry.ts` — o'lchamlar
- `packages/shared/src/catalog.ts` — levellar, narxlar, bezaklar
- `apps/web/src/logic/placement.ts` — maydonda nima qayerda (`plazaItems`)
- `blender/scripts/kit_houses.py`, `kit_levels.py`, `kit_props.py` — modellar qanday yasalgan

O'qish shart emas: `node_modules/`, `.dev-data/`, `packages/shared/data/masterplan.json` (katta raqamlar fayli), `supabase/`, `server/`.
