export interface Issue {
  readonly week: string;
  readonly content: {
    readonly new_count: number; readonly new: readonly string[]; readonly top: { readonly instagram: string; readonly score: number } | null; readonly streets: readonly string[];
    readonly projects: readonly { readonly uz: string; readonly pct: number }[]; readonly total: number;
  };
}

/** Niklar foydalanuvchidan keladi — HTML'ga faqat ekranlangan holda kiradi. */
const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);

const page = (kicker: string, title: string, body: string): string => `<!doctype html><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0}body{width:1080px;height:1350px;background:#14545f;color:#fdf6e6;font-family:"Segoe UI",system-ui,sans-serif;padding:110px 90px 90px;display:flex;flex-direction:column;gap:36px;border-top:34px solid;border-image:repeating-conic-gradient(from 45deg,#e3b34d 0 25%,#b5452f 0 50%) 34}
small{font-size:36px;color:#f3cd68;font-weight:700;letter-spacing:.04em}h1{font-size:104px;line-height:1;font-weight:800}li{font-size:50px;list-style:none;padding:14px 0;border-bottom:3px solid rgba(253,246,230,.18);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}p{font-size:54px;line-height:1.3}b.big{font-size:260px;line-height:.9;color:#f3cd68}footer{margin-top:auto;font-size:34px;opacity:.75}
.bar{height:34px;background:rgba(253,246,230,.16);border-radius:17px;overflow:hidden;margin-top:12px}.bar i{display:block;height:100%;background:#f3cd68}</style><small>${esc(kicker)}</small><h1>${esc(title)}</h1>${body}<footer>Obunachilar shahri</footer>`;

export const slides = ({ week, content: c }: Issue): string[] => {
  const kicker = `SHAHAR GAZETASI · ${week}`;
  return [
    page(kicker, 'Bu hafta shaharda', `<b class="big">+${c.new_count}</b><p>yangi uy. Jami aholi: ${c.total}</p>`),
    ...(c.new.length > 0 ? [page(kicker, "Yangi qo'shnilar", `<ul>${c.new.slice(0, 11).map((n) => `<li>@${esc(n)}</li>`).join('')}</ul>`)] : []),
    ...(c.top ? [page(kicker, 'Hafta uyi', `<p style="font-size:84px;font-weight:800;overflow-wrap:anywhere">@${esc(c.top.instagram)}</p><p>Hashamat bali: ${c.top.score}</p>`)] : []),
    ...(c.streets.length > 0 ? [page(kicker, "Yangi ko'cha nomlari", `<ul>${c.streets.slice(0, 11).map((s) => `<li>${esc(s)}</li>`).join('')}</ul>`)] : []),
    ...(c.projects.length > 0 ? [page(kicker, 'Umumiy qurilish', c.projects.map((p) => `<div><p>${esc(p.uz)} — ${Math.min(100, p.pct)}%</p><div class="bar"><i style="width:${Math.min(100, Math.max(0, p.pct))}%"></i></div></div>`).join(''))] : []),
    page(kicker, 'Sizning uyingiz qani?', '<p>Profil havolasidan kiring va bo\'sh uyni bepul oling.</p>'),
  ];
};
