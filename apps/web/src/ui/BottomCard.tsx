/** Pastdagi karta: bittadan, ustuvorlik bo'yicha (tabrik → kunlik bonus → xazina → yangi bezak; uysizga — "Bepul uy oling"). */
import { useState, type ReactNode } from 'react';
import { BUZZ, buzz, goToPlot, nearestFree } from '../app/actions.ts';
import { rpc } from '../app/api.ts';
import { useT } from '../app/i18n.ts';
import { markNewSeen, openPanel, openRoot, refreshProfile, setApp, setting, toast, useApp } from '../app/store.ts';
import { DAILY, nextCard, type CardKind } from '../logic/cards.ts';
import { Icon, type IconName } from './icons.tsx';
import { DecorImage, useAction } from './kit.tsx';
import { dismissInstall, hasInstallPrompt, installDue, promptInstall } from '../app/install.ts';
import { installWay } from '../logic/growth.ts';

interface CardProps { readonly icon: ReactNode; readonly title: string; readonly children: ReactNode; readonly button: string; readonly isGold?: boolean; readonly isBusy?: boolean; readonly onClick: () => void; readonly onClose?: () => void; readonly buttonLabel?: string }
function Card({ icon, title, children, button, isGold = false, isBusy = false, onClick, onClose, buttonLabel }: CardProps): React.JSX.Element {
  const t = useT();
  return (
    <section className="card glass" aria-label={title}>
      <span className="pic" aria-hidden="true">{icon}</span>
      <div className="grow"><b>{title}</b>{children}</div>
      <button type="button" className={`btn small ${isGold ? 'gold' : ''}`} disabled={isBusy} onClick={onClick} aria-label={buttonLabel}>{button}</button>
      {onClose && <button type="button" className="card-x" onClick={onClose} aria-label={t('close')}><Icon name="close" /></button>}
    </section>
  );
}
const pic = (name: IconName): React.JSX.Element => <Icon name={name} />;

/** Mehmon yoki uysiz odam: asoschilar hisobi, tugasa — "Bo'sh joy tanlang". */
function FreeCard(): React.JSX.Element {
  const t = useT();
  const founders = useApp((s) => s.boot?.founders);
  const start = (): void => {
    const id = nearestFree();
    if (id) goToPlot(id);
    else toast(t('nothing'), true);
  };
  const hasPlace = founders !== undefined && founders.taken < founders.limit;
  return (
    <Card icon={pic('home')} title={t('freeTitle')} button={t('begin')} isGold onClick={start}>
      <small>{hasPlace ? `${t('freeFirst')} ${founders.limit} ${t('freeFirst2')}` : t('freePick')}</small>
      {hasPlace && <><div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={founders.limit} aria-valuenow={founders.taken}><i style={{ width: `${(founders.taken / founders.limit) * 100}%` }} /></div><small>{founders.taken} / {founders.limit} {t('taken2')}</small></>}
    </Card>
  );
}

function DailyCard(): React.JSX.Element {
  const t = useT();
  const { isBusy, run } = useAction();
  const next = useApp((s) => s.profile?.daily_next ?? 1);
  const coins = setting<{ readonly daily?: number; readonly streakStep?: number }>('coins', {});
  const gain = (coins.daily ?? DAILY.base) + (next - 1) * (coins.streakStep ?? DAILY.step);
  const take = (): void => { void run(async () => { await rpc('my_daily'); buzz(BUZZ.coin); await refreshProfile(); }); };
  return <Card icon={pic('gift')} title={t('daily')} button={t('take')} buttonLabel={t('dailyTake')} isBusy={isBusy} onClick={take}><small>{next}-{t('dayRow')} · <em>+{gain}</em></small></Card>;
}

