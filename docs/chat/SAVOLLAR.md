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
