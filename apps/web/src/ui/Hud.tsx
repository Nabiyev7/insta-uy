/** Ekran: yuqori qator, rejim tugmalari, pastki panel. Elementlar faqat chetda, o'rta ochiq (telefon birinchi). */
import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { PLAZA_HALF, streetLabel } from '../../../../packages/shared/src/index.ts';
import { shareImage } from '../app/actions.ts';
import { useT, type Key } from '../app/i18n.ts';
import { setMode } from '../app/modes.ts';
import { here, input, player, snapshotters, type Mode } from '../app/runtime.ts';
import { openPanel, setApp, useApp, type Panel } from '../app/store.ts';
import { ICONS, Icon } from './icons.tsx';
import { useAction } from './kit.tsx';

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

const EMOTES = [['👋', 3, 'wave'], ['💃', 4, 'dance'], ['🧘', 5, 'sit']] as const;
const TAP = 8;
const SIT = 5;
const SIT_MS = 60_000;
const EMOTE_MS = 5000;

function WalkActions(): React.JSX.Element {
  const t = useT();
  const [isOpen, setOpen] = useState(false);
  const play = (anim: number): void => {
    player.emote = anim;
    player.emoteUntil = performance.now() + (anim === SIT ? SIT_MS : EMOTE_MS);
    setOpen(false);
  };
  return (
    <div className="actions">
      {isOpen && <div className="emotes" role="group" aria-label={t('emotes')}>{EMOTES.map(([icon, anim, key]) => <button type="button" key={key} aria-label={t(key)} title={t(key)} onClick={() => play(anim)}>{icon}</button>)}</div>}
      <button type="button" className="chip" aria-label={t('emotes')} aria-expanded={isOpen} onClick={() => setOpen(!isOpen)}>🙂</button>
      <button type="button" className="chip" aria-label={t('photo')} onClick={() => setApp({ isPhoto: true, panel: null })}><Icon d={ICONS.photo} /></button>
    </div>
  );
}

