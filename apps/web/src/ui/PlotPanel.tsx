/** Uchastka oynasi: bo'sh joy, boshqaning uyi yoki o'z uyim. */
import { useState, type FormEvent } from 'react';
import { BADGES, TIERS, instagramUrl, isFreeType, parseBio, parseInstagram, type BadgeId, type Plot } from '../../../../packages/shared/src/index.ts';
import { addressOf, copyText, goToPlot, houseUrl, shareStory, startConstruction, walkTo } from '../app/actions.ts';
import { rpc, type MyPlot, type PlotInfo } from '../app/api.ts';
import { useT } from '../app/i18n.ts';
import { getApp, openAuth, openPanel, refreshHouses, refreshProfile, setting, useApp } from '../app/store.ts';
import { UpgradeButton } from './HousePanels.tsx';
import { PayButtons } from './PayButtons.tsx';
import { BADGE_ICONS } from './badges.ts';
import { Icon } from './icons.tsx';
import { Field, LoadState, RowLink, Sheet, useAction, useLoad } from './kit.tsx';
import { listOf } from '../logic/safe.ts';

interface InfoProps { readonly plot: PlotInfo }

function ClaimForm({ plot }: InfoProps): React.JSX.Element {
  const t = useT();
  const profile = useApp((s) => s.profile);
  const { isBusy, run } = useAction();
  const [nick, setNick] = useState(profile?.instagram ?? '');
  const [bio, setBio] = useState('');
  const [isOpen, setOpen] = useState(false);
  const hasNick = Boolean(profile?.instagram);
  // Bepul uyi bor: faqat kichik izoh (uy qurish tugmasi yo'q). Sinov rejimida — bir nechta uy.
  if (profile?.free_used && profile.test_mode !== true) return <p className="muted small">{t('e_free_used')}</p>;
  if (!isOpen) {
    const hint = setting('telegram_bot', '') ? t('tgFast') : t('needSignIn');
    return <><button type="button" className="btn gold block big" onClick={() => (profile ? setOpen(true) : openAuth())}>{t('buildFree')}</button>{!profile && <p className="muted center">{hint}</p>}</>;
  }
  const submit = (e: FormEvent): void => {
    e.preventDefault();
    void run(async () => {
      const ig = hasNick ? null : parseInstagram(nick);
      if (ig && !ig.ok) throw new Error(ig.code);
      const text = parseBio(bio);
      if (!text.ok) throw new Error(text.code);
      await rpc('my_claim', { p_plot: plot.id, p_instagram: ig?.value ?? null, p_bio: text.value });
      const full = getApp().plotById.get(plot.id);
      if (full) startConstruction(full);
      await Promise.all([refreshHouses(), refreshProfile()]);
    });
  };
  return (
    <form className="section" onSubmit={submit}>
      {hasNick ? <p className="nick">@{profile?.instagram}</p> : <Field label={t('igNick')}><input value={nick} onChange={(e) => setNick(e.target.value)} placeholder="@nik" autoCapitalize="none" required maxLength={80} /></Field>}
      <Field label={t('bio')}><input value={bio} onChange={(e) => setBio(e.target.value)} maxLength={120} /></Field>
      <button type="submit" className="btn gold block big" disabled={isBusy}><Icon name="tools" />{t('claimBtn')}</button>
      <button type="button" className="link" onClick={() => openPanel({ kind: 'rules' })}>{t('rulesAgree')}</button>
    </form>
  );
}

interface HousePrices { readonly house?: Readonly<Record<string, number>>; readonly typeAdd?: Readonly<Record<string, number>> }
const HOUSE: Readonly<Record<string, number>> = { 1: 10000, 2: 20000, 3: 30000, 4: 45000, 5: 60000 };
const TYPE_ADD: Readonly<Record<string, number>> = { hovli: 0, villa: 40000, qasr: 100000 };
/** Premium uy: yangi uchastka + darhol tanlangan level (1–5); bir nechta olish mumkin. */
function BuyPlot({ plot }: InfoProps): React.JSX.Element {
  const t = useT();
  const lang = useApp((s) => s.lang);
  const profile = useApp((s) => s.profile);
  const prices = setting<HousePrices>('premium', {});
  const [tier, setTier] = useState(plot.type === 'hovli' ? 3 : 5);
  const uzs = (prices.house?.[tier] ?? HOUSE[tier] ?? 0) + (prices.typeAdd?.[plot.type] ?? TYPE_ADD[plot.type] ?? 0);
  return (
    <div className="section">
      <p className="muted">{t('premiumHouse')}</p>
      <div className="seg" role="group" aria-label={t('levelWord')}>{TIERS.map((x) => <button type="button" key={x.id} aria-pressed={x.id === tier} title={x[lang]} onClick={() => setTier(x.id)}>{x.id}</button>)}</div>
      <PayButtons kind="plot" payload={{ plot: plot.id, tier, instagram: profile?.instagram ?? undefined }} uzs={uzs} code={`h_${plot.id}_${tier}`} label={`${tier}-${t('levelWord')}`} />
    </div>
  );
}

