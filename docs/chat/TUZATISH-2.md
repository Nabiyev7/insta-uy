# Tuzatish 2 — do'kon va interfeys (egasi, 2026-11-26)

> Kichik ish. 6c (bot) bilan bir sessiyada bajarilishi mumkin. Manba: egasining telefon skrinshoti (do'kon) va `docs/chat/ui-*.png` (25-noyabr 23:00).

## 1. So'mdagi narx do'kondan olib tashlanadi
- Do'kon pastidagi "5 000 so'm · Tez kunda" tugmasi va kartalardagi so'm narxi **ko'rinmaydi** (`PayButtons.tsx` va do'kon kartalari). Kod qoladi: `payments_enabled=true` bo'lganda qayta chiqadi (admin sinov rejimida ham faqat yoqilgan bo'lsa).
- Do'konda faqat tanga narxi va "Olish · N" tugmasi. Tanga yetmasa — "Yana X tanga kerak" + "Tanga olish" (Tanga oynasi).

## 2. Do'kon kategoriyalari — surish o'rniga 2 qator
Hozir tab qatori yonga suriladi: kompyuterda sichqoncha bilan surilmaydi, chetdagi tablar kesilib ustma-ust tushadi ("Ly…gi", "…sh").
- 8 ta tab (Yangi, Hovli, Bog', Mashina, Lyuks, Hayvonlar, To'plamlar, Maxsus) **2 qatorga, 4 tadan, bir xil kenglikda** — surish yo'q, hammasi doim ko'rinadi.
- Eng kichik ekranda (360 px) ham sig'sin: matn qisqa, kerak bo'lsa kichikroq shrift; ruscha nomlar ham sig'sin ("Наборы", "Особое"…). `e2e/ui.mjs` da 360 px va 1280 px da tablar kesilmasligi tekshirilsin.
- Boshqa joylarda ham surilib qoladigan tab qatori bo'lsa — xuddi shunday.

## 3. Admin sinov rejimi do'konda ishlamayapti (xato)
Egasining skrinshotida (admin, 50 010 tanga) bezaklarda "5-levelda" qulfi va "5-levelda ochiladi" tugmasi turibdi. `ShopPanel` `profile.test_mode` ni hisobga olmaydi.
- `test_mode` yoqiq bo'lsa: qulf belgisi yo'q, tugma "Olish · Sinov — bepul", istalgan bezak istalgan leveldagi uyga (server allaqachon ruxsat beradimi — tekshir, bermasa tuzat).
- Sinov rejimi bo'yicha **barcha** oynalarni tekshir (do'kon, bezash, kuchaytirish, mashinalar, tanga paketlari, salyut, uy olish) — biror joyda qulf qolmasin. Test: admin + sinov rejimi → 1-level uyga lyuks bezak.

## 4. Mayda tuzatishlar
1. **"Ekranni tozalash"** ikki joyda (Menyu va Sozlamalar) — faqat Menyu'da qoladi; Sozlamalarda faqat Til va Ovoz (TUZATISH-1, 11-band).
2. **Panel ichidagi aylantirish chizig'i** (scrollbar) kompyuterda qalin va oq — ingichka, to'q rangli yoki yashirin (telefondagidek).
3. **Yordam → "Qanday kiraman?"** — 6c dan keyin: "Botda «🏙 Shahar» tugmasini bosing — sayt Telegram ichida ochiladi". Yordam matni bot o'zgarishlariga moslansin.

## 5. Admin — faqat egasi, faqat Telegram orqali (egasi, 2026-11-26)
- **Admin panelga kirish faqat bot orqali**: `/admin` → bir martalik havola. Havola **faqat `ADMIN_TELEGRAM_ID`** ga beriladi (hozir `role !== 'user'` — moderatorlarga ham beradi; shuni tuzat). Boshqa hamma uchun bot "Bunday buyruq yo'q" deydi (admin borligini ham bildirmaydi).
- Admin paneldagi **login + parol shakli ishlab chiqarishda yo'q** (faqat `DEV=1` da lokal `admin/admin12345`). Admin panel sahifasi kirishsiz ochilsa — bo'sh oyna: "Telegram botda /admin yozing" (boshqa hech narsa).
- Server: `admin_*` RPC'lar faqat `role='admin'` **va** `telegram_id = ADMIN_TELEGRAM_ID` bo'lsa ishlaydi. Moderator roli hozircha ishlatilmaydi (kod qoladi, admin paneldan rol berish tugmasi yashiriladi).
- **Saytda admin izi bo'lmasin**: oddiy foydalanuvchi interfeysida admin paneliga havola, "Admin" so'zi, moderator tugmalari ko'rinmaydi. Admin uchun sayt ichidagi narsalar (sinov rejimi, chatda xabarni o'chirish/bloklash) **faqat egasining akkauntida** ko'rinadi. Bot buyruqlar ro'yxatida `/admin`, `/stat` va h.k. faqat egasining chatida (`setMyCommands` scope — 6c).
- Test: oddiy odam va (ilgari) moderator `/admin` → rad; boshqa Telegram'dagi admin roli → `admin_*` rad; ishlab chiqarish yig'ilishida admin parol shakli yo'q.

