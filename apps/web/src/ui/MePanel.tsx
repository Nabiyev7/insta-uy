import { useState, type FormEvent } from 'react';
import { parseInstagram } from '../../../../packages/shared/src/index.ts';
import { AVATAR_OPTIONS, DECOR, MAX_TIER, ROOF_COLORS, TIERS, WALL_COLORS, normalizeDecor, parseBio, sanitizeAvatar, type AvatarLook, type TierId } from '../../../../packages/shared/src/index.ts';
import { copyText, goToPlot, houseUrl, inviteUrl, nearestFree, shareImage, storyImage } from '../app/actions.ts';
import { post, rpc, signOut, type MyPlot } from '../app/api.ts';
import { hasKey, money, useT } from '../app/i18n.ts';
import { getApp, openPanel, refreshHouses, refreshProfile, setting, toast, useApp } from '../app/store.ts';
import { createOrder, useCatalog } from './OrderPanels.tsx';
import { Field, Section, Seg, Sheet, Swatches, useAction } from './kit.tsx';

const refresh = async (): Promise<void> => { await Promise.all([refreshProfile(), refreshHouses()]); };
interface PlotProps { readonly plot: MyPlot }

function LooksForm({ plot }: PlotProps): React.JSX.Element {
  const t = useT();
  const { isBusy, run } = useAction();
  const [bio, setBio] = useState(plot.bio);
  const [wall, setWall] = useState(plot.wall);
  const [roof, setRoof] = useState(plot.roof);
  const submit = (e: FormEvent): void => {
    e.preventDefault();
    void run(async () => {
      const text = parseBio(bio);
      if (!text.ok) throw new Error(text.code);
      await rpc('my_edit_house', { p_plot: plot.plot, p_bio: text.value, p_wall: wall, p_roof: roof });
      await refresh();
    }, t('saved'));
  };
  return (
    <form className="section" onSubmit={submit}>
      <Field label={t('bio')}><input value={bio} onChange={(e) => setBio(e.target.value)} maxLength={120} /></Field>
      <span className="muted">{t('wallColor')}</span><Swatches label={t('wallColor')} colors={WALL_COLORS} value={wall} onPick={setWall} />
      <span className="muted">{t('roofColor')}</span><Swatches label={t('roofColor')} colors={ROOF_COLORS} value={roof} onPick={setRoof} />
      <button type="submit" className="btn" disabled={isBusy}>{t('save')}</button>
    </form>
  );
}

