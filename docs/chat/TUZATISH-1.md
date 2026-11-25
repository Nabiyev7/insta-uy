# Tuzatish 1 — sinovda topilganlar (2026-11-25)

> 6-qadam (A–F) tugagach, 12-qadamdan (internet) **oldin** bajariladi. Kichik ish: bitta commit, tekshiruvchi.

## 1. Qurilish tabrigi boshqa oynani yopib qo'yadi (xato)
`apps/web/src/app/actions.ts` → `startConstruction`: 3,8 s lik `setTimeout` bekor qilinmaydi. Odam shu orada Do'kon/Hovli oynasini ochsa, tabrik uni yopib ustiga chiqadi.
- Tabrik **ochiq oynani hech qachon yopmasin**: agar shu paytda boshqa oyna ochiq bo'lsa — tabrik **pastki karta** sifatida navbatga tushsin (`logic/cards.ts`), oyna yopilgach ko'rinadi. Oyna yo'q bo'lsa — hozirgidek darhol.
- Taymer bitta joyda saqlansin: yangi `startConstruction` chaqirilsa yoki rejim almashsa eskisi bekor qilinsin (ikki tabrik ketma-ket chiqmasin).
- Uy qurilishi effekti (kamera, ko'tarilish, chang) o'zgarmaydi.
- Test: qurilish boshlanadi → 1 s da Do'kon ochiladi → 4 s dan keyin Do'kon hali ochiq, tabrik kartada.

## 2. Piyoda rejimida to'siqqa qarab paydo bo'lish
`apps/web/src/app/modes.ts` → `spawnPlayer`: odamcha kamera markazida, kamera yo'nalishiga qarab chiqadi; oldida favvora/devor bo'lsa "W" bosilganda tiqilib qoladi.
- Paydo bo'lish nuqtasi **ochiq joyda** bo'lsin (yo'lak, ko'cha, maydon — bino, favvora, daraxt, bezak ichida emas) va odamcha **oldida kamida 8 m bo'sh yo'l** bor tomonga qarasin (8 ta yo'nalishni sinab, kamera yo'nalishiga eng yaqin bo'shini tanla).
- Kirgan va uyi bor odam shahar markazida (0, 0 atrofida) "Piyoda" ni bossa — hozirgidek ko'rinayotgan joyda, faqat yuqoridagi qoida bilan.
- Mashina rejimi (`spawnCar`) uchun ham shu tekshiruv: mashina yo'lda va oldi bo'sh.
- Test: (0, 0) — favvora oldidan, uy darvozasi oldidan, daraxt yonidan piyodaga o'tish → 1 s "oldinga" bosilganda odamcha ≥ 3 m yuradi.

## 3. Lokal muhitda "Obunani tekshirish" 503 beradi (xato emas)
Lokalda `TELEGRAM_TOKEN` yo'q, shuning uchun `telegram_off`. Internetda ishlaydi. Faqat:
- 503 kelganda tugma ostida tushunarli matn: "Hozir tekshirib bo'lmadi, keyinroq urinib ko'ring" (uz + ru), xom xato kodi ko'rinmasin.
- `npm run dev` da (faqat lokal) soxta tekshiruv: `DEV_CHANNEL_OK=1` bo'lsa obuna "bor" deb qaytsin — sinash uchun. Ishlab chiqarishga tushmasin.

## 4. Chala qolgan tarjima
`YardEditor.tsx` dagi `t('paidAnyLevel')` — `i18n.ts` da uz va ru matni bo'lsin. Umuman: kodda ishlatilgan **har bir** `t('…')` kaliti ikkala tilda borligini tekshiradigan test qo'sh (yo'q bo'lsa — test yiqiladi).

## 5. Login + parol — o'chiriladi, lekin kodda qoladi (egasi, 2026-11-25)
6-qadam B qismida (`e0e0ee1`) parol bilan ro'yxat, kirish, parol tiklash va captcha **butunlay o'chirilgan**. Egasi: kirish hozir **faqat Telegram bot orqali**, lekin parol yo'li keyin kerak bo'lishi mumkin — kodda qolsin.
- O'chirilgan qismlarni git'dan (`e0e0ee1^`) qaytar: server (`/auth/register`, parol tiklash), `Captcha.tsx`, `AuthPanel` dagi parol shakli, sinovlari.
- Egasi: hozir yopiq, **sayt yaxshi ishlay boshlagach to'liq qaytadi** (ro'yxat + kirish + tiklash). Shuning uchun hammasi to'liq ishlaydigan holatda saqlansin.
- Hammasi bitta admin sozlamasi ortida: `password_login` (sukut bo'yicha **false**). `false` bo'lsa — saytda parol maydoni, "Ro'yxatdan o'tish", "Parolni unutdim" **umuman ko'rinmaydi**; server endpointlari 403 qaytaradi (sozlama serverda tekshiriladi, faqat UI'da emas). `true` bo'lsa — eski holatdagidek ishlaydi (Turnstile bilan).
- Admin → Sozlamalar'da shu tugma, yonida izoh: "Yoqilsa, odamlar Telegram'siz ham kira oladi".
- Mavjud parolli akkauntlar (`password_login=false` da) — hozirgidek faqat ko'rish rejimi, Telegram ulash taklifi bilan.
- Testlar ikkala holat uchun: false — endpoint 403, UI'da parol maydoni yo'q; true — ro'yxat va kirish ishlaydi.

## 6. Premium uy — hozircha yo'q (egasi, 2026-11-25)
6-qadam E dagi "premium uy" (pulga uchastka + darhol level) **sotuvdan olinadi**: saytda, botda, do'konda va admin panelda ko'rinmaydi, server buyurtma qabul qilmaydi (`premium_house_enabled=false`). Kod **o'chirilmaydi** — bayroqcha ortida yashiriladi (egasi). Keyin egasi bilan qayta loyihalanadi, **narxlarni egasi o'zi belgilaydi** (`KEYINGI.md`); hozirgi `premium.house` / `typeAdd` narxlari ishlatilmaydi. Tanga paketlari, pulli bezaklar va salyut qoladi.

## 7. Tanga paketlari — arzonroq va Stars'ga mos (egasi, 2026-11-25)
`settings.premium.packs` yangi qiymatlari (1 ⭐ ≈ 200 so'm, `starsRate` o'zgarmaydi; Stars narxi alohida maydon `stars` bo'lsin — kurs bilan hisoblanmasin, chiroyli yaxlit son tursin):
| Paket | Tanga | Bonus | Jami | So'm | Stars |
|---|---|---|---|---|---|
| 1 | 500 | — | 500 | 3 000 | — (faqat karta) |
| 2 | 1 000 | +200 | 1 200 | 6 000 | — (faqat karta) |
| 3 | 2 500 | +500 | 3 000 | 12 000 | 60 ⭐ |
| 4 | 5 500 | +1 500 | 7 000 | 25 000 | 125 ⭐ |
| 5 | 12 000 | +4 000 | 16 000 | 50 000 | 250 ⭐ |
- **1- va 2-paket Stars'da sotilmaydi** (`stars: null`): Telegram'da eng kichik Stars paketi 50 ⭐, odam 15–30 ⭐ uchun ~12 000 so'm to'lab qo'yadi. Bot do'konida bu paketlar ko'rinmaydi; saytda ular faqat "Karta" tugmasi bilan. Stars narxi bo'sh paketga Stars invoice yaratib bo'lmasin (serverda tekshir, test).
- **Umumiy qoida (bezak, salyut va boshqa hamma Stars xaridi):** Stars narxi **kamida 50 ⭐**. Kurs bo'yicha 50 ⭐ dan kam chiqadigan tovar Stars'da sotilmaydi — bot do'konida ko'rinmaydi, saytda faqat karta va tanga bilan. Chegara admin sozlamasida (`premium.starsMin = 50`). Test bilan tekshir.
- Migratsiya bilan yangila (eski 4 ta paket o'rniga 5 ta). Saytda va bot do'konida eng foydali paketda "Eng foydali" belgisi (5-paket), 4-paketda "Ommabop".
- Admin "Iqtisod" sahifasida paketlarni qo'shish/o'chirish/narxini o'zgartirish (so'm va Stars alohida).

## 8. Admin uchun sinov rejimi — hech qanday cheklov yo'q (egasi, 2026-11-25)
Egasi saytni o'zi to'liq sinashi kerak. `role='admin'` akkauntda **"Sinov rejimi"** (sukut bo'yicha yoqiq; Uyim → Sozlamalar'da almashtiriladi — o'chirsa oddiy odam ko'rinishida tekshiradi). Yoqiq bo'lsa:
- **Level cheklovi yo'q:** har qanday bezak (lyuks ham) istalgan leveldagi uyga; uyni 1–5 istalgan levelga darhol.
- **Tanga yechilmaydi** (narx ko'rinadi, "Sinov — bepul" yozuvi bilan); kunlik limitlar (xazina, o'tkazma, chastota) yo'q.
- **Pulli narsalar to'lovsiz:** tanga paketi, pulli bezak, salyut — "Sinov xaridi" tugmasi, `payments` jadvaliga `is_test=true` bilan yoziladi, daromad statistikasiga kirmaydi.
- **Uy olish:** yopiq tumanlar, villa/qasr/kvartira uchastkalari, bir nechta bepul uy.
- Hammasi **serverda** tekshiriladi (rol + bayroqcha), mijozga ishonilmaydi; oddiy foydalanuvchida hech narsa o'zgarmaydi (testlar bilan isbotla).
- Admin sinov uylari va bezaklari **hammaga oddiy uy kabi ko'rinadi** (uchastka band bo'ladi); "SINOV" belgisi faqat adminga ko'rinadi (egasi).
- Admin yaratgan hamma narsa `is_test` belgili. Admin panelda **"Sinov ma'lumotlarini tozalash"** tugmasi (tasdiq bilan): admin sinov uylari, bezaklari, buyurtmalari o'chadi, uchastkalar bo'shaydi — ochilishdan oldin bosiladi. Admin uy ustida kichik "SINOV" belgisi (faqat adminga ko'rinadi).

## 9. Admin qanday kiradi
- **Internetda:** sayt — hamma kabi bot orqali (`/start` → nik → havola). `ADMIN_TELEGRAM_ID` dagi Telegram akkaunt birinchi kirishdayoq **avtomatik admin** bo'ladi (SQL kerak emas; README 6-bandini shunga moslab yangila). Admin panel — botga `/admin` → 15 daqiqalik bir martalik havola (hozirgidek).
- **Lokalda (kompyuterda sinash):** bot ishlamaydi, shuning uchun faqat `DEV=1` da kirish oynasida **"Admin sifatida kirish (lokal)"** tugmasi — bosilsa admin akkauntiga kiradi. Ishlab chiqarish yig'ilishida bu tugma va uning endpointi umuman yo'q (test bilan tekshir).

## Qabul sharti
- Yuqoridagi testlar, `npm test`, `npm run typecheck`, `npm run e2e` o'tadi; tekshiruvchi ✅.
- `PLAN.md` "Holat", commit: `fix: tuzatish 1 — tabrik oynani yopmaydi, piyoda ochiq joyda, kanal xabari, tarjima testi, parol yo'li bayroqcha ortida, premium uy olib tashlandi, yangi paketlar, admin sinov rejimi`.
