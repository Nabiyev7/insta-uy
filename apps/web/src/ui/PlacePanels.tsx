import { useEffect, useRef, useState, type FormEvent } from 'react';
import { BADGES, TIERS, TOWERS, TOWER_NAMES, instagramUrl, isFreeType, parseBio, parseInstagram, type BadgeId, type Commerce } from '../../../../packages/shared/src/index.ts';
import { addressOf, goToPlot } from '../app/actions.ts';
import { rpc, type PlotInfo } from '../app/api.ts';
import { money, useT } from '../app/i18n.ts';
import { goToPoint } from '../app/modes.ts';
import { getApp, openPanel, refreshHouses, refreshProfile, setting, toast, useApp } from '../app/store.ts';
import { createOrder } from './OrderPanels.tsx';
import { drawBigMap, fromMap, MAP_SIZE } from './mapCanvas.ts';
import { Field, Section, Sheet, useAction, useLoad } from './kit.tsx';

interface IdProps { readonly id: string }

function ReportForm({ kind, target }: { readonly kind: string; readonly target: string }): React.JSX.Element {
  const t = useT();
  const { isBusy, run } = useAction();
  const [reason, setReason] = useState('');
  const submit = (e: FormEvent): void => {
    e.preventDefault();
    void run(() => rpc('my_report', { p_kind: kind, p_target: target, p_reason: reason }), t('sent')).then((ok) => ok && setReason(''));
  };
  return (
    <details>
      <summary className="muted">⚑ {t('report')}</summary>
      <form className="row" onSubmit={submit}>
        <input className="input grow" value={reason} onChange={(e) => setReason(e.target.value)} minLength={3} maxLength={500} placeholder={t('reportReason')} aria-label={t('reportReason')} required />
        <button type="submit" className="btn small clay" disabled={isBusy}>{t('report')}</button>
      </form>
    </details>
  );
}

function ClaimForm({ plot, onDone }: { readonly plot: PlotInfo; readonly onDone: () => void }): React.JSX.Element {
  const t = useT();
  const profile = useApp((s) => s.profile);
  const { isBusy, run } = useAction();
  const [nick, setNick] = useState(profile?.instagram ?? '');
  const [bio, setBio] = useState('');
  if (!profile) return <button type="button" className="btn clay block" onClick={() => openPanel({ kind: 'auth' })}>{t('needLogin')}</button>;
  if (profile.free_used) return <p className="muted">{t('e_free_used')}</p>;
  const submit = (e: FormEvent): void => {
    e.preventDefault();
    void run(async () => {
      const ig = parseInstagram(nick);
      if (!ig.ok) throw new Error(ig.code);
      const text = parseBio(bio);
      if (!text.ok) throw new Error(text.code);
      const r = await rpc<{ status: string }>('my_claim', { p_plot: plot.id, p_instagram: ig.value, p_bio: text.value });
      await Promise.all([refreshHouses(), refreshProfile()]);
      toast(t(r.status === 'pending' ? 'claimedPending' : 'claimed'));
      onDone();
    });
  };
  return (
    <form className="section" onSubmit={submit}>
      <h3>{t('claimTitle')}</h3>
      <Field label={t('igNick')}><input value={nick} onChange={(e) => setNick(e.target.value)} placeholder="@nik" autoCapitalize="none" required maxLength={80} /></Field>
      <Field label={t('bio')}><input value={bio} onChange={(e) => setBio(e.target.value)} maxLength={120} /></Field>
      <button type="submit" className="btn clay block" disabled={isBusy}>{t('claimBtn')}</button>
      <button type="button" className="link" onClick={() => openPanel({ kind: 'rules' })}>{t('rulesAgree')}</button>
    </form>
  );
}

function BuyPlot({ plot }: { readonly plot: PlotInfo }): React.JSX.Element {
  const t = useT();
  const profile = useApp((s) => s.profile);
  const { isBusy, run } = useAction();
  const [nick, setNick] = useState(profile?.instagram ?? '');
  const isPaid = setting('payments_enabled', false);
  const submit = (e: FormEvent): void => {
    e.preventDefault();
    void run(async () => {
      const ig = parseInstagram(nick);
      if (!ig.ok) throw new Error(ig.code);
      await createOrder('plot', { plot: plot.id, instagram: ig.value });
    });
  };
  return (
    <form className="section" onSubmit={submit}>
      <div className="row between"><span className="muted">{t('price')}</span><b>{money(plot.price)} {t('som')}</b></div>
      {!isPaid && <p className="muted">{t('paidSoon')}</p>}
      {isPaid && profile && <>
        <Field label={t('igNick')}><input value={nick} onChange={(e) => setNick(e.target.value)} required maxLength={80} /></Field>
        <button type="submit" className="btn block" disabled={isBusy}>{t('buy')}</button>
      </>}
      {isPaid && !profile && <button type="button" className="btn block" onClick={() => openPanel({ kind: 'auth' })}>{t('login')}</button>}
    </form>
  );
}