function DecorShop({ plot }: PlotProps): React.JSX.Element {
  const t = useT();
  const lang = useApp((s) => s.lang);
  const owned = useApp((s) => s.profile?.decor) ?? {};
  const catalog = useCatalog();
  const { isBusy, run } = useAction();
  const isPaid = setting('payments_enabled', false);
  const isCoins = setting('coins_enabled', true);
  const setDecor = (ids: readonly string[]): void => { void run(async () => { await rpc('my_set_decor', { p_plot: plot.plot, p_decor: normalizeDecor(ids) }); await refresh(); }, t('saved')); };
  return (
    <Section title={t('decor')}>
      <ul className="list">
        {DECOR.filter((d) => catalog.has(d.id) || owned[d.id]).map((d) => {
          const c = catalog.get(d.id);
          const isPlaced = plot.decor.includes(d.id);
          return (
            <li key={d.id}>
              <span className="grow">{d[lang]}{c?.left !== null && c?.left !== undefined && <span className="tag gold"> {c.left} {t('left')}</span>}<br /><span className="muted">{owned[d.id] ? t('owned2') : c && `${isCoins ? `💰 ${c.coins}` : ''}${isPaid ? ` · ${money(c.uzs)} ${t('som')}` : ''}`}</span></span>
              {isPlaced && <button type="button" className="btn small soft" disabled={isBusy} onClick={() => setDecor(plot.decor.filter((x) => x !== d.id))}>{t('remove')}</button>}
              {!isPlaced && owned[d.id] && <button type="button" className="btn small" disabled={isBusy} onClick={() => setDecor([...plot.decor, d.id])}>{t('place')}</button>}
              {!owned[d.id] && isCoins && <button type="button" className="btn small" disabled={isBusy || (c?.left === 0)} onClick={() => run(async () => { await rpc('my_buy_decor_coins', { p_id: d.id }); await refreshProfile(); }, t('saved'))}>💰</button>}
              {!owned[d.id] && isPaid && <button type="button" className="btn small clay" disabled={isBusy || (c?.left === 0)} onClick={() => run(() => createOrder('decor', { id: d.id }))}>{t('buy')}</button>}
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

interface Prices { readonly tierUp: Readonly<Record<string, number>>; readonly expansion: number; readonly label: Readonly<Record<string, number>> }
interface CoinPrices { readonly tierBase: number; readonly maxTier: number }
function Upgrades({ plot }: PlotProps): React.JSX.Element {
  const t = useT();
  const lang = useApp((s) => s.lang);
  const { isBusy, run } = useAction();
  const isPaid = setting('payments_enabled', false);
  const prices = setting<Prices | null>('prices', null);
  const coins = setting<CoinPrices | null>('coins', null);
  const name = (id: number): string => TIERS.find((x) => x.id === id)?.[lang] ?? '';
  const next = (plot.tier + 1) as TierId;
  return (
    <Section title={`${t('tier')} ${plot.tier}/${MAX_TIER}: ${name(plot.tier)}`}>
      {plot.tier < MAX_TIER && coins && plot.tier < coins.maxTier && setting('coins_enabled', true) && <button type="button" className="btn" disabled={isBusy} onClick={() => run(async () => { await rpc('my_tier_coins', { p_plot: plot.plot }); await refresh(); }, t('saved'))}>⬆ {next}. {name(next)} · 💰 {coins.tierBase * plot.tier}</button>}
      {plot.tier < MAX_TIER && isPaid && prices && <button type="button" className="btn clay" disabled={isBusy} onClick={() => run(() => createOrder('tier', { plot: plot.plot, tier: next }))}>⬆ {next}. {name(next)} · {money(prices.tierUp[next] ?? 0)} {t('som')}</button>}
      {isPaid && prices && plot.label !== 'gold' && <div className="row">{(['silver', 'gold'] as const).filter((l) => l !== plot.label).map((l) => <button type="button" key={l} className="btn small soft" disabled={isBusy} onClick={() => run(() => createOrder('label', { plot: plot.plot, label: l }))}>{t('label')}: {t(l)} · {money(prices.label[l] ?? 0)}</button>)}</div>}
      {isPaid && prices && plot.expansion && !plot.has_expansion && <button type="button" className="btn small soft" disabled={isBusy} onClick={() => run(() => createOrder('expansion', { plot: plot.plot }))}>{t('expand')} · {money(prices.expansion)}</button>}
      {!isPaid && <p className="muted">{t('paidSoon')}</p>}
    </Section>
  );
}

function Gift({ plot }: PlotProps): React.JSX.Element {
  const t = useT();
  const { isBusy, run } = useAction();
  const [to, setTo] = useState('');
  const [msg, setMsg] = useState('');
  return (
    <details className="section">
      <summary>🎁 {t('gift')}</summary>
      <form className="section" onSubmit={(e) => { e.preventDefault(); void run(() => rpc('my_transfer', { p_plot: plot.plot, p_to: to, p_message: msg }), t('sent')); }}>
        <Field label={t('giftTo')}><input value={to} onChange={(e) => setTo(e.target.value)} required autoCapitalize="none" /></Field>
        <Field label={t('giftMsg')}><input value={msg} onChange={(e) => setMsg(e.target.value)} maxLength={100} /></Field>
        <button type="submit" className="btn small" disabled={isBusy}>{t('gift')}</button>
      </form>
    </details>
  );
}

/** Nik tasdiqlanmagan yoki band bo'lib qolgan uy: qayta yozish. */
function NickForm({ plot }: PlotProps): React.JSX.Element {
  const t = useT();
  const { isBusy, run } = useAction();
  const [nick, setNick] = useState('');
  const submit = (e: FormEvent): void => {
    e.preventDefault();
    void run(async () => {
      const ig = parseInstagram(nick);
      if (!ig.ok) throw new Error(ig.code);
      await rpc('my_set_nick', { p_plot: plot.plot, p_instagram: ig.value });
      await refresh();
    }, t('sent'));
  };
  return <form className="section" onSubmit={submit}><Field label={t('igNick')}><input value={nick} onChange={(e) => setNick(e.target.value)} placeholder="@nik" autoCapitalize="none" maxLength={80} required /></Field><button type="submit" className="btn" disabled={isBusy}>{t('save')}</button></form>;
}

function HouseSection({ plot }: PlotProps): React.JSX.Element {
  const t = useT();
  const { isBusy, run } = useAction();
  const full = useApp((s) => s.plotById.get(plot.plot));
  const story = (): Promise<boolean> => run(async () => {
    const p = getApp().plotById.get(plot.plot);
    if (!p) return;
    openPanel(null);
    const canvas = await storyImage(p, plot.instagram ?? '');
    openPanel({ kind: 'me' });
    await shareImage(canvas, `uy-${plot.instagram}`);
  });
  return (
    <>
      <div className="row between"><span className="address">{plot.address}</span><span className="tag">{t(plot.status === 'pending' ? 'pending' : 'owned')}</span></div>
      {plot.instagram ? <p className="nick">@{plot.instagram}</p> : <NickForm plot={plot} />}
      <div className="row">
        <button type="button" className="btn clay grow" disabled={isBusy} onClick={story}>📱 {t('stories')}</button>
        <button type="button" className="btn soft" onClick={() => goToPlot(plot.plot)}>{t('goThere')}</button>
        <button type="button" className="btn soft" onClick={() => run(() => copyText(houseUrl(plot.plot)), t('copied'))}>🔗</button>
      </div>
      <LooksForm key={`${plot.plot}${plot.bio}${plot.wall}${plot.roof}`} plot={plot} />
      {full?.type !== 'kvartira' && plot.status === 'owned' && <><Upgrades plot={plot} /><DecorShop plot={plot} /></>}
      {plot.status === 'owned' && <Gift plot={plot} />}
    </>
  );
}

function Inbox(): React.JSX.Element | null {
  const t = useT();
  const profile = useApp((s) => s.profile);
  const { isBusy, run } = useAction();
  if (!profile || (profile.notes.length === 0 && profile.transfers.length === 0)) return null;
  const answer = (id: string, isYes: boolean): void => { void run(async () => { await rpc('my_transfer_answer', { p_id: id, p_accept: isYes, p_instagram: profile.instagram }); await refresh(); }); };
  return (
    <Section title={t('notes')}>
      {profile.transfers.map((tr) => (
        <div className="quote" key={tr.id}>🎁 <b>{tr.from}</b> {t('giftIn')}: {tr.message}
          <div className="row"><button type="button" className="btn small" disabled={isBusy} onClick={() => answer(tr.id, true)}>{t('accept')}</button><button type="button" className="btn small soft" disabled={isBusy} onClick={() => answer(tr.id, false)}>{t('decline')}</button></div>
        </div>
      ))}
      <ul className="list">{profile.notes.map((n) => { const key = `n_${n.kind}`; return <li key={n.id}>{hasKey(key) ? t(key) : n.kind}</li>; })}</ul>
      {profile.notes.length > 0 && <button type="button" className="btn small soft" disabled={isBusy} onClick={() => run(async () => { await rpc('my_notes_read'); await refreshProfile(); })}>✓ {t('done')}</button>}
    </Section>
  );
}

export function MePanel(): React.JSX.Element {
  const t = useT();
  const profile = useApp((s) => s.profile);
  const { isBusy, run } = useAction();
  const [tgUrl, setTgUrl] = useState('');
  if (!profile) return <Sheet title={t('me')}><button type="button" className="btn" onClick={() => openPanel({ kind: 'auth' })}>{t('login')}</button></Sheet>;
  const findFree = (): void => {
    const id = nearestFree();
    if (id) goToPlot(id);
    else toast(t('nothing'), true);
  };
  return (
    <Sheet title={t('me')}>
      <Inbox />
      {profile.plots.length === 0 && <><p>{t('noHouse')}</p><button type="button" className="btn clay" onClick={findFree}>🏠 {t('findFree')}</button></>}
      {profile.plots.map((p) => <HouseSection key={p.plot} plot={p} />)}
      <Section title={t('invite')}>
        <div className="row between"><span className="muted">{t('invited')}: <b>{profile.invited}</b></span><button type="button" className="btn small" onClick={() => run(() => copyText(inviteUrl(profile.ref)), t('copied'))}>🔗 {t('share')}</button></div>
      </Section>
      <Section title={profile.login}>
        {profile.telegram ? <span className="tag free">✓ {t('tgLinked')}</span> : <button type="button" className="btn" disabled={isBusy} onClick={() => run(async () => setTgUrl((await post<{ url: string }>('/auth/telegram/link', {}, true)).url))}>✈️ {t('linkTg')}</button>}
        {tgUrl && !profile.telegram && <a className="btn clay" href={tgUrl} target="_blank" rel="noopener noreferrer" onClick={() => setTimeout(() => void refreshProfile(), 15_000)}>{t('openTg')}</a>}
        {!profile.telegram && <p className="muted">{t('linkTgWhy')}</p>}
        <div className="row">
          <button type="button" className="btn small soft" onClick={() => openPanel({ kind: 'avatar' })}>{t('avatar')}</button>
          <button type="button" className="btn small soft" onClick={() => openPanel({ kind: 'orders' })}>{t('orders')}</button>
          <button type="button" className="btn small soft" onClick={() => openPanel({ kind: 'ads' })}>{t('myAds')}</button>
          <button type="button" className="btn small soft" onClick={() => run(async () => { await signOut(); openPanel(null); })}>{t('logout')}</button>
        </div>
      </Section>
    </Sheet>
  );
}

export function AvatarPanel(): React.JSX.Element {
  const t = useT();
  const profile = useApp((s) => s.profile);
  const { run } = useAction();
  const look = sanitizeAvatar(profile?.avatar);
  const set = (patch: Partial<AvatarLook>): void => { void run(async () => { await rpc('my_avatar', { p_avatar: { ...look, ...patch } }); await refreshProfile(); }); };
  const colors = (key: 'skin' | 'hair' | 'top' | 'pants'): React.JSX.Element => {
    const list: readonly string[] = AVATAR_OPTIONS[key];
    return <><span className="muted">{t(key)}</span><Swatches label={t(key)} colors={list} value={list.indexOf(look[key])} onPick={(i) => set({ [key]: list[i] })} /></>;
  };
  return (
    <Sheet title={t('avatar')} onBack={() => openPanel({ kind: profile ? 'me' : 'menu' })}>
      {colors('skin')}{colors('hair')}{colors('top')}{colors('pants')}
      <span className="muted">{t('hat')}</span><Seg label={t('hat')} value={look.hat} onPick={(hat) => set({ hat })} options={[['none', t('o_none')], ['doppi', t('o_doppi')], ['kepka', t('o_kepka')]]} />
      <span className="muted">{t('outfit')}</span><Seg label={t('outfit')} value={look.outfit} onPick={(outfit) => set({ outfit })} options={[['oddiy', t('o_oddiy')], ['chopon', t('o_chopon')]]} />
      {!profile && <button type="button" className="btn" onClick={() => openPanel({ kind: 'auth' })}>{t('login')}</button>}
    </Sheet>
  );
}
