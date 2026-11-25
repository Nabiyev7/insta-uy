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
