# Tuzatish 5 — haqiqiy loyiha (egasi, 2026-11-27)

> Egasi: **sinov tugadi — bu endi haqiqiy loyiha.** "Sinov" so'zi va sinov ma'lumotlari qolmasin. Har banddan keyin `npm test` + `typecheck` + commit + push; tekshiruvchi oxirida bir marta; oxirida `e2e/prod.mjs` bilan ishlab chiqarishda tekshir.

## 1. "Sinov rejimi" o'rniga — admin huquqlari (doimiy)
- Saytda, admin panelda va botda **"sinov", "test", "SINOV" so'zlari va belgilari yo'q** (uy ustidagi "SINOV" belgisi, "Sinov xaridi", "Sinov — bepul", Sozlamalar'dagi "Sinov rejimi" tugmasi, HUD'dagi chip).
- Egasi (`ADMIN_TELEGRAM_ID`, `role='admin'`) uchun **hamma narsa doim ochiq**, tugmasiz: istalgan bezak (lyuks, premium) istalgan leveldagi uyga, uyni istalgan levelga, tanga yechilmaydi, kunlik limitlar yo'q, yopiq tumanlar. Do'konda adminga tugma — "Olish" (narx ko'rinadi, lekin yechilmaydi), kichik "Admin" yozuvi faqat unga.
- Admin olgan narsalar **haqiqiy** (`is_test` belgisi endi qo'yilmaydi; ustun qoladi), daromad statistikasiga kirmaydi (`payments` da `is_admin=true`).
- **Qo'shimcha uy** admin uchun bo'sh joydagi "+" orqali emas — admin panel → Uylar → **"Uy berish"** (uchastka, nik, level) yoki saytda bo'sh joyni bosganda faqat adminga ko'rinadigan "Admin: shu yerga uy qo'yish" tugmasi.
- Server: `private.is_tester` → `private.is_owner_admin` (rol + `ADMIN_TELEGRAM_ID`); hamma tekshiruvlar shu orqali. Testlar yangilansin.

## 2. "+" belgisi — uyi bor hech kimga chiqmasin (xato hali bor)
- Qoida endi oddiy: **foydalanuvchida kamida 1 ta uy bo'lsa (admin ham) — bo'sh joylarda "+", ramka, "Bu joy sizni kutyapti" belgilari va "Uy qurish" tugmasi yo'q.** Admin istisnosi yo'q (1-banddagi "Admin: shu yerga uy qo'yish" bundan mustasno — u "+" emas).
- Sababini aniq top: profil `plots` ro'yxati, `free_used`, kesh (`caches`), markerlar qayta chizilishi, Mini App'da profil kechikib kelishi. Uy olingan zahoti va sahifa qayta ochilganda ham yo'q bo'lsin.
- **Ishlab chiqarishda tekshir**: `e2e/prod.mjs` ga ssenariy — mehmon → "+" bor; uyi bor akkaunt (lokal dev admin kirishi yoki test tokeni bilan) → "+" yo'q. Skrinshot `docs/chat/ui-uyi-bor.png`.

## 3. Sinovda yaratilgan narsalarni o'chirish (egasi ruxsat berdi)
- Avval **zaxira** (kunlik zaxira buyrug'i) — fayl egasining Telegram'iga.
- Keyin ishlab chiqarish bazasida: sinov davridagi barcha uylar, bezaklar, buyurtmalar, to'lovlar (Stars test), chat xabarlari, murojaatlar, nizolar, yuraklar, salyutlar, kanal post navbati, kunlik faollik — **o'chiriladi**; uchastkalar bo'shaydi. "Shahar asoschisi" hisoblagichi 0. Tumanlar boshlang'ich holatga.
- **Akkauntlar** (profiles): egasining akkaunti qoladi (tanga 0, uy yo'q — u bepul uyini oddiy yo'l bilan oladi). Boshqa sinov akkauntlari — egasi bilan kelishilgan ro'yxatdan (hozirgi akkauntlar ro'yxatini egasiga ko'rsat: nik + yaratilgan sana; o'chirishni egasi tasdiqlaydi).
- Bot `/stat` va admin panel "Umumiy" — hammasi 0 dan.
- Bajarilgandan keyin `docs/chat/HISOBOT.md` ga: nima o'chdi (sonlari bilan), zaxira fayli qayerda.

## 4. Shaharni yuqoridan ko'rish — balandroq
Hozir eng baland kamera 190 / 240 / 300 m (`logic/quality.ts` → `cityMax`), ko'rinish 480 / 600 / 800 m — shahar mayda ko'rinmayapti, yuqoridan kam joy ko'rinadi.
- `cityMax` → **450 / 600 / 750 m**, `cityView` → **1 100 / 1 400 / 1 800 m** (yoki eng balandda butun shahar 3 km ko'rinadigan darajada, sifatga qarab).
- Uzoqdagi narsalar arzon: baland kamerada uylar faqat sodda LOD / bitta instancing qatlami, daraxtlar siyrak, tuman (fog) masofaga mos; yer uzoq chunk'lari (`farGround`) bilan.
- Tepaga ko'tarilganda kamera biroz ko'proq tepadan qaraydi (burchak ~55–65°), xarita kabi o'qiladi.
- Perf: `node e2e/perf.mjs` oldin/keyin — **past sifatda ham 30 FPS dan tushmasin**; tushsa — `cityMax` ni pasaytir, lekin ≥ 400 m.

## 5. Uy ustidagi niklar — kattaroq va hammasi ko'rinsin, lekin xalaqit bermasin
Hozir bir vaqtda faqat 8 / 16 / 26 ta yorliq (`quality.ts` → `labels`) — egasi: saytga kirganda **hamma uylarning niki ko'rinib tursin**.
- Hamma egali uylar niki chiziladi (bitta **matn atlas + instanced sprite** — yuzlab yorliq ham arzon; DOM yorliq emas). Ekranda bir vaqtda ko'rinadiganlar chegarasi katta (masalan 300), ustuvorlik — kameraga yaqinlik.
- **O'lcham**: yaqinda katta va qalin (telefonda ~16–18 px), uzoqlashgan sari kichrayadi, lekin **kamida ~10 px** (o'qiladigan); juda balandda (≥ 400 m) — faqat ko'p uyli joylarda zichlik bo'yicha, yoki kichik nuqta + hover/bosganda nik.
- **Xalaqit bermasin**: yorliqlar bir-birining ustiga tushsa — uzoqrog'i yashiriladi (oddiy ekran-to'r bo'yicha declutter); oyna (panel) ochiq bo'lsa panel ostidagi yorliqlar xira; piyoda/mashina rejimida faqat yaqindagilar; o'z uyingiz yorlig'i doim ustida (sariq).
- Perf: 1 000 ta egali uy bilan (`DEMO=1` lokal) — FPS oldingidan ko'pi bilan 10% past.

## 6. Tanga paketlari — yozuvlar ustma-ust
Do'kon → ⭐ Premium → Tanga paketlari (va Tanga oynasidagi "Tanga sotib olish") kartalarida matnlar bir-birining ustiga chiqqan.
- Karta tuzilishi: tepada **tanga soni** (katta), ostida bonus ("+500 bonus"), keyin **⭐ narx**, pastda belgi ("Ommabop"/"Eng foydali") — burchakda emas, matn ustiga tushmasin; tugma "Botda sotib olish" kartaning pastida, to'liq kenglikda.
- 360 px, 390 px va ruscha matnda ham ustma-ust yo'q (e2e: elementlar to'rtburchaklari kesishmasligini tekshiruvchi test). Skrinshot `ui-tanga-paket.png`.

## Qabul sharti
- 1–6 bajarilgan; saytda/admin/botda "sinov/test" so'zi qidiruvda (`grep -ri "sinov\|test" ui matnlari`) yo'q (kod ichidagi test fayllari bundan mustasno).
- `npm test`, `typecheck`, `e2e`, `perf` (oldin/keyin), `screens`, `e2e/prod.mjs`; tekshiruvchi ✅; `ISHLAR.md` [x]; `PLAN.md` "Holat"; push; `HISOBOT.md`.
