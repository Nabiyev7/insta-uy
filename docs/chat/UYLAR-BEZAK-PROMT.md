# Bo'sh uchastkalar, yangi uylar (1–5-level) va bezaklar — CityLand UZ

> Egasi bilan kelishilgan (2026-11-24). Avval `CLAUDE.md`, `PLAN.md`, `docs/chat/BOSQICHLAR.md` ni o'qi.
> Namunalar: `blender/uslub-v2.blend` — sahnalar **"Uy L1"**, **"Uy L4"**, **"Uy L5"**, **"Uy L5 bezakli"**, **"Bezaklar"**; bezak kodi — shu fayldagi matn bloki **`bezak_lib`** (Blender → Text Editor). Rasmlar: `docs/chat/yangi-uy-L1-v2.png`, `uy-L4.png`, `uy-L5.png`, `uy-L5-tomonlar.png`, `bezaklar-katalog.png`, `uy-L5-bezakli.png`.
> Hamma modellar **kod orqali** `blender/scripts/` ga ko'chiriladi (qo'lda .blend emas), `npm run models` bilan eksport.

## 1. Egasi yo'q uchastkalarda uy YO'Q
- Shahar ochilganda hech bir uchastkada uy turmaydi (demo/joy-to'ldiruvchi uylar olib tashlanadi). Uy **faqat egasi bo'lgan** uchastkada chiziladi.
- **Bo'sh uchastka ko'rinishi**: maysa, uchastka chegarasi (past, ingichka chiziq yoki bordyur), 1–2 standart daraxt (instancing), va kichik **"Bo'sh joy — oling!"** taxtachasi (uz/ru). Uzoqdan taxtacha ko'rinmaydi (LOD).
- Bo'sh uchastkani bosish → oyna: manzil (ko'cha, raqam), "**Shu yerda uy qurish**" tugmasi (kirmagan bo'lsa — "Telegram orqali kirish"). Faqat hovli uchastkalar; ochiq tumanlarda istalgan bo'sh joy (`BOSQICH-2.md`).
- **Uy qurilishi effekti**: uy olinganda kamera uchastkaga uchadi, 2–3 soniya qurilish animatsiyasi (uy pastdan ko'tariladi / chang bulutchasi), keyin 1-level uy va uy ustida egasining Instagram niki, "Tabriklaymiz" oynasi.
- Yopiq tumanlar: to'siq + kran ("qurilish" holati), u yerda bo'sh uchastka taxtachalari ko'rinmaydi.
- Telefon: bo'sh uchastkalar juda yengil bo'lsin (bitta instanced yer bo'lagi + daraxt). Ochilishda chizilayotgan uylar keskin kamaygani sababli perf yaxshilanishi kerak — `perf.mjs` da tekshir va `PERF.md` ga yoz.

## 2. Uy modellari 1–5-level (yangi uslub)
Umumiy: yorug', tekis ranglar, bevel; uchastka 24×34; uy **hamma tomondan** to'liq (oynasiz bo'm-bo'sh devor yo'q — orqa va yonlarda ham oynalar); hovli 1–4-levelda faqat standart (daraxtlar, butalar, gulzor, yo'lak).

| Level | Nomi | Namuna | Asosiy belgilari |
|---|---|---|---|
| 1 | Kichik uy | "Uy L1" | 10,5×8,5, qizil ikki nishabli tom, ustunli ayvoncha, qopqali oynalar, past oq panjara, pochta qutisi |
| 2 | Shinam uy | hozirgi (Claude Code yasagan) | qanot + 4 ustunli ayvon + karport, oq devor. **Tuzat**: darvozadan karportgacha asfalt yo'l; devorga har 4–5 m ustuncha va rangli qopqoq; pochta qutisi qaytsin |
| 3 | Hovli uy | hozirgi | ikki qanot, veranda, mansarda. **Tuzat**: karport/garaj qaytsin (2-levelda bor narsa yo'qolmasin); tomni ixchamroq qil (devorlar ko'proq ko'rinsin); eshik oldida chiroqlar; devor — 2-leveldagidek ustunchali |
| 4 | Bezakli uy | "Uy L4" | **yangi bosqich — zamonaviy**: to'q kulrang-ko'k to'rt nishabli tom, polgacha katta oynalar, yog'och panelli kirish + soyabon, garaj + avtomobil yo'li, yog'och terassa + pergola, g'isht devor (ustun + oq qopqoq), 2 darvoza. **Tuzat**: orqa va yon devorlarga oynalar |
| 5 | Katta uy | "Uy L5" | **2 qavat**, 2-qavatda yog'och qoplama + shishali balkon, 2 mashinalik garaj + keng avtomobil yo'li (**mashinasiz** — mashina faqat bezak), hamma tomonda oynalar |

- **Qoida o'zgarishi (egasi qarori)**: `PLAN.md` dagi "uyni tepaga qavat qilib qurish YO'Q" o'rniga: **uy ko'pi bilan 2 qavat; 5-leveldan boshlab 2 qavat**. §1 va §2 ni shunga moslab yangila.
- 6–10-level: hozircha mavjud modellar, yangi palitraga moslab; keyin egasi bilan alohida ko'riladi. Uyni ko'tarish chegarasi hozircha o'zgarmaydi (admin sozlamasi).
- Har model ≤ 2 500 uchburchak (5-level ≤ 3 000), LOD bilan; takrorlanuvchi qismlar (daraxt, butalar, panjara bo'laklari) instancing.

## 3. Bezaklar (5-leveldan)
- **Bezaklar faqat 5-level va undan yuqori uylarga** qo'yiladi (1–4-levelda bezak joylari yopiq; do'konda "5-levelda ochiladi"). Uy ranglari, nik lavhasi va shunga o'xshash sozlamalar bunga kirmaydi — ular avvalgidek.
- **15 ta yangi bezak** (`bezak_lib` dagi funksiyalar → kit skriptiga):
  - Dam olish: besedka, mangal, basseyn (shezlong + soyabon bilan), soyabonli stol (4 stul).
  - Mashinalar: sedan, krossover, sport — **garaj oldiga** qo'yiladi; mashina rejimida sotib olingan mashina haydaladi (bor mantiq).
  - Tabiat: olma, o'rik, gilos (mevali), archa, palma, gulzor, gul kamari, hovuz + favvora (baliqchalar).
- **Joy nuqtalari (hamma 5–10-level uchun bir xil turlar)**: `garaj_oldi` (mashina), `old_hovli_chap` (basseyn/besedka/hovuz), `old_hovli_ong` (stol/mangal), `darvoza_yoni` (gul kamari/gulzor), `burchak_1..4` (daraxtlar). Har level modeli bu nuqtalarni uy va bir-biriga tegmaydigan joyda beradi; uy kattalashganda bezak uchastkadan chiqmaydi va uyga kirmaydi (test). Mavjud `anchors.ts` tizimiga moslab qo'sh.
- Har bezak ≤ 300 uchburchak (basseyn, besedka ≤ 500); mevali daraxtlar — barglar + mevalar bitta mesh.
- Narxlar `docs/chat/TANGA-NARXLAR.md` dagi toifalar bo'yicha (admin o'zgartiradi).
- Mavjud eski bezaklar katalogda qoladi (o'chirilmaydi), lekin yangi uslubga mos kelmaganlari `active=false` (sotuvdan olinadi, egalarida qoladi).

## 4. Qabul sharti
- Shahar ochilganda uy yo'q, bo'sh uchastkalar taxtachali; uy olish → qurilish effekti → 1-level uy + nik.
- 1–5-level modellar namunalarga mos, hamma tomondan to'liq; 2 va 3-level tuzatishlari bajarilgan.
- 15 bezak katalogda, faqat 5+ level uyga qo'yiladi, joy nuqtalari ishlaydi.
- `PLAN.md` qoidasi (2 qavat) yangilangan.
- `npm test`, `npm run typecheck`, `npm run e2e` o'tadi; `perf.mjs` yomonlashmagan (kutilgan: yaxshilangan); tekshiruvchi agent ✅.
- Rasmlar: `docs/chat/levellar.jpg` (1–5 yaqindan, 4 tomondan ham), `bezaklar.jpg`, `bosh-uchastka.png`, `uy-qurilishi.gif` yoki 3 kadr.
- `ISHLAR.md` belgisi, `PLAN.md` "Holat", git commit.
