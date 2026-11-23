# Yo'riqnoma

Bu loyihaning yagona yo'riqnomasi — [PLAN.md](PLAN.md). Ishni boshlashdan oldin uni to'liq o'qi (ayniqsa §2 qoidalar va "Holat" bo'limi).
Ishga tushirish va arxitektura: [README.md](README.md).

## Tekshiruvchi agent (`.claude/agents/tekshiruvchi.md`)

- Promtlar (`docs/chat/`) shu ketma-ketlikda bajariladi: `UYLAR` → `MARKAZ` → `BEZAK-HARAKAT` → `IQTISOD`.
- Ishni o'zing bajar (boshqa agentlarga bo'lish shart emas).
- Har promt tugagach `tekshiruvchi` agentini ishga tushir. U kodni o'zgartirmaydi, faqat ✅/❌ hisobot beradi. ❌ bo'lsa — tuzat va qayta tekshir.
- Keyin `PLAN.md` "Holat" va git commit.
