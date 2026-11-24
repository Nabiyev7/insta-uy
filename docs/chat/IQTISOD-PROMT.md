# Uy tarqatish, tanga iqtisodi va referal

> Egasi bilan kelishilgan (2026-11-23). Avval `PLAN.md` ni o'qi. Bu promtni `MARKAZ-PROMT.md` va `BEZAK-HARAKAT-PROMT.md` bajarilgandan keyin bajar.
> Oxirida: `npm test`, `npm run typecheck`, `npm run e2e`, "Holat" yangilanadi, git commit.

## Qarorlar
1. **Haqiqiy pul hozircha yo'q.** Hamma narsa **tanga (bonus)** bilan olinadi: uy leveli, bezak, villa/qasr uchastkasi, nik yorlig'i, ko'cha nomi. `payments_enabled=false` qoladi, to'lov kodi o'chirilmaydi (keyin yoqiladi).
2. **Tijorat joylari sotilmaydi:** B001–B170 (do'kon, ofis, bilbord) hammasi hozircha sotuvdan olinadi. Bazada qoladi, binolar ko'rinish uchun turadi. Saytda va admin panelda "sotuvda emas" holati.
3. **Faqat uylar** egalarga beriladi.

## 0. Kirish — Telegram majburiy
- **Shaharni ko'rish uchun kirish shart emas** (mehmon rejimi): kamera bilan aylanish, uylarni bosib ko'rish, qidiruv.
- **Har qanday harakat uchun Telegram shart:** uy olish, bezak, tanga, ovoz, chat, referal.
- Ro'yxatdan o'tish va kirish ekranida **katta asosiy tugma — "Telegram orqali kirish"**. Login+parol orqali ro'yxatdan o'tish olib tashlanadi. Mavjud login+parol akkauntlar (agar bo'lsa) Telegram ulamaguncha faqat ko'rish rejimida bo'ladi.
- **Instagram ichidagi brauzer muammosi:** odamlar asosan Instagram'dagi linkdan keladi. Telegram ochilganda o'sha brauzer yopilib qolishi mumkin. Shuning uchun bot tasdiqlagandan keyin foydalanuvchiga **bir martalik "Saytga qaytish" linkini** yuborsin. Bu link saytni allaqachon kirilgan holda ochsin (qisqa muddatli token, bir marta ishlaydi). Shu jarayonni Instagram in-app brauzerida, Android Chrome'da va iOS Safari'da e2e/qo'lda sinash kerak.
- Bot ochilganda qisqa salomlashish va 3 ta tugma: "Shaharni ochish", "Mening uyim", "Yangiliklar kanali".
- **Bot orqali:** shaxsiy bildirishnomalar (uyga ovoz, sovg'a, referal mukofoti, uy bo'shatilish ogohlantirishi), **so'rovnomalar** (admin paneldan yaratiladi: savol, 2–6 variant; natija admin panelda; ovoz bergan o'yinchiga ixtiyoriy tanga mukofoti), **xabar yuborish** (admin paneldan hammaga yoki bir tumanga; Telegram limitlariga moslab sekundiga ~25 xabardan ko'p emas, navbat bilan).
- Foydalanuvchi bildirishnomalarni o'chira oladi (faqat muhim xabarlar qoladi).
- **Yangiliklar** uchun alohida Telegram **kanal** ishlatiladi (bot emas). Admin paneldagi "haftalik gazeta" kanalga post sifatida yuborilishi mumkin bo'lsin (kanal ID sozlamada).

## 1. Bepul uy tarqatish
- **Birinchi 100 kishi** markazga eng yaqin bo'sh hovli/kvartiralardan oladi (maydon atrofidagi uchastkalar, masofa bo'yicha tartiblangan) va avtomatik **"Shahar asoschisi"** nishoni.
- 101-dan boshlab: navbatdagi ochiq tumandagi bo'sh joy, markazga yaqinidan uzoqqa qarab (PLAN §2.3). Odam bir nechta variantdan tanlashi mumkin (masalan eng yaqin 5 ta bo'sh joy).
- "Birinchi 100" hisobi serverda, bir vaqtda kelganlarda ham aniq (tranzaksiya/lock). 100 tugaganda saytda "Asoschilar joylari tugadi" ko'rinadi. 100 soni admin sozlamasida.
- **Bitta odam = bitta bepul uy.** Bepul uy olish uchun **Telegram ulangan bo'lishi shart** (1 Telegram akkaunt = 1 bepul uy). Bu soxta akkauntlarga qarshi asosiy himoya. Turnstile ham ishlaydi.

## 2. Tanga narxlari
- Hozirgi so'm narxlaridan tanga narxi chiqariladi: **tanga = so'm / 50** (mavjud bezak narxlari shu nisbatda). Masalan: level 2 → 300, level 10 → 6 000, villa uchastkasi → 3 000, qasr → 8 000 tanga.
- **Hozircha uyni faqat 3-levelgacha ko'tarish mumkin** (admin sozlamasi `maxTier = 3`, tanga bilan ham). 4–10-level modellari keyin qayta ko'rib chiqiladi, so'ng chegara admin paneldan oshiriladi. Saytda 4+ level "Tez kunda" deb ko'rinadi.
- Hamma narx admin panelda o'zgartiriladi.

