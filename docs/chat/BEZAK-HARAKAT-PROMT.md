# Harakat, transport va bezaklar tizimi

> Egasi bilan kelishilgan (2026-11-23). Avval `PLAN.md` ni o'qi. `MARKAZ-PROMT.md` alohida topshiriq. Agar u hali bajarilmagan bo'lsa, avval uni tugat.
> Ish **3 bosqichda**, har bosqichdan keyin: `npm test`, `npm run typecheck`, `node e2e/perf.mjs`, "Holat"ni yangilash va git commit.

## Umumiy qarorlar
- **Uslub umumiy, universal** — Farg'onaga yoki bir hududga bog'lanmaydi. Bezaklarning asosiy qismi zamonaviy/universal; milliy narsalar (so'ri, tandir, tok) do'kondagi tanlovlardan faqat bir qismi. `PLAN.md` §3 dagi uslub qatorini shunga moslab yangila.
- Odamlar **faqat uyning tashqi ko'rinishini** bezaydi, ichki bezatish yo'q.
- **Qulf saqlanadi:** uchastka joyi va o'lchami o'zgarmaydi. Bezak hech qachon uchastka chegarasidan chiqmaydi.
- Faqat **uylar** sotiladi. Markazdagi baland binolar hozircha faqat ko'rinish uchun.
- Arzon telefon (Redmi A) — asosiy chegara. Har bosqichda FPS tekshirilsin.

---

## 1-bosqich: Shaharni ko'rish rejimi va transport

### 1.1 Boshlang'ich rejim — "Shahar" (erkin kamera)
Sayt ochilganda odamcha **yo'q**, shaharni tepadan kamera bilan tez ko'rib yuriladi.
- Telefon: bir barmoq bilan surish — siljish, ikki barmoq bilan chimchilash — yaqinlashish/uzoqlashish, ikki barmoq bilan aylantirish — burilish.
- Kompyuter: sichqoncha bilan sudrash yoki WASD — siljish, g'ildirak — zoom, o'ng tugma — burilish.
- Kamera balandligi chegaralangan: eng pastda ~15 m, eng yuqorida shunday balandlikki, tuman yaqin atrofdagi 3–4 mahallani ko'rsatsin (butun 2×2 km birdan emas, telefon uchun). Shahar chegarasidan tashqariga chiqilmaydi.
- Uyni bosish → kamera silliq uchib boradi va uy oynasi ochiladi (egasi, Instagram, bezaklar).
- Mini-xaritani bosish → kamera o'sha joyga uchadi. Qidiruv (nik) ham kamerani uchiradi.
- Tepadan ko'rganda: uzoqdagi uylar LOD, mayda bezaklar, odamlar va mashinalar yashiriladi. Yuqori balandlikda soyalar yo'q.

### 1.2 "Piyoda" rejimi (tugma orqali)
- Ekranda **"Piyoda yurish"** tugmasi: odamcha kamera qaragan joyda (yoki "Mening uyim" yonida) paydo bo'ladi, hozirgi 3-shaxs boshqaruv ishlaydi (joystick / WASD).
- **"Shaharga qaytish"** tugmasi bosilsa, erkin kameraga qaytadi.
- Bu rejim uyni yaqindan ko'rish va boshqa o'yinchilar bilan uchrashish uchun.

### 1.3 "Mashinada" rejimi
- **"Mashina"** tugmasi: odamcha mashinaga o'tiradi, tezligi piyodadan ~4–5 barobar ko'p.
- Hammaga **bepul oddiy mashina** beriladi. Bezak do'konidan sotib olingan mashina (sedan, furgon, sport) ham **haydaladi** — sotib olishga sabab bo'ladi. Mashina tanlash ro'yxati.
- Boshqaruv: telefonda chap joystick (rul + gaz), tormoz tugmasi; kompyuterda WASD. Oddiy arkada fizikasi: binolar, panjaralar va daraxtlarga urilib to'xtaydi (`PLAZA_SOLIDS` va uy to'qnashuvlari ishlatiladi). Yo'ldan chiqib maysadan ham yurish mumkin, lekin uchastka ichiga kirib bo'lmaydi.
- Kamera mashina orqasidan yuradi, tezlik oshganda biroz uzoqlashadi.
- Ko'p o'yinchida boshqa o'yinchilar mashinada ko'rinadi.
- Yangi model kerak bo'lsa ham, mavjud mashina modellaridan foydalan. Yangi transport keyin qo'shiladi (velosiped, skuter, avtobus — hozir emas).

### 1.4 Ekran joylashuvi (telefon birinchi)
**Asosiy qoida: elementlar bir-biriga tegmaydi va ekran o'rtasini to'smaydi.** Hamma narsa faqat chetlarda. Telefon "kesik"i va pastki tizim chizig'i uchun `safe-area-inset` hisobga olinadi. Eng kichik ekran (360 × 640) va gorizontal holatda tekshirilsin.

