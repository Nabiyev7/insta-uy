/** O'z uyim ishlari: ranglar va material, level, nik, bezash, sovg'alar. */
import { useState, type FormEvent } from 'react';
import { DOOR_COLORS, FRAME_COLORS, MAX_TIER, ROOF_COLORS, TIERS, WALL_COLORS, WALL_MATERIALS, frameIndex, parseBio, parseInstagram, roofColor, type TierId } from '../../../../packages/shared/src/index.ts';
import { cheerLevel } from '../app/actions.ts';
import { rpc, type MyPlot } from '../app/api.ts';
import { money, useT } from '../app/i18n.ts';
import { openPanel, refreshHouses, refreshProfile, setting, useApp } from '../app/store.ts';
import { GiftDecor, YardEditor } from './YardEditor.tsx';
import { createOrder } from './OrderPanels.tsx';
import { Icon } from './icons.tsx';
import { Field, Section, Seg, Sheet, Swatches, useAction } from './kit.tsx';

export const refreshMine = async (): Promise<void> => { await Promise.all([refreshProfile(), refreshHouses()]); };
interface PlotProps { readonly plot: MyPlot }
interface IdProps { readonly id: string }
const useMine = (id: string): MyPlot | undefined => useApp((s) => s.profile?.plots.find((p) => p.plot === id));

function LooksForm({ plot }: PlotProps): React.JSX.Element {
  const t = useT();
  const { isBusy, run } = useAction();
  const hasHouse = useApp((x) => x.plotById.get(plot.plot)?.type !== 'kvartira');
  const [bio, setBio] = useState(plot.bio);
  const [wall, setWall] = useState(plot.wall);
  const [roof, setRoof] = useState(plot.roof);
  const [material, setMaterial] = useState(plot.material);
  const [frame, setFrame] = useState(plot.frame);
  const [door, setDoor] = useState(plot.door);
  const lang = useApp((x) => x.lang);
  const submit = (e: FormEvent): void => {
    e.preventDefault();
    void run(async () => {
      const text = parseBio(bio);
      if (!text.ok) throw new Error(text.code);
      await rpc('my_edit_house', { p_plot: plot.plot, p_bio: text.value, p_wall: wall, p_roof: roof, p_material: material, p_frame: frame, p_door: door });
      await refreshMine();
    }, t('saved'));
  };
  return (
    <form className="stack" onSubmit={submit}>
      <span className="muted">{t('wallColor')}</span><Swatches label={t('wallColor')} colors={WALL_COLORS} value={wall} onPick={setWall} />
      <span className="muted">{t('roofColor')}</span><Swatches label={t('roofColor')} colors={ROOF_COLORS.map((c, i) => (i === 0 ? roofColor(plot.tier, 0) : c))} value={roof} onPick={setRoof} />
      {hasHouse && <>
        <span className="muted">{t('wallMaterial')}</span><Seg label={t('wallMaterial')} value={String(material)} onPick={(v) => setMaterial(Number(v))} options={WALL_MATERIALS.map((m, i) => [String(i), m[lang]] as const)} />
        <span className="muted">{t('frameColor')}</span><Swatches label={t('frameColor')} colors={FRAME_COLORS.map((c, i) => FRAME_COLORS[frameIndex(plot.tier, i)] ?? c)} value={frame} onPick={setFrame} />
        <span className="muted">{t('doorColor')}</span><Swatches label={t('doorColor')} colors={DOOR_COLORS} value={door} onPick={setDoor} />
      </>}
      <Field label={t('bio')}><input value={bio} onChange={(e) => setBio(e.target.value)} maxLength={120} /></Field>
      <button type="submit" className="btn block" disabled={isBusy}>{t('save')}</button>
    </form>
  );
}
export function LooksPanel({ id }: IdProps): React.JSX.Element | null {
  const t = useT();
  const plot = useMine(id);
  if (!plot) return null;
  return <Sheet title={t('looks')}><LooksForm key={`${plot.plot}${plot.bio}${plot.wall}${plot.roof}${plot.material}${plot.frame}${plot.door}`} plot={plot} /></Sheet>;
}

export function YardPanel({ id }: IdProps): React.JSX.Element | null {
  const t = useT();
  const plot = useMine(id);
  if (!plot) return null;
  return <Sheet title={t('decorate')} footer={<button type="button" className="btn block" onClick={() => openPanel({ kind: 'shop' })}><Icon name="shop" />{t('shop')}</button>}><YardEditor plot={plot} /></Sheet>;
}

