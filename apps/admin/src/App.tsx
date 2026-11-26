import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { rpc, signIn, signInFromLink, supabase, type Me } from './api.ts';
import { Btn, NotifyContext, useAction, type Notify } from './ui.tsx';
import { Districts, Stats } from './sections/Overview.tsx';
import { Houses } from './sections/Houses.tsx';
import { Moderation } from './sections/Moderation.tsx';
import { Orders } from './sections/Orders.tsx';
import { Users } from './sections/Users.tsx';
import { Catalog } from './sections/Catalog.tsx';
import { Audit, Projects, Settings } from './sections/Settings.tsx';
import { MapEditor } from './sections/MapEditor.tsx';
import { Videos } from './sections/Videos.tsx';
import { Economy } from './sections/Economy.tsx';
import { Messages } from './sections/Messages.tsx';
import { Disputes, Tickets } from './sections/Support.tsx';
import { Errors } from './sections/Errors.tsx';

type SectionDef = readonly [id: string, title: string, perm: string | null, view: () => React.JSX.Element];
const SECTIONS: readonly SectionDef[] = [
  ['stats', 'Statistika', null, Stats], ['houses', 'Uylar', 'plots', Houses], ['mod', 'Moderatsiya', null, Moderation], ['districts', 'Tumanlar', 'settings', Districts], ['map', 'Xarita', 'map', MapEditor],
  ['orders', "Buyurtma va to'lov", 'orders', Orders], ['video', 'Video', 'video', Videos], ['users', 'Foydalanuvchilar', 'users', Users], ['catalog', 'Bezaklar', 'settings', Catalog], ['economy', 'Iqtisod', 'admin', Economy], ['messages', 'Xabarlar', 'admin', Messages], ['tickets', 'Murojaatlar', 'admin', Tickets], ['disputes', 'Nik nizolari', 'admin', Disputes],
  ['projects', 'Loyihalar', 'settings', Projects], ['settings', 'Sozlamalar', 'settings', Settings], ['errors', 'Xatolar', 'admin', Errors], ['audit', 'Jurnal', 'admin', Audit],
];

/** Ishlab chiqarishda login + parol shakli yo'q: kirish faqat botdagi /admin havolasi orqali. */
const HAS_PASSWORD_FORM = import.meta.env.DEV;
function Login({ onDone }: { readonly onDone: () => void }): React.JSX.Element {
  if (!HAS_PASSWORD_FORM) return <div className="login"><p className="muted">Telegram botda <b>/admin</b> yozing</p></div>;
  return <PasswordLogin onDone={onDone} />;
}
function PasswordLogin({ onDone }: { readonly onDone: () => void }): React.JSX.Element {
  const { isBusy, run } = useAction();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const submit = (e: FormEvent): void => {
    e.preventDefault();
    void run(() => signIn(login, password), 'Xush kelibsiz').then((ok) => ok && onDone());
  };
  return (
    <div className="login"><form onSubmit={submit}>
      <h2>CityLand UZ — admin</h2>
      <p className="muted">Telegram botga <b>/admin</b> yozing — kirish havolasi keladi.</p>
      <input className="input" value={login} onChange={(e) => setLogin(e.target.value)} placeholder="Login" aria-label="Login" autoComplete="username" required />
      <input className="input" value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Parol" aria-label="Parol" autoComplete="current-password" required />
      <Btn kind="main" type="submit" disabled={isBusy}>Kirish</Btn>
    </form></div>
  );
}

export function App(): React.JSX.Element {
  const [me, setMe] = useState<Me | null>(null);
  const [isReady, setReady] = useState(false);
  const [section, setSection] = useState(() => location.hash.slice(1) || 'stats');
  const [toast, setToast] = useState<{ text: string; isError: boolean } | null>(null);
  const notify = useCallback<Notify>((text, isError = false) => setToast({ text, isError }), []);
  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(id);
  }, [toast]);
  const loadMe = useCallback(async (): Promise<void> => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      setMe(null);
      setReady(true);
      return;
    }
    try {
      setMe(await rpc<Me>('admin_me'));
    } catch {
      await supabase.auth.signOut();
      setMe(null);
      notify("Bu akkauntda admin huquqi yo'q", true);
    }
    setReady(true);
  }, [notify]);
  useEffect(() => { void signInFromLink().catch((error: unknown) => notify(error instanceof Error ? error.message : 'Xato', true)).finally(() => { void loadMe(); }); }, [loadMe, notify]);

  const allowed = SECTIONS.filter(([, , perm]) => me && (perm === null || me.role === 'admin' || me.perms.includes(perm)));
  const current = allowed.find(([id]) => id === section) ?? allowed[0];
  const View = current?.[3];
  const go = (id: string): void => {
    location.hash = id;
    setSection(id);
  };
  return (
    <NotifyContext value={notify}>
      {isReady && !me && <Login onDone={() => void loadMe()} />}
      {me && current && View && (
        <div className="app">
          <nav className="side" aria-label="Bo'limlar">
            <h1>CityLand UZ — admin</h1>
            {allowed.map(([id, title]) => <button type="button" key={id} aria-current={id === current[0] ? 'page' : undefined} onClick={() => go(id)}>{title}</button>)}
            <button type="button" onClick={() => void supabase.auth.signOut().then(() => setMe(null))}>Chiqish ({me.login})</button>
          </nav>
          <main><h2>{current[1]}</h2><View key={current[0]} /></main>
        </div>
      )}
      {toast && <p className={`toast ${toast.isError ? 'bad' : ''}`} role="status">{toast.text}</p>}
    </NotifyContext>
  );
}
