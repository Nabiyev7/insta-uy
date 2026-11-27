# SAVOLLAR — ish davomida o'zim hal qilgan narsalar

Har biri: savol → nimani tanladim → nega. Egasi o'zgartirmoqchi bo'lsa, aytsa bo'ldi.

## 1-qadam: uylar va bosh reja
1. **Uchastka o'lchamlari.** Hovli 25×34, villa 32×44, qasr 42×60 m (±10% ruxsat ichida) — ko'chalar orasiga eng chiroyli shu o'lchamlar tushdi.
2. **Odam o'zi sotib olgan panjara/darvoza** levelnikidan ustun turadi (u ataylab tanlagan). Shuning uchun 9-levelda yog'och panjara qo'ygan odamda yog'och ko'rinadi.
3. **Kuchsiz telefonda** uzoqdagi ikki qo'shni level bir xil sodda shaklda ko'rinadi (tezlik uchun). O'rta va yuqori sifatda har levelning o'z shakli bor.
4. **Villa 1,25 → 1,3 baravar.** Hovlidagi 7–10-level uyi 1,2 baravar, villa undan kichik bo'lib qolmasin deb ozgina kattalashdi. Qasr o'zgarmadi.
5. **Eski lokal baza** o'chirilmadi: `.dev-data-v1` papkasida. Yangi baza (demo aholi bilan) noldan yaratildi.
6. **Biznes tumani va kvartiralar atrofidagi bo'sh joy** daraxtli bog'cha bo'ldi: tijorat joylari soni (170) o'zgarmagani uchun u yerda joy ko'p qoldi.
7. **Bilbordlar** 2,5 m yo'l tomonga surildi (12,4 → 9,9 m): aks holda yangi hovlilarga kirib, darvoza oldini to'sardi. Bu ham bir martalik ruxsat ichida qilindi.

## 2-qadam: markaz
1. **Davlat binosini bossa oyna ochiladimi?** Jadvalda "bossa nima ochiladi" bor, lekin "keyingi bosqichlar"da ham yozilgan. Saytdagi tayyor oynalarni uladim (saroy → gazeta, hokimiyat → shahar, sud → qoidalar): bu yangi ish emas va zarari yo'q.
2. **Minoralarning sotuvdan olinishi** bazadagi `commerce_closed` sozlamasi bilan qilindi (joylar o'chmadi, keyin bitta sozlama bilan ochiladi).
3. **Bayram bezaklari** (archa, o'tov) ham yo'laklardan chetga surildi: yo'lakda faqat favvora qolsin.

## 3-qadam: harakat va ekran
1. **Eng baland kamera** sifatga qarab 190/240/300 m, ko'rinish radiusi 480/600/800 m — atrofdagi 3–4 mahalla ko'rinadi.
2. **Bepul mashina** — mavjud furgon modelining kichikroq va sekinroq (61 km/soat) turi; sotib olinganlari tezroq (67–86 km/soat).
3. **Chatda vaqt cheklovi yo'q**, lekin 3 soniyada 12 tadan ko'p xabar to'xtatiladi: qo'lda bunchalik tez yozib bo'lmaydi, bu faqat dastur (bot) oqimidan himoya.
4. **Mahalla chatiga** shu tumanda tasdiqlangan uyi borlar (va moderatorlar) yozadi.
5. **Tepadan qarayotgan odam** boshqalarga ko'rinmaydi (odamcha yo'q), lekin onlayn ro'yxatda bor.
6. **Xazina qazish** faqat piyoda yoki mashinada: tepadan qazib bo'lmasin.
7. **Chat majburiy Telegram** sharti 6-qadamda (kirish qismi) yoqiladi; server bunga tayyor.
8. **Chatda `@nom` yozish ham taqiqlandi:** u Telegram kanalga yo'l ochadi. Odamga murojaat qilish uchun nikini `@` siz yozsa bo'ladi.
9. **Sport mashina** 21 m/s: topshiriqdagi "4–5 barobar" chegarasida qolsin.

## 4-qadam: bezaklar tizimi
1. **Jadval nomi** `decor_items` emas, mavjud `decor_catalog` kengaytirildi: eski xaridlar va buyurtmalar shunga bog'langan, ko'chirish xavfli bo'lardi.
2. **Mavsum har yili takrorlanadi:** admin kiritgan sananing faqat kuni va oyi hisobga olinadi (yil oxiridan o'tsa ham ishlaydi).
3. **Level:** do'konda eng baland levelli uyingiz bo'yicha, qo'yishda esa shu uyning leveli bo'yicha tekshiriladi.
4. **Bezagi ko'p eski uy:** bezak yo'qolmaydi, lekin chegaradan oshirib yangisini qo'sha olmaydi.
5. **Egasi yo'lak yoki chiroq qo'ysa**, leveldan tekin kelgani o'rniga ko'rinadi (ustma-ust tushmasin).
6. **Chinor va archa hovlida kichikroq** (0,62 va 0,8): shoxi qo'shninikiga o'tmasin.
7. **Nik lavhasi** — 100 tanga, hamma leveldan; yozuvi har doim uyning tasdiqlangan niki.

## Ish davomida yangilangan promtlar (umumiy uslub)
1. **Promtlar ish paytida yangilandi** (uslub umumiy bo'lsin, ekranni tozalash, akkauntni o'chirish, referal vaqt shartisiz). Yangi matn bo'yicha ishladim: 1–2-qadamda qurilgan uylar, saroylar va davlat binolari **klassik uslubga qayta ishlandi** (naqsh, ko'k gumbaz olib tashlandi).
2. **Saroy (9–10-level)** — ustunli portik, fronton, cherepitsa tom; 10-levelda minorachalar va oq kupol. Oltin hoshiya 7-leveldan.
3. **Level nomi** "Naqshli hovli" → "Chiroyli hovli"; leveldan tekin so'ri o'rniga bog' soyaboni. So'ri, tok, tandir do'konda qoldi.
4. **Choyxona binosi** maydonda qoldi (MARKAZ promtida bor), faqat naqshi olib tashlandi.
5. **Avatar** sukut bo'yicha bosh kiyimsiz (do'ppi tanlovda qoldi). Sayt panellaridagi rangli hoshiya o'zgarmadi — u dizayn belgisi.
6. **`YUKLAMA-PROMT.md`** — `ISHLAR.md` da 7-qadam, egasi keyingi bosqichga qoldirdi.

