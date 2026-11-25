import { useState, type FormEvent } from 'react';
import { post, signIn } from '../app/api.ts';
import { useT } from '../app/i18n.ts';
import { finishAuth, getApp, setting } from '../app/store.ts';
import { rememberPanel } from '../app/login.ts';
import { Icon } from './icons.tsx';
import { Field, Sheet, useAction } from './kit.tsx';

export const refCode = (): string | null => {
  try {
    return sessionStorage.getItem('ref');
  } catch {
    return null;
  }
};

/** Bot havolasi: yangi odam — nik so'raladi, eski — darhol kirish havolasi keladi. */
export const botLink = (bot: string): string => {
  const ref = refCode();
  return `https://t.me/${bot}?start=${ref ? `r_${ref}` : 'login'}`;
};

interface DevSent { readonly sent: readonly { readonly text: string; readonly buttons: readonly { readonly url?: string }[] }[] }
const devSay = async (id: number, text: string): Promise<string | null> => {
  const r = await post<DevSent>('/dev/telegram', { message: { message_id: 1, from: { id, first_name: 'Sinov' }, chat: { id, type: 'private' }, text } });
  const url = r.sent.flatMap((m) => m.buttons).find((b) => b.url?.includes('kirish='))?.url;
  return url ? new URL(url).searchParams.get('kirish') : null;
};

/** Faqat lokal (npm run dev): Telegramsiz bot suhbatini sinash — o'sha bot kodi ishlaydi. */
function DevLogin(): React.JSX.Element {
  const { isBusy, run } = useAction();
  const [id, setId] = useState('');
  const [nick, setNick] = useState('');
  const submit = (e: FormEvent): void => {
    e.preventDefault();
    void run(async () => {
      const tg = Number(id);
      const token = (await devSay(tg, '/start login')) ?? (await devSay(tg, nick));
      if (!token) throw new Error('nick_taken');
      rememberPanel(getApp().trail.at(-1) ?? null);
      location.assign(`${location.pathname}?kirish=${token}`);
    });
  };
  return (
    <form className="section dev-login" onSubmit={submit}>
      <p className="muted">Lokal sinov: bot o‘rniga</p>
      <Field label="Telegram ID"><input value={id} onChange={(e) => setId(e.target.value)} inputMode="numeric" pattern="\d{1,12}" required /></Field>
      <Field label="Instagram nik"><input value={nick} onChange={(e) => setNick(e.target.value)} autoCapitalize="none" maxLength={30} /></Field>
      <button type="submit" className="btn block" disabled={isBusy}>Sinov kirish</button>
    </form>
  );
}

/** Eski (parolli) akkauntlar uchun — Telegram ulanmaguncha faqat ko'rish mumkin. */
function LegacyLogin(): React.JSX.Element {
  const t = useT();
  const { isBusy, run } = useAction();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const submit = (e: FormEvent): void => {
    e.preventDefault();
    void run(() => signIn(login, password)).then((ok) => ok && finishAuth());
  };
  return (
    <details className="section legacy-login">
      <summary>{t('oldAccount')}</summary>
      <form onSubmit={submit}>
        <Field label={t('loginField')}><input value={login} onChange={(e) => setLogin(e.target.value)} autoCapitalize="none" autoComplete="username" required maxLength={24} /></Field>
        <Field label={t('password')}><input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="current-password" required minLength={8} /></Field>
        <button type="submit" className="btn block" disabled={isBusy}>{t('login')}</button>
      </form>
    </details>
  );
}

export function AuthPanel(): React.JSX.Element {
  const t = useT();
  const bot = setting('telegram_bot', '');
  return (
    <Sheet title={t('login')}>
      <div className="section">
        <p>{t('tgHow')}</p>
        {bot
          ? <a className="btn gold block big" href={botLink(bot)} target="_blank" rel="noopener noreferrer" onClick={() => rememberPanel(getApp().trail.at(-1) ?? null)}><Icon name="telegram" />{t('viaTelegram')}</a>
          : <button type="button" className="btn gold block big" disabled><Icon name="telegram" />{t('viaTelegram')} · {t('soon')}</button>}
      </div>
      {import.meta.env.DEV && !navigator.webdriver && <DevLogin />}
      <LegacyLogin />
    </Sheet>
  );
}
