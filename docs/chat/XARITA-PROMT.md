# 1-bosqich: SHAHARNI QURISH (xarita + yangi uslub) — CityLand UZ

> Egasi bilan kelishilgan (2026-11-24). Avval `CLAUDE.md`, `PLAN.md`, `docs/chat/BOSQICHLAR.md` ni o'qi.
> Rejaning rasmi: `docs/chat/reja-DE.png`. Blender'dagi chizma: `blender/reja-v3.blend`, sahna **"Reja DE"**. Yangi uslub namunasi: `blender/uslub-v2.blend`, sahna **"Uy L1"** (rasmlar: `docs/chat/yangi-uy-L1-v2.png`, `yangi-uy-L1-v2-yaqin.png`).
> Maqsad: odam saytni ochib, **yorug', chiroyli, tartibli** shaharni tepadan aylanib ko'radi. Bosqich oxirida sayt ishlaydigan holatda bo'lsin.

## 0. Ruxsat
Bu ish bosh rejani **qayta chizishni** talab qiladi (zonalar butunlay o'zgaradi). Egasi rejalash vaqtida "hamma narsa ochiq bo'lsin, oxirida ko'ramiz" degan. **Bosh reja qulfini ochishdan oldin egadan aynan "Qulfni ochishga ruxsat beraman" iborasini so'ra** va javobni `PLAN.md` "Holat"ga yoz. Ruxsatsiz `masterplan.json` / `masterplan.lock` ga tegma — qolgan qismlar (uslub, modellar, nom) ustida ishlayver.
Hali haqiqiy foydalanuvchi yo'q; lokal demo ma'lumotlar qayta yaratiladi.

## 1. Shahar nomi — CityLand UZ
- Hamma joyda yangi nom: sayt sarlavhasi, `i18n.ts` (`cityName` va h.k.), `kutish.html`, OG rasm/matn, admin panel, Telegram bot matnlari, `PLAN.md`, `README.md`.
- Telegram kanal: `@citylanduz` (sozlamada). Bot username — `.dev.vars`/sozlamadan o'qilsin (egasi ochgan; nomini so'ra, kodga qattiq yozma). Bot tokeni hech qachon kodga yoki git'ga tushmasin.

## 2. Shahar rejasi (D+E: to'rt markaz + yashil bulvar)
Koordinatalar: metr, o'yin tizimida — **x sharqqa, z janubga** (Blender chizmasida y = −z). Shahar ±1500 (3×3 km).

### Asosiy g'oya
O'rtada faqat **kichik maydon**. Muhim binolar shahar bo'ylab **to'rt markazga** tarqalgan va ular o'rtadagi maydon orqali **yashil "xoch"** (bulvarlar) bilan ulangan. Hech narsa markazga to'planmaydi.

