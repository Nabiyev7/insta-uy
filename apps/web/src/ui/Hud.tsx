import { useEffect, useRef, useState, type FormEvent, type PointerEvent } from 'react';
import { streetLabel } from '../../../../packages/shared/src/index.ts';
import { shareImage } from '../app/actions.ts';
import { useT } from '../app/i18n.ts';
import { sendChat } from '../app/multiplayer.ts';
import { input, player, snapshotters } from '../app/runtime.ts';
import { openPanel, setApp, useApp } from '../app/store.ts';
import { drawMinimap } from './mapCanvas.ts';
import { useAction } from './kit.tsx';

function Icon({ d }: { readonly d: string }): React.JSX.Element {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;
}

function Joystick(): React.JSX.Element {
  const knob = useRef<HTMLElement>(null);
  const move = (e: PointerEvent<HTMLDivElement>): void => {
    const r = e.currentTarget.getBoundingClientRect();
    const half = r.width / 2;
    const x = (e.clientX - r.left - half) / half;
    const y = (e.clientY - r.top - half) / half;
    const len = Math.max(1, Math.hypot(x, y));
    input.moveX = x / len;
    input.moveY = -y / len;
    if (knob.current) knob.current.style.transform = `translate(${(x / len) * half * 0.6}px, ${(y / len) * half * 0.6}px)`;
  };
  useEffect(() => () => { input.moveX = input.moveY = 0; }, []);
  const stop = (): void => {
    input.moveX = input.moveY = 0;
    if (knob.current) knob.current.style.transform = '';
  };
  return (
    <div
      className="joystick" aria-hidden="true" onLostPointerCapture={stop} onPointerCancel={stop} onPointerUp={stop} onPointerMove={(e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) move(e); }}
      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); move(e); }}
    ><i ref={knob} /></div>
  );
}

function Minimap(): React.JSX.Element {
  const t = useT();
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const id = setInterval(() => { if (ref.current) drawMinimap(ref.current); }, 120);
    return () => clearInterval(id);
  }, []);
  return <button type="button" className="minimap" aria-label={t('map')} onClick={() => openPanel({ kind: 'map' })}><canvas ref={ref} width={248} height={248} /></button>;
}

function Chat(): React.JSX.Element | null {
  const t = useT();
  const chat = useApp((s) => s.chat);
  const profile = useApp((s) => s.profile);
  const online = useApp((s) => s.online);
  const [isOpen, setOpen] = useState(false);
  const [text, setText] = useState('');
  const submit = (e: FormEvent): void => {
    e.preventDefault();
    if (text.trim()) sendChat(text);
    setText('');
  };
  if (online === 0) return null;
  return (
    <div className="chatbox">
      {chat.slice(isOpen ? -8 : -3).map((c) => <p key={c.id}><b>{c.nick}</b>{c.text}</p>)}
      {isOpen && profile && <form onSubmit={submit}><input value={text} onChange={(e) => setText(e.target.value)} maxLength={200} placeholder={t('chatHint')} aria-label={t('chat')} autoFocus /><button type="submit" className="btn small">➤</button></form>}
      <div><button type="button" className="btn small soft" onClick={() => setOpen(!isOpen)}>💬 {online} {t('online')}</button></div>
    </div>
  );
}

const EMOTES = [['👋', 3, 'wave'], ['💃', 4, 'dance'], ['🧘', 5, 'sit']] as const;

function Actions(): React.JSX.Element {
  const t = useT();
  const [isOpen, setOpen] = useState(false);
  const play = (anim: number): void => {
    player.emote = anim;
    player.emoteUntil = performance.now() + (anim === 5 ? 60_000 : 5000);
    setOpen(false);
  };
  return (
    <div className="actions">
      {isOpen && <div className="emotes" role="group" aria-label={t('emotes')}>{EMOTES.map(([icon, anim, key]) => <button type="button" key={key} aria-label={t(key)} title={t(key)} onClick={() => play(anim)}>{icon}</button>)}</div>}
      <button type="button" className="chip" aria-label={t('emotes')} aria-expanded={isOpen} onClick={() => setOpen(!isOpen)}>🙂</button>
      <button type="button" className="chip" aria-label={t('photo')} onClick={() => setApp({ isPhoto: true, panel: null })}><Icon d="M4 8h3l2-3h6l2 3h3v11H4zM12 17a3.5 3.5 0 100-7 3.5 3.5 0 000 7z" /></button>
    </div>
  );
}

function PhotoBar(): React.JSX.Element {
  const t = useT();
  const { isBusy, run } = useAction();
  return (
    <div className="hud"><div className="photo-bar">
      <button type="button" className="btn soft" onClick={() => setApp({ isPhoto: false })}>{t('close')}</button>
      <button type="button" className="btn clay" disabled={isBusy} onClick={() => run(async () => { const c = snapshotters.capture?.(); if (c) await shareImage(c, 'shahar'); })}>📸 {t('shoot')}</button>
    </div></div>
  );
}

export function Hud(): React.JSX.Element {
  const t = useT();
  const { district, street, lang, boot, profile, isPhoto } = useApp();
  if (isPhoto) return <PhotoBar />;
  const d = boot?.districts.find((x) => x.id === district);
  const isPlaza = Math.hypot(player.x, player.z) < 125;
  const place = isPlaza ? t('plaza') : d ? (lang === 'uz' ? d.name_uz : d.name_ru) : t('outskirts');
  const notes = (profile?.notes.length ?? 0) + (profile?.transfers.length ?? 0);
  return (
    <div className="hud">
      <button type="button" className="plate" onClick={() => street && openPanel({ kind: 'street', id: street })}>
        <b>{place}</b>
        <small>{street && !isPlaza ? streetLabel(street, boot?.streets[String(street)], lang) : t('cityName')}</small>
      </button>
      {Boolean(boot?.settings.maintenance) && <p className="banner">{t('maintenance')}</p>}
      <nav className="topbar" aria-label={t('menu')}>
        <button type="button" className="chip" aria-label={t('search')} onClick={() => openPanel({ kind: 'search' })}><Icon d="M11 18a7 7 0 100-14 7 7 0 000 14zM20 20l-4-4" /></button>
        <button type="button" className="chip main" onClick={() => openPanel({ kind: profile ? 'me' : 'auth' })} aria-label={profile ? t('me') : t('login')}>
          <Icon d="M3 11l9-8 9 8M6 9.5V20h12V9.5M10 20v-6h4v6" /><span>{profile ? t('me') : t('login')}</span>{notes > 0 && <i className="dot">{notes}</i>}
        </button>
        <button type="button" className="chip" aria-label={t('menu')} onClick={() => openPanel({ kind: 'menu' })}><Icon d="M4 7h16M4 12h16M4 17h16" /></button>
      </nav>
      <Minimap />
      <Joystick />
      <Chat />
      <Actions />
      {location.search.includes('fps') && <FpsMeter />}
    </div>
  );
}

function FpsMeter(): React.JSX.Element {
  const fps = useApp((s) => s.fps);
  const quality = useApp((s) => s.quality);
  return <output style={{ position: 'absolute', left: 12, top: 84, color: '#fff', font: '700 14px monospace' }}>{fps} fps · {quality}</output>;
}
