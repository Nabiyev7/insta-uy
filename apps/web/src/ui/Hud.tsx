/** Ekran: yuqori qator, o'ng ustun (rejimlar), pastdagi karta va panel. Elementlar faqat chetda, o'rta ochiq (telefon birinchi). */
import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { inPlaza, streetLabel, zoneAt } from '../../../../packages/shared/src/index.ts';
import { BUZZ, buzz, shareImage } from '../app/actions.ts';
import { money, useT, type Key } from '../app/i18n.ts';
import { setMode } from '../app/modes.ts';
import { here, input, player, snapshotters, type Mode } from '../app/runtime.ts';
import { backPanel, openAuth, openPanel, openRoot, setApp, useApp, type Panel } from '../app/store.ts';
import { rpc } from '../app/api.ts';
import { goToPlot, nearestFree } from '../app/actions.ts';
import { canClaimFree, countLine } from '../logic/lively.ts';
import { getApp, setting } from '../app/store.ts';
import { BottomCard, PreviewBar } from './BottomCard.tsx';
import { CoinFly } from './CoinFly.tsx';
import { Icon, type IconName } from './icons.tsx';
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

const EMOTES: readonly (readonly [IconName, number, Key])[] = [['wave', 3, 'wave'], ['dance', 4, 'dance'], ['sit', 5, 'sit']];
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
      {isOpen && <div className="emotes glass" role="group" aria-label={t('emotes')}>{EMOTES.map(([icon, anim, key]) => <button type="button" key={key} aria-label={t(key)} title={t(key)} onClick={() => play(anim)}><Icon name={icon} /></button>)}</div>}
      <button type="button" className="round glass" aria-label={t('emotes')} aria-expanded={isOpen} onClick={() => setOpen(!isOpen)}><Icon name="emote" /></button>
      <button type="button" className="round glass" aria-label={t('photo')} onClick={() => { openRoot(null); setApp({ isPhoto: true }); }}><Icon name="photo" /></button>
    </div>
  );
}

function DriveActions(): React.JSX.Element {
  const t = useT();
  const brake = (isOn: boolean) => (): void => { input.isBraking = isOn; };
  useEffect(() => () => { input.isBraking = false; }, []);
  return (
    <div className="actions">
      <button type="button" className="round glass" aria-label={t('pickCar')} onClick={() => openPanel({ kind: 'cars' })}><Icon name="drive" /></button>
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
      <button type="button" className="btn gold" disabled={isBusy} onClick={() => run(async () => { const c = snapshotters.capture?.(); if (c) await shareImage(c, 'shahar'); })}><Icon name="photo" />{t('shoot')}</button>
      <button type="button" className="round glass" aria-label={t('hideUi')} title={t('hideUi')} onClick={() => setApp({ isPhoto: false, isClean: true })}><Icon name="eyeOff" /></button>
    </div></div>
  );
}

const PLACE_PANELS: readonly Panel['kind'][] = ['plot', 'civic', 'building', 'commerce', 'street'];
function PlacePill(): React.JSX.Element {
  const t = useT();
  const { district, street, lang, boot, panel } = useApp();
  if (panel && PLACE_PANELS.includes(panel.kind)) return <button type="button" className="pill place glass" onClick={backPanel}><Icon name="back" /><b>{t('back')}</b></button>;
  const d = boot?.districts.find((x) => x.id === district);
  const at = here();
  const isPlaza = inPlaza(at.x, at.z);
  const districtName = d ? (lang === 'uz' ? d.name_uz : d.name_ru) : t('outskirts');
  const streetName = street ? streetLabel(street, boot?.streets[String(street)], lang) : '';
  const place = isPlaza ? t('plaza') : zoneAt(at.x, at.z)?.[lang] ?? (streetName || districtName);
  // Ko'cha oynasi yo'q: joy nomi xaritani ochadi.
  const open = (): void => openRoot({ kind: 'map' });
  return <button type="button" className="pill place glass" aria-label={`${place}, ${districtName}`} title={districtName} onClick={open}><Icon name="pin" /><b>{place}</b></button>;
}

/** Mehmon va hali uyi yo'q odamga: "Bugun N kishi uy oldi · jami M". Bosilsa — eng yaqin bo'sh joyga. */
function HousesCount(): React.JSX.Element | null {
  const t = useT();
  const count = useApp((s) => s.boot?.houses);
  const hasHouse = useApp((s) => (s.profile?.plots.length ?? 0) > 0);
  const mode = useApp((s) => s.mode);
  if (hasHouse || mode !== 'city' || !setting('lively_start', true)) return null;
  const go = (): void => {
    const p = getApp().profile;
    // Bepul uyi bor odam bo'sh joyga emas — o'z uyiga.
    const id = canClaimFree(p) ? nearestFree() : p?.plots[0]?.plot ?? null;
    if (id) goToPlot(id);
  };
  return <button type="button" className="pill glass lively-count" onClick={go}><Icon name="home" /><b>{countLine(count, { today: t('housesToday'), first: t('beFirst') })}</b></button>;
}

function TopRow(): React.JSX.Element {
  const t = useT();
  const { profile } = useApp();
  const notes = (profile?.notes.length ?? 0) + (profile?.transfers.length ?? 0);
  return (
    <header className="topbar">
      <PlacePill />
      {profile && <>
        <button type="button" className="pill coins glass" aria-label={`${t('coins')}: ${profile.coins}`} title={t('addCoins')} onClick={() => openRoot({ kind: 'coins' })}><Icon name="coin" /><b>{money(profile.coins)}</b><Icon name="plus" className="add" /></button>
        <button type="button" className="round glass bell" aria-label={`${t('notes')}${notes > 0 ? `: ${notes}` : ''}`} onClick={() => openRoot({ kind: 'notes' })}><Icon name="bell" />{notes > 0 && <i className="dot">{notes > 99 ? '99+' : notes}</i>}</button>
      </>}
      <button type="button" className="round glass" aria-label={t('menu')} onClick={() => openRoot({ kind: 'menu' })}><Icon name="menu" /></button>
    </header>
  );
}

