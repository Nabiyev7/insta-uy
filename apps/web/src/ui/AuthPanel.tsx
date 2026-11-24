import { useEffect, useState, type FormEvent } from 'react';
import { parseLogin, parsePassword } from '../../../../packages/shared/src/index.ts';
import { post, signIn, signInWithToken } from '../app/api.ts';
import { useT } from '../app/i18n.ts';
import { errorText, translate } from '../app/i18n.ts';
import { getApp, openPanel, setting, toast } from '../app/store.ts';
import { Captcha } from './Captcha.tsx';
import { Field, Seg, Sheet, useAction } from './kit.tsx';

type Mode = 'login' | 'register' | 'reset';
const POLL_MS = 2500;
const POLL_LIMIT = 200;
export const refCode = (): string | null => {
  try {
    return sessionStorage.getItem('ref');
  } catch {
    return null;
  }
};

/** Telegram: token → bot → tasdiq → sessiya. */
function TelegramLogin(): React.JSX.Element {
  const t = useT();
  const { isBusy, run } = useAction();
  const [pending, setPending] = useState<{ token: string; url: string } | null>(null);
  useEffect(() => {
    if (!pending) return undefined;
    let left = POLL_LIMIT;
    let isPending = false;
    const id = setInterval(() => {
      if (isPending) return;
      isPending = true;
      left -= 1;
      post<{ state: string; token_hash?: string }>('/auth/telegram/poll', { token: pending.token, ref: refCode() }).then(async (r) => {
        if (r.state === 'waiting' && left > 0) return;
        clearInterval(id);
        setPending(null);
        if (r.state === 'ok' && r.token_hash) {
          await signInWithToken(r.token_hash);
          openPanel({ kind: 'me' });
        } else toast(translate('e_expired', getApp().lang), true);
      }).catch((error: unknown) => {
        // Tarmoq uzilsa keyingi urinishda davom etadi; boshqa xato ko'rsatiladi.
        if (!(error instanceof Error && error.message === 'network')) toast(errorText(error, getApp().lang), true);
      }).finally(() => { isPending = false; });
    }, POLL_MS);
    return () => clearInterval(id);
  }, [pending]);
  if (pending) return <div className="section"><p>{t('tgWait')}</p><a className="btn" href={pending.url} target="_blank" rel="noopener noreferrer">{t('openTg')}</a></div>;
  return <button type="button" className="btn block" disabled={isBusy} onClick={() => run(async () => setPending(await post<{ token: string; url: string }>('/auth/telegram/start', {})))}>✈️ {t('viaTelegram')}</button>;
}

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

export function AuthPanel(): React.JSX.Element {
  const t = useT();
  const { isBusy, run } = useAction();
  const [mode, setMode] = useState<Mode>('login');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [captcha, setCaptcha] = useState('');
  const done = (): void => openPanel({ kind: 'me' });
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
    }).then((ok) => ok && done());
  };
  return (
    <Sheet title={t(mode === 'register' ? 'register' : 'login')}>
      {setting('telegram_bot', '') ? <TelegramLogin /> : <button type="button" className="btn block" disabled>✈️ {t('viaTelegram')} · {t('soon')}</button>}
      <Seg label={t('login')} value={mode} onPick={setMode} options={[['login', t('login')], ['register', t('register')]]} />
      {mode === 'reset' ? <ResetForm onDone={done} /> : (
        <form className="section" onSubmit={submit}>
          <Field label={t('loginField')}><input value={login} onChange={(e) => setLogin(e.target.value)} autoCapitalize="none" autoComplete="username" required maxLength={24} /></Field>
          <Field label={t('password')}><input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} required minLength={8} /></Field>
          {mode === 'register' && <Captcha onToken={setCaptcha} />}
          <button type="submit" className="btn clay block" disabled={isBusy}>{t(mode === 'register' ? 'register' : 'login')}</button>
          {mode === 'login' && <button type="button" className="link" onClick={() => setMode('reset')}>{t('forgot')}</button>}
          {mode === 'register' && <button type="button" className="link" onClick={() => openPanel({ kind: 'rules' })}>{t('rulesAgree')}</button>}
        </form>
      )}
    </Sheet>
  );
}
