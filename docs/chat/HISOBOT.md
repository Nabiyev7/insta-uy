# Hisobot (2026-11-24)

## 8-qadam — shahar qurildi (CityLand UZ)
To'rt markaz, yashil bulvarlar, halqa va diagonal yo'llar; yangi yorug' uslub; kasalxona, masjid, o't o'chirish, teatr, univermag, bozor. Reja qulflangan.

## 9-qadam — bo'sh uchastkalar, uylar 1–5, bezaklar
- Shahar uysiz ochiladi. Bo'sh joyda maysa, bordyur, daraxt va "Bo'sh joy — oling!" taxtachasi. Bosilsa — manzil va "Shu yerda uy qurish".
- Uy olinganda kamera uchadi, uy yerdan ko'tariladi, chang chiqadi, keyin "Tabriklaymiz" oynasi va uy ustida nik.
- 2- va 3-level tuzatildi, 4- va 5-level namunadagidek yasaldi (5 — ikki qavatli). Hammasi to'rt tomondan oynali.
- 15 ta yangi bezak; bezaklar faqat 5-leveldan; joy nuqtalari uyga, yo'lakka va bir-biriga tegmaydi (test bor).
- Tezlik: oldingidan 20–40% tezroq (batafsil `PERF.md`).

## 10-qadam — lyuks bezaklar
- 9 ta lyuks bezak: pavilyon, gril oshxona, lyuks basseyn + jakuzi, marmar favvora, fransuz bog'i, limuzin, superkar, lyuks jip, tuvakdagi daraxt. Faqat 7-leveldan; 5–6-levelda qulf.
- Uchta mashina haydaladi. Kechasi chiroqlar va suv yonadi. Uyga va bir-biriga tegmasligi testda.

## 11-qadam — yangi interfeys
- Namunadagi ko'rinish: yengil oq panellar, o'ng ustunda rejimlar, o'rtada sariq tugma, pastda bitta karta.
- Hamma eski funksiya joyini topdi: menyu 3 guruhda, Uyim bo'limlari, qo'ng'iroqda xabarlar, do'konda 9 tab va haqiqiy 3D rasmlar.
- Orqaga tugmasi ishlaydi; kirgandan keyin o'sha joyga qaytadi; tun rejimi, chap qo'l, internet yo'q xabari.
- Sinov: 3 ekran o'lchami × 2 til, har tugma va har oyna (60 oqim).

