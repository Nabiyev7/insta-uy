# ISHLAR — Claude Code uchun navbatdagi vazifalar

> Egasi bilan kelishilgan (2026-11-24). Avval `CLAUDE.md` va `PLAN.md` ni to'liq o'qi.
> Quyidagi qadamlarni **ketma-ket, o'zing to'xtamasdan** bajar. Har qadam tugagach shu fayldagi ro'yxatda `[ ]` ni `[x]` ga almashtir — limit tugab qolsa, keyingi sessiya shu yerdan davom etadi.

## Umumiy uslub (hamma qadamlarga tegishli)

Dizayn **Farg'ona yoki boshqa bir hududga bog'lanmaydi** — **umumiy, universal** shahar: zamonaviy va klassik uylar, ochiq ranglar, toza shakllar. Milliy elementlar (naqsh, ayvon, so'ri, tandir, gumbaz) **majburiy emas** — ular faqat do'kondagi ixtiyoriy bezaklarning bir qismi bo'lib qoladi.
- 1-qadamda `PLAN.md` §3 dagi "Farg'ona vodiysi ruhi" va `CHAT-UCHUN.md` dagi shunga o'xshash qatorlar "umumiy, universal uslub" ga almashtirilsin.
- Promtlarda milliy uslub talab qilingan joy qolgan bo'lsa — bu bo'lim ustun turadi.

## ⏸ TO'XTATILDI (2026-11-24)
Egasi ishni bosqichlarga bo'ldi: `docs/chat/BOSQICHLAR.md`. Bu ro'yxatdagi **6 va 7-qadamlar hozir bajarilmaydi** (keyingi bosqichlarda). Yangi vazifa — 1-bosqich (xarita), uning promti alohida beriladi.

## Ro'yxat

- [x] **0. Tayyorgarlik** — `docs/chat/agentlar/tekshiruvchi.md` ni `.claude/agents/tekshiruvchi.md` ga ko'chir, commit qil.
- [x] **1. Uylar va yangi bosh reja** — `docs/chat/UYLAR-PROMT.md`
- [x] **2. Markaz** — `docs/chat/MARKAZ-PROMT.md`
- [x] **3. Harakat va ekran** — `docs/chat/BEZAK-HARAKAT-PROMT.md`, faqat 1-bosqich
- [x] **4. Bezaklar tizimi** — `docs/chat/BEZAK-HARAKAT-PROMT.md`, faqat 2-bosqich
- [x] **5. Yangi bezaklar va sotuv** — `docs/chat/BEZAK-HARAKAT-PROMT.md`, faqat 3-bosqich
- [ ] **6. Kirish, tanga, referal, zaxira** — `docs/chat/IQTISOD-PROMT.md`
- [ ] **7. Yuklamani taqsimlash** — `docs/chat/YUKLAMA-PROMT.md`
- [x] **8. Xarita: shaharni qurish (CityLand UZ)** — `docs/chat/XARITA-PROMT.md`
- [x] **9. Bo'sh uchastkalar, yangi uylar 1–5, bezaklar** — `docs/chat/UYLAR-BEZAK-PROMT.md`
- [x] **10. Lyuks bezaklar (7-leveldan)** — `docs/chat/BEZAK-LYUKS-PROMT.md`
- [ ] **11. Yangi interfeys** — `docs/chat/INTERFEYS-PROMT.md`

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