## 3. Tanga topish
| Qayerdan | Boshlang'ich qiymat (admin o'zgartiradi) |
|---|---|
| Ro'yxatdan o'tib Telegram ulash | 200 |
| Kunlik kirish | 50; ketma-ket 7-kun 300 |
| Kunlik/haftalik topshiriqlar (mavjud) | hozirgidek |
| Referal — taklif qilgan odamga | 500 |
| Referal — taklif bilan kelgan odamga | 200 |
| "Haftaning hovlisi" g'olibi | 1 000 |

## 4. Referal
- Har bir o'yinchida shaxsiy link (mavjud taklif tizimi) va hisoblagich.
- Mukofot taklif bilan kelgan odam **Telegram ulab, bepul uy olgan zahoti** beriladi. **Hech qanday vaqt sharti yo'q** (kun kutish, necha kun kirish, oylik limit — yo'q).
- O'ziga o'zi taklif qilish mumkin emas: bir Telegram akkaunt yoki bir qurilma bo'lsa, mukofot berilmaydi.
- Reyting: "Eng ko'p odam taklif qilganlar". Eng ko'p taklif qilganlarga nishon ("Elchi"): 10, 50, 100 taklif uchun.

## 5. Inflyatsiyaga qarshi
- Admin panelda: jami chiqarilgan va sarflangan tanga statistikasi (kunlik grafik).
- Barcha mukofot va narxlar bitta "Iqtisod" sozlamalari sahifasida.
- Hamma operatsiya serverda, tanga balansi mijozda o'zgartirilmaydi (bu allaqachon PLAN §9 da).

## 6. Zaxira nusxani Telegram'ga yuborish
- Hozirgi kunlik zaxira (`server/src/cron.ts` → `backup`, Supabase Storage `backups`) qoladi.
- Qo'shimcha: shu JSON fayl har kuni **admin(lar)ning shaxsiy Telegram'iga** bot orqali hujjat sifatida yuborilsin (Supabase'dan tashqarida ham nusxa bo'lsin). Qabul qiluvchi Telegram ID'lar admin sozlamasida.
- Fayl 45 MB dan katta bo'lsa (bot cheklovi 50 MB) gzip bilan siqilsin; baribir katta bo'lsa — bo'laklarga bo'linsin va adminga ogohlantirish yuborilsin.
- Yuborish muvaffaqiyatsiz bo'lsa — Sentry'ga xato va keyingi cron'da qayta urinish.
- Admin panelda "Zaxiradan tiklash" bo'yicha qisqa yo'riqnoma (README'ga ham): Telegram'dagi fayldan bazani qanday tiklash.
- Sinov: zaxira yaratiladi, siqiladi, (sinov rejimida) Telegram API chaqiruvi to'g'ri yuboriladi.

## 7. Boshqa qarorlar
- **Tashlab ketilgan uylar:** egasi **3 oy** kirmasa, bepul uy bo'shatiladi (admin sozlamasi, mavjud mexanizm). Bo'shatishdan **2 hafta oldin** Telegram bot orqali ogohlantirish ("Uyingiz 14 kundan keyin bo'shatiladi — saytga kiring"). Nishonlar (masalan "Shahar asoschisi") odamda qoladi, uy esa yangi egaga beriladi.
- **Ko'cha nomlari:** oddiy ko'chalar — mavjud ovoz berish tizimi (PLAN §5). **Markaziy ko'chalar** (maydonga tutashgan va prospektlar) nomi **tangaga** sotiladi, admin tasdig'idan keyin. Narxi admin sozlamasida (boshlang'ich: 4 000 tanga). Pul bilan sotish o'chiq.
- **Kvartiralar** hozircha o'zgarmaydi.
- **Moderatsiya:** hozircha admin o'zi. Mavjud moderator roli ishlaydigan holatda qolsin (keyin yordamchiga beriladi) — tekshirib qo'y.
- **Kutish ro'yxati Telegram orqali:** `kutish.html` sahifasida asosiy tugma — "Ochilganda xabar ber" → botga o'tadi, bot odamni ro'yxatga yozadi. Admin panelda ro'yxat soni va "Ochildi — hammaga xabar yuborish" tugmasi (navbat bilan, Telegram limitlariga mos).
- **Qoidalar va maxfiylik matni** (`apps/web/src/ui/legal.ts`, uz + ru) yangilansin: haqiqiy pul hozircha yo'q, tanga — virtual, pulga almashtirilmaydi; Telegram orqali kirish va qanday ma'lumot saqlanadi (Telegram ID, nik, Instagram nik); 3 oylik qoida; akkauntni o'chirish; shaxsiy xabar yo'qligi; ma'lumot qayerda saqlanadi (Supabase, server mintaqasi). Matn sodda bo'lsin; oxirida "huquqshunos ko'rib chiqishi kerak" degan izoh faqat kodda (saytda emas).

## Qabul
- 100 ta bir vaqtdagi ro'yxatdan o'tishni simulyatsiya qiluvchi sinov: aynan 100 kishi asoschi bo'ladi, hech qaysi uy ikki kishiga berilmaydi.
- Referal sinovlari: Telegram/uy bo'lmasa mukofot yo'q, bo'lsa darhol beriladi; o'ziga taklif ishlamaydi; vaqtga bog'liq cheklov yo'q.
- Sayt va admin panelda "pul bilan sotib olish" tugmalari ko'rinmaydi.