Hal qilinmagan savollar: `SAVOLLAR.md` (8–11-qadam bo'limlari). Haqiqiy Redmi A telefonda hali sinalmagan.

## 6-qadam — kirish bot orqali, uy olish, tanga, premium (2026-11-25)
- **Tozalash:** uy levellari 1–5 (5-level ikki qavat), katta "Kuchaytirish" tugmasi. Uy va avatar ranglari, shikoyat va nik tasdig'i olib tashlandi.
- **Kirish faqat Telegram bot orqali:** bot nikni so'raydi va bir martalik havola yuboradi (15 daqiqa amal qiladi). Parol va ro'yxat formasi yo'q.
  - Nikni faqat admin o'zgartiradi.
  - Admin panelga kirish ham bot orqali: botga `/admin` yoziladi.
  - Bot nomi hali kiritilmagan, shuning uchun tugmada "Tez kunda" turibdi.
- **Uy olish:**
  - Har kimga 1 ta bepul uy.
  - Birinchi 100 kishi — "Shahar asoschisi" (bir vaqtda kelsa ham aniq 100).
  - 3 oy kirmagan odamning bepul uyi bo'shaydi; bot 2 hafta oldin ogohlantiradi.
- **Tanga:**
  - Topish yo'llari:
    - asoschi — 1 000;
    - har kuni kirish — 100 (7-kuni +300);
    - kanalga obuna — 300;
    - do'st taklifi — 500;
    - "Haftaning hovlisi" — 2 000;
    - xazina — 50 (kuniga 3 ta).
  - Topshiriqlar olib tashlandi.
  - Tanga o'tkazish mumkin: kuniga 500 gacha yuborish, 1 000 gacha olish.
  - Admin panelda "Iqtisod" sahifasi qo'shildi.
- **Premium (kod tayyor, to'lov o'chiq):**
  - Sotuvga tayyor: tanga paketlari, darhol 1–5-level premium uy, pulga bezak (1-level uyga ham), salyut.
  - To'lov usullari: Telegram Stars (botdagi "Do'kon") va karta.
  - Pulni qaytarish admin panelda.
  - Hozir saytdagi hamma pul tugmalarida "Tez kunda" turibdi.
- **Raqobatdan:**
  - Boshqaning uyiga yurak bosish (uy ustida soni ko'rinadi) va "Eng mashhur uylar" ro'yxati.
  - Stories rasmida logo va taklif havolasi.
  - Do'st taklifi uchun sovg'alar: 1 do'st — gulzor, 3 — besedka, 10 — sedan.
  - Kunlik zaxira adminning Telegramiga keladi.
- **Eski IQTISOD qoldiqlari:**
  - Admin panelda bot orqali xabar va so'rovnoma yuborish.
  - "Elchi" nishoni.
  - Qoidalar matni yangilandi.
  - README'ga zaxiradan tiklash yo'riqnomasi yozildi.
- **Sinov:**
  - 336 ta unit test o'tdi.
  - Tur tekshiruvi xatosiz.
  - E2e: 88 ta qadam (3 ekran × 2 til) o'tdi.
  - Tezlik eski versiya bilan bir xil (`PERF.md`).
  - Skrinshotlar `docs/chat/ui-*.png`.

Hal qilinmagan savollar: `SAVOLLAR.md` (6-qadam: A, B+C, D, E, F, eski IQTISOD bo'limlari).

## 6a — Tuzatish 1 (2026-11-25)
- Tabrik endi ochiq oynani yopmaydi. Piyoda va mashina ochiq joyda, oldi bo'sh tomonga qarab paydo bo'ladi.
- Parol bilan kirish kodda qoldi, lekin o'chiq ("password_login"). Premium uy yashirildi. Tanga paketlari 5 ta: 3 000 so'mdan, Stars kamida 50 ⭐.
- Admin uchun sinov rejimi: cheklov yo'q, tanga yechilmaydi, pulli narsalar bepul; hammasi "sinov" belgili, bitta tugma bilan tozalanadi.
- Sizning Telegram'ingiz (ADMIN_TELEGRAM_ID) birinchi kirishdayoq admin bo'ladi; kompyuterda "Admin sifatida kirish (lokal)" tugmasi.
- Interfeys: doim to'q; sozlamada faqat til va ovoz; avatar, gazeta, ko'cha oynasi, "Onlayn" chat, uy sovg'asi olib tashlandi; yurak — bitta tugma.
- "Haftaning hovlisi" endi Telegram botdagi so'rovnoma: eng ko'p yurak olgan 5 uy, 48 soat, g'olibga 2 000 tanga.

## 6b — Qo'shimcha 1 (2026-11-25)
- Bot nikni tekshiradi (xato bo'lsa aniq sababi bilan) va "Shu to'g'rimi?" deb so'raydi.
- Nikni kimdir olib qo'ygan bo'lsa: "Bu nik meniki" → skrinshot → admin panelda "Nik nizolari".
- Kechqurun 19:00 da bonus eslatmasi (kuniga 1 ta, /stop bilan o'chadi).
- Uyim'da do'st taklifi shkalasi (1 → 3 → 10 sovg'a), kirishda kamera animatsiyasi, "Yangi qo'shningiz" xabari, "Bosh ekranga qo'shish" kartasi.
- Shahar loyihalari: 3D taxta (nomi va foiz), to'lganda botda va kanalda e'lon, eng ko'p qo'shgan 3 kishi.
- Botda "✍️ Adminga yozish": siz Telegram'da "Javob berish" qilsangiz — javob odamga boradi; admin panelda "Murojaatlar".

Sinov: 368 ta unit test, tur tekshiruvi toza, e2e 88/88, skrinshotlar yangilandi. Ochiq savollar: `SAVOLLAR.md` (6a, 6b bo'limlari).

## 6d — Tuzatish 2 (2026-11-26)
- Do'konda endi faqat tanga narxi. Tanga yetmasa — "Yana X tanga kerak" va "Tanga olish" tugmasi.
- Bo'limlar 2 qatorda, 4 tadan — hammasi doim ko'rinadi (telefonda ham, kompyuterda ham, ruschada ham).
- Sinov rejimida (siz uchun) hech qayerda qulf yo'q: lyuks bezakni 1-level uyga ham qo'yasiz.
- Admin — faqat siz: admin panelga faqat botdagi `/admin` orqali kirasiz. Boshqa odam (hatto bazada admin yozilgan bo'lsa ham) kira olmaydi, bot unga "Bunday buyruq yo'q" deydi.
- Do'konda alohida "Premium" bo'lim (oltin hoshiya): Uylar, Bezaklar, Mashinalar, Tanga paketlari. Faqat pulga, hozircha "Tez kunda". Maxsus premium tovarlarni keyin birga chizamiz.
- Uy ustidagi nik katta va o'qiladi; o'z uyingiz niki sariq va uy belgisi bilan.
- Saytga necha kishi kirganini sanash (Cloudflare, bepul) va qayerdan kelgani (`?from=bio`, `?from=reels`).
- Bo'sh shahar jonliroq: markaz yonidagi bo'sh joylarda yonib-o'chadigan bayroqcha, tepada "Bugun N kishi uy oldi", boshqa birov uy olsa — qisqa xabar.

## 6c — Telegram bot (2026-11-26)
- Botdagi "🏙 Shahar" tugmasi saytni **Telegram ichida** ochadi va o'zi kiradi (havola kerak emas). Brauzer uchun havola ham qoldi.
- Til bir marta tanlanadi; keyin bot faqat shu tilda yozadi. Sozlamalarda almashadi va sayt ham o'sha tilga o'tadi.
- Pastda doim 6 ta tugma: Shahar, Uyim (yoki Uy olish), Do'kon, Do'st taklif, Adminga yozish, Sozlamalar.
- "Do'st taklif" — shaxsiy havola, sovg'alar shkalasi va "Do'stga yuborish" tugmasi.
- Kanalga o'zi post qiladi: kunlik yangi uylar (20:00), haftaning hovlisi, shahar loyihasi tugaganda, 100/500/1 000… uy bo'lganda. Har birini admin panel → Sozlamalar'da o'chirasiz.
- Siz uchun buyruqlar: `/stat` (bugun va 7 kun), `/hammaga` (matn yoki rasm → ko'rib chiqasiz → kimga → yuborish), `/murojaatlar`, `/nizolar`, `/admin`.
- `npm run bot:setup` — internetga chiqqanda bot buyruqlari, tavsifi, menyu tugmasi va webhook bir buyruq bilan sozlanadi.

**Tekshiruvchi:** hamma band ✅. 3 ta ❌ topdi, hammasi tuzatildi:
- PLAN "Holat" yangilandi;
- sinov rejimidagi do'kon skrinshoti (`ui-dokon-sinov.png`) qo'shildi;
- "ishlab chiqarishda admin parol shakli yo'q" testi qo'shildi.

**Sinov:**
- 402 ta unit test o'tdi, tur tekshiruvi xatosiz.
- E2e 88/88 o'tdi.
- Skrinshotlar yangilandi.

**Telefon tezligi** (CPU 6 baravar sekinlashtirilgan, oldin → keyin, `PERF.md`): yomonlashmadi.
- Piyoda: 195 → 360.
- Shahar: 270 → 322.
- Mashina: 166 → 255 (past sifatda).

**Yangi savollar** (`SAVOLLAR.md`, 6d va 6c bo'limlari):
- Pastki menyu tugmasidan ochilganda ba'zi Telegram ilovalari "kim kirdi" ma'lumotini bermasligi mumkin. 12-qadamda telefonda tekshiramiz.
- Haftaning hovlisi kanal postida uy rasmi hali yo'q.
- Premium "Uylar" bo'limi hozircha bo'sh.
- So'm narxi to'lov yoqilganda qaytadi.


## 6e, 6f — Tuzatish 3 va 4 (2026-11-26)
- Uyi bor odamga (sinov rejimi o'chiq bo'lsa, admin ham) bo'sh joylarda "+" va "Uy qurish" chiqmaydi. Reyting va boshqa oynalar eski server javobida yiqilmaydi.
- Tanga yuborish va xazina ovi olib tashlandi (kod qoladi, bayroqcha ortida).
- Premium va tanga paketlari xaridi botda.

## 13-qadam — Haqiqiy ochilish (2026-11-26)
**Nima qilindi:**
- **To'lov — faqat Telegram Stars, faqat botda:**
  - saytda pul to'lovi oynasi umuman yo'q (test bilan tekshirilgan);
  - salyut, tanga paketlari, premium va level — "Botda sotib olish" tugmasi;
  - kichik paketlar olib tashlandi — 3 ta qoldi: 3 000 (60 ⭐), 7 000 (125 ⭐), 16 000 (250 ⭐);
  - botda `/paysupport` (to'lov muammosi → sizga "💳 [to'lov]" belgili murojaat) va `/terms` (qoidalar);
  - qoidalarga Stars bandi qo'shildi.
- **Tozalash:** "Sinov ma'lumotlarini tozalash" tugmasi endi sinov rejimini ham o'chiradi. Ishlab chiqarish bazasining zaxirasi olindi.
- **Yuklama:**
  - sayt ommaviy ma'lumotni serverning 1 daqiqalik snapshotidan oladi — Supabase yuki odamlar soniga bog'liq emas;
  - yangilash oralig'i kattalashtirildi;
  - kunlik faollik yozuvi kuniga bir marta;
  - 500 kishilik 5 daqiqalik sinov xatosiz o'tdi (`YUKLAMA-HISOBOT.md`).
- **Kuzatuv:**
  - server har 10 daqiqada sayt, baza va jonli serverni tekshiradi — Render uxlamaydi; 2 marta ketma-ket xato bo'lsa, sizga botda "⚠️" (soatiga ko'pi bilan 1 ta);
  - saytdagi xatolar admin → **Xatolar** bo'limida;
  - `/stat` da baza hajmi;
  - zaxiradan tiklash bitta buyruq: `npm run restore`.
- **Ochilish kuni:**
  - bot `?start=from_bio` / `from_reels` ni hisobga oladi;
  - ochiq tumanlar 80% to'lsa, keyingisi o'zi ochiladi va sizga xabar keladi.

**Tekshiruvchi:**
- 13-qadam bandlarining hammasi bajarilgan.
- 2 ta jiddiy eslatmasi tuzatildi:
  - ogohlantirish chastotasi endi bazada saqlanadi (`workers.dev` da kesh ishlamaydi);
  - saytdan xato yuborish boshqa domenga brauzer to'sig'isiz boradi.
- Hujjatdagi qoldiqlar (PLAN, ISHLAR, README'da Render hisobi) tuzatildi.
- E2e paytida yana bitta haqiqiy xato topildi va tuzatildi: uy olingandan keyin uy darhol ko'rinmay qolishi mumkin edi.

**Sinov:**
- 434 ta unit test o'tdi, tur tekshiruvi xatosiz.
- E2e 88/88 o'tdi.
- Yuklama: 500/500 ulanish, xato yo'q.
- Ishlab chiqarish (`e2e/prod.mjs`): sayt 1,9 s da ochildi, xato yo'q.
- Cron loglari: `*/10` 16:30 va 16:40 da "Ok" (sog'liq tekshiruvi — ogohlantirishsiz, Render ping ishlayapti).

**Siz bosishingiz kerak bo'lgan tugmalar** (batafsil — `OCHILISH-ROYXAT.md`):
1. Botni @citylanduz kanaliga admin qilish.
2. Supabase → Authentication → "Allow new users to sign up" — o'chirish.
3. `nabiyev_7` akkaunti haqida qaror: o'chirish yoki qoldirish (unda haqiqiy uy va "Asoschi" №1 bor).
4. Admin panel → Iqtisod → **"Sinov ma'lumotlarini tozalash"**.
5. Botda 60 ⭐ lik paketni bir marta sotib olib tekshirish (xohlasangiz, admin panelda qaytarish).
6. O'z bepul uyingizni olish.
7. Instagram bio: `https://t.me/Citylanduz_bot?start=from_bio`.
8. `/hammaga` → kutish ro'yxatiga xabar (matn tayyor).
9. Kanalga e'lon (matn va rasm tayyor).