### Zonalar
| Zona | Chegaralar (x; z) | Ichida |
|---|---|---|
| Markaziy maydon | doira, markaz (0,0), r=140 | favvora, chiroqlar, o'rindiqlar, gulzor; boshqa bino yo'q |
| Katta yashil bulvar (G'—Sh) | x −1050…800; z −90…90 | daraxt qatorlari, piyoda yo'lak, o'rtada maysa |
| Kichik bulvar (Sh—J) | x −55…55; z −820…−90 va 90…820 | daraxtlar, yo'lak |
| **Ma'muriy markaz** (shimol) | x −300…300; z −1180…−820 | prezident binosi (−180, −940), hokimiyat (0, −1090), sud (180, −940), kichik maydoncha |
| **Biznes markazi** (sharq) | x 800…1280; z −300…300 | banklar, ofis minoralari, agentliklar, novostroykalar, qurilish maydoni (kran) — faqat ko'rinish uchun |
| **Savdo markazi** (janub) | x −300…300; z 820…1180 | bozor, univermag, do'konlar qatori, avtoturargoh |
| **Dam olish** (g'arb) | x −1500…−1050; z −320…320 | shahar bog'i; stadion uchun joy — ellips markazi (−1275, 150) — umumiy loyiha (tanga bilan quriladi), hozircha poydevor/to'siq |
| Kasalxona | (−800, −170), bulvarning shimoliy tomoni | **yangi model** |
| Teatr / muzey | (−420, −170) | yangi model (mavjud klassik binodan moslab) |
| Masjid | (420, −170) | **yangi model** |
| O't o'chirish bo'limi | (620, 600), halqa yo'l yonida | **yangi model** |
| Tepalik — qasrlar | x −1500…−1000; z −1500…−1000 | 100 ta qasr uchastkasi |
| Kvartiralar 1 | x 1000…1500; z −1500…−1000 | ko'p qavatli uylar |
| Kvartiralar 2 | x −1500…−1000; z 1000…1500 | ko'p qavatli uylar |
| Ko'l bo'yi — villalar | x 1000…1500; z 900…1500 | ko'l markazi (1220, 1220), r=180; 400 ta villa |
| **Daryo uchun ajratilgan yo'lak** | chiziq (1500,−750) → (1370,−300) → (1370,300) → (1250,800) → (1220,1220); eni 60 m + har tomonda 20 m qirg'oq | **uchastka qo'yilmaydi**. Hozircha maysa/sayilgoh; daryoning o'zi keyingi yangilanishda |
| 8 ta mahalla markazi | markazlari: (−500,−450), (500,−450), (500,450), (−500,450), (−700,−1100), (700,−1100), (−700,1100), (700,1100); har biri ~100×100 | maktab, kafe, do'kon, sport maydoni, bolalar maydonchasi |
| Hovli mahallalar | qolgan hamma joy | 3 500 ta hovli uchastka |

### Yo'llar
- Katak: prospektlar x = −750, 0, 750 va z = −750, 0, 750 (eni 28 m; markazdagi maydon va bulvarlar ustidan o'tmaydi — ular piyoda zona); ko'chalar har 375 m (12 m) + mahalla ichki ko'chalari.
- **Halqa yo'l**: doira, r = 650, eni 26 m.
- **4 diagonal prospekt**: halqadan (r≈220 dan) shahar burchaklarigacha, eni 24 m.
- Uchastkalar yo'llarga, daryo yo'lagiga, ko'lga va zonalarga tegmasin.

### Uchastkalar
- O'lchamlar (bosh reja v2 dagidek): hovli 24×34, villa 30×42, qasr 40×56. Sonlar: 3 500 / 1 000 kvartira / 400 / 100. Tijorat joylari (B…) biznes va savdo markazlariga ko'chiriladi, **sotuvda emas**.
- Sig'masa — uchastkani kichraytirma; zonalarni biroz suring yoki hovli ichki ko'chalarini zichlang, va nima qilganingni `SAVOLLAR.md` ga yoz.
- Tumanlar markazdan tashqariga ochiladi (PLAN §2.3).

## 3. Yangi uslub (eng muhim!)
Egasining fikri: hozirgi shahar **juda eskicha va qorong'i**, atmosfera **haddan tashqari iliq va realistik** — bu sayt qotishiga ham sabab bo'lishi mumkin. Yangi uslub — `blender/uslub-v2.blend` dagidek:
- **Yorug', toza, stilize** (multfilmdek emas, lekin realistik ham emas). Teksturasiz yoki juda kam teksturali — **tekis ranglar**, qirralari biroz yumaloq (bevel).
- **Palitra** (sRGB hex): maysa `#7FBF55` / `#72B24B`, devor `#F7F2EA`, tom `#D9604A` (variantlar uy egasi rangi orqali), poydevor `#B9B4AC`, oyna `#9FD6EE`, ramka/panjara `#FFFFFF`/`#FAFAFA`, yo'lak `#E7DFD0`, daraxt barglari `#4E9F3D` / `#65B547` / `#7CC458`, tana `#7A5132`, qopqa `#5E8FA8`, asfalt `#6B6E75`, bordyur `#D6D3CD`.
- **Yorug'lik**: kunduzi oq-iliq quyosh, yumshoq soyalar, osmon och havorang, kontrast o'rtacha. Sariq/to'q sariq "kechki" tuslar va kuchli tuman — yo'q. Tun rejimi saqlanadi, lekin u ham ochroq va tozaroq.
- Daraxtlar: 3–4 yumaloq barg to'dasidan iborat stilize daraxt (bir nechta variant, instancing).
- Ko'chalarda trotuar va bordyur.

### Uylar
- **1-level**: `uslub-v2.blend` "Uy L1" dagi uy va hovlini `blender/scripts/` dagi kit skriptiga **kod sifatida** ko'chir (qo'lda emas): 10,5×8,5 m uy, ikki nishabli tom + qatorlar + tizma + karniz, mo'ri, ustunli ayvon, qopqali derazalar, butalar, 2 ta gulzor, 4 ta daraxt, tosh yo'lak, past oq panjara, pochta qutisi.
- **2-level** (o'zing loyihala, xuddi shu uslubda): uy ~15×13 m, tomi boshqacha shaklda (masalan, yon qanot bilan), yonida soyabonli mashina joyi (karport), panjara — suvoq devor.
- **3-level**: ~17×14 m, ikkinchi qanot, tom ostida mansarda oynasi, keng veranda, eshik oldida chiroqlar. 1→2→3 farqi **tepadan ham aniq** ko'rinsin.
- **4–10-level**: hozircha mavjud modellar qoladi, faqat yangi palitraga moslab ranglari o'zgartiriladi (keyin egasi bilan qayta ko'riladi). Uyni ko'tarish chegarasi — 3 (o'zgarmaydi).
- Level nomlari yangilansin (uz/ru): 1 Kichik uy, 2 Shinam uy, 3 Hovli uy, 4 Bezakli uy, 5 Katta uy, 6 Boy uy, 7 Villa, 8 Hashamatli villa, 9 Qasr, 10 Saroy. Showcase'dagi yozuvlar ham.

### Boshqa binolar
- Mavjud binolar (prezident, hokimiyat, sud, bank, ofis, agentlik, novostroyka, bozor, maktab, kafe, do'kon, kvartira uylari) — yangi palitra va bevel bilan yangilansin.
- **Yangi 3 ta bino** (har biri ≤ 2 500 uchburchak, LOD bilan):
  - **Kasalxona**: katta oq bino, 3–4 qavat, tepada qizil xoch belgisi, kirish oldida soyabon, 1–2 ta tez yordam mashinasi.
  - **Masjid**: umumiy/zamonaviy uslub — oq devorlar, sodda gumbaz (och kulrang yoki havorang), bitta minora, hovli va daraxtlar. Ortiqcha naqshsiz.
  - **O't o'chirish bo'limi**: qizil darvozali garaj (3 eshik), kichik minora, oldida 1–2 ta qizil mashina.
- Mahalla markazi uchun: sport maydoni (futbol/basketbol chiziqlari) va bolalar maydonchasi — juda sodda modellar.

## 4. Sayt (1-bosqich holati)
- Asosiy rejim — **"Shahar"** (erkin kamera, tepadan); xarita, qidiruv ishlaydi.
- Keyingi bosqich funksiyalari (kirish, uy olish, do'kon, piyoda/mashina, chat) **o'chirilmaydi**, lekin chala/xato ishlasa — admin sozlamasi bilan yashir. Kirish tugmasi o'rnida "Tez kunda — @citylanduz" bo'lishi mumkin (egasiga `SAVOLLAR.md` orqali taklif qil).
- Mehmon shaharni ko'rganda hech qanday xato chiqmasin.

## 5. Telefon tezligi
- Maqsad o'zgarmaydi: arzon Android'da past sifatda 30+ FPS, birinchi yuklanish 3–5 MB.
- Teksturalarning ko'pi kerak bo'lmay qolsa — olib tashla (yuklanish kamayadi).
- `node e2e/perf.mjs` natijasi oldingidan yomon bo'lmasin; shahar 3×3 km, eng yuqori kamera holatida ham.

## 6. Qabul sharti
- Reja `reja-DE.png` ga mos: to'rt markaz, yashil xoch, halqa yo'l, diagonal prospektlar, daryo yo'lagi bo'sh, 8 mahalla markazi.
- Sonlar: 3 500 / 1 000 / 400 / 100; uchastkalar bir-biriga, yo'llarga, daryo yo'lagiga, ko'lga tegmaydi (test).
- Yangi uslub: L1 namunaga mos; L2, L3 tayyor; yangi 3 bino joyida.
- Nom hamma joyda CityLand UZ.
- `npm test`, `npm run typecheck`, `npm run e2e` o'tadi; tekshiruvchi agent ✅.
- Yangi rasmlar: `docs/chat/xarita.jpg` (butun shahar tepadan), `levellar.jpg` (1–3 yaqindan + 4–10), `markaz-3d.jpg` (maydon va bulvar), `binolar.jpg` (kasalxona, masjid, o't o'chirish), telefon skrinshoti (`npm run screens`).
- `PLAN.md` ("Holat", §3 hajm/uslub, §14 shahar nomi), `BOSQICHLAR.md` (1-bosqich ✅) yangilansin, git commit.