## 6. Do'konda alohida "Premium" bo'lim (egasi, 2026-11-26)
- Do'kon tepasida ikki qism: **"Tanga do'koni"** (hozirgi 8 kategoriya, faqat tanga) va **"⭐ Premium"** (faqat pul: karta so'm yoki Stars; **tangaga sotilmaydi**). Premium alohida rang/belgi bilan ajralib tursin (oltin hoshiya).
- Premium ichida 4 kategoriya (2-banddagidek tablar, surishsiz): **Uylar · Bezaklar · Mashinalar · Tanga paketlari**.
- **Tanga paketlari** — hozirgi 5 paket (TUZATISH-1, 7-band) shu yerga ko'chadi; Tanga oynasidagi "Tanga olish" ham shu tabni ochadi.
- **Uylar, Bezaklar, Mashinalar** — premium tovarlar **alohida, maxsus dizaynli** bo'ladi (oddiy tanga do'konidagilar emas); modellarni egasi bilan keyin Blender'da chizamiz (`KEYINGI.md`). Hozir:
  - katalogda `is_premium` belgisi (tanga narxi yo'q, faqat so'm + Stars; Stars ≥ 50 ⭐ qoidasi), admin panelda tovarni premium qilish va narx qo'yish;
  - premium tovar hali yo'q kategoriyada — chiroyli bo'sh karta: "Maxsus premium uylar tayyorlanmoqda · Tez kunda" (uz + ru);
  - premium bezak/mashina **level cheklovisiz** (1-level uyda ham — 6-qadam E dagi pulli bezak nuqtalari shu uchun);
  - premium uy kodi (TUZATISH-1, 6-band — yashirilgan) shu bo'limga ulanadi, lekin tovar qo'shilmaguncha ko'rinmaydi.
- To'lov o'chiq (`payments_enabled=false`): bo'lim **hammaga ko'rinadi**, narxlar ko'rinadi, tugmalar "Tez kunda". Admin sinov rejimida — "Sinov xaridi".
- Bot "🛍 Do'kon" (6c) premium tovarlarni ham ko'rsatadi (Stars bilan).
- Test: premium tovar tangaga olinmaydi (server rad); oddiy tovarda so'm narxi yo'q; bo'sh kategoriya kartasi; to'lov o'chiqda "Tez kunda".

## 7. Uy ustidagi nik — o'qiladigan bo'lsin (egasi, 2026-11-26)
Skrinshotlarda nik yorlig'i juda mayda, deyarli o'qilmaydi — loyihaning asosiy g'oyasi shu.
- Yaqinlashganda (≈ 60 m gacha) nik **katta va qalin** (telefonda ~14–16 px balandlik), oq fon + to'q matn, yumaloq yorliq; uzoqlashganda kichrayadi, ≈ 250 m dan keyin faqat nuqta/belgi (tezlik uchun, hozirgi LOD qoidasi saqlansin).
- **O'z uyingiz** niki ajralib tursin (sariq yorliq + 🏠 belgisi); level belgisi ("L5") yorliq ichida kichik.
- Bir vaqtda ko'rinadigan yorliqlar soni chegarasi qoladi (kuchsiz telefon); ustma-ust tushsa — yaqinrog'i ustida.
- Perf yomonlashmasin (`node e2e/perf.mjs` oldin/keyin).

## 8. Saytga kelganlarni sanash — Cloudflare Web Analytics (bepul)
- Saytga Cloudflare Web Analytics skripti (cookie'siz, bepul); token `VITE_CF_ANALYTICS` sozlamasidan — bo'sh bo'lsa skript qo'shilmaydi (lokalda yo'q).
- Admin panel "Umumiy" sahifasiga havola va qisqa izoh. 12-qadamda egasi token oladi (`INTERNET-PROMT.md` ga qo'sh).
- Qayerdan kelgani: Instagram bio va reels havolalariga `?from=bio`, `?from=reels` belgisi; sayt uni bir marta saqlaydi va akkaunt ochilganda profilga yozadi (`source`). Admin "Umumiy"da: manbalar bo'yicha yangi foydalanuvchilar soni (7 kun).
- Maxfiylik sahifasiga bir qator: "Anonim tashrif statistikasi (Cloudflare) yig'iladi".

## 9. Bo'sh shahar — jonliroq boshlanish
Ochilishda hali hech kim uy olmagan, shahar bo'sh ko'rinadi.
- Markaziy maydonga eng yaqin bo'sh joylarda (ochiq tumanlarda) **"Bu joy sizni kutyapti"** — sekin yonib-o'chadigan yorqin "+" va kichik bayroqcha (hozirgi taxtacha o'rniga emas, unga qo'shimcha; faqat eng yaqin ~20 ta joyda, tezlik uchun).
- Ekranning yuqorisida (mehmon va yangi odam uchun) kichik hisoblagich: **"Bugun N kishi uy oldi · jami M"**; 0 bo'lsa — "Birinchilardan bo'ling!" Bosilsa — eng yaqin bo'sh joyga uchadi.
- Yangi uy qurilganda boshqalar ekranida 3 soniyalik kichik xabar: "@nik hozirgina uy oldi" (kuniga ko'p bo'lsa — daqiqasiga ko'pi bilan 1 ta).
- Hammasi admin sozlamasida o'chiriladi.

## Qabul sharti
- `npm test`, `npm run typecheck`, `npm run e2e`, `npm run screens` (do'kon 2 qator tab bilan, so'm narxsiz; admin sinov rejimida qulfsiz skrinshot `ui-dokon-sinov.png`).
- `ISHLAR.md` [x], `PLAN.md` "Holat", commit: `fix: tuzatish 2 — do'kondan so'm narxi olindi, kategoriyalar 2 qatorda, sinov rejimi do'konda, admin faqat egasi Telegram orqali, premium bo'lim, nik yorlig'i, analitika, jonli boshlanish`.
