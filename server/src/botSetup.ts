/** Bot profili — avtomatik sozlash (12-qadamda deploy'dan keyin `npm run bot:setup`). Takror ishga tushirilsa xavfsiz: har chaqiruv o'rnatadi, qo'shmaydi. */
import { bt, type Lang, type TextKey } from './botText.ts';
import type { Ctx } from './types.ts';
import { json, safeEqual } from './util.ts';

export interface BotSetupOptions {
  readonly siteUrl: string;
  /** Worker manzili: webhook `${apiUrl}/telegram/webhook`. */
  readonly apiUrl: string;
  readonly webhookSecret: string;
  /** Egasining Telegram ID si — admin buyruqlari faqat shu chatda. */
  readonly adminTelegramId?: number;
}

const USER_COMMANDS: readonly (readonly [string, TextKey])[] = [['start', 'cmdStart'], ['dokon', 'cmdShop'], ['taklif', 'cmdInvite'], ['yordam', 'cmdSupport'], ['sozlamalar', 'cmdSettings']];
const ADMIN_COMMANDS: readonly (readonly [string, TextKey])[] = [['admin', 'cmdAdmin'], ['stat', 'cmdStat'], ['hammaga', 'cmdBroadcast'], ['murojaatlar', 'cmdTickets'], ['nizolar', 'cmdDisputes']];
export const commandsFor = (lang: Lang, isAdmin: boolean): readonly { readonly command: string; readonly description: string }[] =>
  [...USER_COMMANDS, ...(isAdmin ? ADMIN_COMMANDS : [])].map(([command, key]) => ({ command, description: bt(lang, key) }));

/** Bajariladigan Telegram chaqiruvlari ro'yxati (sinovda ham shu tekshiriladi). */
export const setupCalls = (o: BotSetupOptions): readonly (readonly [method: string, body: Readonly<Record<string, unknown>>])[] => {
  const langs: readonly (readonly [Lang, string | undefined])[] = [['uz', undefined], ['ru', 'ru']];
  const perLang = langs.flatMap(([lang, code]) => {
    const withCode = code ? { language_code: code } : {};
    return [
      ['setMyCommands', { commands: commandsFor(lang, false), scope: { type: 'default' }, ...withCode }],
      ...(o.adminTelegramId ? [['setMyCommands', { commands: commandsFor(lang, true), scope: { type: 'chat', chat_id: o.adminTelegramId }, ...withCode }] as const] : []),
      ['setMyDescription', { description: bt(lang, 'description'), ...withCode }],
      ['setMyShortDescription', { short_description: bt(lang, 'shortDescription'), ...withCode }],
    ] as const;
  });
  return [
    ...perLang,
    ['setChatMenuButton', { menu_button: { type: 'web_app', text: bt('uz', 'btnCity'), web_app: { url: `${o.siteUrl}/` } } }],
    ['setWebhook', { url: `${o.apiUrl}/telegram/webhook`, secret_token: o.webhookSecret, allowed_updates: ['message', 'callback_query', 'pre_checkout_query'], drop_pending_updates: false }],
  ];
};

export const botSetup = async (token: string, o: BotSetupOptions, fetcher: typeof fetch = fetch): Promise<readonly string[]> => {
  const done: string[] = [];
  for (const [method, body] of setupCalls(o)) {
    const res = await fetcher(`https://api.telegram.org/bot${token}/${method}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const r = (await res.json().catch(() => ({}))) as { ok?: boolean; description?: string };
    if (!res.ok || r.ok === false) throw new Error(`${method}: ${r.description ?? res.status}`);
    done.push(method);
  }
  return done;
};

/** POST /bot/setup — server o'zi sozlaydi: token Cloudflare maxfiy kaliti bo'lib qoladi, hech qayerga chiqmaydi.
 *  Faqat `x-setup-secret: <TELEGRAM_WEBHOOK_SECRET>` bilan (kalit faqat egasining kompyuterida). Takror chaqirsa bo'ladi. */
export const setupRoute = async (req: Request, ctx: Ctx): Promise<Response> => {
  const secret = ctx.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || !ctx.env.TELEGRAM_TOKEN || !safeEqual(req.headers.get('x-setup-secret') ?? '', secret)) return json({ error: 'forbidden' }, 403);
  const done = await botSetup(ctx.env.TELEGRAM_TOKEN, {
    siteUrl: ctx.env.SITE_URL.replace(/\/$/, ''), apiUrl: new URL(req.url).origin, webhookSecret: secret, adminTelegramId: Number(ctx.env.ADMIN_TELEGRAM_ID) || undefined,
  }, ctx.fetch);
  return json({ ok: true, done });
};

