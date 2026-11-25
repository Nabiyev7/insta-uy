/** O'z uyim ishlari: ranglar va material, level, nik, bezash, sovg'alar. */
import { useState, type FormEvent } from 'react';
import { MAX_TIER, TIERS, TIER_COINS, parseBio, type TierId } from '../../../../packages/shared/src/index.ts';
import { startConstruction } from '../app/actions.ts';
import { rpc, type MyPlot } from '../app/api.ts';
import { money, useT } from '../app/i18n.ts';
import { openPanel, refreshHouses, refreshProfile, setting, useApp } from '../app/store.ts';
import { GiftDecor, YardEditor } from './YardEditor.tsx';
import { createOrder } from './OrderPanels.tsx';
import { PayButtons } from './PayButtons.tsx';
import { Icon } from './icons.tsx';
import { Field, Section, Sheet, askConfirm, useAction } from './kit.tsx';

export const refreshMine = async (): Promise<void> => { await Promise.all([refreshProfile(), refreshHouses()]); };
interface PlotProps { readonly plot: MyPlot }
interface IdProps { readonly id: string }
const useMine = (id: string): MyPlot | undefined => useApp((s) => s.profile?.plots.find((p) => p.plot === id));

function BioForm({ plot }: PlotProps): React.JSX.Element {
  const t = useT();
  const { isBusy, run } = useAction();
  const [bio, setBio] = useState(plot.bio);
  const submit = (e: FormEvent): void => {
    e.preventDefault();
    void run(async () => {
      const text = parseBio(bio);
      if (!text.ok) throw new Error(text.code);
      await rpc('my_edit_bio', { p_plot: plot.plot, p_bio: text.value });
      await refreshMine();
    }, t('saved'));
  };
  return (
    <form className="stack" onSubmit={submit}>
      <p className="muted">{t('bioHint')}</p>
      <Field label={t('bio')}><input value={bio} onChange={(e) => setBio(e.target.value)} maxLength={120} /></Field>
      <button type="submit" className="btn block" disabled={isBusy}>{t('save')}</button>
    </form>
  );
}
export function BioPanel({ id }: IdProps): React.JSX.Element | null {
  const t = useT();
  const plot = useMine(id);
  if (!plot) return null;
  return <Sheet title={t('bioTitle')} variant="half"><BioForm key={`${plot.plot}${plot.bio}`} plot={plot} /></Sheet>;
}

export function YardPanel({ id }: IdProps): React.JSX.Element | null {
  const t = useT();
  const plot = useMine(id);
  if (!plot) return null;
  return <Sheet title={t('decorate')} footer={<button type="button" className="btn block" onClick={() => openPanel({ kind: 'shop' })}><Icon name="shop" />{t('shop')}</button>}><YardEditor plot={plot} /></Sheet>;
}

interface Prices { readonly tierUp: Readonly<Record<string, number>>; readonly expansion: number; readonly label: Readonly<Record<string, number>> }
interface CoinPrices { readonly maxTier?: number; readonly tier?: Readonly<Record<string, number>> }
/** Kuchaytirish: tanga yetsa — tasdiq, qurilish effekti, tabrik; yetmasa — qancha kerakligi va "Tanga olish"; 5-levelda — "Eng yuqori level". */
export function UpgradeButton({ plot }: PlotProps): React.JSX.Element | null {
  const t = useT();
  const lang = useApp((s) => s.lang);
  const balance = useApp((s) => s.profile?.coins ?? 0);
  const full = useApp((s) => s.plotById.get(plot.plot));
  const { isBusy, run } = useAction();
  const prices = setting<Prices | null>('prices', null);
  const coins = setting<CoinPrices>('coins', {});
  const isTester = useApp((s) => s.profile?.test_mode === true);
  const setTier = (tier: number): void => { void run(async () => { await rpc('my_test_tier', { p_plot: plot.plot, p_tier: tier }); await refreshMine(); if (full && tier > plot.tier) startConstruction(full, tier); }); };
  const testTiers = isTester && <div className="seg test-tiers" role="group" aria-label={t('testMode')}>{TIERS.map((x) => <button type="button" key={x.id} aria-pressed={x.id === plot.tier} disabled={isBusy} onClick={() => setTier(x.id)}>{x.id}</button>)}</div>;
  if (plot.tier >= MAX_TIER) return <>{testTiers}<p className="max-level with-icon"><Icon name="star" />{t('maxLevel')}</p></>;
  const next = (plot.tier + 1) as TierId;
  const name = TIERS.find((x) => x.id === next)?.[lang] ?? '';
  const price = coins.tier?.[next] ?? TIER_COINS[next] ?? 0;
  const canCoins = plot.tier < Math.min(MAX_TIER, coins.maxTier ?? MAX_TIER) && setting('coins_enabled', true);
  const label = <>{t('raise')}<Icon name="next" />{next}-{t('levelWord')}<span className="price"><Icon name="coin" />{money(price)}</span></>;
  const raise = async (): Promise<void> => {
    if (!(await askConfirm(`${next}. ${name} — ${money(price)} ${t('coinsWord')}`))) return;
    await run(async () => {
      await rpc('my_tier_coins', { p_plot: plot.plot });
      await refreshMine();
      if (full) startConstruction(full, next);
    });
  };
  return (
    <>
      {testTiers}
      {canCoins && balance >= price && <button type="button" className="btn gold block big upgrade" disabled={isBusy} onClick={() => void raise()}>{label}</button>}
      {canCoins && balance < price && <div className="upgrade-need">
        <button type="button" className="btn block big upgrade" disabled>{label}</button>
        <div className="row between"><span className="muted">{t('needMore').replace('{n}', money(price - balance))}</span><button type="button" className="btn small gold" onClick={() => openPanel({ kind: 'coins' })}><Icon name="coin" />{t('addCoins')}</button></div>
      </div>}
      {prices && <PayButtons kind="tier" payload={{ plot: plot.plot, tier: next }} uzs={prices.tierUp[next] ?? 0} code={`t_${plot.plot}_${next}`} label={`${next}. ${name}`} />}
    </>
  );
}

/** Faqat to'lov yoqilganda: nik yorlig'i va hovlini kengaytirish. */
export function PaidExtras({ plot }: PlotProps): React.JSX.Element | null {
  const t = useT();
  const { isBusy, run } = useAction();
  const prices = setting<Prices | null>('prices', null);
  if (!setting('payments_enabled', false) || !prices) return null;
  return (
    <>
      {plot.label !== 'gold' && <div className="row">{(['silver', 'gold'] as const).filter((l) => l !== plot.label).map((l) => <button type="button" key={l} className="btn small soft" disabled={isBusy} onClick={() => run(() => createOrder('label', { plot: plot.plot, label: l }))}>{t('label')}: {t(l)} · {money(prices.label[l] ?? 0)}</button>)}</div>}
      {plot.expansion && !plot.has_expansion && <button type="button" className="btn small soft" disabled={isBusy} onClick={() => run(() => createOrder('expansion', { plot: plot.plot }))}>{t('expand')} · {money(prices.expansion)}</button>}
    </>
  );
}



interface GiftsProps { readonly to?: string }
export function GiftsPanel({ to = '' }: GiftsProps): React.JSX.Element {
  const t = useT();
  return (
    <Sheet title={to ? `${t('giftTitle')}: @${to}` : t('giftsTitle')}>
      <p className="muted">{t('giftsHint')}</p>
      <Section title={t('giftDecor')} icon="gift"><GiftDecor to={to} /></Section>
    </Sheet>
  );
}
