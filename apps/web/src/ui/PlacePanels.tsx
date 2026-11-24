/** Joylar: ko'p qavatli bino, davlat binosi, tijorat binosi, ko'cha. */
import { useState } from 'react';
import { TOWERS, TOWER_NAMES, civicById, type Commerce } from '../../../../packages/shared/src/index.ts';
import { addressOf } from '../app/actions.ts';
import { rpc } from '../app/api.ts';
import { money, useT, type Key } from '../app/i18n.ts';
import { openAuth, openPanel, setting, useApp } from '../app/store.ts';
import { createOrder } from './OrderPanels.tsx';
import { ReportForm } from './ReportForm.tsx';
import type { IconName } from './icons.tsx';
import { LoadState, RowLink, Section, Sheet, useAction, useLoad } from './kit.tsx';

interface IdProps { readonly id: string }

export function BuildingPanel({ id }: { readonly id: number }): React.JSX.Element | null {
  const t = useT();
  const plan = useApp((s) => s.plan);
  const houses = useApp((s) => s.houses);
  const units = plan?.plots.filter((p) => p.building === id) ?? [];
  const first = units[0];
  if (!first) return null;
  return (
    <Sheet title={addressOf({ ...first, unit: 0 })} variant="half">
      <p className="muted">{t('residents')}</p>
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

/** Davlat binosi: nomi va unga bog'langan oyna. */
const CIVIC_LINKS: Readonly<Record<'gazette' | 'city' | 'rules', readonly [IconName, Key]>> = { gazette: ['news', 'gazette'], city: ['bank', 'cityWorks'], rules: ['rules', 'rules'] };
export function CivicPanel({ id }: IdProps): React.JSX.Element | null {
  const t = useT();
  const lang = useApp((s) => s.lang);
  const civic = civicById(id);
  if (!civic) return null;
  const { panel } = civic;
  return (
    <Sheet title={civic[lang]} variant="half">
      <p className="muted">{t('civicNote')}</p>
      {panel && <div className="menu-list"><RowLink icon={CIVIC_LINKS[panel][0]} text={t(CIVIC_LINKS[panel][1])} onClick={() => openPanel({ kind: panel })} /></div>}
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
  const loaded = useLoad(() => rpc<CommerceInfo>('api_commerce', { p_id: id }), id);
  const { data } = loaded;
  const isClosed = setting<readonly string[]>('commerce_closed', []).includes(id);
  const isSale = data?.free === true && !isClosed && setting('payments_enabled', false);
  /** Ijarada emas va sotilmaydi. */
  const isShut = data !== null && !isSale && (data.free || isClosed) && !data.title;
  if (tower) return <Sheet title={TOWER_NAMES[tower.look][lang]} variant="half" extra={<span className="tag">{t('notForSale')}</span>}><p className="muted">{t('towerNote')}</p></Sheet>;
  return (
    <Sheet title={data ? t(`t_${data.type}`) : t('business')} variant="half" extra={isShut && <span className="tag">{t('notForSale')}</span>}>
      <LoadState of={loaded} />
      {data?.title && <p className="nick">{data.title}</p>}
      {data?.link?.startsWith('https://') && <a className="btn" href={data.link} target="_blank" rel="noopener noreferrer nofollow">{t('open')}</a>}
      {isShut && <p className="muted">{t('e_not_for_sale')}</p>}
      {isSale && <>
        <div className="row between"><span className="tag free">{t('free')}</span><b>{money(data.price)} {t('som')} / {t('perMonth')}</b></div>
        <button type="button" className="btn block" disabled={isBusy} onClick={() => (profile ? void run(() => createOrder('commerce', { id })) : openAuth())}>{t('rent')}</button>
      </>}
      {data?.title && <ReportForm kind="ad" target={id} />}
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
  const isGuest = useApp((s) => s.profile === null);
  const loaded = useLoad(() => rpc<StreetInfo>('api_street', { p_street: id }), String(id));
  const { data, reload } = loaded;
  const act = (fn: () => Promise<unknown>): void => {
    if (isGuest) { openAuth(); return; }
    void run(fn, t('sent')).then((ok) => { if (ok) { setName(''); reload(); } });
  };
  const nameForm = (label: string, fn: (v: string) => Promise<unknown>): React.JSX.Element => (
    <form className="row" onSubmit={(e) => { e.preventDefault(); act(() => fn(name)); }}>
      <input className="input grow" value={name} onChange={(e) => setName(e.target.value)} maxLength={25} placeholder={t('streetName')} aria-label={t('streetName')} required />
      <button type="submit" className="btn small" disabled={isBusy}>{label}</button>
    </form>
  );
  const canPay = setting('payments_enabled', false);
  return (
    <Sheet title={data?.name ?? `${id}-${t('street').toLowerCase()}`} variant="half">
      <LoadState of={loaded} />
      {data && <p className="muted">{data.owners} {t('streetOwners')}</p>}
      {data?.pending && <span className="tag gold">{t('streetPending')}</span>}
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
