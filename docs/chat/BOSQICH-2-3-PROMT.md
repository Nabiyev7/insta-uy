# 2–3-bosqich: kirish (bot orqali), uy olish, tanga, premium — CityLand UZ

> Egasi bilan kelishilgan (2026-11-24/25). **Bu fayl eski `IQTISOD-PROMT.md` o'rnini bosadi** (zid joyda shu fayl ustun). Avval `CLAUDE.md`, `PLAN.md`, `docs/chat/BOSQICHLAR.md`, `BOSQICH-2.md`, `TANGA-NARXLAR.md`, `TOLOV.md`, `RAQOBAT.md` ni o'qi.
> Ish katta — **5 qismga bo'lib** bajar, har qismdan keyin: tekshiruvchi, tuzatish, "Holat", commit. Har qism oxirida sayt ishlaydigan holatda.

---
## A. Tozalash va qoidalar
1. **6–10-level uy modellari olib tashlanadi** (kit, eksport, showcase, katalog). Uy leveli hozircha **1–5**. `MAX_TIER`, baza cheklovlari, `decor_slots`, level nomlari — shunga mos. Villa va qasr uchastkalari qoladi (ularda ham 1–5-level uylar turadi, uchastkasi katta). Keyin 6–10 qayta qo'shilishi oson bo'lsin (konstanta bitta joyda).
2. **Uy ko'tarish chegarasi — 5** (tanga bilan).
3. **Lyuks bezaklar tanga bilan — 5-leveldan** (oldin 7 edi; `LUXE_LEVEL = 5`).
4. **Olib tashlanadi:**
   - **uy ranglarini o'zgartirish** (devor, tom, ramka, eshik rangi va devor materiali tanlovi) — uy har levelda o'zining standart rangida; bazadagi ustunlar qoladi, lekin UI va RPC'lar o'chiriladi;
   - **avatar ranglarini o'zgartirish** (kiyim modeli tanlovi qolishi mumkin, rang tanlovi yo'q);
   - **shikoyat bo'limi hamma joydan** (uy oynasi, chat, nik) — UI, RPC, admin bo'limi; o'rniga: so'z filtri, havola taqiqi, admin bloklashi va xabarni o'chirishi qoladi;
   - **nikni admin tasdiqlashi** (`require_approval` o'chiq va UI'dan olib tashlanadi) — uy darhol tayyor, nik darhol ko'rinadi.
5. **"Uyni kuchaytirish" tugmasi** ko'rinadigan bo'lsin: o'z uyimni bosganda oynada katta tugma — "Kuchaytirish → N-level · narx" (tanga yetsa faol, yetmasa "Yana X tanga kerak" va "Tanga olish"); Uyim panelida ham; 5-levelda "Eng yuqori level". Bosilganda tasdiq → qurilish effekti → tabrik.