export function PlotPanel({ id }: IdProps): React.JSX.Element | null {
  const t = useT();
  const lang = useApp((s) => s.lang);
  const plot = useApp((s) => s.plotById.get(id));
  const { data, reload } = useLoad(() => rpc<PlotInfo>('api_plot', { p_plot: id }), id);
  if (!plot) return null;
  const statusTag = data && (!data.open && data.status === 'free' ? <span className="tag clay">{t('closed')}</span> : <span className={`tag ${data.status === 'free' ? 'free' : ''}`}>{t(data.status)}</span>);
  const tier = TIERS.find((x) => x.id === data?.tier);
  return (
    <Sheet title={t(`t_${plot.type}`)}>
      <div className="row between"><button type="button" className="link address" onClick={() => openPanel({ kind: 'street', id: plot.streetId })}>{addressOf(plot)}</button>{statusTag}</div>
      {data?.instagram && <>
        <p className="nick">@{data.instagram}</p>
        <div className="row">
          {data.badges.filter((b): b is BadgeId => b in BADGES).map((b) => <span className="tag gold" key={b}>{BADGES[b].icon} {BADGES[b][lang]}</span>)}
          {tier && plot.type !== 'kvartira' && <span className="tag">★ {tier.id} · {tier[lang]}</span>}
        </div>
        {data.bio && <p className="quote">{data.bio}</p>}
        <a className="btn" href={instagramUrl(data.instagram)} target="_blank" rel="noopener noreferrer">{t('visitIg')}</a>
        {data.since && <p className="muted">{t('sinceDate')}: {new Date(data.since).toLocaleDateString('ru-RU')}</p>}
      </>}
      {data?.status === 'free' && data.open && isFreeType(plot.type) && <ClaimForm plot={data} onDone={reload} />}
      {data?.status === 'free' && data.open && (!isFreeType(plot.type) || setting('payments_enabled', false)) && <BuyPlot plot={data} />}
      <button type="button" className="btn soft" onClick={() => goToPlot(id)}>{t('goThere')}</button>
      {data && data.status !== 'free' && <ReportForm kind="plot" target={id} />}
    </Sheet>
  );
}

