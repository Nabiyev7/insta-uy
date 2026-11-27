# ISHLAR — Claude Code uchun navbatdagi vazifalar

> Egasi bilan kelishilgan (2026-11-24). Avval `CLAUDE.md` va `PLAN.md` ni to'liq o'qi.
> Quyidagi qadamlarni **ketma-ket, o'zing to'xtamasdan** bajar. Har qadam tugagach shu fayldagi ro'yxatda `[ ]` ni `[x]` ga almashtir — limit tugab qolsa, keyingi sessiya shu yerdan davom etadi.

## Umumiy uslub (hamma qadamlarga tegishli)

Dizayn **Farg'ona yoki boshqa bir hududga bog'lanmaydi** — **umumiy, universal** shahar: zamonaviy va klassik uylar, ochiq ranglar, toza shakllar. Milliy elementlar (naqsh, ayvon, so'ri, tandir, gumbaz) **majburiy emas** — ular faqat do'kondagi ixtiyoriy bezaklarning bir qismi bo'lib qoladi.
- 1-qadamda `PLAN.md` §3 dagi "Farg'ona vodiysi ruhi" va `CHAT-UCHUN.md` dagi shunga o'xshash qatorlar "umumiy, universal uslub" ga almashtirilsin.
- Promtlarda milliy uslub talab qilingan joy qolgan bo'lsa — bu bo'lim ustun turadi.

## Joriy vazifa
Ish bosqichlarga bo'lingan: `docs/chat/BOSQICHLAR.md`. 6, 6a–6e bajarildi. **Navbatdagi: 12-qadam — `docs/chat/INTERNET-PROMT.md`** (egasi akkauntlar tayyor deganda). 7-qadam betadan keyin. (2026-11-26)

## Ro'yxat

- [x] **0. Tayyorgarlik** — `docs/chat/agentlar/tekshiruvchi.md` ni `.claude/agents/tekshiruvchi.md` ga ko'chir, commit qil.
- [x] **1. Uylar va yangi bosh reja** — `docs/chat/UYLAR-PROMT.md`
- [x] **2. Markaz** — `docs/chat/MARKAZ-PROMT.md`
- [x] **3. Harakat va ekran** — `docs/chat/BEZAK-HARAKAT-PROMT.md`, faqat 1-bosqich
- [x] **4. Bezaklar tizimi** — `docs/chat/BEZAK-HARAKAT-PROMT.md`, faqat 2-bosqich
- [x] **5. Yangi bezaklar va sotuv** — `docs/chat/BEZAK-HARAKAT-PROMT.md`, faqat 3-bosqich
- [x] **6. Kirish (bot), uy olish, tanga, premium** — `docs/chat/BOSQICH-2-3-PROMT.md` (eski `IQTISOD-PROMT.md` o'rniga; zid joyda yangisi ustun)
- [ ] **7. Yuklamani taqsimlash** — `docs/chat/YUKLAMA-PROMT.md`
- [x] **8. Xarita: shaharni qurish (CityLand UZ)** — `docs/chat/XARITA-PROMT.md`
- [x] **9. Bo'sh uchastkalar, yangi uylar 1–5, bezaklar** — `docs/chat/UYLAR-BEZAK-PROMT.md`
- [x] **10. Lyuks bezaklar (7-leveldan)** — `docs/chat/BEZAK-LYUKS-PROMT.md`
- [x] **11. Yangi interfeys** — `docs/chat/INTERFEYS-PROMT.md`
- [x] **6a. Tuzatish 1 (sinovdan)** — `docs/chat/TUZATISH-1.md` (6-qadam tugagach, 12-qadamdan oldin)
- [x] **6b. Qo'shimcha 1** — `docs/chat/QOSHIMCHA-1.md` (6a dan keyin, 12-qadamdan oldin)
- [x] **6c. Telegram bot** — `docs/chat/BOT-PROMT.md` (12-qadamdan oldin)
- [x] **6d. Tuzatish 2 (do'kon)** — `docs/chat/TUZATISH-2.md` (6c bilan birga)
- [x] **6e. Tuzatish 3** — `docs/chat/TUZATISH-3.md` (12-qadamdan oldin)
- [x] **6f. Tuzatish 4 (telefon sinovidan)** — `docs/chat/TUZATISH-4.md`
- [x] **12. Internetga chiqarish (beta)** — `docs/chat/INTERNET-PROMT.md` (sayt, bot, Render ishlayapti; egasi telefonda sinadi)
- [x] **13. Haqiqiy ochilish** — `docs/chat/OCHILISH-PROMT.md` (Stars, tozalash, minimal yuklama, kuzatuv, ochilish kuni)
- [x] **14. Tuzatish 5 — haqiqiy loyiha** — `docs/chat/TUZATISH-5.md` (admin huquqlari, "+", sinov ma'lumotlarini o'chirish, baland kamera, niklar, tanga paketlari)
- [x] **15. Tuzatish 6 — narxlar −50%, bezak levellari, joylar, chegirmalar, admin katalog** — `docs/chat/TUZATISH-6.md`
- [ ] **16. Instagram: postlar** — `docs/chat/INSTAGRAM-PROMT.md` (faqat 0, 0.1 va 1-bo'limlar — postlar; **2–3-bo'lim (promo video, reels) hozircha QILINMAYDI**)
- [ ] **17. Foto rejimi: oltin soat, tun, maket effekti** — `docs/chat/FOTO-PROMT.md`
- [ ] **18. Video: "qurilish va yangi egasi" ssenariysi** — `docs/chat/VIDEO-QURILISH-PROMT.md` — **KEYINGA QOLDIRILDI** (egasi, 2026-11-27: avval takomillashtiramiz, keyin ishga tushiriladi; hozir tegma)

## Har qadamdan keyin

1. **Tekshiruv:** `tekshiruvchi` agentini ishga tushir. Agar bu sessiyada u hali ko'rinmasa — tekshiruvni umumiy (general-purpose) yordamchi agentga ber va unga `docs/chat/agentlar/tekshiruvchi.md` dagi yo'riqnomani to'liq ko'rsat. Tekshiruvchi kodni o'zgartirmaydi.
2. **Tuzatish:** ❌ bo'lsa — tuzat va qayta tekshir. Ko'pi bilan 2 marta; hal bo'lmasa muammoni `docs/chat/SAVOLLAR.md` ga yoz va keyingi qadamga o't.
3. **Holat:** `PLAN.md` "Holat" bo'limiga qadam tugaganini yoz; shu fayldagi ro'yxatda belgini qo'y.
4. **Commit:** xabarda qadam raqami va nomi bo'lsin (masalan `feat: 1-qadam — katta hovlilar, bosh reja v2`).

## Rasmlar

- 1-qadamdan keyin: `docs/chat/xarita.jpg` va `docs/chat/levellar.jpg` yangi rasmlar bilan almashtirilsin.
- 2-qadamdan keyin: `docs/chat/markaz-3d.jpg`.
- 3-qadamdan keyin: telefon o'lchamida (360×640) saytning Shahar, Piyoda va Mashina rejimidagi skrinshotlari → `docs/chat/ekran-*.png`.
- 5-qadamdan keyin: yangi bezaklar showcase rasmi → `docs/chat/bezaklar.jpg`.

## Qaror kerak bo'lsa

Promtda javob bo'lmasa — `PLAN.md` §2 qoidalarini buzmaydigan **eng xavfsiz** variantni tanla, uni `docs/chat/SAVOLLAR.md` ga (savol + nimani tanlading + nega) yoz va davom et. Egasini kutib to'xtama.

Istisno: bosh reja qulfi faqat `UYLAR-PROMT.md` da berilgan bir martalik ruxsat doirasida ochiladi. Boshqa hech bir qadamda uchastka joylariga tegilmaydi.

## Oxirida

Qisqa hisobot (o'zbekcha, sodda — egasi dasturchi emas):
- har qadamda nima qilindi (2–3 qatordan);
- tekshiruvchi natijalari;
- hal bo'lmagan muammolar;
- `SAVOLLAR.md` dagi savollar;
- telefon tezligi (perf) oldin/keyin.

Hisobotni `docs/chat/HISOBOT.md` ga ham yoz.