/** Admin sinov rejimida yopiq narsalar ham ochiq (server ham tekshiradi). */
const profileTest = (): boolean => getApp().profile?.test_mode === true;

const NEAR = 60;
/** Yon-atrofdagi egali uylar. */
const countNeighbours = (p: Plot): number => {
  const { houses, plotById } = getApp();
  return [...houses.keys()].filter((id) => { const q = plotById.get(id); return q && id !== p.id && Math.hypot(q.x - p.x, q.z - p.z) < NEAR; }).length;
};

function FreePlot({ plot, full }: InfoProps & { readonly full: Plot }): React.JSX.Element {
  const t = useT();
  const lang = useApp((s) => s.lang);
  const district = useApp((s) => s.boot?.districts.find((d) => d.id === full.districtId));
  const founders = useApp((s) => s.boot?.founders);
  const isFounder = founders !== undefined && founders.taken < founders.limit;
  const isSale = plot.type !== 'kvartira' && (!isFreeType(plot.type) || setting('payments_enabled', false));
  return (
    <>
      <p className="muted">{district ? (lang === 'uz' ? district.name_uz : district.name_ru) : ''} · {t('toPlaza')} {Math.round(Math.hypot(full.x, full.z) / 10) * 10} {t('meters')}</p>
      <div className="facts">
        <span>{full.w}×{full.d} {t('meters')}</span>
        <span>{countNeighbours(full)} {t('neighbours')}</span>
        <span>{isFounder && isFreeType(plot.type) ? t('founder') : t(`t_${plot.type}`)}</span>
      </div>
      {!plot.open && <p className="muted">{t('closed')}</p>}
      {plot.open && isFreeType(plot.type) && <ClaimForm plot={plot} />}
      {plot.open && plot.type === 'kvartira' && <p className="muted">{t('e_apartments_closed')}</p>}
      {plot.open && isSale && (setting('premium_house_enabled', false) || profileTest()) && <BuyPlot plot={plot} />}
    </>
  );
}

/** Haftaning eng chiroyli hovlisi: haftada bitta ovoz, o'ziga emas. */
/** Yurak: boshqaning uyiga bir marta. */
function Heart({ id, count, isDone, isMine, onDone }: { readonly id: string; readonly count: number; readonly isDone: boolean; readonly isMine: boolean; readonly onDone: () => void }): React.JSX.Element {
  const t = useT();
  const profile = useApp((s) => s.profile);
  const { isBusy, run } = useAction();
  const press = (): void => {
    if (!profile) { openAuth(); return; }
    void run(() => rpc('my_heart', { p_plot: id })).then((ok) => { if (ok) onDone(); });
  };
  // Bitta tugma: ichida son; bosilgandan keyin yurak to'ldiriladi.
  return (
    <div className="row heart">
      <button type="button" className={`btn small ${isDone ? 'gold' : 'soft'}`} disabled={isBusy || isDone || isMine} aria-pressed={isDone} aria-label={`${t(isDone ? 'hearted' : 'heartIt')}: ${count}`} onClick={press}><Icon name="heart" />{count}</button>
    </div>
  );
}