export function BuildingPanel({ id }: { readonly id: number }): React.JSX.Element | null {
  const t = useT();
  const plan = useApp((s) => s.plan);
  const houses = useApp((s) => s.houses);
  const units = plan?.plots.filter((p) => p.building === id) ?? [];
  const first = units[0];
  if (!first) return null;
  return (
    <Sheet title={t('residents')}>
      <p className="address">{addressOf({ ...first, unit: 0 })}</p>
      <ul className="list">
        {units.map((u) => {
          const h = houses.get(u.id);
          return (
            <li key={u.id}>
              <span className="n">{u.unit}</span>
              <button type="button" className="plain" onClick={() => openPanel({ kind: 'plot', id: u.id })}>{h?.nick ? <b>@{h.nick}</b> : <span className="muted">{t('free')}</span>}</button>
              <span className="muted">{Math.ceil(u.unit / 4)}-{t('floor')}</span>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}

interface CommerceInfo { readonly id: string; readonly type: Commerce['type']; readonly price: number; readonly free: boolean; readonly title: string | null; readonly link: string | null }
export function CommercePanel({ id }: IdProps): React.JSX.Element {
  const t = useT();
  const profile = useApp((s) => s.profile);
  const { isBusy, run } = useAction();
  const lang = useApp((s) => s.lang);
  const tower = TOWERS[id];
  const { data } = useLoad(() => rpc<CommerceInfo>('api_commerce', { p_id: id }), id);
  if (tower) return <Sheet title={TOWER_NAMES[tower.look][lang]}><p className="muted">{t('towerNote')}</p></Sheet>;
  return (
    <Sheet title={data ? t(`t_${data.type}`) : t('business')}>
      {data?.title && <p className="nick">{data.title}</p>}
      {data?.link?.startsWith('https://') && <a className="btn" href={data.link} target="_blank" rel="noopener noreferrer nofollow">{t('open')}</a>}
      {data?.free && <>
        <div className="row between"><span className="tag free">{t('free')}</span><b>{money(data.price)} {t('som')} / {t('perMonth')}</b></div>
        {!setting('payments_enabled', false) && <p className="muted">{t('paidSoon')}</p>}
        {setting('payments_enabled', false) && <button type="button" className="btn block" disabled={isBusy} onClick={() => (profile ? void run(() => createOrder('commerce', { id })) : openPanel({ kind: 'auth' }))}>{t('rent')}</button>}
      </>}
      {data && !data.free && <ReportForm kind="ad" target={id} />}
    </Sheet>
  );
}

interface StreetInfo {
  readonly id: number; readonly name: string | null; readonly central: boolean; readonly owners: number; readonly pending: boolean; readonly lives: boolean; readonly price: number;
  readonly vote: { readonly id: string; readonly closes: string; readonly mine: number | null; readonly proposals: readonly { readonly id: number; readonly name: string; readonly votes: number }[] } | null;
}
export function StreetPanel({ id }: { readonly id: number }): React.JSX.Element {
  const t = useT();
  const { isBusy, run } = useAction();
  const [name, setName] = useState('');
  const { data, reload } = useLoad(() => rpc<StreetInfo>('api_street', { p_street: id }), String(id));
  const act = (fn: () => Promise<unknown>): void => { void run(fn, t('sent')).then((ok) => { if (ok) { setName(''); reload(); } }); };
  const nameForm = (label: string, fn: (v: string) => Promise<unknown>): React.JSX.Element => (
    <form className="row" onSubmit={(e) => { e.preventDefault(); act(() => fn(name)); }}>
      <input className="input grow" value={name} onChange={(e) => setName(e.target.value)} maxLength={25} placeholder={t('streetName')} aria-label={t('streetName')} required />
      <button type="submit" className="btn small" disabled={isBusy}>{label}</button>
    </form>
  );
  const canPay = setting('payments_enabled', false);
  return (
    <Sheet title={data?.name ?? `${id}-${t('street').toLowerCase()}`}>
      {data && <p className="muted">{data.owners} {t('streetOwners')}</p>}
      {data?.pending && <span className="tag clay">{t('streetPending')}</span>}
      {data?.vote && <Section title={`${t('vote')} · ${new Date(data.vote.closes).toLocaleDateString('ru-RU')} ${t('until')}`}>
        <ul className="list">{data.vote.proposals.map((p) => (
          <li key={p.id}><b className="grow">{p.name}</b><span className="muted">{p.votes} {t('votes')}</span>
            {data.vote?.mine === p.id ? <span className="tag">{t('voted')}</span> : data.lives && <button type="button" className="btn small soft" disabled={isBusy} onClick={() => act(() => rpc('my_street_vote', { p_proposal: p.id }))}>{t('vote')}</button>}
          </li>))}</ul>
        {data.lives && nameForm(t('propose'), (v) => rpc('my_street_propose', { p_vote: data.vote?.id, p_name: v }))}
      </Section>}
      {data && !data.vote && !data.pending && !data.central && data.lives && <Section title={t('streetName')}>
        {!data.name && nameForm(t('streetTemp'), (v) => rpc('my_street_temp', { p_street: id, p_name: v }))}
        {data.owners >= setting('street_vote_min', 5) ? <button type="button" className="btn" disabled={isBusy} onClick={() => act(() => rpc('my_street_open_vote', { p_street: id }))}>{t('streetVote')}</button> : <p className="muted">{t('streetNeed')}</p>}
      </Section>}
      {data?.central && !data.pending && <Section title={t('streetBuy')}>
        <p><b>{money(data.price)} {t('som')}</b></p>
        {canPay ? nameForm(t('buy'), (v) => createOrder('street_name', { street: id, name: v })) : <p className="muted">{t('paidSoon')}</p>}
      </Section>}
      {data?.name && <ReportForm kind="street" target={String(id)} />}
    </Sheet>
  );
}

interface Found { readonly plot: string; readonly instagram: string; readonly address: string }
function SearchBox(): React.JSX.Element {
  const t = useT();
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(id);
  }, [q]);
  const { data } = useLoad(() => (debounced.length < 2 ? Promise.resolve([]) : rpc<readonly Found[]>('api_search', { p_q: debounced })), debounced);
  return (
    <div className="search">
      <input className="input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('searchHint')} aria-label={t('search')} autoCapitalize="none" maxLength={40} />
      <ul className="list">
        {data?.map((f) => <li key={f.plot}><button type="button" className="plain" onClick={() => goToPlot(f.plot)}><b>@{f.instagram}</b><br /><span className="muted">{f.address}</span></button><span aria-hidden="true">→</span></li>)}
      </ul>
      {debounced.length >= 2 && data?.length === 0 && <p className="muted">{t('nothing')}</p>}
    </div>
  );
}

export function MapPanel(): React.JSX.Element {
  const t = useT();
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const draw = (): void => { if (ref.current) drawBigMap(ref.current); };
    draw();
    const id = setInterval(draw, 1000);
    return () => clearInterval(id);
  }, []);
  const go = (e: React.MouseEvent<HTMLCanvasElement>): void => {
    const r = e.currentTarget.getBoundingClientRect();
    goToPoint(fromMap(((e.clientX - r.left) / r.width) * MAP_SIZE), fromMap(((e.clientY - r.top) / r.height) * MAP_SIZE));
    if (matchMedia('(max-width: 640px)').matches) openPanel(null);
  };
  return (
    <Sheet title={t('map')}>
      <SearchBox />
      <canvas ref={ref} className="bigmap" width={MAP_SIZE} height={MAP_SIZE} onClick={go} aria-label={t('map')} />
      <div className="row">
        <button type="button" className="btn small soft" onClick={() => goToPoint(0, 40)}>⛲ {t('plaza')}</button>
        {getApp().profile?.plots.map((p) => <button type="button" key={p.plot} className="btn small" onClick={() => goToPlot(p.plot)}>🏠 {t('me')}</button>)}
      </div>
    </Sheet>
  );
}