interface Prices { readonly tierUp: Readonly<Record<string, number>>; readonly expansion: number; readonly label: Readonly<Record<string, number>> }
interface CoinPrices { readonly tierBase: number; readonly maxTier: number }
/** Levelni ko'tarish: tanga bilan, chegaradan keyin — "Tez kunda" (to'lov yoqilsa — pulga). */
export function UpgradeButton({ plot }: PlotProps): React.JSX.Element | null {
  const t = useT();
  const lang = useApp((s) => s.lang);
  const { isBusy, run } = useAction();
  const isPaid = setting('payments_enabled', false);
  const prices = setting<Prices | null>('prices', null);
  const coins = setting<CoinPrices | null>('coins', null);
  if (plot.tier >= MAX_TIER) return null;
  const next = (plot.tier + 1) as TierId;
  const name = TIERS.find((x) => x.id === next)?.[lang] ?? '';
  const canCoins = coins !== null && plot.tier < coins.maxTier && setting('coins_enabled', true);
  const raise = (): void => {
    void run(async () => {
      await rpc('my_tier_coins', { p_plot: plot.plot });
      await refreshMine();
      cheerLevel(plot.plot, next);
    });
  };
  return (
    <>
      {canCoins && <button type="button" className="btn gold block" disabled={isBusy} onClick={raise}><Icon name="up" />{t('raise')}: {next}. {name}<span className="price"><Icon name="coin" />{money(coins.tierBase * plot.tier)}</span></button>}
      {!canCoins && !isPaid && <p className="muted with-icon"><Icon name="lock" />{next}. {name} · {t('soon')}</p>}
      {isPaid && prices && <button type="button" className="btn block" disabled={isBusy} onClick={() => run(() => createOrder('tier', { plot: plot.plot, tier: next }))}><Icon name="up" />{next}. {name} · {money(prices.tierUp[next] ?? 0)} {t('som')}</button>}
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

/** Nik tasdiqlanmagan yoki band bo'lib qolgan uy: qayta yozish. */
export function NickForm({ plot }: PlotProps): React.JSX.Element {
  const t = useT();
  const { isBusy, run } = useAction();
  const [nick, setNick] = useState('');
  const submit = (e: FormEvent): void => {
    e.preventDefault();
    void run(async () => {
      const ig = parseInstagram(nick);
      if (!ig.ok) throw new Error(ig.code);
      await rpc('my_set_nick', { p_plot: plot.plot, p_instagram: ig.value });
      await refreshMine();
    }, t('sent'));
  };
  return <form className="stack" onSubmit={submit}><Field label={t('igNick')}><input value={nick} onChange={(e) => setNick(e.target.value)} placeholder="@nik" autoCapitalize="none" maxLength={80} required /></Field><button type="submit" className="btn" disabled={isBusy}>{t('save')}</button></form>;
}

function GiftHouse({ plot }: PlotProps): React.JSX.Element {
  const t = useT();
  const { isBusy, run } = useAction();
  const [to, setTo] = useState('');
  const [msg, setMsg] = useState('');
  return (
    <details className="section">
      <summary className="with-icon"><Icon name="home" />{t('gift')}: {plot.address}</summary>
      <form className="stack" onSubmit={(e) => { e.preventDefault(); void run(() => rpc('my_transfer', { p_plot: plot.plot, p_to: to, p_message: msg }), t('sent')); }}>
        <Field label={t('giftTo')}><input value={to} onChange={(e) => setTo(e.target.value)} required autoCapitalize="none" /></Field>
        <Field label={t('giftMsg')}><input value={msg} onChange={(e) => setMsg(e.target.value)} maxLength={100} /></Field>
        <button type="submit" className="btn small" disabled={isBusy}>{t('gift')}</button>
      </form>
    </details>
  );
}

/** Kelgan o'tkazma (uy sovg'asi): qabul qilish yoki rad etish. */
export function Transfers(): React.JSX.Element | null {
  const t = useT();
  const profile = useApp((s) => s.profile);
  const { isBusy, run } = useAction();
  if (!profile || profile.transfers.length === 0) return null;
  const answer = (id: string, isYes: boolean): void => { void run(async () => { await rpc('my_transfer_answer', { p_id: id, p_accept: isYes, p_instagram: profile.instagram }); await refreshMine(); }); };
  return (
    <>
      {profile.transfers.map((tr) => (
        <div className="quote" key={tr.id}><b>{tr.from}</b> {t('giftIn')}: {tr.message}
          <div className="row"><button type="button" className="btn small" disabled={isBusy} onClick={() => answer(tr.id, true)}>{t('accept')}</button><button type="button" className="btn small soft" disabled={isBusy} onClick={() => answer(tr.id, false)}>{t('decline')}</button></div>
        </div>
      ))}
    </>
  );
}

interface GiftsProps { readonly to?: string }
export function GiftsPanel({ to = '' }: GiftsProps): React.JSX.Element {
  const t = useT();
  const plots = useApp((s) => s.profile?.plots) ?? [];
  return (
    <Sheet title={to ? `${t('giftTitle')}: @${to}` : t('giftsTitle')}>
      <p className="muted">{t('giftsHint')}</p>
      <Transfers />
      <Section title={t('giftDecor')} icon="gift"><GiftDecor to={to} /></Section>
      {!to && plots.filter((p) => p.status === 'owned').map((p) => <GiftHouse key={p.plot} plot={p} />)}
    </Sheet>
  );
}