## 5-qadam: yangi bezaklar va sotuv
1. **Ro'yxat yangi promtdan:** qozon-o'choq, supa va ariq ko'prikchasi olib tashlandi; bog' soyaboni, velosiped, pochta qutisi qo'shildi. Jami 26 ta yangi model.
2. **Narxlar** mavjud nisbatda: tanga = so'm / 50. Masalan mangal 200, besedka 600, garaj 1 000, ot 1 200 tanga.
3. **To'plamlar:** "Dam olish" (besedka + mangal + hamak + gulzor) va "Bolalar" (maydoncha + batut + basketbol), 20% chegirma.
4. **Noyob raqam** sotib olish tartibida beriladi, sovg'a qilinsa raqami bilan o'tadi, o'chgan raqam qayta berilmaydi.
5. **Sovg'a** faqat qo'lda bo'sh turgan bezakdan; hovlida turganini avval olib qo'yish kerak. Kuniga 20 ta.
6. **Haftaning hovlisi:** hafta dushanbadan (Toshkent vaqti); ovoz o'zgartirilmaydi; teng bo'lsa birinchi ovoz olgan yutadi; nishon keyingi g'olibga o'tadi.
7. **Hayit mavsumi** har yili siljiydi: hozir 10–31 may qo'yildi, admin har yili sanani o'zgartiradi.
8. **Sinab ko'rish** do'kondagi 👁 tugmasi: bezak o'z hovlingizda faqat sizga ko'rinadi.