const MODES: readonly (readonly [Mode, Key, IconName])[] = [['city', 'modeCity', 'city'], ['walk', 'modeWalk', 'walk'], ['drive', 'modeDrive', 'drive']];
function Rail(): React.JSX.Element {
  const t = useT();
  const mode = useApp((s) => s.mode);
  const pick = (id: Mode): void => {
    buzz(BUZZ.tap);
    openRoot(null);
    setMode(id);
  };
  return (
    <div className="rail">
      <div className="modes glass" role="group" aria-label={t('modes')}>
        {MODES.map(([id, key, icon]) => <button type="button" key={id} aria-label={t(key)} title={t(key)} aria-pressed={mode === id} onClick={() => pick(id)}><Icon name={icon} /></button>)}
      </div>
      {mode === 'walk' && <WalkActions />}
      {mode === 'drive' && <DriveActions />}
    </div>
  );
}

function BottomBar(): React.JSX.Element {
  const t = useT();
  const { panel, profile, online, unread } = useApp();
  const toggle = (p: Panel) => (): void => openRoot(panel?.kind === p.kind ? null : p);
  const item = (p: Panel, icon: IconName, label: string, extra?: React.ReactNode): React.JSX.Element => (
    <button type="button" aria-current={panel?.kind === p.kind ? 'page' : undefined} onClick={toggle(p)}><Icon name={icon} /><span>{label}</span>{extra}</button>
  );
  const isMe = panel?.kind === 'me' || panel?.kind === 'auth';
  const openMe = (): void => {
    buzz(BUZZ.tap);
    if (isMe) openRoot(null);
    else if (profile) openRoot({ kind: 'me' });
    else openAuth();
  };
  return (
    <nav className="nav5 glass" aria-label={t('menu')}>
      {item({ kind: 'map' }, 'map', t('map'))}
      {item({ kind: 'chat' }, 'chat', t('chatShort'), <>{online > 0 && <i className="online"><em aria-hidden="true" />{online}</i>}{unread > 0 && <i className="dot">{unread > 99 ? '99+' : unread}</i>}</>)}
      <button type="button" className="main" aria-label={t(profile ? 'myHouse' : 'login')} aria-current={isMe ? 'page' : undefined} onClick={openMe}><i><Icon name={profile ? 'home' : 'telegram'} /></i><span>{t(profile ? 'myHouse' : 'login')}</span></button>
      {item({ kind: 'shop' }, 'shop', t('shop'))}
      {item({ kind: 'rank' }, 'rank', t('rankShort'))}
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
  return <div className="hud"><button type="button" className="eye" aria-label={t('showUi')} onClick={() => setApp({ isClean: false })}><Icon name="eye" /></button></div>;
}

export function Hud(): React.JSX.Element {
  const t = useT();
  const isPhoto = useApp((s) => s.isPhoto);
  const isClean = useApp((s) => s.isClean);
  const mode = useApp((s) => s.mode);
  const isOffline = useApp((s) => s.isOffline);
  const hasPanel = useApp((s) => s.panel !== null);
  const isMaintenance = useApp((s) => Boolean(s.boot?.settings.maintenance));
  const isTester = useApp((s) => s.profile?.test_mode === true);
  const isLiveWaking = useApp((s) => s.isLiveWaking);
  if (isClean) return <CleanScreen />;
  if (isPhoto) return <PhotoBar />;
  return (
    <div className={`hud mode-${mode} ${hasPanel ? 'has-panel' : ''}`}>
      <TopRow />
      {!hasPanel && <HousesCount />}
      {(isOffline || isMaintenance) && <p className="banner" role="alert">{t(isOffline ? 'offline' : 'maintenance')}</p>}
      {!isOffline && !isMaintenance && <SaluteBanner />}
      {isLiveWaking && !isTester && <p className="live-chip" role="status">{t('liveWaking')}</p>}
      {isTester && <p className="test-chip" title={t('testModeHint')}>{t('testMode')} · {t('testFree')}</p>}
      {mode !== 'city' && <Joystick />}
      <div className="dock"><Rail /><PreviewBar /><BottomCard /><BottomBar /></div>
      <CoinFly />
      {location.search.includes('fps') && <FpsMeter />}
    </div>
  );
}

interface SaluteRow { readonly nick: string | null; readonly text: string }
const SALUTE_POLL_MS = 5 * 60_000;
/** Shahar ustidagi salyut xabari (pulga yoki tangaga, 24 soat). */
function SaluteBanner(): React.JSX.Element | null {
  const [row, setRow] = useState<SaluteRow | null>(null);
  useEffect(() => {
    let isAlive = true;
    const load = (): void => { void rpc<SaluteRow | null>('api_salute').then((r) => { if (isAlive) setRow(r); }).catch(() => undefined); };
    load();
    const id = setInterval(load, SALUTE_POLL_MS);
    return () => { isAlive = false; clearInterval(id); };
  }, []);
  if (!row) return null;
  return <p className="banner salute"><Icon name="star" /> {row.nick ? `@${row.nick}: ` : ''}{row.text}</p>;
}

function FpsMeter(): React.JSX.Element {
  const fps = useApp((s) => s.fps);
  const quality = useApp((s) => s.quality);
  return <output className="fps">{fps} fps · {quality}</output>;
}
