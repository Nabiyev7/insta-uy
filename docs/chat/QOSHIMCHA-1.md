# Qo'shimcha 1 — nik qoidasi, nik nizosi, o'sish funksiyalari (egasi, 2026-11-25)

> `TUZATISH-1.md` (6a) dan keyin, 12-qadamdan (internet) **oldin**. Har bo'limdan keyin tekshiruvchi; oxirida bitta commit yoki bo'lim bo'yicha.
> Hamma matn uz + ru. Hamma son va vaqt — admin sozlamasida.

## 1. Instagram nik — tasdiqsiz, lekin ehtiyotkor kiritish
- Instagram nikni **tekshirish/tasdiqlash yo'q** (bio kodi va h.k. qilinmaydi). Odam nima yozsa — o'sha. **Bitta nik — bitta odam** (takrorlanmaydi, katta-kichik harf farqsiz, oxiridagi nuqta/bo'shliq olinadi).
- Nik **faqat botda** yoziladi (`server/src/telegram.ts` → `ASK_NICK`, `takeNick`); hozir u tasdiqsiz darhol akkaunt yaratadi. Nik keyin o'zgarmaydi, shuning uchun **botda to'liq ogohlantirish va tasdiq qadami** (akkaunt faqat "Ha, to'g'ri" bosilgandan keyin yaratiladi):
  - "Nikingizni Instagram'dagidek **to'liq va aniq** yozing: har bir harf, raqam, nuqta va pastki chiziq (`_`) muhim. Keyin o'zgartirib bo'lmaydi."
  - Yozilgandan keyin **tasdiq qadami**: "Shu to'g'rimi? → `instagram.com/<nik>`" (havola bosilsa Instagram'da ochiladi — odam o'zi tekshiradi) + "Ha, to'g'ri" / "Qayta yozish".
  - Format tekshiruvi (Instagram qoidasi: 1–30 belgi, faqat a–z, 0–9, `.` va `_`, ketma-ket ikki nuqta yo'q, nuqta bilan boshlanmaydi/tugamaydi) — xato bo'lsa aniq sabab ("`ali..vali` — ikki nuqta ketma-ket bo'lmaydi").
  - `@` va `instagram.com/` bilan yozilsa avtomatik olib tashlanadi.
  - Botdagi namuna nik (`ASK_NICK`, uz va ru): "masalan: ali_karimov" o'rniga **"masalan: citylanduz"** — qiymat `telegram_channel` sozlamasidan olinsin (kodga yozilmasin).

## 2. Nik nizosi — "Bu nik meniki" (faqat bot orqali)
Kimdir boshqaning Instagram nikini olib qo'ygan bo'lsa:
1. **Da'vogar** bot orqali: nikni yozadi → band ekani chiqadi → "Bu nik meniki" tugmasi (hozirgi "/yordam orqali yozing" xabari o'rniga) → **dalil** yuboradi: o'sha Instagram akkauntning profil sahifasi skrinshoti (Instagram'ga kirgan holda, "Profilni tahrirlash" tugmasi ko'rinib turgan). Bot nimani suratga olishni rasm/matn bilan tushuntiradi.
2. Ariza admin panelda **"Nik nizolari"** bo'limiga tushadi (da'vogar, nik, skrinshot, sana, hozirgi egasi).
3. Admin "Tekshirishga yuborish" → **hozirgi egasiga** bot xabar: "@nik uchun boshqa odam ariza berdi. Bu nik sizniki bo'lsa — 7 kun ichida o'sha Instagram profilingiz skrinshotini yuboring." (+ "Nik meniki emas, beraman" tugmasi.)
4. Admin ikkala dalilni ko'rib **qaror** qiladi:
   - **Da'vogar haq** (yoki hozirgi egasi "beraman" dedi, yoki 7 kunda javob bermadi): nik da'vogarga o'tadi. **Eski egasi** botdan xabar oladi: "Yangi nik yozing" — u yangi nikini kiritadi (1-band qoidalari bilan). **Eski egasining uyi, levellari, bezaklari, tangasi, yuraklari, nishonlari — hammasi o'zida qoladi**, faqat nik almashadi. Yangi nik yozguncha uy ustida **nik ko'rinmaydi** (eski nik darhol o'chadi, uy esa joyida turadi).
   - **Hozirgi egasi haq:** ariza yopiladi, da'vogarga bot xabar beradi.
5. Da'vogar nikni olgach — oddiy foydalanuvchi kabi (bepul uyini oladi, agar hali olmagan bo'lsa).
- Hamma qadam `nick_disputes` jadvalida (holat, dalillar `storage`da, kim qachon nima qildi). Bitta nikka bir vaqtda bitta ochiq ariza; bitta odam kuniga ko'pi bilan 3 ta ariza.
- Admin qarori — bitta tugma; nik almashishi bitta tranzaksiya (yarim holat qolmasin). Test: to'liq yo'l, "beraman", 7 kun javobsiz, rad etildi.
- Yordam bo'limida qisqa izoh: "Nikingizni kimdir olib qo'ygan bo'lsa — botga yozing".

