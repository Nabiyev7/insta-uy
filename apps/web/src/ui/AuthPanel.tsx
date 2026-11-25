import { useEffect, useState, type FormEvent } from 'react';
import { parseLogin, parsePassword } from '../../../../packages/shared/src/index.ts';
import { post, signIn } from '../app/api.ts';
import { useT } from '../app/i18n.ts';
import { finishAuth, getApp, openPanel, setting } from '../app/store.ts';
import { rememberPanel } from '../app/login.ts';
import { Icon } from './icons.tsx';
import { Captcha } from './Captcha.tsx';
import { Field, Seg, Sheet, useAction } from './kit.tsx';

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

interface DevSent { readonly sent: readonly { readonly text: string; readonly buttons: readonly { readonly url?: string; readonly data?: string }[] }[] }
const tokenIn = (r: DevSent): string | null => {
  const url = r.sent.flatMap((m) => m.buttons).find((b) => b.url?.includes('kirish='))?.url;
  return url ? new URL(url).searchParams.get('kirish') : null;
};
/** Bot bilan lokal suhbat; nik yozilsa tasdiq ("Ha, to'g'ri") ham bosiladi. */
const devSay = async (id: number, text: string): Promise<string | null> => {
  const r = await post<DevSent>('/dev/telegram', { message: { message_id: 1, from: { id, first_name: 'Sinov' }, chat: { id, type: 'private' }, text } });
  const token = tokenIn(r);
  if (token || !r.sent.some((m) => m.buttons.some((b) => 'data' in b && b.data === 'nick_ok'))) return token;
  return tokenIn(await post<DevSent>('/dev/telegram', { callback_query: { id: 'n', from: { id, first_name: 'Sinov' }, data: 'nick_ok' } }));
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
      <button type="button" className="btn soft block" disabled={isBusy} onClick={() => void run(async () => {
        const { token } = await post<{ token: string }>('/dev/admin', {});
        location.assign(`${location.pathname}?kirish=${token}`);
      })}>Admin sifatida kirish (lokal)</button>
    </form>
  );
}

type Mode = 'login' | 'register' | 'reset';

function ResetForm({ onDone }: { readonly onDone: () => void }): React.JSX.Element {
  const t = useT();
  const { isBusy, run } = useAction();
  const [login, setLogin] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => { post<{ url: string | null }>('/auth/reset/start', { login: 'x' }).then((r) => setUrl(r.url), () => undefined); }, []);
  const submit = (e: FormEvent): void => {
    e.preventDefault();
    void run(async () => {
      await post('/auth/reset/finish', { login, code, password });
      await signIn(login, password);
    }, t('saved')).then((ok) => ok && onDone());
  };
  return (
    <form className="section" onSubmit={submit}>
      <p>{t('resetHelp')}</p>
      {url && <a className="btn soft" href={url} target="_blank" rel="noopener noreferrer">{t('openTg')}</a>}
      <Field label={t('loginField')}><input value={login} onChange={(e) => setLogin(e.target.value)} autoCapitalize="none" required /></Field>
      <Field label={t('code')}><input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" pattern="\d{6}" required /></Field>
      <Field label={t('newPassword')}><input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="new-password" minLength={8} required /></Field>
      <button type="submit" className="btn" disabled={isBusy}>{t('save')}</button>
    </form>
  );
}

/** Login + parol (ro'yxat, kirish, tiklash). Faqat admin sozlamasi `password_login` yoqilganda ko'rinadi — server ham shuni tekshiradi. */
function PasswordLogin(): React.JSX.Element {
  const t = useT();
  const { isBusy, run } = useAction();
  const [mode, setMode] = useState<Mode>('login');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [captcha, setCaptcha] = useState('');
  const submit = (e: FormEvent): void => {
    e.preventDefault();
    void run(async () => {
      if (mode === 'register') {
        const l = parseLogin(login);
        if (!l.ok) throw new Error(`login_${l.code}`);
        const p = parsePassword(password);
        if (!p.ok) throw new Error(`password_${p.code}`);
        await post('/auth/register', { login: l.value, password, ref: refCode(), captcha });
      }
      await signIn(login, password);
    }).then((ok) => ok && finishAuth());
  };
  return (
    <div className="section password-login">
      <Seg label={t('login')} value={mode} onPick={setMode} options={[['login', t('login')], ['register', t('register')]]} />
      {mode === 'reset' ? <ResetForm onDone={finishAuth} /> : (
        <form onSubmit={submit}>
          <Field label={t('loginField')}><input value={login} onChange={(e) => setLogin(e.target.value)} autoCapitalize="none" autoComplete="username" required maxLength={24} /></Field>
          <Field label={t('password')}><input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} required minLength={8} /></Field>
          {mode === 'register' && <Captcha onToken={setCaptcha} />}
          <button type="submit" className="btn block" disabled={isBusy}>{t(mode === 'register' ? 'register' : 'login')}</button>
          {mode === 'login' && <button type="button" className="link" onClick={() => setMode('reset')}>{t('forgot')}</button>}
          {mode === 'register' && <button type="button" className="link" onClick={() => openPanel({ kind: 'rules' })}>{t('rulesAgree')}</button>}
        </form>
      )}
    </div>
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
      {setting('password_login', false) && <PasswordLogin />}
    </Sheet>
  );
}
