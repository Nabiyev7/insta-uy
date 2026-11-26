/** `npm run bot:setup` — bot buyruqlari (uz/ru, admin alohida), tavsifi, Menu tugmasi (Mini App) va webhook. Qiymatlar muhitdan; token hech qayerga yozilmaydi. */
import { botSetup } from '../src/botSetup.ts';

const need = (key: string): string => {
  const v = process.env[key]?.trim();
  if (!v) throw new Error(`${key} kerak (muhit o'zgaruvchisi)`);
  return v;
};

const done = await botSetup(need('TELEGRAM_TOKEN'), {
  siteUrl: need('SITE_URL').replace(/\/$/, ''),
  apiUrl: need('API_URL').replace(/\/$/, ''),
  webhookSecret: need('TELEGRAM_WEBHOOK_SECRET'),
  adminTelegramId: Number(process.env.ADMIN_TELEGRAM_ID) || undefined,
});
process.stdout.write(`Bot sozlandi: ${done.join(', ')}\n`);