function DriveActions(): React.JSX.Element {
  const t = useT();
  const brake = (isOn: boolean) => (): void => { input.isBraking = isOn; };
  useEffect(() => () => { input.isBraking = false; }, []);
  return (
    <div className="actions">
      <button type="button" className="chip" aria-label={t('cars')} onClick={() => openPanel({ kind: 'cars' })}><Icon d={ICONS.drive} /></button>
      <button type="button" className="brake" aria-label={t('brake')} onPointerDown={brake(true)} onPointerUp={brake(false)} onPointerCancel={brake(false)} onPointerLeave={brake(false)} onContextMenu={(e) => e.preventDefault()}>{t('brake')}</button>
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

function TopRow(): React.JSX.Element {
  const t = useT();
  const { district, street, lang, boot, profile } = useApp();
  const d = boot?.districts.find((x) => x.id === district);
  const at = here();
  const isPlaza = Math.abs(at.x) < PLAZA_HALF && Math.abs(at.z) < PLAZA_HALF;
  const place = isPlaza ? t('plaza') : d ? (lang === 'uz' ? d.name_uz : d.name_ru) : t('outskirts');
  const hasBonus = profile !== null && !profile.daily_done;
  return (
    <header className="topbar">
      <button type="button" className="plate" onClick={() => street && openPanel({ kind: 'street', id: street })}>
        <b>{place}</b>
        <small>{street && !isPlaza ? streetLabel(street, boot?.streets[String(street)], lang) : t('cityName')}</small>
      </button>
      <button type="button" className="chip" aria-label={t('hideUi')} title={t('hideUi')} onClick={() => setApp({ isClean: true, panel: null })}><Icon d={ICONS.eye} /></button>
      <button type="button" className="chip coins" aria-label={`${t('coins')}${profile ? `: ${profile.coins}` : ''}`} onClick={() => openPanel({ kind: 'coins' })}>
        <span aria-hidden="true">💰</span>{profile && <b>{profile.coins}</b>}{hasBonus && <i className="dot small" />}
      </button>
      <button type="button" className="chip" aria-label={t('menu')} onClick={() => openPanel({ kind: 'menu' })}><Icon d={ICONS.menu} /></button>
    </header>
  );
}

const MODES: readonly (readonly [Mode, Key, keyof typeof ICONS])[] = [['city', 'modeCity', 'city'], ['walk', 'modeWalk', 'walk'], ['drive', 'modeDrive', 'drive']];

function ModeBar(): React.JSX.Element {
  const t = useT();
  const mode = useApp((s) => s.mode);
  return (
    <div className="modes" role="group" aria-label={t('modes')}>
      {MODES.map(([id, key, icon]) => <button type="button" key={id} aria-pressed={mode === id} onClick={() => { openPanel(null); setMode(id); }}><Icon d={ICONS[icon]} />{t(key)}</button>)}
    </div>
  );
}

function PreviewBar(): React.JSX.Element | null {
  const t = useT();
  const lang = useApp((s) => s.lang);
  const preview = useApp((s) => s.preview);
  const row = useApp((s) => s.catalog.find((c) => c.id === s.preview?.decor));
  if (!preview || !row) return null;
  return (
    <div className="preview" role="status">
      <span>👁 {row[lang]}</span>
      <button type="button" className="btn small clay" onClick={() => { setApp({ preview: null }); openPanel({ kind: 'shop' }); }}>{t('shop')}</button>
      <button type="button" className="btn small soft" onClick={() => setApp({ preview: null })}>{t('close')}</button>
    </div>
  );
}

function BottomBar(): React.JSX.Element {
  const t = useT();
  const { panel, profile, online, unread } = useApp();
  const notes = (profile?.notes.length ?? 0) + (profile?.transfers.length ?? 0);
  const toggle = (p: Panel) => (): void => openPanel(panel?.kind === p.kind ? null : p);
  const item = (p: Panel, icon: keyof typeof ICONS, label: string, extra?: React.ReactNode): React.JSX.Element => (
    <button type="button" aria-current={panel?.kind === p.kind ? 'page' : undefined} onClick={toggle(p)}><Icon d={ICONS[icon]} /><span>{label}</span>{extra}</button>
  );
  return (
    <nav className="nav5" aria-label={t('menu')}>
      {item({ kind: 'map' }, 'map', t('map'))}
      {item({ kind: 'chat' }, 'chat', t('chatShort'), <>{online > 0 && <i className="online"><em aria-hidden="true" />{online}</i>}{unread > 0 && <i className="dot">{unread > 99 ? '99+' : unread}</i>}</>)}
      {item({ kind: 'shop' }, 'shop', t('shop'))}
      {item({ kind: 'rank' }, 'rank', t('rank'))}
      {item({ kind: profile ? 'me' : 'auth' }, 'home', profile ? t('myHouse') : t('login'), notes > 0 && <i className="dot">{notes}</i>)}
    </nav>
  );
}

/** Faqat shahar: istalgan joyga (sudrash emas) yoki ko'z tugmasiga bosilsa tugmalar qaytadi. */
function CleanScreen(): React.JSX.Element {
  const t = useT();
  useEffect(() => {
    let start: { readonly x: number; readonly y: number } | null = null;
    const down = (e: globalThis.PointerEvent): void => { start = { x: e.clientX, y: e.clientY }; };
    const up = (e: globalThis.PointerEvent): void => {
      if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) < TAP) setApp({ isClean: false });
      start = null;
    };
    // Yashirgan bosishning o'zi darhol qaytarib yubormasin.
    const id = setTimeout(() => { addEventListener('pointerdown', down); addEventListener('pointerup', up); }, 300);
    return () => {
      clearTimeout(id);
      removeEventListener('pointerdown', down);
      removeEventListener('pointerup', up);
    };
  }, []);
  return <div className="hud"><button type="button" className="eye" aria-label={t('showUi')} onClick={() => setApp({ isClean: false })}><Icon d={ICONS.eye} /></button></div>;
}

export function Hud(): React.JSX.Element {
  const t = useT();
  const isPhoto = useApp((s) => s.isPhoto);
  const isClean = useApp((s) => s.isClean);
  const mode = useApp((s) => s.mode);
  const isMaintenance = useApp((s) => Boolean(s.boot?.settings.maintenance));
  if (isClean) return <CleanScreen />;
  if (isPhoto) return <PhotoBar />;
  return (
    <div className={`hud mode-${mode}`}>
      <TopRow />
      {isMaintenance && <p className="banner">{t('maintenance')}</p>}
      {mode !== 'city' && <Joystick />}
      {mode === 'walk' && <WalkActions />}
      {mode === 'drive' && <DriveActions />}
      <div className="dock"><PreviewBar /><ModeBar /><BottomBar /></div>
      {location.search.includes('fps') && <FpsMeter />}
    </div>
  );
}

function FpsMeter(): React.JSX.Element {
  const fps = useApp((s) => s.fps);
  const quality = useApp((s) => s.quality);
  return <output className="fps">{fps} fps · {quality}</output>;
}
