# Tuzatish 6 — bezak narxlari, levellar, chegirmalar, admin katalog (egasi, 2026-11-27)

> 14-qadam (TUZATISH-5) bajarilgan. Har banddan keyin `npm test` + `typecheck` + commit + push; tekshiruvchi oxirida bir marta.
> Hamma narx va level **bazada** (migratsiya bilan), `catalog.ts` dagi standartlar ham moslansin. Hammasi admin panelda o'zgaradi.

## 1. Narxlar 50% arzon (egasi: "hammasi")
Tanga bilan sotiladigan **hamma narx** × 0,5 va yaxlitlanadi: 1 000 gacha — 10 ga, 1 000–9 999 — 50 ga, 10 000 dan — 500 ga.
- **Bezaklar va mashinalar** — pastdagi jadval (hozirgi faol tovarlar). Mavsumiy va yashirin tovarlar ham shu qoida bilan.
- **To'plamlar** — tarkibidagi yangi narxlar yig'indisidan 20% chegirma (avtomatik hisoblanadi, qo'lda yozilmaydi).
- **Uy leveli**: 2-lv 300 → **150**, 3-lv 1 000 → **500**, 4-lv 2 000 → **1 000**, 5-lv 3 500 → **1 750**.
- **Salyut** (tanga): 2 000 → **1 000**.
- **Tanga paketlari (Stars) — arzonroq va ko'proq tanga** (egasi):
  | Paket | Hozir | Yangi |
  |---|---|---|
  | 1 | 3 000 tanga — 60 ⭐ | **5 000 tanga — 50 ⭐** |
  | 2 ("Ommabop") | 7 000 — 125 ⭐ | **12 000 — 100 ⭐** |
  | 3 ("Eng foydali") | 16 000 — 250 ⭐ | **28 000 — 200 ⭐** |
  Bonus alohida ko'rsatilmaydi (jami son yoziladi) yoki "+X bonus" qilib — kartada chiroyli bo'lgani. Stars ≥ 50 ⭐ qoidasi saqlanadi. Admin "Iqtisod"da o'zgaradi.
- **O'zgarmaydi**: tanga *topish* miqdorlari (bonuslar) va premium tovar narxlari.
- `TANGA-NARXLAR.md` yangi jadval bilan yangilansin (sana bilan).

## 2. Bezak qaysi leveldan ochiladi — narxga qarab
Mavjud tovarlar — **6-banddagi jadvaldagi level** (narx/sifat bo'yicha egasi bilan kelishilgan). Yangi tovar uchun avtomatik qoida (yangi narxda): **≤ 75 → 1-lv, ≤ 150 → 2-lv, ≤ 325 → 3-lv, ≤ 725 → 4-lv, undan qimmat va hamma `lux_*` → 5-lv.** Nik lavhasi — doim 1-lv.
- Agar tovarning joy nuqtasi pastroq levelda bo'lmasa (masalan mashina — "garaj oldi" nuqtasi 2-lv dan bor bo'lsa), level = max(narx bo'yicha, nuqta bor level). Shunday tovarlarni `SAVOLLAR.md` ga ro'yxat qil.
- Bu **standart**: admin panelda har tovarga qo'lda boshqa level qo'yish mumkin (qo'lda qo'yilgani saqlanadi, avtomatik qayta hisoblanmaydi; "Avtomatik" tugmasi bilan qaytadi).
- Yangi tovar qo'shilganda level narxdan avtomatik taklif qilinadi.
- Do'konda qulf yozuvi: "3-levelda ochiladi" + "Uyni kuchaytirish" tugmasi.

## 3. Hovlidagi bezak joylari — har levelda
Hozir 1–4-levelda 0. Yangi: **1-lv — 2, 2-lv — 4, 3-lv — 6, 4-lv — 10, 5-lv — 16** (nik lavhasi hisobga kirmaydi; `decor_slots`).
- 1–4-level uylarda nuqtalar bor (6-qadam E: garaj oldi, old hovli chap/o'ng, darvoza yoni, burchaklar) — qaysi nuqta qaysi levelda ochilishini mantiqli taqsimla (1-lv: darvoza yoni + 1 burchak; …), uyga/yo'lakka tegmasligi testi saqlansin.
- Bezash oynasida (rejada) faqat ochiq nuqtalar; yopiqlari kulrang "N-levelda".

## 4. Chegirmalar — qo'lda, muddat bilan
- Admin panel: tovarga **chegirma %** (5–90) + **boshlanish va tugash sanasi/vaqti** (Toshkent vaqti). Bir vaqtda bir tovarga bitta chegirma.
- Narx serverda hisoblanadi (mijoz emas); muddat tugashi bilan avtomatik eski narx.
- **Do'konda alohida "🔥 Chegirmalar" bo'limi** (tablar ichida birinchi, faqat chegirma bor bo'lsa ko'rinadi): kartada eski narx chizilgan, yangi narx, "-30%" belgisi va **tugashiga qolgan vaqt** ("2 kun 5 soat"). Boshqa tablarda ham shu tovar chegirma belgisi bilan.
- Ixtiyoriy (admin tugmasi): chegirma boshlanganda kanalga post / botda hammaga xabar.
- Test: muddat ichida/tashqarisida narx, server rad etadi eski/soxta narxni, bo'lim chegirma yo'q bo'lsa yashirin.

## 5. Admin panel — Bezaklar bo'limi soddaroq
Hozir: ustunlar So'm, Tanga, Level, Zaxira, Sotilgan, Mavsum + 3 tugma; eski nusxalar aralash (Sedan `car_sedan` va `avto_sedan`, Sport ikki marta).
- **Ro'yxat**: rasm (kichik 3D ikonka) · nom · kategoriya · **tanga narxi** (joyida tahrirlanadi) · **level** (joyida tanlanadi, "avto" belgisi) · chegirma (bor bo'lsa) · sotilgan · holat (sotuvda / yashirin).
- **So'm ustuni olib tashlanadi** (bezaklar faqat tanga; premium tovarlar alohida "⭐ Premium" bo'limida, Stars narxi bilan).
- **Arxiv**: eski, o'rniga yangisi kelgan tovarlar (`car_sedan`, `car_sport`, `car_van`, `water_pool`, `water_fountain`, `yard_besedka`, `yard_mangal`, `yard_umbrella`, `yard_garage`, `tree_archa`, `tree_orik`, `tree_olma`, `yard_flowers` va h.k.) — alohida "Arxiv" tabida, asosiy ro'yxatda yo'q. Egalarida bo'lsa — ularda qoladi.
- **Qidiruv va filtr**: kategoriya, level, holat; tartiblash narx/level/sotilgan bo'yicha.
- **Ommaviy amal**: belgilanganlarga narxni % ga o'zgartirish, levelni avtomatik qayta hisoblash, yashirish, chegirma qo'yish.
- **"Yangi tovar" — 1 sahifali oson shakl**: (1) model tanlash — `assets/decor` dagi modellar rasmli to'r ko'rinishida (yangi model Blender'dan `npm run models` bilan qo'shiladi); (2) nom uz + ru; (3) kategoriya (joy nuqtalari kategoriyadan avtomatik); (4) tanga narxi → level avtomatik taklif; (5) ixtiyoriy: zaxira soni, mavsum, "YANGI" belgisi; (6) **oldindan ko'rish** (do'kon kartasi qanday ko'rinadi) → Saqlash. Majburiy bo'lmagan maydonlar yashirin "Qo'shimcha" ichida.
- Hamma o'zgarish jurnali (kim, qachon, nima — admin "Jurnal").

## 6. Yangi narx va level jadvali (1–2-bandlar bo'yicha hisoblangan)
| Bezak | id | Hozir | Yangi (−50%) | Level |
|---|---|---|---|---|
| Tosh yo'lak | `path_stone` | 80 | 40 | 1 |
| Anor | `tree_anor` | 80 | 40 | 1 |
| Pochta qutisi | `sign_mailbox` | 80 | 40 | 1 |
| Yog'och panjara | `fence_wood` | 100 | 50 | 1 |
| Yog'och darvoza | `gate_wood` | 120 | 60 | 1 |
| Tut | `tree_tut` | 120 | 60 | 1 |
| Behi | `tree_behi` | 120 | 60 | 1 |
| Chinor | `tree_chinor` | 150 | 80 | 1 |
| Gulzor | `gul_zor` | 150 | 80 | 1 |
| Nik lavhasi | `sign_nick` | 200 | 100 | 1 |
| Velosiped | `yard_bike` | 160 | 80 | 2 |
| Tovuqlar | `pet_hens` | 160 | 80 | 2 |
| So'ri | `yard_sori` | 180 | 90 | 2 |
| Hovli chiroqlari | `light_lamps` | 180 | 90 | 2 |
| Mushuk | `pet_cat` | 180 | 90 | 2 |
| Olma daraxti | `daraxt_olma` | 200 | 100 | 2 |
| O'rik daraxti | `daraxt_orik` | 200 | 100 | 2 |
| Gilos daraxti | `daraxt_gilos` | 200 | 100 | 2 |
| Archa | `daraxt_archa` | 200 | 100 | 2 |
| Tok (ishkom) | `yard_tok` | 220 | 110 | 2 |
| Kuchuk | `pet_dog` | 220 | 110 | 2 |
| Hamak | `yard_hammock` | 240 | 120 | 2 |
| Qo'y | `pet_sheep` | 240 | 120 | 2 |
| G'isht devor | `fence_brick` | 260 | 130 | 2 |
| Tandir | `yard_tandir` | 300 | 150 | 3 |
| Tokzor | `yard_tokzor` | 300 | 150 | 3 |
| Basketbol halqasi | `yard_basketball` | 300 | 150 | 3 |
| Palma | `daraxt_palma` | 300 | 150 | 3 |
| Gul kamari | `gul_kamar` | 300 | 150 | 3 |
| It uyi | `pet_house` | 400 | 200 | 3 |
| Kaptarxona | `pet_dovecote` | 400 | 200 | 3 |
| Mangal | `dam_mangal` | 400 | 200 | 3 |
| Soyabonli darvoza | `gate_carved` | 450 | 220 | 3 |
| Batut | `yard_batut` | 500 | 250 | 3 |
| Yangi yil chiroqlari | `light_newyear` | 500 | 250 | 3 |
| Hayit fonarlari | `light_hayit` | 500 | 250 | 3 |
| Soyabonli stol | `dam_stol` | 500 | 250 | 3 |
| Temir panjara | `fence_ornate` | 600 | 300 | 3 |
| Sumalak qozoni (Navro'z) | `special_sumalak` | 600 | 300 | 3 |
| Yangi yil archasi | `tree_newyear` | 600 | 300 | 3 |
| Besedka | `dam_besedka` | 600 | 300 | 3 |
| Hashamatli yoritish | `light_luxe` | 700 | 350 | 4 |
| Quyosh panellari | `roof_solar` | 800 | 400 | 4 |
| Hovuz va favvora | `suv_hovuz` | 800 | 400 | 4 |
| Bolalar maydonchasi | `yard_playground` | 1000 | 500 | 4 |
| Ot | `pet_horse` | 1200 | 600 | 4 |
| Sedan | `avto_sedan` | 1200 | 600 | 4 |
| Oltin darvoza | `gate_gold` | 1500 | 750 | 5 |
| Navro'z o'tovi (mavsumiy) | `special_yurt` | 1500 | 750 | 5 |
| Basseyn | `dam_basseyn` | 1500 | 750 | 5 |
| Krossover | `avto_krossover` | 1800 | 900 | 5 |
| Sport mashina | `avto_sport` | 2500 | 1250 | 5 |
| Tuvakdagi daraxt | `lux_daraxt` | 3000 | 1500 | 5 |
| Tovus (noyob) | `special_peacock` | 4000 | 2000 | 5 |
| Gril oshxona | `lux_gril` | 4000 | 2000 | 5 |
| Humo haykali (noyob) | `special_statue` | 5000 | 2500 | 5 |
| Fransuz bog'i | `lux_bog` | 5000 | 2500 | 5 |
| Marmar favvora | `lux_favvora` | 6000 | 3000 | 5 |
| Pavilyon | `lux_pavilyon` | 8000 | 4000 | 5 |
| Lyuks basseyn va jakuzi | `lux_basseyn` | 10000 | 5000 | 5 |
| Lyuks jip | `lux_jip` | 10000 | 5000 | 5 |
| Limuzin | `lux_limuzin` | 12000 | 6000 | 5 |
| Superkar | `lux_superkar` | 15000 | 7500 | 5 |
## Qabul sharti
- Migratsiya: narxlar, levellar, `decor_slots`, chegirma jadvali; testlar (yaxlitlash, level qoidasi, nuqta istisnosi, chegirma muddati, server narxi).
- Admin panel: ro'yxat, joyida tahrir, arxiv, yangi tovar shakli, chegirma — e2e (admin) bilan.
- Do'kon: "🔥 Chegirmalar" bo'limi, qulf yozuvlari; skrinshotlar `ui-dokon-chegirma.png`, `admin-bezaklar.png`, `admin-yangi-tovar.png`.
- `TANGA-NARXLAR.md` yangilangan; `npm test`, `typecheck`, `e2e`, `screens`; tekshiruvchi ✅; `ISHLAR.md` [x]; `PLAN.md` "Holat"; push; `HISOBOT.md`.