function NewDecorCard(): React.JSX.Element | null {
  const t = useT();
  const lang = useApp((s) => s.lang);
  const catalog = useApp((s) => s.catalog);
  const fresh = catalog.filter((c) => c.onSale && c.isNew);
  const first = fresh[0];
  if (!first) return null;
  const seen = (): void => markNewSeen(fresh.map((c) => c.id));
  return (
    <Card icon={<DecorImage model={first.model} />} title={t('newDecor')} button={t('see')} onClick={() => { seen(); openRoot({ kind: 'shop' }); }} onClose={seen}>
      <small>{first[lang]}{fresh.length > 1 ? ` ${t('more')} ${fresh.length - 1}` : ''}</small>
    </Card>
  );
}

function CheerCard(): React.JSX.Element | null {
  const t = useT();
  const cheer = useApp((s) => s.cheer);
  if (!cheer) return null;
  const open = (): void => openPanel({ kind: 'congrats', id: cheer.plot, ...(cheer.isBuilt ? {} : { tier: cheer.tier }) });
  return <Card icon={pic('confetti')} title={cheer.isBuilt ? t('cheerBuilt') : `${cheer.tier}-${t('cheerLevel')}`} button={t('show')} isGold onClick={open} onClose={() => setApp({ cheer: null })}><small>{t('cheerText')}</small></Card>;
}

function TreasureCard(): React.JSX.Element | null {
  const t = useT();
  const gain = useApp((s) => s.treasure);
  if (gain === null) return null;
  const done = (): void => setApp({ treasure: null });
  return <Card icon={pic('diamond')} title={t('treasureGot')} button={t('done')} onClick={done}><small>{t('treasureText')} · <em>+{gain}</em></small></Card>;
}

const VIEWS: Readonly<Record<CardKind, () => React.JSX.Element | null>> = { cheer: CheerCard, daily: DailyCard, treasure: TreasureCard, fresh: NewDecorCard, free: FreeCard };

function InstallCard(): React.JSX.Element | null {
  const t = useT();
  const [isShown, setShown] = useState(installDue);
  if (!isShown) return null;
  const way = installWay(navigator.userAgent, hasInstallPrompt());
  if (way === 'none') return null;
  const close = (): void => { dismissInstall(); setShown(false); };
  const text = way === 'ios' ? t('installIos') : way === 'instagram' ? t('installInsta') : t('installText');
  const add = (): void => { if (way === 'prompt') void promptInstall().finally(() => setShown(false)); else close(); };
  return <Card icon={<Icon name="home" />} title={t('installTitle')} button={way === 'prompt' ? t('install') : t('done')} onClick={add} onClose={close}><small>{text}</small></Card>;
}

export function BottomCard(): React.JSX.Element | null {
  const { profile, panel, preview, building, mode, cheer, treasure, catalog, seenNew } = useApp();
  if (panel || preview || building) return null;
  const kind = nextCard({
    isCity: mode === 'city', isGuest: !profile, hasHouse: (profile?.plots.length ?? 0) > 0, isDailyReady: profile !== null && !profile.daily_done && setting('coins_enabled', true),
    hasCheer: cheer !== null, hasTreasure: treasure !== null, hasFresh: catalog.some((c) => c.onSale && c.isNew && !seenNew.includes(c.id)),
  });
  const View = kind ? VIEWS[kind] : null;
  if (!View) return mode === 'city' ? <InstallCard /> : null;
  return <View />;
}

export function PreviewBar(): React.JSX.Element | null {
  const t = useT();
  const lang = useApp((s) => s.lang);
  const preview = useApp((s) => s.preview);
  const row = useApp((s) => s.catalog.find((c) => c.id === s.preview?.decor));
  if (!preview || !row) return null;
  return (
    <div className="preview glass" role="status">
      <DecorImage model={row.model} /><span>{row[lang]}</span>
      <button type="button" className="btn small" onClick={() => { setApp({ preview: null }); openRoot({ kind: 'shop' }); }}>{t('shop')}</button>
      <button type="button" className="btn small soft" onClick={() => setApp({ preview: null })}>{t('close')}</button>
    </div>
  );
}
