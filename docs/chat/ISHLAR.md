# ISHLAR — Claude Code uchun navbatdagi vazifalar

> Egasi bilan kelishilgan (2026-11-24). Avval `CLAUDE.md` va `PLAN.md` ni to'liq o'qi.
> Quyidagi qadamlarni **ketma-ket, o'zing to'xtamasdan** bajar. Har qadam tugagach shu fayldagi ro'yxatda `[ ]` ni `[x]` ga almashtir — limit tugab qolsa, keyingi sessiya shu yerdan davom etadi.

## Ro'yxat

- [ ] **0. Tayyorgarlik** — `docs/chat/agentlar/tekshiruvchi.md` ni `.claude/agents/tekshiruvchi.md` ga ko'chir, commit qil.
- [ ] **1. Uylar va yangi bosh reja** — `docs/chat/UYLAR-PROMT.md`
- [ ] **2. Markaz** — `docs/chat/MARKAZ-PROMT.md`
- [ ] **3. Harakat va ekran** — `docs/chat/BEZAK-HARAKAT-PROMT.md`, faqat 1-bosqich
- [ ] **4. Bezaklar tizimi** — `docs/chat/BEZAK-HARAKAT-PROMT.md`, faqat 2-bosqich
- [ ] **5. Yangi bezaklar va sotuv** — `docs/chat/BEZAK-HARAKAT-PROMT.md`, faqat 3-bosqich
- [ ] **6. Kirish, tanga, referal, zaxira** — `docs/chat/IQTISOD-PROMT.md`

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
