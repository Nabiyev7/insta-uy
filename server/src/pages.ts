import { z } from 'zod';
import { HttpError, type Ctx } from './types.ts';
import { escapeHtml, json, limit, readJson } from './util.ts';

const waitlistSchema = z.object({ instagram: z.string().max(80), contact: z.string().max(80).optional() });
export const waitlist = async (req: Request, ctx: Ctx): Promise<Response> => {
  const body = await readJson(req, waitlistSchema);
  await limit(ctx, 'wait', 10, 3600);
  const nick = body.instagram.trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/[/?#].*$/, '');
  return json({ ok: true, count: await ctx.db.rpc<number>('svc_waitlist', { p_instagram: nick, p_contact: body.contact ?? null }) });
};

interface PlotInfo { readonly id: string; readonly address: string; readonly instagram: string | null }

/** Link oldindan ko'rinishi: /uy/P0001 → OG teglar, so'ng 3D saytga. */
export const housePage = async (_req: Request, ctx: Ctx, id: string): Promise<Response> => {
  if (!/^P\d{4}$/.test(id)) throw new HttpError(404, 'not_found');
  const plot = await ctx.db.rpc<PlotInfo | null>('api_plot', { p_plot: id });
  if (!plot) throw new HttpError(404, 'not_found');
  const site = ctx.env.SITE_URL.replace(/\/$/, '');
  const target = `${site}/?uy=${id}`;
  const title = escapeHtml(plot.instagram ? `@${plot.instagram} ning uyi` : "Bo'sh uy");
  const desc = escapeHtml(`${plot.address} — CityLand UZ`);
  const html = `<!doctype html><html lang="uz"><head><meta charset="utf-8"><title>${title}</title>
<meta property="og:title" content="${title}"><meta property="og:description" content="${desc}"><meta property="og:image" content="${site}/og.png">
<meta property="og:url" content="${site}/uy/${id}"><meta property="og:type" content="website"><meta name="twitter:card" content="summary_large_image">
<meta http-equiv="refresh" content="0;url=${target}"></head><body><a href="${target}">${title}</a></body></html>`;
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=600' } });
};