## B. Kirish — faqat Telegram, bot orqali
- **Yo'l**: Instagram bio'da botga havola → bot `/start` → salom + "Instagram nikingizni yozing" → nik tekshiriladi (format, so'z filtri, band emasmi; @ siz) → bot **shaxsiy bir martalik havola** yuboradi ("Shaharni ochish" tugmasi) → sayt **kirib bo'lgan holda** ochiladi (qisqa muddatli token, bir marta ishlaydi). Instagram ichki brauzeri muammosi shu bilan hal bo'ladi.
- Saytdagi "Telegram orqali kirish" ham shu botga yuboradi (`?start=login`), keyin bot havola beradi. Login+parol ro'yxatdan o'tish **olib tashlanadi**; mavjud parolli akkauntlar Telegram ulamaguncha faqat ko'rish rejimida.
- Instagram niki keyin o'zgartirilmaydi (faqat admin).
- Bot username sozlamadan (`telegram_bot`); egasi hali yozmagan bo'lsa — hozirgidek "Tez kunda". Token faqat maxfiy sozlamada.
- Mehmon (kirmasdan) shaharni ko'ra oladi — o'zgarmaydi.

## C. Uy olish
- **Bitta bepul uy** — faqat hovli, 1-level, istalgan bo'sh joyda (ochiq tumanlar). Birinchi 100 kishi — "Shahar asoschisi" nishoni.
- **Bir nechta uy mumkin**: bepul bittadan tashqari qo'shimcha uylar faqat **pulga** (E qism). Hamma uylar "Uyim"da ro'yxat; har birini alohida kuchaytirish va bezash mumkin; har uy ustida egasining niki.
- 3 oy kirmasa bepul uy bo'shatiladi (2 hafta oldin bot ogohlantiradi). Pulga olingan uylar bo'shatilmaydi.

## D. Tanga
Hamma qiymat admin "Iqtisod" sahifasida. Boshlang'ich qiymatlar — `TANGA-NARXLAR.md`:
- **Topish** (faqat shular): birinchi 100 kishi 1 000; kunlik kirish 100, ketma-ket 7 kun +300 (bir kun o'tkazilsa seriya darhol noldan); **Telegram kanalga obuna** 300 (bir marta, bot `getChatMember` bilan tekshiradi; bot kanalda admin); do'st taklifi 500 (do'st Telegram + uy olganda, **vaqt sharti yo'q**; o'ziga taklif ishlamaydi); "Haftaning hovlisi" g'olibi 2 000; xazina 50 (kuniga 3 ta).
- **Narxlar**: level 2 — 300, 3 — 1 000, 4 — 2 000, 5 — 3 500; bezaklar toifalar bo'yicha (`TANGA-NARXLAR.md`).
- **Tanga o'tkazish**: kuniga yuborish ≤ 500, qabul ≤ 1 000, **komissiya yo'q**, faqat uyi va Telegram'i bor akkauntlar orasida, o'ziga yo'q; admin panelda ro'yxat.
- Chatga yozish uchun tanga yo'q.
- Pul birligi nomi: "Tanga" / "Монеты".

## E. Premium (pulga) — kod tayyor, **`payments_enabled=false`**
- **Pulga sotiladi** (Stars — bot orqali; so'm — A variant kartaga o'tkazma + noyob summa + avtomatik solishtirish; B variant Payme/Click keyin; narx saytda ochiq):
  1. **Tanga paketlari**: 1 000 — 10 000 so'm / 50⭐; 3 000+300 — 25 000 / 125⭐; 7 000+1 000 — 50 000 / 250⭐; 16 000+3 000 — 100 000 / 500⭐.
  2. **Premium uy** — yangi uchastka + darhol tanlangan level (1–5), **level cheklovisiz, bir nechta**; hovli, villa yoki qasr uchastkasi. Boshlang'ich: hovli 3-level 30 000 / 150⭐, hovli 5-level 60 000 / 300⭐; villa +40 000 / +200⭐; qasr +100 000 / +500⭐.
  3. **Bezaklar (oddiy va lyuks) pulga** — **level cheklovisiz**: pulga olingan bezak uyning levelidan qat'i nazar qo'yiladi. Buning uchun 1–4-level uylarda ham **pulli bezaklar uchun joy nuqtalari** (garaj_oldi, old_hovli_chap/ong, darvoza_yoni, burchaklar) bo'lsin; tanga bilan esa avvalgidek 5-leveldan. Narx: oddiy 5 000–20 000 so'm, lyuks 15 000–60 000 so'm (Stars — kurs bo'yicha).
  4. **Salyut**: shahar ustida xabar 24 soat (so'z filtri), tanga 2 000 yoki 10 000 so'm / 50⭐.
  5. **Noyob nik joylari** (keyin, kod skeleti): biznes minoralari, stadion va h.k.; bitta joy — bitta ega, muddatli.
- Hamma to'lov avtomatik tasdiqlanadi (Stars: `successful_payment`; karta: summa solishtirish), **qo'lda chek yo'q**. Har to'lov `payments` jadvalida, admin panelda ko'rinadi, qaytarish (refund) imkoni.
- Bot orqali xarid: bot menyusida "Do'kon" → tovar → to'lov → sayt va hovlida darhol paydo bo'ladi. Saytdagi "Olish (pulga)" tugmasi botga chuqur havola (`?start=buy_<id>`).
- Sinov: Telegram Stars test muhiti va soxta bank xabarlari bilan e2e.

## F. Raqobat tahlilidan
- **Yurak (♥)**: boshqaning uyiga yurak bosish (har uyga 1 marta), uy ustidagi yorliqda va oynasida soni; "**Eng mashhur uylar**" reytingi (Top bo'limiga tab).
- **Stories rasmi**: uy rasmi + nik + manzil + CityLand UZ logo + **shaxsiy taklif havolasi** (Instagram havola stikeri uchun havola nusxalanadi, ko'rsatma bilan); 9:16.
- **Referal sovg'alari** (tangadan tashqari): 1 do'st — gulzor, 3 — besedka, 10 — sedan (admin o'zgartiradi).
- **Zaxira**: kunlik zaxira JSON adminning shaxsiy Telegram'iga ham yuborilsin (siqilgan; 45 MB dan katta bo'lsa bo'laklab).

## Qabul sharti
- A–F hammasi; eski `IQTISOD-PROMT.md` dagi bajarilmagan va bu faylga zid bo'lmagan qismlar ham.
- Sinovlar: bot orqali ro'yxat (bir martalik havola, takror ishlatib bo'lmaydi), 100 asoschi bir vaqtda (aniq 100), referal, kanal bonusi, o'tkazma limitlari, kunlik seriya, kuchaytirish tugmasi, bir nechta uy, pulga olingan bezak 1-level uyda, premium uy, to'lov o'chiq bo'lganda pul tugmalari "Tez kunda".
- `npm test`, `npm run typecheck`, `npm run e2e`; perf yomonlashmagan; tekshiruvchi ✅; skrinshotlar `docs/chat/ui-*.png`; `PLAN.md` (§2 — 2 qavat, level 1–5, ranglar yo'q, shikoyat yo'q), "Holat", commit.
- Hal qilinmagan joylar → `SAVOLLAR.md`.
