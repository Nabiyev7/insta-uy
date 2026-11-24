# Lyuks (qimmat) bezaklar — 7-leveldan (egasi bilan kelishilgan, 2026-11-24)

> 9-qadam (`UYLAR-BEZAK-PROMT.md`) tugagandan keyin bajariladi — o'sha bezak tizimi va joy nuqtalariga qo'shimcha.
> Namuna: `blender/uslub-v2.blend` — sahnalar **"Bezaklar qimmat"** va **"Uy L5 lyuks"**; kod — shu fayldagi `bezak_lib` matnining oxiridagi yangi funksiyalar (`pavilyon`, `gril_oshxona`, `basseyn_lux`, `mashina_lux`, `favvora_lux`, `bog_lux`, `daraxt_lux`). Rasmlar: `docs/chat/bezaklar-qimmat.png`, `uy-L5-lyuks.png`. Kod orqali `blender/scripts/` ga ko'chir.

## Qoidalar
- **Oddiy bezaklar** (9-qadamdagi 15 ta) — 5-leveldan.
- **Lyuks bezaklar — 7-leveldan** (do'konda 5–6-levelda qulf belgisi bilan "7-levelda ochiladi").
- Lyuks bezak o'zining oddiy jufti bilan **bir xil joy nuqtasiga** tushadi (basseyn ↔ lyuks basseyn va h.k.).

## 9 ta lyuks bezak
| Lyuks | Oddiy jufti | Joy nuqtasi | Narx (tanga, boshlang'ich) |
|---|---|---|---|
| Pavilyon (marmar, ustunlar, divan, chiroqlar) | Besedka | old_hovli_chap | 8 000 |
| Gril oshxona | Mangal | old_hovli_ong | 4 000 |
| Lyuks basseyn + jakuzi (suv osti chiroqlari, 4 shezlong) | Basseyn | old_hovli_chap | 10 000 |
| Marmar favvora (2 qavat, oltin shar va baliqlar) | Hovuz + favvora | old_hovli_ong yoki markaz | 6 000 |
| Fransuz bog'i (gul to'shaklari, oltin haykal, sarvlar) | Gulzor | old_hovli_chap/ong | 5 000 |
| Limuzin | Sedan | garaj_oldi | 12 000 |
| Superkar | Sport | garaj_oldi | 15 000 |
| Lyuks jip | Krossover | garaj_oldi | 10 000 |
| Tuvakdagi daraxt (marmar tuvak, oltin hoshiya) | Mevali daraxt | burchak / eshik oldi | 3 000 |

- Oddiy mashinalar narxi: 1 000–2 500. Hamma narx admin panelda.
- Lyuks bezaklar keyinchalik **pulga sotiladigan noyob narsalar** qatoriga ham qo'shilishi mumkin (`TOLOV.md`) — hozir faqat tanga.
- Lyuks mashinalar mashina rejimida haydaladi (bor mantiq).
- Uchburchak: har biri ≤ 600 (basseyn va pavilyon ≤ 900), LOD bilan; oltin/marmar — tekis rang materiallar (yangi tekstura yo'q). Kechasi yonadigan qismlar (chiroqlar, suv osti) — mavjud tungi emissiya tizimi orqali.

## Qabul sharti
- 9 ta lyuks bezak katalogda, faqat 7+ level uyga qo'yiladi; 5–6-levelda qulf ko'rinadi.
- Joy nuqtalarida uyga va bir-biriga tegmaydi (test, 7–10-level uchun).
- `npm test`, `npm run typecheck`; `perf.mjs` yomonlashmagan; tekshiruvchi ✅.
- Rasm: `docs/chat/bezaklar-lyuks.jpg` (showcase). `ISHLAR.md`, `PLAN.md` "Holat", commit.
