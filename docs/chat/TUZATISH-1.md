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
- Hammasi bitta admin sozlamasi ortida: `password_login` (sukut bo'yicha **false**). `false` bo'lsa — saytda parol maydoni, "Ro'yxatdan o'tish", "Parolni unutdim" **umuman ko'rinmaydi**; server endpointlari 403 qaytaradi (sozlama serverda tekshiriladi, faqat UI'da emas). `true` bo'lsa — eski holatdagidek ishlaydi (Turnstile bilan).
- Admin → Sozlamalar'da shu tugma, yonida izoh: "Yoqilsa, odamlar Telegram'siz ham kira oladi".
- Mavjud parolli akkauntlar (`password_login=false` da) — hozirgidek faqat ko'rish rejimi, Telegram ulash taklifi bilan.
- Testlar ikkala holat uchun: false — endpoint 403, UI'da parol maydoni yo'q; true — ro'yxat va kirish ishlaydi.

## Qabul sharti
- Yuqoridagi testlar, `npm test`, `npm run typecheck`, `npm run e2e` o'tadi; tekshiruvchi ✅.
- `PLAN.md` "Holat", commit: `fix: tuzatish 1 — tabrik oynani yopmaydi, piyoda ochiq joyda, kanal xabari, tarjima testi, parol yo'li bayroqcha ortida`.