- **Yuqori qator** (bitta qator): chapda — joy nomi (mahalla/ko'cha, bosilsa ko'cha oynasi); o'ngda — tanga soni (bosilsa tanga oynasi, kunlik bonus bo'lsa nuqta belgisi) va menyu (≡: gazeta, saylov, umumiy loyihalar, qoidalar, yordam, sozlamalar, til).
- **Rejim tugmalari** (pastki panel ustida, kichik bir qator): Shahar · Piyoda · Mashina. Faol rejim ajralib turadi.
- **Pastki panel** (5 tugma): **Xarita** (mini-xarita ekrandan olib tashlanadi; bosilsa to'liq xarita + nik bo'yicha qidiruv), **Chat** (ustida doim yashil nuqta va **onlayn odamlar soni**), **Do'kon**, **Reyting**, **Uyim** (kirmagan bo'lsa — "Telegram orqali kirish").
- **Joystick** faqat Piyoda/Mashina rejimida, pastki chap burchakda (panel ustida). Mashinada o'ng tomonda tormoz.
- **Kayfiyat (salom, raqs, o'tirish) va foto** faqat Piyoda rejimida, pastki o'ng burchakda kichik tugmalar.
- **Shahar rejimida** ekranda faqat yuqori qator, rejim tugmalari va pastki panel bo'ladi.

### 1.5 Chat
- Chat tugmasi ekranning pastki yarmida oyna (bottom sheet) ochadi, yuqorida shahar ko'rinib turadi. Uchta bo'lim:
  - **Umumiy** — butun shahar.
  - **Mahalla** — har tumanning o'z chati; o'qishni hamma o'qiydi, yozishni faqat o'sha tumanda uyi borlar yozadi. Sukut bo'yicha o'yinchi turgan (yoki uyi bor) tuman ochiladi.
  - **Onlayn** — hozir saytdagilar ro'yxati (nik, qaysi tumanda). Nik bosilsa kamera o'sha odamga uchadi.
- **Yangi akkauntlar uchun ham, chatda ham vaqt cheklovi yo'q:** ro'yxatdan o'tgan zahoti yoza oladi, "sekin rejim" (N soniyada 1 xabar) sukut bo'yicha **o'chiq**. Agar mavjud kodda shunday cheklovlar bo'lsa — olib tashlansin. Faqat admin panelda favqulodda holat uchun "sekin rejim" tugmasi qolsin (sukut bo'yicha o'chiq).
- Himoya vaqt bilan emas, shular bilan: Telegram majburiy (spamchi akkaunt ochishi qiyin), so'z filtri, chatda havolalar taqiqlanadi, shikoyat tugmasi, "jim qilish" (odamning xabarlarini faqat o'zingiz uchun yashirish), admin/moderator xabarni o'chirishi va akkauntni bloklashi.
- Mavjud so'z filtri, shikoyat va moderatsiya ishlaydi. Chat yopiq bo'lsa ekranda xabar chiqmaydi (faqat tugmada yangi xabar belgisi).

### 1.6 Qo'shimchalar
- **Ekranni tozalash tugmasi:** bitta bosish bilan hamma UI yashirinadi (faqat shahar ko'rinadi, foto/video uchun); ekranga istalgan joyga bosish yoki kichik "ko'z" tugmasi bilan qaytadi.
- **Shaxsiy xabar yo'q:** o'yinchilar bir-biriga yopiq xabar yoza olmaydi, faqat ochiq chat (Umumiy/Mahalla). Kodda shaxsiy xabar bo'lsa — olib tashlansin. Sabab: yosh cheklovi yo'q, bolalar xavfsizligi.
- **Akkauntni o'chirish:** "Uyim → Sozlamalar" da ko'rinadigan tugma. Tasdiqlashdan keyin profil, chat xabarlari va shaxsiy ma'lumotlar o'chiriladi, uy bo'shatiladi (Telegram bilan bog'lanish ham uziladi). Zaxira nusxalarda qolgan ma'lumot maxfiylik siyosatida aytilgan muddatdan keyin yo'qoladi — `legal.ts` ga shu haqida qator qo'shilsin. Mavjud o'chirish funksiyasi bo'lsa, shuni ko'rinadigan joyga chiqar.

### 1.7 Qabul
- Uch rejim o'rtasida o'tish 1 soniyadan tez. Ochilish ekranidagi qisqa yo'riqnoma yangi boshqaruvga moslansin (uz + ru).
- `perf.mjs` da eng yuqori kamera holatida ham past sifatda 30+ FPS mo'ljali saqlansin.

---

## 2-bosqich: Bezaklar tizimi

### 2.1 Katalog bazaga o'tadi
- `catalog.ts` dagi `DECOR` ro'yxati bazaga o'tadi (yangi migratsiya, masalan `decor_items`): `id, model_id, slot, name_uz, name_ru, price_uzs, price_coins, stock, min_level, season_from, season_to, set_id, is_new, active, sort`. Mavjud 25 ta bezak seed bo'ladi (id'lar o'zgarmaydi, eski xaridlar buzilmaydi).
- Admin panelda: bezak qo'shish/tahrirlash/yashirish, narx, soni, min level, mavsum sanalari, "Yangi" belgisi. Yangi **3D model** baribir kod orqali qo'shiladi (`kit_props.py`), admin faqat mavjud modeldan yangi tovar yarata oladi (masalan boshqa rang/narx).
- RLS yopiq, o'qish `api_*`, o'zgartirish `admin_*`. Xarid faqat serverda tasdiqlanadi (pul/tanga, level, soni, mavsum).

