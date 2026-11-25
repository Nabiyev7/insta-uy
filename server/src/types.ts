/** Worker muhiti. Maxfiy qiymatlar faqat `wrangler secret` / .env orqali. */
export interface Env {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_SERVICE_KEY: string;
  readonly SITE_URL: string;
  readonly ALLOWED_ORIGINS: string;
  readonly TELEGRAM_TOKEN?: string;
  readonly TELEGRAM_BOT?: string;
  /** Yangiliklar kanali (@siz). */
  readonly TELEGRAM_CHANNEL?: string;
  /** Admin panel manzili (botning /admin havolasi uchun). */
  readonly ADMIN_URL?: string;
  readonly TELEGRAM_WEBHOOK_SECRET?: string;
  readonly ADMIN_TELEGRAM_ID?: string;
  readonly BANK_BOT?: string;
  readonly BANK_SECRET?: string;
  readonly PAYME_KEY?: string;
  readonly CLICK_SECRET?: string;
  readonly CLICK_SERVICE_ID?: string;
  readonly META_TOKEN?: string;
  readonly META_MEDIA_IDS?: string;
  /** Kod va tokenlarni xeshlash uchun tuz. */
  readonly HASH_SECRET: string;
  /** Faqat lokal: Telegram'siz sinash. */
  readonly DEV?: string;
}

export interface AuthUser { readonly id: string; readonly email: string }

/** Supabase ustidagi yupqa qatlam (Repository). Testda soxtasi ishlatiladi. */
export interface Backend {
  rpc<T = unknown>(fn: string, args?: Readonly<Record<string, unknown>>): Promise<T>;
  createUser(email: string, password: string): Promise<AuthUser>;
  setPassword(userId: string, password: string): Promise<void>;
  deleteUser(userId: string): Promise<void>;
  magicToken(email: string): Promise<string>;
  userByJwt(jwt: string): Promise<AuthUser | null>;
  emailOf(userId: string): Promise<string | null>;
  putFile(bucket: string, path: string, body: string, contentType: string): Promise<void>;
}

export interface Telegram {
  send(chat: number, text: string, buttons?: readonly TgButton[]): Promise<void>;
  answer(callbackId: string, text: string): Promise<void>;
  video(chat: number, url: string, caption: string): Promise<void>;
  /** Kanal a'zosimi (bot kanalda admin bo'lishi kerak). */
  isMember(channel: string, user: number): Promise<boolean>;
}
export interface TgButton { readonly text: string; readonly data?: string; readonly url?: string }

export interface Ctx {
  readonly env: Env;
  readonly db: Backend;
  readonly tg: Telegram | null;
  readonly ip: string;
  readonly fetch: typeof fetch;
}

export class HttpError extends Error {
  readonly status: number;
  constructor(status: number, code: string) {
    super(code);
    this.status = status;
  }
}