function Owner({ info, isMine }: { readonly info: PlotInfo; readonly isMine: boolean }): React.JSX.Element {
  const t = useT();
  const lang = useApp((s) => s.lang);
  const catalog = useApp((s) => s.catalog);
  const tier = TIERS.find((x) => x.id === info.tier);
  return (
    <>
      <div className="row between"><p className="nick">{info.instagram ? `@${info.instagram}` : t(info.status)}</p>{info.instagram && !isMine && <a className="btn small" href={instagramUrl(info.instagram)} target="_blank" rel="noopener noreferrer"><Icon name="instagram" />Instagram</a>}</div>
      <div className="row tags">
        {tier && info.type !== 'kvartira' && <span className="tag"><Icon name="star" />{tier.id} · {tier[lang]}</span>}
        {listOf<string>(info.badges).filter((b): b is BadgeId => b in BADGES).map((b) => <span className="tag gold" key={b}><Icon name={BADGE_ICONS[b]} />{BADGES[b][lang]}</span>)}
        {listOf<PlotInfo['rare'][number]>(info.rare).map((r) => <span className="tag gold" key={`${r.id}${r.serial}`}><Icon name="diamond" />{catalog.find((c) => c.id === r.id)?.[lang].replace(/ \(.*\)$/, '') ?? r.id} №{r.serial} / {r.stock}</span>)}
      </div>
      {info.bio && <p className="quote">{info.bio}</p>}
      {info.since && <p className="muted">{t('sinceDate')}: {new Date(info.since).toLocaleDateString('ru-RU')}</p>}
    </>
  );
}

/** O'z uyim: ko'tarish, bezash, ranglar, stories, ulashish. */
function MineActions({ mine, full }: { readonly mine: MyPlot; readonly full: Plot }): React.JSX.Element {
  const t = useT();
  const { isBusy, run } = useAction();
  const hasYard = full.type !== 'kvartira' && mine.status === 'owned';
  return (
    <>
      {hasYard && <UpgradeButton plot={mine} />}
      <div className="tiles">
        {hasYard && <button type="button" onClick={() => openPanel({ kind: 'yard', id: mine.plot })}><Icon name="plus" />{t('decorate')}</button>}
        <button type="button" onClick={() => openPanel({ kind: 'bio', id: mine.plot })}><Icon name="rules" />{t('bioTitle')}</button>
        <button type="button" disabled={isBusy} onClick={() => run(() => shareStory(mine.plot, mine.instagram ?? ''))}><Icon name="story" />{t('stories')}</button>
        <button type="button" disabled={isBusy} onClick={() => run(() => copyText(houseUrl(mine.plot)), t('copied'))}><Icon name="share" />{t('share')}</button>
      </div>
      <RowLink icon="walk" text={t('closeLook')} onClick={() => walkTo(mine.plot)} />
    </>
  );
}

function VisitorActions({ info }: { readonly info: PlotInfo }): React.JSX.Element {
  const t = useT();
  const profile = useApp((s) => s.profile);
  const gift = (): void => {
    const panel = { kind: 'gifts', to: info.instagram ?? '' } as const;
    if (profile) openPanel(panel);
    else openAuth(panel);
  };
  return (
    <>
      <div className="row two">
        <button type="button" className="btn" onClick={() => walkTo(info.id)}><Icon name="walk" />{t('closeLook')}</button>
        {info.instagram && info.status === 'owned' && <button type="button" className="btn soft" onClick={gift}><Icon name="gift" />{t('giftTitle')}</button>}
      </div>
    </>
  );
}

interface PlotPanelProps { readonly id: string }
export function PlotPanel({ id }: PlotPanelProps): React.JSX.Element | null {
  const t = useT();
  const full = useApp((s) => s.plotById.get(id));
  const mine = useApp((s) => s.profile?.plots.find((p) => p.plot === id));
  const loaded = useLoad(() => rpc<PlotInfo>('api_plot', { p_plot: id }), id);
  const info = loaded.data;
  if (!full) return null;
  const isFree = info?.status === 'free';
  const tag = info && <span className={`tag ${isFree && info.open ? 'free' : ''}`}>{isFree && !info.open ? t('soon') : t(info.status)}</span>;
  return (
    <Sheet title={addressOf(full)} variant="half" extra={tag}>
      <LoadState of={loaded} />
      {info && isFree && <FreePlot plot={info} full={full} />}
      {info && !isFree && <Owner info={info} isMine={mine !== undefined} />}
      {info?.status === 'owned' && <Heart id={id} count={info.hearts} isDone={info.hearted} isMine={mine !== undefined} onDone={loaded.reload} />}
      {info && mine && <MineActions mine={mine} full={full} />}
      {info && !isFree && !mine && <VisitorActions info={info} />}
      <div className="row links">
        <button type="button" className="link" onClick={() => goToPlot(id)}>{t('goThere')}</button>
      </div>
    </Sheet>
  );
}
