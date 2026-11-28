# Keyingi yangilanishlar uchun g'oyalar (hozir QILINMAYDI)

> Egasi bilan kelishilgan (2026-11-24). Bu ro'yxat — kelajak uchun. Claude Code bularni o'zi boshlamasin.

## Dizayn va funksiya
1. Kirish animatsiyasi: sayt ochilganda kamera shahar ustidan uchib, pastga tushadi.
2. Uy olinganda tantana: konfetti, "Tabriklaymiz" yozuvi, stories uchun rasm.
3. Level oshganda qurilish effekti: kran, chang, uy qayta "quriladi".
4. Uyga to'g'ridan-to'g'ri link: `?uy=ID` — kamera o'sha uyga uchadi.
5. Mahalla kirishida nomli darvoza yoki tabelka.
6. "Yangi nima?" oynasi yangilanishdan keyin.
7. Sekin internetda bosqichli ochilish (avval sodda shahar, keyin detallar).

## Ijtimoiy
- Do'stlar ro'yxati, bildirishnomalar qo'ng'irog'i, mehmonlar daftari, "bu uyni N kishi ko'rdi", haftalik tadbirlar, mahalla raqobati.

## O'sish
- Instagram nikini tasdiqlash (bio'ga kod), stories rasmida referal link/QR, bo'sh uyda "Bu joy bo'sh — oling!", shahar o'sishi timelapse videosi.

## Ekran
- Gap pufakchalari, chap qo'l rejimi, telefon chetlari (safe-area allaqachon promtda), birinchi kirgandagi 5 qadamli ko'rsatma.

## Uylar
- **Premium tovarlar** (faqat pulga, do'konda "⭐ Premium" bo'limi — TUZATISH-2, 6-band): **maxsus dizaynli uylar, bezaklar, mashinalar** — egasi bilan Blender'da chiziladi, narxlarni egasi belgilaydi (2026-11-26).
  - Premium uy qarorlari (egasi, 2026-11-27): uslublar **A. Zamonaviy villa** (tekis tom, katta oynalar, infinity basseyn) va **C. Shisha penthaus** (shisha kub, tomda bog' va jakuzi); qo'shimchalar — **tungi yorug'lik** (iliq derazalar, basseyn nuri, chiroq chiziqlari) va **oltin nik + darvoza lavhasi + uchastka hoshiyasi**; tepadan tanilsin (tom terrasasi/basseyn); ≤ 3 500 uchburchak + LOD; uchastka — **villa, qasr va hovli** (hovliga kichik versiya). Avval **1 ta namuna** Blender'da — egasi "yasa" deganda. **Eskiz A (2026-11-27): `blender/premium-namuna.blend`, `docs/chat/premium-A-*.png` — 3 qavat (premiumga istisno: oddiy uylar 2 qavatdan oshmaydi), 2 mashinalik garaj, terrasalar, infinity basseyn, pergola.** **To'xtatildi (2026-11-27): egasi A ni rad etdi → B (klassik osobnyak) → "3 qavatli villaga o'xshat" → C (`PremiumC`, `docs/chat/premium-C-*.png`): zamonaviy 3 qavatli villa, och bej tosh, qora ramkali katta derazalar, shisha balkonlar, oltin chiziqlar, soyabonli kirish, real o'lchamlar (odam 1,75 m, qavat 3,2 m, eshik 2,0×2,6), tartibli yo'llar (mashina darvozasi → garaj, piyoda → eshik → basseyn). Egasi hali tasdiqlamagan — keyin shu C dan davom etiladi.**
- **Login + parol** — kod bor, o'chiq; sayt yaxshi ishlay boshlagach to'liq qaytariladi (2026-11-25).
- 4–10-level uy modellarini qayta ko'rib chiqish (hozircha maksimal level — 3).
- Kvartira egalari uchun balkon bezaklari va levellar.
- Uy uslubini tanlash: zamonaviy / klassik.

## Keyinga qoldirilgan qarorlar
- Baland binolarning vazifasi, haqiqiy pul bilan to'lov, ochilish sanasi, shahar nomi (tavsiya: Obunaobod).

## Binolar (keyin qo'shiladi)
- Pochta, politsiya, kinoteatr va ko'ngilochar markaz, universitet/kollej, vokzal va avtobus bekatlari, yoqilg'i quyish shoxobchalari.
- 1-bosqichda faqat 3 ta qo'shimcha asosiy bino: kasalxona, masjid, o't o'chirish bo'limi.

## Tabiat (bosqichma-bosqich)
- Daryo va ko'priklar (joyi 1-bosqich xaritasida oldindan ajratiladi), atrofdagi tog'lar, ko'proq yashil zonalar.

## Tanga
- **Xazina ovi** — vaqtincha o'chirilgan (bayroqcha `treasure_enabled`), keyin egasi bilan qayta ko'rib chiqiladi (2026-11-26).
- **Tanga yuborish** — olib tashlangan (bayroqcha `coins_transfer_enabled`), kerak bo'lsa qaytariladi (2026-11-26).
- Uy bo'shatilganda (3 oy kirmasa) tanga, level va bezaklar nima bo'lishi — hal qilinmagan.

## Vaqtincha o'chirilganlar (2026-11-26)
- **Xazina ovi** — vaqtincha o'chirilgan, keyin ko'rib chiqiladi (kod qoladi; admin → Sozlamalar → `treasure_enabled`).
- **Tanga yuborish** (bir odamdan boshqasiga) — olib tashlangan (kod qoladi; `coins_transfer_enabled`).

## Noyob obyektlar (egasi, 2026-11-27) — hozir QILINMAYDI, avval Blender'da yasaladi
- Uylardan tashqari **tayyor noyob obyektlar**: bino, kema/yaxta, samolyot, kasalxona va h.k. — **har biri bitta, bitta egasi**. Avval Blender'da yasaladi, keyin shaharga qo'shilib sotuvga chiqadi.
- Joylar (keyin hal qilinadi, egasi "hammasi" dedi): mavjud 170 tijorat joyi va 12 biznes minorasi, stadion; ko'l/daryo (kema); yangi zona — aeroport/port (bosh reja qulfini ochish kerak); bo'sh uchastkalar.
- Egasi oladi: **oltin nik va lavha**, **Instagram havolasi** (obyektni bossa), **o'z nomi** (so'z filtri bilan).
- Sotuv: **abadiy (qat'iy narx)** yoki **oylik ijara**; yoki **auksion** (saytda va botda). Aldash/cho'zishga qarshi variantlar egasiga taklif qilingan: (1) stavka oldindan Stars bilan to'lanadi, oshirilsa avtomatik qaytariladi; (2) 10% zalog + 24 soatda to'lov. Umumiy qoidalar: oxirgi 5 daqiqada stavka → +5 daqiqa, qat'iy muddat (masalan 3 kun), minimal qadam, boshlang'ich va "hoziroq sotib olish" narxi, faqat Telegram + uyi borlar, o'ziga stavka yo'q, ochiq tarix, bot xabarlari, admin bekor qilishi. **Egasi tanladi (2026-11-27): (1) stavka oldindan Stars bilan to'lanadi, oshirilsa darhol avtomatik qaytariladi** (Stars hisobiga, komissiyasiz; auksion bekor bo'lsa — hammaga qaytadi; qoidalarda "pul Stars bo'lib qaytadi" deb ochiq yoziladi).
- Auksion muddati: admin tanlaydi — 24 soat / 3 kun (standart) / 7 kun; tugash vaqti 20:00–22:00 (Toshkent); boshlanishida kanal posti + bot xabari, tugashiga 1 soat qolganda eslatma.
- Stavka bo'lmasa: g'olibsiz yopiladi; admin tugmasi (yoki avtomatik sozlama): (a) narxni −20% qilib qayta qo'yish, (b) oddiy sotuvga o'tkazish, (c) keyinga qoldirish.
- **Oddiy sotuv (kim birinchi)** — oddiyroq modellar uchun: "Sotib olish" bosilganda 5 daqiqa band; `pre_checkout_query` da sotilgan bo'lsa rad (pul yechilmaydi); bir vaqtda ikki to'lov bo'lsa — ikkinchisiga avtomatik qaytarish; sotilganda kanalga "@nik … sotib oldi!" posti.
- Buyurtma (zakaz): **botda buyurtma shakli** (nima, namuna rasm, joy, kontakt → admin panel ro'yxati) **va** Instagram kommentlaridan (egasi qo'lda admin panelga kiritadi).
- Qoida: haqiqiy brend, logo, davlat ramzi yo'q (PLAN §2) — o'xshash, o'ylab topilgan obyektlar.

## Video (keyinga qoldirilgan, egasi 2026-11-27)
- Promo video va reels (`INSTAGRAM-PROMT.md` 2–3-bo'lim) va "qurilish va yangi egasi" ssenariysi (`VIDEO-QURILISH-PROMT.md`) — egasi bilan takomillashtirilib, keyin ishga tushiriladi. Egasi o'z namunasini (yoqqan video) beradi.

## Referal uchun noyob bezaklar (egasi, 2026-11-27)
- Do'st taklifi bosqichlari uchun **hech kimda yo'q, sotilmaydigan** bezaklar yasaladi (Blender) va bosqichlarga (3/10/25/50 do'st) tanga bilan birga qo'shiladi. Hozircha faqat tanga.