### 2.2 Level → bezak joylari
| Level | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| Bezak joyi (max) | 3 | 4 | 5 | 6 | 8 | 10 | 12 | 14 | 17 | 20 |
- Raqamlar admin sozlamasida o'zgartiriladi (lekin 20 dan oshmasin, telefon uchun).
- Leveldan "tekin" keladigan hovli bezaklari (`LEVEL_YARD`) bu hisobga kirmaydi.
- Har uchastka turi (hovli, villa, qasr) uchun **oldindan belgilangan joy nuqtalari** (anchor) bo'ladi: oldingi hovli, orqa hovli, darvoza yoni, devor bo'yi, tom va hokazo. Nuqtalar uchastka ichida, uyga va bir-biriga tegmaydi. Level oshgani sari yangi nuqtalar ochiladi. Egasi bezakni bo'sh nuqtaga qo'yadi va keyin bezakni boshqa nuqtaga ko'chira oladi.
- Har bir bezak uchun qaysi nuqta turlariga qo'yish mumkinligi belgilanadi (masalan hovuz faqat katta nuqtaga).

### 2.3 Level bilan ochiladigan bezaklar
- `min_level`: masalan oltin darvoza 7 dan, hovuz 5 dan. Do'konda yopiq tovar qulf belgisi bilan va "X-levelda ochiladi" yozuvi bilan ko'rinadi.

### 2.4 Tashqi ko'rinishni sozlash
- Bor: devor va tom rangi. Qo'shiladi: **devor materiali** (suvoq, g'isht, tosh, yog'och — mavjud teksturalar), **deraza ramkasi rangi**, **eshik rangi**.
- **Nik lavhasi** darvozada (egasining niki yozilgan taxta, so'z filtri orqali). Arzon bezak.

### 2.5 Qabul
- Eski ma'lumotlar ko'chiriladi, mavjud bezaklar yo'qolmaydi.
- Bezak hech qachon uchastkadan chiqmaydi (test bilan).
- 20 bezakli 50 ta uy turgan sahnada past sifatda FPS sezilarli tushmasin. Uzoqdagi uylarda mayda bezaklar ko'rsatilmasin.

---

## 3-bosqich: Yangi bezaklar va sotuv funksiyalari

### 3.1 Yangi modellar (har biri ≤ 300 uchburchak, mavjud 16 tekstura, jami fayl +300 KB gacha)
- Umumiy/zamonaviy (asosiy qism): besedka, mangal, batut, basketbol halqasi, quyosh panellari (tomga), garaj, hamak, bolalar maydonchasi, it uyi, bog' soyaboni, velosiped, pochta qutisi.
- Milliy (ixtiyoriy, kichik qism): tandir (ustida tutun), so'ri, tokzor.
- Daraxtlar: o'rik, olma, tut, behi.
- Hayvonlar: qo'y, tovuqlar, ot, kaptarxona.
- Narxlarni o'zing taklif qil (mavjud narxlar mantiqida), admin keyin o'zgartiradi.

### 3.2 Sotuv funksiyalari
- **Mavsumiy bezaklar:** `season_from/to` oralig'idan tashqarida sotilmaydi, sotib olingani qoladi. Boshlang'ich: Navro'z (sumalak qozoni), Yangi yil (chiroqlar, archa), Hayit (fonarlar).
- **Noyob raqamlangan bezaklar:** har nusxa raqamga ega ("Tovus №3 / 10"), uy oynasida ko'rinadi.
- **To'plamlar:** bir nechta bezak birga, chegirma bilan (`set_id`). Masalan "Dam olish to'plami": besedka + mangal + hamak + gulzor.
- **Sinab ko'rish:** sotib olishdan oldin bezak o'z hovlisida vaqtincha ko'rinadi (faqat o'zida, saqlanmaydi).
- **Sovg'a:** bezakni boshqa o'yinchiga sovg'a qilish (nik bo'yicha, bildirishnoma bilan).
- **"Yangi" belgisi** va do'konda "Yangi tovarlar" bo'limi. Yangi tovar qo'shilganda Telegram bot orqali xabar (ixtiyoriy, o'chirsa bo'ladi).
- **Haftaning eng chiroyli hovlisi:** har o'yinchi haftada 1 ta ovoz beradi (o'ziga emas). G'olib nishon oladi va admin paneldagi video navbatiga avtomatik reels sifatida qo'shiladi.

### 3.3 Qabul
- Hamma narx/son/vaqt tekshiruvi serverda.
- Mavjud sinovlar + yangi funksiyalar uchun sinovlar.
- `npm run showcase` da yangi bezaklar ko'rsatilsin.