## 3. Botdan eslatmalar
- Kunlik bonusni olmagan bo'lsa — **kechqurun 19:00 (Toshkent)** bitta xabar: "Bugungi +100 tanga sizni kutyapti" + "Shaharni ochish" tugmasi.
- 7 kunlik seriya uzilay deb qolsa (kecha kirgan, bugun hali yo'q) — o'sha xabar seriya matni bilan ("Seriya 5 kun — bugun kirmasangiz noldan boshlanadi").
- Kuniga ko'pi bilan **1 ta** eslatma; botda `/stop` — eslatmalar o'chadi, `/start` — yoqiladi. Navbat orqali, bo'laklab (yuklama).

## 4. Do'st taklifi shkalasi
- Uyim → "Do'st taklif qilish": shkala **1 → 3 → 10** do'st, har nuqtada sovg'a rasmi (gulzor, besedka, sedan — `referral_gifts` dan), hozirgi son, keyingi sovg'agacha nechta qoldi. Olingan sovg'a — belgi bilan.
- Taklif havolasi tugmasi shkala ostida.

## 5. Kirish animatsiyasi
- Sayt birinchi ochilganda (sessiyada bir marta): kamera shahar ustidan baland nuqtadan sekin aylanib uchib, markaz yoki o'z uyiga tushadi (3–4 s). Ekranga tegsa — darhol to'xtaydi. Kuchsiz telefonda (Past sifat) — qisqaroq.
- `?uy=ID` havolasi bilan ochilsa — animatsiya o'sha uyga tushadi.
- Admin panel "Video" uchun ham shu traektoriya ishlatilsin (reels kadri).

## 6. "Yangi qo'shningiz" xabari
- Kimdir uy qursa — 60 m atrofidagi uy egalariga bot: "Yangi qo'shningiz: @nik" + uyga havola (`?uy=ID`). Kuniga bir odamga ko'pi bilan 3 ta (bir nechta bo'lsa bitta xabarda jamlansin).

## 7. "Bosh ekranga qo'shish"
- Ikkinchi kirishda (birinchisida emas) pastki karta: "CityLand UZ ni telefon ekraningizga qo'shing" — Android'da tizim oynasi (`beforeinstallprompt`), iPhone'da 2 qadamli rasmli ko'rsatma. Rad etsa — 14 kun chiqmaydi. Instagram ichki brauzerida — "Chrome'da ochish" maslahati.

## 8. Shahar ishlari — jonliroq
- Har loyiha joyida (bog', stadion, ko'prik) **3D taxta**: nomi va foiz (masalan "Stadion · 34%"), qurilish to'sig'i va kran (bor bo'lsa — saqlansin).
- Loyiha to'lganda: obyekt shaharda paydo bo'ladi (qurilish effekti), bot hammaga xabar beradi, kanalga post.
- **Eng ko'p qo'shgan 3 kishi** niki obyekt yonidagi lavhada abadiy yoziladi; panelda reyting.
- Loyiha joylari bosh rejadagi mavjud joylar (stadion — (−1275, 150) va h.k.); **qulfga tegilmaydi**. Ko'prik uchun joy yo'q bo'lsa — loyiha keyinga qoldirilib, `SAVOLLAR.md` ga yoz.
- Panelda qisqa tushuntirish: "Tangangizni shahar loyihasiga qo'shing — to'lganda shaharda quriladi va nikingiz lavhada qoladi."

## 9. Botda "Adminga yozish" (egasi, 2026-11-25)
Hozir faqat `/yordam matn` bor (bir qatorli, javob qaytmaydi, odam buyruqni bilishi kerak). O'rniga:
- Bot menyusida doimiy **"✍️ Adminga yozish"** tugmasi (va `/yordam` buyrug'i shu yo'lni ochadi; eski `/yordam matn` ham ishlayversin).
- Bosilsa: "Savolingiz yoki muammoingizni yozing. Rasm/skrinshot ham yuborsa bo'ladi." → odam **matn, rasm yoki skrinshot** yuboradi (bir nechta xabar — 2 daqiqa ichida bitta murojaatga yig'iladi) → "✅ Yuborildi. Admin javobini shu yerda olasiz."
- Admin (`ADMIN_TELEGRAM_ID`) botda oladi: murojaat raqami, nik, Telegram ismi/username, uy manzili (bor bo'lsa) va xabar(lar). Admin o'sha xabarga Telegram'da **"Javob berish" (reply)** qilsa — javob bot orqali **foydalanuvchiga yetib boradi** ("💬 Admin javobi: …"). Rasm bilan javob ham.
- Admin panelda **"Murojaatlar"** bo'limi: ro'yxat (yangi / javob berilgan / yopilgan), yozishma tarixi, paneldan ham javob yozish, "Yopish".
- Cheklov: bir odam kuniga ko'pi bilan 5 ta murojaat; bloklangan akkaunt yoza olmaydi. So'z filtri kerak emas (xabarni faqat admin ko'radi).
- Saytdagi Yordam bo'limida: "Savol bormi? Botda «Adminga yozish»" tugmasi → botga havola (`?start=yordam`).
- Nik nizosi (2-band) ham shu yerdan boshlanishi mumkin, lekin alohida tugma bilan ("Nik meniki").
- Test: murojaat → admin reply → foydalanuvchiga yetdi; rasm; kunlik limit; paneldan javob.

## Qabul sharti
- Har bo'lim uchun test (nik formati, nizo yo'li 4 holat, eslatma kuniga 1 ta, shkala, animatsiya to'xtashi, qo'shni xabari limiti, PWA karta 14 kun, loyiha to'lishi).
- `npm test`, `npm run typecheck`, `npm run e2e`; perf yomonlashmagan; skrinshotlar; tekshiruvchi ✅; `PLAN.md` "Holat"; commit: `feat: qo'shimcha 1 — nik qoidasi va nizosi, eslatmalar, taklif shkalasi, kirish animatsiyasi, qo'shni xabari, PWA, shahar ishlari, adminga yozish`.