## 8-qadam: shaharni qurish (XARITA-PROMT, CityLand UZ)
1. **Qulf.** Egasidan so'raldi, javob: "Qulfni ochishga ruxsat beraman" (2026-11-24). Bosh reja v3 chizildi va qayta qulflandi.
2. **Bot nomi.** Egasi "keyin aytaman" dedi: `TELEGRAM_BOT` sozlamasi bo'sh turibdi (kodga yozilmagan), keyin bitta qatorga yoziladi. Kanal `@citylanduz` — `telegram_channel` sozlamasida.
3. **Villalar sig'madi.** Ko'l bo'yi zonasiga (500×600 m) ko'l bilan birga 400 ta villa sig'maydi. Zona kengaydi: x 750…1500, z 375…1500 va g'arbidagi kvartal (x 375…750, z 750…1500). Uchastka kichraymadi.
4. **Qasrlar** uchun tepalik 500×500 → 620×620 m bo'ldi (100 ta qasr va yo'llar sig'sin).
5. **Mahalla markazlari** 15–100 m surildi: aks holda halqa yo'l, diagonal yoki ko'cha ichidan o'tardi. O't o'chirish ham (620, 600) dan (690, 596) ga — diagonal yo'l ustida edi; prospektga qaraydi.
6. **Ma'muriy va savdo markazi** x bo'yicha ±300 → ±288: yonidagi yo'lakka ikki qator hovli sig'di.
7. **Maydon va bulvar ustidan yo'l o'tmaydi** (promt matnidagidek, rasmdan farqli). Faqat halqa yo'l bulvarni kesadi (piyodalar yo'lagi bilan). Bulvar yoniga 12 m li ko'chalar qo'shildi — hovlilar shularga qaraydi.
8. **Daryo qirg'og'iga** ikki ko'cha qo'shildi (yo'lakdan tashqarida), sharqiy chetdagi hovlilar yo'lsiz qolmasin.
9. **Janubi-sharqiy diagonal** ko'l qirg'og'ida tugaydi, ko'l atrofida aylanma ko'cha bor.
10. **Tijorat joylari** (170 ta) hammasi sotuvdan olindi; admin sozlamasidagi `commerce_closed` ro'yxatidan chiqarilsa, yana sotiladi.
11. **Tun qisqardi** (sutkaning ~28%) va yorug'landi: egasi "juda qorong'i" degani uchun.
12. **Uy ko'tarish chegarasi** bazada 5 edi, promtdagidek 3 qilindi; 4-leveldan "Tez kunda" chiqadi.
13. **Taklif — kirish tugmasi.** 1-bosqichda "Kirish" o'rniga "Tez kunda — @citylanduz" chiqarish mumkin. Hozir kirish va uy olish to'liq ishlayapti (sinovdan o'tgan), shuning uchun yashirmadim. Yashirish kerak bo'lsa, ayting.
14. **Stadion** — joyida to'siq, poydevor va kran turibdi; umumiy loyiha to'lganda quriladi.
15. **Texnik manzillar** ham yangilandi (`citylanduz.pages.dev`, ichki login pochtasi). Haqiqiy domen hali ochilmagan.
16. **Yo'l uchlaridagi 2 m tirqish** (tekshiruvchi topdi): o'nlab ko'cha uchi boshqa yo'lga 0,4–6 m yetmaydi. Reja qulflangani uchun joylarga tegmadim — asfalt qo'shni yo'lgacha cho'zib chiziladi, tirqish ko'rinmaydi. Rejaning o'zini tuzatish uchun yangi "Qulfni ochishga ruxsat beraman" kerak.
17. **Telegram tugmasi**: bot nomi (`telegram_bot` sozlamasi) bo'sh turganda "Telegram orqali kirish · Tez kunda" bo'lib turadi (bosilmaydi).

## 9-qadam: bo'sh uchastkalar, uylar 1–5, bezaklar (UYLAR-BEZAK-PROMT)
1. **Garaj o'qi.** Hamma levelda (2–10) avtomobil yo'li bitta joyda: uy kattalashganda yo'l va darvoza ko'chmaydi. Shu sabab namunadagi uylar 0,3–0,5 m surildi.
2. **6–10-level** modellarining shakli o'zgarmadi; ranglari 8-qadamda umumiy yangi palitraga o'tgan (`kit_core.py` `PALETTE`), bu qadamda qo'shimcha moslash qilinmadi, lekin ularga ham mashina maydonchasi va ikkinchi darvoza qo'shildi — "garaj oldi" nuqtasi ishlashi uchun. Muammo: 5-level ikki qavatli, 6-level esa bir qavatli eski uy — pastroq ko'rinadi. 6–10 ni yangilashda hal qilinadi.
3. **Standart rang.** Tom va ramkaning "0" rangi endi "levelning o'z rangi": 1–3 qizil tom, 4–5 to'q kulrang-ko'k tom va to'q ramka. Egasi boshqa rang tanlasa — o'shanisi. Yangi olingan uy tomi 0 bilan boshlanadi (oldin tasodifiy edi).
4. **Bezak joylari soni:** 1–4-level 1 (faqat nik lavhasi), keyin 8, 10, 12, 14, 16, 17. Admin o'zgartiradi (`decor_slots`).
5. **Sotuvdan olingan eski bezaklar (13 ta):** o'rniga yangisi kelganlari — eski hovuz, favvora, furgon, sedan, sport, soyabon, besedka, mangal, archa, olma, o'rik, gulzor, garaj. Milliy narsalar (so'ri, tok, tandir, o'tov) qoldi. "Dam olish" to'plami yangi bezaklar bilan almashdi.
6. **Panjara, darvoza, yo'lak, chiroq** ham bezak hisoblandi — 5-leveldan. Nik lavhasi har levelda.
7. **Bepul uy faqat hovli** (`BOSQICH-2.md`): kvartira bosilsa "hozircha berilmaydi" chiqadi, bazada ham yopildi (bepul va pulli yo'l).
8. **Nik tasdig'i** (`require_approval`) yoqiq turibdi: uy darhol quriladi, "Nikingizni admin tekshiradi" deb chiqadi. Kerak bo'lmasa, sozlamadan o'chiriladi.
9. **Bo'sh joydagi tugma:** kirmagan odamga "Telegram orqali kirish" chiqadi va kirish oynasi ochiladi; bot nomi yozilmaguncha u yerda Telegram "Tez kunda" turadi (login+parol ishlaydi — uni olib tashlash 2-bosqich ishi).
10. **Villa va qasr** bo'sh uchastkalarida taxtacha yo'q (bepul emas), faqat daraxt.
11. **`agents/` va `github/` papkalari** bu ishga kirmaydi, commitga qo'shilmadi.

## 10-qadam: lyuks bezaklar (BEZAK-LYUKS-PROMT)
1. **O'lchamlar.** Namunadagi pavilyon, basseyn va bog' (9 × 11 m gacha) hovliga sig'maydi — old hovli chap nuqtasi 7,2 × 7 m ga moslab kichraytirildi. Shezlonglar yotqizib joylashtirildi.
2. **Marmar favvora va fransuz bog'i** ikki joyga sig'adi: o'ngda kichik, chap (keng) hovlida 1,6–1,8 baravar katta turadi. "Markaz" nuqtasi yo'q (u yerda yo'lak o'tadi) — o'rniga chap/o'ng.
3. **Tuvakdagi daraxt** burchaklarda katta, eshik oldidagi 2 ta nuqtada 0,6 baravar kichik turadi.
4. **So'mdagi narx** promtda yo'q: eski qoida bo'yicha 1 tanga = 50 so'm qilib yozildi (pulli to'lov o'chiq, admin o'zgartiradi).
5. **Garaj oldi nuqtasi** 5 → 5,6 m uzaytirildi (limuzin sig'ishi uchun), avtomobil yo'lidan chiqmaydi.
6. "YANGI" belgisi endi faqat lyuks bezaklarda; 9-qadamdagilardan olindi.
7. **Topilgan eski xato (9-qadamdan):** yangi mashinalarni haydaganda boshqalar ko'rmas edi (server kodi 13 gacha ruxsat berardi). Tuzatildi, endi har mashina testdan o'tadi.

## 11-qadam: yangi interfeys (INTERFEYS-PROMT)
1. **Bezak joylari soni.** Promtdagi qoida bo'yicha 1–4-levelda 0. 9–10-levelda 16–17 edi, lekin nik lavhasidan boshqa 16 ta nuqta bor — shuning uchun 15 va 16 qilindi. Admin o'zgartiradi.
2. **Tun rejimi** faqat panellarga tegishli (avto — telefon mavzusi bo'yicha). Shahardagi kun-tun o'zicha aylanaveradi.
3. **Telegram kirish** "Tez kunda" turibdi (bot nomi yo'q), shu oynada login+parol ishlaydi. "Telegram orqali 10 soniyada" yozuvi bot yozilgach chiqadi.
4. **Telegram kanal** menyuda @citylanduz (promtda berilgan). Sozlamada boshqa kanal yozilsa — o'shanisi.
5. **♥ yurak** saytda yo'q — o'rniga bor "Haftaning hovlisi" ovozi turibdi (promt: "bor bo'lsa").
6. **Mehmon do'konida** hamma 5+ bezak qulf belgisi bilan turadi; "Olish" bosilsa kirish oynasi ochiladi va kirgach o'sha tovarga qaytadi.
7. **Kartalar** Piyoda va Mashina rejimida chiqmaydi (joystikka joy kerak) — faqat tabrik va xazina chiqadi.
8. **"N qo'shni"** — 60 m atrofidagi egali uylar soni.
9. **Pastki panelda 5 ta bo'lim** promtdagidek; qidiruv xarita ichida (nik va manzil).
10. **Oynalar (pastdan chiqadigan)** namunadagidek shaffof emas, oq (tunda to'q) — matn yaxshi o'qilishi uchun; shaffof "oyna" faqat ekrandagi tugma va panellarda. Istasangiz ularni ham shaffof qilamiz.
11. **Uy tepasidagi yorliqda** yulduzcha o'rniga "L5" yoziladi; nishonlar emoji emas, belgi.

## 6-qadam: kirish, uy olish, tanga, premium (BOSQICH-2-3-PROMT)
### A qismi
1. **5-level bezak joyi** — 16 ta (nik lavhasisiz hamma nuqta): 5-level endi eng yuqori level. Admin o'zgartiradi.
2. **Villa va qasr uchastkasida** 1–5-level uylar uchastka o'lchamiga qarab kattalashib turadi (villa 1,2, qasr 1,6 baravar).
3. **Avatar ranglari** odamga qarab avtomatik (bir xil odam — doim bir xil rang), tanlanmaydi.
4. **Temir panjara va oltin darvoza** endi levelga tekin berilmaydi (eski 7–10-levelniki edi) — do'kondagi bezak sifatida 5-leveldan.
5. **Kunduzgi tun yorug'ligi** 5-levelda ham yaxshi ko'rinadi (eski 10-levelnikidan kamroq).

### B+C qismi
1. **Kirish havolasi 15 daqiqa** amal qiladi va bir marta ishlaydi. Muddati o'tsa — botga /start yozib yangisini olish kerak.
2. **Bot nomi** (`telegram_bot`) hali bo'sh — saytdagi tugma "Tez kunda". Egasi bot nomini admin → Sozlamalar'ga yozganda ishlaydi.
3. **Admin panelga kirish** — botga `/admin` (faqat admin/moderator). Serverga `ADMIN_URL` (admin panel manzili) yozish kerak.
4. **Eski parolli akkauntlar** (sinov paytida ochilganlar) kirib ko'ra oladi, lekin uy olish, chat, sovg'a uchun Telegram ulashi kerak. Parol tiklash yo'q.
5. **Birinchi admin**: botga /start yozib akkaunt ochiladi, so'ng bazada `role='admin'` qilinadi (README).
6. **Kim kirmasa**: 3 oy (90 kun) — bepul uy bo'shaydi, 2 hafta oldin bot ogohlantiradi. Level oshirilgan bepul uy ham bo'shaydi (faqat pulga olingani qoladi). Pulga kengaytirilgan bepul uy ham bo'shaydi; sovg'a qilib berilgan uy esa pullik hisoblanadi va bo'shamaydi — kerak bo'lsa o'zgartiramiz.
7. **Instagram ichki brauzeri**: bot havolasi tashqi brauzerda emas, Telegram ichida ochilishi mumkin — sayt baribir kirgan holda ochiladi.

### D qismi (tanga)
1. **"O'ziga yuborish (bir qurilma)"** — bir qurilmani aniqlash yo'q; o'ziga va bir Telegramga yuborish bloklangan, shubhali akkauntni admin "Iqtisod" ro'yxatidan ko'rib bloklaydi.
2. **Kanal bonusi** ishlashi uchun bot kanalda **admin** bo'lishi va serverda `TELEGRAM_CHANNEL` yozilgan bo'lishi kerak.
3. **Kunlik seriya** 7 kunda yopiladi: 7-kuni +300, 8-kundan yana 1-kun.
4. **Xazina**: har kim kuniga 3 ta topadi (birinchisi topilgach keyingisi boshqa joyda paydo bo'ladi). Bitta joyni necha kishi topishi chegarasi yo'q.
5. **Narxlar**: lyuks bezaklar (3 000–15 000) va tovus (4 000) avvalgi promtdagi narxida qoldi — "Noyob 5 000–10 000" toifasidan biroz chetda. Markaziy ko'cha nomi (10 000 tanga) hozircha so'mda sotiladi — tanga bilan keyin.
6. **Uy bo'shatilganda tanga/level/bezaklar** — TANGA-NARXLAR bo'yicha keyin hal qilinadi (hozir bezaklar egasida qoladi).

### E qismi (premium)
1. **To'lov o'chiq** (`payments_enabled=false`): hamma pul tugmalari "Tez kunda". Yoqish — admin → Sozlamalar.
2. **Stars uchun** BotFather'da qo'shimcha sozlash shart emas (XTR valyuta). Yulduz kursi 1⭐ = 200 so'm (admin → Sozlamalar → `premium.starsRate`).
3. **Premium uy narxi** 1, 2, 4-level uchun promtda yo'q edi — taxminan qo'ydim: 10 000 / 20 000 / 45 000 so'm (3 va 5 — promtdagidek 30 000 / 60 000). Admin o'zgartiradi.
4. **Qaytarish**: Stars — tugma bilan Telegram orqali avtomatik; karta — pulni admin o'zi qaytaradi, keyin "Qaytarildi" bosadi. Tanga paketi qaytarilsa, tangalar (qolgani) olib qo'yiladi; boshqa narsalar (uy, bezak) avtomatik olinmaydi — admin qo'lda.
5. **Salyut** navbat bilan: bittasi 24 soat, keyingisi undan keyin boshlanadi. Matnda havola va @nik bo'lmaydi.
6. **Noyob nik joylari** — faqat jadval va `api_nick_spots` (skelet); joylar va sotuv keyin.
7. **Bank xabari bilan karta to'lovi** (A variant) avvalgidek: admin bank botining xabarini botga forward qiladi. Payme/Click (B variant) — kod bor, kalitlar kerak.

### F qismi
1. **Yurak** soni uy ustidagi yorliqda (qizil yurak belgisi) va uy oynasida ko'rinadi.
2. **Referal sovg'asi** pulga olingandek hisoblanadi — 1-level uyning pulli nuqtasiga ham qo'yiladi.
3. **Zaxira** faqat `ADMIN_TELEGRAM_ID` ga yuboriladi; bir nechta admin kerak bo'lsa — keyin.
4. **Bezaklarning so'mdagi narxi** promtga moslab qayta hisoblandi: oddiy — 5 000–20 000 so'm (tanga × 25), lyuks — 15 000–60 000 so'm (tanga × 5). Avvalgi so'm narxlari (masalan lyuks 750 000) bekor.
5. **Pul qaytarilganda** faqat tanga paketining tangasi avtomatik olinadi; uy, bezak, level, salyut odamda qoladi (admin kerak bo'lsa Uylar/Foydalanuvchilar bo'limidan qo'lda oladi).
6. **Saytdagi salyut + Stars**: Telegram havolasi matnni olib o'tolmaydi — bot "/salyut matn" deb yozishni so'raydi. Karta yoki tanga bilan to'lashda matn saytdan olinadi.

### Eski IQTISOD-PROMT
Bajarildi: Telegram orqali kirish, asoschi 100 (aniq), 1 kishiga 1 bepul uy, referal (vaqt sharti yo'q), "Iqtisod" sahifasi, zaxira Telegramga, 3 oy qoidasi + ogohlantirish, xabar yuborish, so'rovnoma, Elchi nishoni, kutish ro'yxatiga xabar, qoidalar matni.
Qilinmadi yoki BOSQICH-2-3 ga zid bo'lgani uchun o'zgartirildi:
1. **Tanga narxi = so'm / 50**, "Telegram ulash 200", "taklif bilan kelganga 200", "3-levelgacha" — yangi promt (TANGA-NARXLAR, level 1–5) bilan almashtirildi.
2. **So'rovnomada tanga mukofoti** — yo'q (D: "topish faqat shulardan").
3. **"Pul bilan sotib olish tugmalari ko'rinmaydi"** — E bo'yicha endi "Tez kunda" bo'lib ko'rinadi.
4. **Gazetani kanalga post qilish** — hali yo'q (kanal ID va botni kanalga admin qilish kerak).
5. **Kunlik tanga grafigi** — "Iqtisod"da faqat 7 kunlik jadval (grafik keyin).
6. **Zaxira yuborilmasa qayta urinish va Sentry** — cron keyingi kuni yana yuboradi; xato cron natijasida ko'rinadi, Sentry ulanmagan.
7. **Bir qurilmadan referal** — qurilma aniqlanmaydi (faqat bir Telegram).
8. **Zaxiradan tiklash yo'riqnomasi** — faqat README'da (admin panelda emas).
9. **Maxfiylikda server mintaqasi** yozilmadi — Supabase loyihasi qaysi mintaqada ochilishi hali noma'lum (12-qadamda aniqlanadi).
10. **Markaziy ko'cha nomini tangaga sotish** — hozircha so'mda (to'lov o'chiq). Tangaga o'tkazish — keyin.
11. **Tijorat joylari (B001–B170)** — `commerce_closed` ro'yxatidagilar sotuvda emas; hammasini yopish admin → Sozlamalar orqali.
12. **Xabar yuborish tezligi** — har cron'da 300 ta (taxminan soatiga 1 800); yuborilmay qolgan xabar qayta yuborilmaydi.

### 6a — Tuzatish 1 (promtda javobi yo'q joylar: nimani tanladim va nega)
1. **Premium uy** — kod o'chirilmadi, `premium_house_enabled=false` ortida (egasi shunday dedi). Villa/qasr uchastkasini pulga sotish ham shu bayroqcha ortida (bitta "pulga uchastka" yo'li). Admin sinov rejimida ochiq.
2. **Sinov rejimidagi narx yozuvi** — har narx yoniga emas, ekran pastida bitta qizil "Sinov rejimi · Sinov — bepul" belgisi; pulli tugmalar "Sinov xaridi" bo'ladi. Sabab: kam joy, chalkashmaydi.
3. **Sinov uylari** asoschilar joyini egallamaydi va `is_free=false` (bir nikka bir nechta sinov uyi). Tanga o'tkazmasida (send) sinovchidan ham tanga yechiladi — aks holda tanga "yo'qdan" paydo bo'lardi.
4. **Chat "Onlayn" tabi** olib tashlangani bilan "jim qilinganlar" ro'yxati (qaytarish tugmasi) ham ketdi — jim qilish xabar menyusida qoladi. Kerak bo'lsa Sozlamalarga qaytaramiz.
5. **Hovli so'rovnomasida uy rasmi yo'q** — bot xabarida har nomzodning nik va havolasi (rasm yuborish uchun uy rasmini serverda chizish kerak — keyin).
6. **"Haftaning hovlisi" so'rovnomasi** dushanba kuni birinchi cron'da boshlanadi; nomzod 2 tadan kam bo'lsa — o'sha hafta so'rovnoma yo'q.
7. **Gazeta va ko'cha oynasi** — faqat saytdan yashirildi, server va baza qoladi (promt: "UI'dan yashiriladi").
8. **Interfeys kontrasti (WCAG AA)** — to'q rejim avvalgi to'q mavzu ranglarida; alohida o'lchov vositasi bilan tekshirilmadi.
9. **Lokal admin tugmasi** — `import.meta.env.DEV` ortida (ishlab chiqarish yig'ilishida kod chiqib ketadi), endpoint esa `DEV=1` bo'lmasa 404 (test bor).

### 6b — Qo'shimcha 1 (nimani tanladim va nega)
1. **Nizo dalillari (skrinshot)** Supabase Storage'ga emas, Telegram'da qoladi (fayl ID bazada); admin panel ularni server orqali ko'radi. Sabab: omborga shaxsiy rasm ko'chirilmaydi, kod sodda.
2. **Nik o'tganda da'vogar** akkauntini o'zi ochadi: bot "/start yozing" deydi (nik bo'shagan bo'ladi). Sabab: akkaunt faqat bot suhbatida yaratiladi.
3. **"Yangi qo'shningiz"** — kuniga 3 tagacha alohida xabar (bitta xabarga jamlash — keyin).
4. **Kirish animatsiyasi** admin "Video" (reels) uchun hali ishlatilmadi — video o'z kamera yo'lidan foydalanadi. Kirishdan oldin profil yuklanmagan bo'lsa, kamera markazga (o'z uyiga emas) tushadi.
5. **Shahar loyihalari**: ko'prik uchun bosh rejada joy yo'q — taxta chiqmaydi (loyiha bazada qoladi). Bog' taxtasi hovuz yonida. Loyiha to'lganda yangi 3D obyekt (stadion modeli va h.k.) hali yo'q — faqat taxta 100% bo'ladi va xabar boradi.
6. **Eslatma soati** 19:00 (sozlama `reminder_hour`); xabar uy egasi bo'lgan va bonusni olmaganlarga.

### Yakuniy tekshiruvdan (6a + 6b)
1. **Nik da'vogarga band qilinmaydi**: nik bo'shagach da'vogar /start yozguncha boshqa odam olib qo'yishi mumkin (ehtimoli kam). Kerak bo'lsa — 7 kunlik band qilish qo'shamiz.
2. **Akkaunti bor odam** boshqa nikka da'vo qila olmaydi (nik o'zgarmaydi qoidasi) — bot shuni aytadi.
3. **Sinov rejimi**: shahar loyihasiga hissa va salyut sinovchidan ham haqiqiy tanga yechadi (hammaga ta'sir qiladi). Sinov xaridida olingan tanga paketi admin balansiga haqiqiy tanga qo'shadi; tozalash uni olib tashlamaydi.
4. **Kechki eslatma kuni** Toshkent vaqti bo'yicha, "bonus olinganmi" esa server kuni bo'yicha — 19:00 da farq yo'q; `reminder_hour` ni tun yarmiga qo'ymang.
5. **Lokal admin tugmasi** ishlab chiqarish yig'ilishida yo'qligi alohida build testi bilan tekshirilmagan (endpoint 404 — test bor).

### 6d — Tuzatish 2 (nimani tanladim va nega)
1. **So'mdagi narx tanga do'konida**: to'lov yoqilsa (`payments_enabled=true`) qayta chiqadi (1-band), garchi 6-bandda "Tanga do'koni — faqat tanga" deyilgan. Sabab: 1-band aniq "kod qoladi, yoqilganda qayta chiqadi" deydi. Kerak bo'lmasa — bitta qatorni o'chiramiz.
2. **"Darvoza va yoritish" tabi** "Hovli"ga qo'shildi: promtdagi 8 tab ro'yxatida u yo'q va 4×2 panjaraga sig'ishi uchun.
3. **Uy olish, level ko'tarish va salyut** pul tugmalari to'lov o'chiq paytda avvalgidek "Tez kunda" bo'lib turadi (faqat do'kondagi so'm narxi yashirildi).
4. **Egasi qanday aniqlanadi**: server har cron'da `ADMIN_TELEGRAM_ID` ni bazaga yozadi (`svc_set_owner`). Shundan keyin boshqa hech kim admin bo'la olmaydi (baza o'zi rad etadi), eski admin/moderator rollari "user" bo'ladi. `ADMIN_TELEGRAM_ID` berilmagan lokal sinovda admin roli yetadi.
5. **Moderator** kodi qoldi, lekin `moderators_enabled` sozlamasi (yo'q = o'chiq) bilan yopiq. Admin panelda "Rol" tugmasi yashirildi.
6. **Premium "Uylar"** tabi hozircha doim bo'sh ("Tez kunda"): premium uy tovarlari katalogga qo'shilganda ulanadi (eski premium uy kodi `premium_house_enabled=false` ortida qoladi).
7. **Premium tovar** admin panelda "Bezaklar" → tahrirlash → "Premium (faqat pulga)" belgisi bilan; narx — so'm maydoni, Stars kurs bo'yicha (≥ 50 ⭐ bo'lmasa faqat karta).
8. **Uzoqdagi uylar** (yorliq masofasidan keyin): nuqta qo'yilmadi — hozirgi LOD qoidasi saqlandi (yorliq ko'rinmaydi). Sabab: tezlik.
9. **Kelish manbai** faqat yangi akkauntga (1 kun ichida) yoziladi; bot havolasi orqali kelganlar (`t.me/...?start=`) hozircha "Belgisiz".
10. **"Hozirgina uy oldi"** xabari uylar ro'yxati har daqiqada yangilanganda chiqadi (realtime emas) — kechikish 1 daqiqagacha.

### 6c — Telegram bot (nimani tanladim va nega)
1. **Pastdagi menyu (reply keyboard) Mini App tugmalari**: Telegram'ning ba'zi ilovalarida bunday tugmadan ochilgan Mini App'ga `initData` (kim ekanligi) kelmaydi. Shunda sayt "Menu → Shahar tugmasini bosing" deydi; bot profilidagi **Menu** tugmasi va xabardagi tugmalar `initData` beradi. Haqiqiy telefonda 12-qadamda tekshiriladi (`SINOV-TELEFON.md`). Kerak bo'lsa pastdagi tugmalarni oddiy matn tugmasiga o'tkazamiz (bosilganda bot Mini App tugmasini yuboradi).
2. **Haftaning hovlisi kanal postida uy rasmi yo'q** — server uy rasmini chiza olmaydi (stories rasmi saytda chiziladi). Hozir: nik, ovozlar soni va uyga havola. Rasmni keyinroq (masalan, sayt chizib omborga yuklagan rasm) qo'shamiz.
3. **Kanal postlari tili** — `channel_lang` sozlamasi (sukut: o'zbekcha). Har tur admin → Sozlamalar → `channel_posts` da yoqiladi/o'chiriladi.
4. **Bazada yozilgan eski xabarlar** (nik nizosi, eslatma, so'rovnoma) "o'zbekcha / ruscha" ko'rinishida edi — endi yuborishda oluvchi tiliga qarab bittasi olinadi (`oneLang`). Yangi tizim xabarlari (haftaning hovlisi, loyiha) ikki alohida matn bilan.
5. **/hammaga** — matn yoki bitta rasm (izoh bilan). Kimga: hammaga / tumanga (ochiq tumanlar ro'yxati) / kutish ro'yxatiga. Xabarni o'chirganlarga (`/stop`) umumiy xabar bormaydi.
6. **Admin buyruqlari** (`/admin`, `/stat`, `/hammaga`, `/murojaatlar`, `/nizolar`) — faqat `ADMIN_TELEGRAM_ID` va bazada egasi bo'lsa; boshqalarga "Bunday buyruq yo'q" (admin borligi ham bildirilmaydi).
7. **Eski `/yordam matn`** olib tashlandi: «✍️ Adminga yozish» (yoki `/yordam`) → keyin xabar. `/parol` va `start=reset` faqat `password_login=true` bo'lsa ishlaydi, aks holda oddiy matn kabi.
8. **Akkaunti yo'q odam** noma'lum matn yozsa — "Menyudan tanlang" emas, nik so'raladi (menyu hali yo'q).
9. **Telegram Web (brauzerdagi Telegram)** Mini App'ni iframe ichida ochadi — shuning uchun saytda `X-Frame-Options: DENY` olib tashlandi, `frame-ancestors` faqat `*.telegram.org` ga ruxsat beradi.
10. **Sayt tili = bot tili**: botdagi havolalarda `?til=`; saytda til almashtirilsa profilga yoziladi (`my_lang`) va bot ham shu tilda yozadi.
11. **"🏡 Uy olish"** — saytda xarita oynasi ochiladi, kamera eng yaqin bo'sh joyga turadi.

### 6f, 4-band — sayt egasining kompyuterida Chrome'da ochilmaydi (tashxis va variantlar, 2026-11-26)
**Topilgan sabab (shu kompyuter va uy Wi-Fi):**
- **IPv6 ishlamaydi:** DNS IPv6 manzil beradi, lekin ulanish o'tmaydi (Google IPv6 ga ham).
- **Chrome'ning TLS 1.3 ulanishi `pages.dev` ga uziladi** (`ERR_CONNECTION_RESET`):
  - post-kvant kalitni o'chirish yordam bermadi;
  - TLS 1.2 bilan yoki faqat IPv4 orqali sayt ochiladi;
  - curl/PowerShell (IPv4) — 200.
- Bir soat oldin shu kompyuterda ochilgan edi, demak muammo vaqti-vaqti bilan bo'ladi.
- Telefonda (Chrome va Telegram) ishlaydi.
- Xulosa: provayder yo'nalishi yoki uy routeridagi IPv6 sozlamasi. Saytning o'zi va Cloudflare bunga aloqador emas.

**Bepul variantlar (egasi o'zi):**
1. Windows'da Wi-Fi adapterida IPv6 ni o'chirish: Boshqaruv paneli → Tarmoq → adapter → Xususiyatlar → «IP version 6» belgisini olib tashlash. Shu kompyuter uchun eng oson yechim.
2. Routerda IPv6 ni o'chirish yoki provayderga "IPv6 ishlamayapti" deb murojaat qilish.
3. Chrome'da: `chrome://flags` → «Experimental QUIC protocol» → Disabled.

**Agar beta foydalanuvchilarida ham shunday shikoyat bo'lsa (pullik — egasi tanlaydi, men qilmadim):**
- O'z domeni (masalan, `citylanduz.uz` yoki `.com`):
  - `.uz` — yiliga taxminan 60–120 ming so'm (UZ registratorlar);
  - `.com` — Cloudflare Registrar'da yiliga ~10 $.
  - O'z domenida Cloudflare'da HTTP/3 ni o'chirish, minimal TLS va boshqa sozlamalarni boshqarish mumkin; `pages.dev` da bu imkon yo'q.
- Boshqa bepul xosting (Netlify, Vercel, GitHub Pages) — boshqa IP va tarmoq. Lekin avtomatik deploy va sarlavhalarni qayta sozlash kerak, foydasi kafolatlanmaydi.

**Hozircha:** hech narsa sotib olinmadi. `e2e/prod.mjs` mustahkamlandi: QUIC o'chiq, 3 urinish, oxirgisi TLS 1.2 bilan, xato matni aniq yoziladi.

### 6f — tekshiruvchi eslatmalari (egasi qaror qiladi)
1. **1–2-tanga paketlari** (500 va 1 200 tanga) faqat karta bilan sotilardi; endi xarid botda, botda esa hozircha faqat Stars bor — bu ikki paketni hech qayerda olib bo'lmaydi. Variantlar: (a) ularga ham Stars narxi qo'yish (50 ⭐ dan kam bo'lmasin — masalan, 500 tanga = 50 ⭐); (b) to'lov yoqilganda botga karta to'lovi qo'shish; (c) ikkisini ro'yxatdan olib tashlash. **Hozir:** saytda ko'rinadi, botda "Stars bilan sotilmaydi" deyiladi.
2. **Oddiy do'kondagi so'mli bezak, uy/level va salyut** hali saytda (to'lov yoqilganda) karta/Stars bilan to'lanadi — 3-band faqat Premium va tanga paketlarini so'ragan edi. Hammasini botga ko'chiraylikmi?

### 13-qadam — ochilish (nimani tanladim va nega; egasi qarori kerak bo'lganlari)
1. **`nabiyev_7` akkaunti** (ishlab chiqarishda: haqiqiy bepul uy P0003, "Asoschi" №1, 41 100 tanga) — tozalash tugmasi unga tegmaydi (sinov belgisi yo'q). Egasi hal qiladi: o'chirish (akkauntni o'chirish) yoki qoldirish. `OCHILISH-ROYXAT.md` 1-bo'lim.
2. **Sinov xaridlaridan kelgan tangalar** (sizning `citylanduz` akkauntingizda 29 800) tozalashda olib tashlanmaydi (avvalgi qaror, 6a). Kerak bo'lsa admin → Foydalanuvchilar → Tanga (manfiy) bilan nolga tushiring.
3. **Stars test muhiti**: Telegram test serveri alohida bot va test akkaunt talab qiladi — bu yerda qilinmadi. To'liq yo'l (invoice → pre_checkout → successful_payment → tanga → refund) avtomatik testda soxta Telegram bilan tekshirildi (`server/test/server.test.ts`). Haqiqiy muhitda — egasi 60 ⭐ lik paket bilan bir marta.
4. **Oddiy do'kondagi bezaklar pulga sotilmaydi** (faqat tanga). Pulli bezaklar — faqat Premium bo'limida (hozircha yo'q, "Tayyorlanmoqda"). Nik yorlig'i, hovlini kengaytirish, ijara va ko'cha nomi faqat karta bilan sotilardi — karta o'chiq, shuning uchun saytdan yashirildi (kod qoladi).
5. **Yangilash oralig'i**: uylar 2 daqiqa, sozlamalar 5 daqiqa (bepul Workers limiti uchun). "@nik hozirgina uy oldi" xabari 2 daqiqagacha kechikadi.
6. **Sog'liq tekshiruvi** 15 emas, **10 daqiqada** (mavjud cron'ga qo'shildi — bepul tarifda cron soni cheklangan). Tekshiruv ichida 20 soniyadan keyin qayta tekshiriladi ("2 marta ketma-ket").
7. **Render trafigi** (100 GB/oy) — eng tez tugaydigan bepul chegara bo'lishi mumkin (YUKLAMA-HISOBOT.md). Oshsa: Render Starter ($7/oy) yoki harakat tikini kamaytirish.
8. **Zaxiradan tiklash** "bir buyruq" — `npm run restore -- fayl.json.gz` SQL tayyorlaydi; uni Supabase SQL Editor'ga qo'yish qo'lda (Supabase CLI'da to'g'ridan-to'g'ri SQL bajarish buyrug'i yo'q, parol so'ramasligi uchun).

## 14-qadam: Tuzatish 5 — haqiqiy loyiha (2026-11-27)
1. **Eski `private.is_tester` nomlari** ko'p funksiya ichida ishlatiladi. Hammasini qayta yozish o'rniga ular endi faqat `private.is_owner_admin` ni chaqiradi (`test_mode` ustuni hisobga olinmaydi). Natija bir xil, xavf kam.
2. **Admin ham bepul uyini oddiy yo'l bilan oladi** (bitta; "Asoschi" nishoni va 1 000 tanga unga ham beriladi). Qo'shimcha uylar faqat "Uy berish" orqali olinadi va asoschilar soniga kirmaydi. Admin uchun yopiq tuman, villa va qasr ochiq.
3. **"Uy berish"da nik bazada topilmasa**, uy admin akkauntiga shu nik bilan yoziladi (masalan, brend yoki namuna uy). Nik noto'g'ri yozilsa — uyni admin panel → Uylar → "Bo'shatish" bilan bo'shatib, qaytadan bering.
4. **Kanalga post** endi admin uylari uchun ham chiqadi (ular haqiqiy).
5. **O'chirish** zaxiradan keyin bajarildi. Ikki akkaunt bor edi: @citylanduz (egasi) va @nabiyev_7. Egasi @nabiyev_7 ni o'chirishni tasdiqladi.
   - Zaxira 2 joyda: kompyuterda `.zaxira/oldin-ochish-20261127-0307.json` va egasining Telegramida.
   - Kutish ro'yxati, katalog, xarita, sozlamalar va audit jurnali qoldi.
6. **Kirish yozuvi tartibi.** Birinchi urinishda tozalash rad etildi (Supabase'da WHERE siz DELETE taqiqlangan), lekin @nabiyev_7 ning kirish yozuvi (auth) undan oldin o'chib bo'lgan edi.
   - Tuzatishdan keyin (`0037`) tozalash to'liq bajarildi.
   - Natija tasdiqlangan holat bilan bir xil.
7. **Niklarning tezligi 456 ta uy bilan o'lchandi**, 1 000 ta bilan emas: lokal DEMO ikki tumanda shuncha uy yaratadi.
   - Ketma-ket o'lchovda FPS pasaymadi.
   - Bundan tashqari unit test 1 000 ta uy bilan yorliqlar yig'ilishini tekshiradi.
8. **Eng balandda butun shahar (3 km) ekranga sig'maydi.** Telefonda taxminan 1–1,5 km ko'rinadi. Balandlik promtdagi qiymatlarda qoldirildi; FPS chegarasidan ancha yuqori.
9. **`e2e/prod.mjs` egasining akkauntida brauzer sessiyasini ochadi** (faqat o'qish). Shuning uchun egasining "oxirgi ko'rilgan" vaqti va bugungi faollik yozuvi yangilanadi.

## 15-qadam: Tuzatish 6 — narxlar, levellar, chegirmalar, admin katalog (2026-11-27)
1. **Yaxlitlash "o'rtada — juftga".** Jadvaldagi 150 → 80 va 450 → 220 ikkalasiga faqat shu qoida mos keladi (7,5 → 8, 22,5 → 22). Jadvaldagi 63 ta narxning hammasi shu qoidaga to'g'ri keladi (test tekshiradi).
2. **Level: jadval va qoida 7 ta tovarda farq qiladi.**
   - Jadval: chinor va gulzor (80 tanga) — 1-lv; tandir, tokzor, basketbol halqasi, palma va gul kamari (150 tanga) — 3-lv.
   - Qoida: ikkala guruh uchun 2-lv.
   - Jadval ustun turadi. Bu 7 tasi "qo'lda qo'yilgan" deb belgilandi, shuning uchun narx o'zgarsa ham leveli saqlanadi; admin → Bezaklar → Level → "avto" bilan qaytariladi.
   - Qolganlari "avto".
3. **Nuqtalar levellari tovarlar jadvaliga mos qilib taqsimlandi.** Shuning uchun "nuqta istisnosi" kerak bo'lgan mavjud tovar yo'q. Qoida bazada ishlaydi: masalan, faqat tomga qo'yiladigan yangi tovar arzon bo'lsa ham 4-leveldan ochiladi (test bor).
   | Level | Yangi ochiladigan nuqtalar | Hammasi | Joy soni |
   |---|---|---|---|
   | 1 | panjara, darvoza, yo'lak, darvoza yoni, old burchak (chap), old hovli (o'ng) | 6 | 2 |
   | 2 | yo'lak chiroqlari, eshik oldi, old hovli (chap), old burchak (o'ng) | 10 | 4 |
   | 3 | eshik oldi (o'ng) | 11 | 6 |
   | 4 | uy yoritilishi, tom, garaj oldi, orqa burchaklar | 16 | 10 |
   | 5 | — | 16 | 16 |
4. **Orqa burchaklar 4-leveldan ochiladi.** Ular 2–3-leveldagi uyga tegadi (test topdi), 4-levelda esa tegmaydi.
5. **Tanga paketlarida bonus alohida ko'rsatilmaydi**, kartada jami son yoziladi: 5 000 / 12 000 / 28 000.
6. **To'plam narxi chegirmasiz hisoblanadi** (asosiy narxlar yig'indisidan 20%). Arxivdagi tovarlar to'plamdan chiqarildi; ilgari ular to'plamni sotib bo'lmaydigan qilib qo'yardi.
7. **Chegirma.**
   - Ko'p tovarga birdaniga qo'yish mumkin. Muddati kesishgan ikkinchi chegirma rad etiladi.
   - Narx serverda hisoblanadi. Do'kondagi ko'rinish ~1 daqiqagacha kechikishi mumkin (umumiy nusxa), lekin xarid doim serverdagi aniq narxda.
   - Chegirmali narx ham shu yaxlitlash qoidasi bilan hisoblanadi.
8. **Chegirma boshlanganda kanalga yoki botga avtomatik e'lon qilinmadi** (promtda ixtiyoriy edi). Bu ommaviy, qaytarib bo'lmaydigan amal, shuning uchun hozircha yo'q. Kerak bo'lsa — keyingi qadamda tugma qilaman.
9. **"🔥" emoji o'rniga olov ikonkasi.** Saytda emoji ishlatmaslik qoidasi bor (test tekshiradi).
10. **"Yangi tovar"dagi modellar ro'yxati** — bazadagi tovarlarning modellari: arxivdagilar ham, `assets/decor` dagi hamma rasm ham shular. Blender'dan yangi model `npm run models` bilan katalogga qo'shilgach, shu ro'yxatda chiqadi.
11. **Premium tovarlar** endi admin → Bezaklar → "⭐ Premium" tabida (so'm narxi bilan, Stars shundan hisoblanadi); asosiy ro'yxatda so'm ustuni yo'q.
12. **To'plam narxida chegirma hisobga olinmaydi.** U asosiy narxlar yig'indisidan 20% bo'ladi. Shuning uchun alohida tovarga qo'yilgan chegirma to'plamni arzonlashtirmaydi.
13. **To'plamdan chiqarish.** 0038-migratsiya o'sha paytda sotuvda bo'lmagan tovarlarni to'plamdan chiqardi; ular aynan arxivdagi 13 ta edi. Keyin yashirib, yana ko'rsatilgan tovar to'plamga o'zi qaytmaydi: admin → tovar → Qo'shimcha → "To'plam ID" da qayta yoziladi.

## 17-qadam: Foto rejimi (2026-11-27)
1. **Post-processing kutubxonasi qo'shilmadi.** Three.js ichidagi tayyor qismlar ishlatildi (EffectComposer, tilt-shift shaderlari, UnrealBloom), yangi paket yo'q.
2. **Tungi Foto kadrida uy ustidagi niklar yashiriladi.** Aks holda bloom oq yorliqlarni oq dog'larga aylantiradi. O'z uyingiz kadrda bo'lsa, nikingiz rasm belgisida (@nik) chiqadi.
3. **Tunda derazalar va chiroqlar o'yindagidan ~1,9 baravar yorqinroq qilindi**, chunki kadrning umumiy yorqinligi pasaytirilgan (to'q ko'k osmon). Bu faqat Foto rejimida.
4. **Telegram'ning `shareToStory` funksiyasi ishlatilmadi.** U faylni emas, internetdagi havolani so'raydi, rasmni esa serverga yuklash kerak bo'lardi. Hozir "Ulashish" telefonning ulashish oynasini ochadi (Instagram ham shu yerda); imkoni bo'lmasa — fayl saqlanadi.
5. **Foto sozlamalari Foto rejimidan chiqqanda eslab qolinadi.** O'yindagi ko'rinish esa darhol odatiy holatga qaytadi (effektlar faqat Foto rejimida ishlaydi).
6. **Kuchsiz telefonda** jonli ko'rinishda maket effekti o'chiq bo'ladi, yakuniy kadrda esa yoqiladi. Xotira yetmasa kadr 1× aniqlikda olinadi; u ham bo'lmasa — "Suratga olib bo'lmadi" xabari.

## 16-qadam: Instagram postlari (2026-11-27)
1. **Kadrlar faqat saytning Foto rejimidan olindi** (siz shunday so'radingiz). Blender varianti va `01-1-blender.png` qilinmadi. Afzalligi: postdagi rasm saytdagidan farq qilmaydi.
2. **Niklar umumiy so'zlar bilan almashtirildi** (`sening_niking`, `qoshnim`, `dostim_uyi`…), faqat kadr olinayotgan brauzerda. Demo bazadagi `demo_0123` kabi niklar postga tushmaydi, haqiqiy odam nikiga o'xshash nik ham yo'q.
3. **Sarlavha ortida chalkashlik bo'lmasin deb**, niklar faqat nikka oid kadrlarda ko'rsatildi (mahalla, "Uy ustida sening niking", levellar, bezaklar).
4. **Bot ekrani (2-post)** HTML'da chizilgan telefon ramkasi. Matnlar haqiqiy botdagi bilan bir xil, faqat qisqartirilgan va emojisiz (slaydda emoji ishlatmaslik qoidasi).
5. **Sovg'alar shkalasi (9-post)** saytdagi bezak ikonkalari bilan (128 px — biroz kichik). Kattaroq ikonka kerak bo'lsa, Blender'da qayta render qilinadi (`npm run models`).
6. **Slaydlar gitda.** Sizning `9433aef` commit'ingiz ularni gitga qo'shgan edi, shuni saqlab qoldim (≈ 34 MB). Har qayta yig'ishda repozitoriy shuncha kattalashadi. Kerak bo'lsa, `.gitignore` ga olib qo'yish mumkin.
7. **`korinish.png` dagi tartib** 1 → 9 (chapdan o'ngga, tepadan pastga). Instagram'da eng oxirgi post tepada chap burchakda turadi. Shuning uchun 9-postdan boshlab teskari tartibda joylasangiz, profilda shu ko'rinish chiqadi.
