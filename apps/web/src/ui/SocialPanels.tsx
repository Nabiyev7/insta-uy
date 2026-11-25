import { useState } from 'react';
import { BUZZ, buzz, goToPlot } from '../app/actions.ts';
import { post, rpc } from '../app/api.ts';
import { money, useT, type Key } from '../app/i18n.ts';
import { player } from '../app/runtime.ts';
import { openAuth, refreshBoot, refreshProfile, setApp, setting, toast, useApp } from '../app/store.ts';
import { Icon } from './icons.tsx';
import { LoadState, Section, Sheet, useAction, useLoad } from './kit.tsx';

const useDistrictName = (): ((id: number) => string) => {
  const boot = useApp((s) => s.boot);
  const lang = useApp((s) => s.lang);
  return (id) => { const d = boot?.districts.find((x) => x.id === id); return d ? (lang === 'uz' ? d.name_uz : d.name_ru) : String(id); };
};

interface Rankings {
  readonly houses: readonly { readonly plot: string; readonly instagram: string; readonly tier: number; readonly score: number }[];
  readonly districts: readonly { readonly id: number; readonly active: number }[]; readonly inviters: readonly { readonly nick: string; readonly n: number }[];
}
interface Yards { readonly leaders: readonly { readonly plot: string; readonly instagram: string; readonly votes: number }[]; readonly winner: { readonly plot: string; readonly instagram: string; readonly votes: number } | null }
export function RankPanel(): React.JSX.Element {
  const t = useT();
  const name = useDistrictName();
  const loaded = useLoad(() => rpc<Rankings>('api_rankings'), 'rank');
  const { data } = loaded;
  const yardsLoaded = useLoad(() => rpc<Yards>('api_yards'), 'yards');
  const yards = yardsLoaded.data;
  return (
    <Sheet title={t('rank')}>
      <LoadState of={loaded} />
      {!loaded.hasError && yardsLoaded.hasError && <LoadState of={yardsLoaded} />}
      {yards && <Section title={t('yardWeek')} icon="flower">
        {yards.winner && <p>{t('lastWinner')}: <button type="button" className="link" onClick={() => yards.winner && goToPlot(yards.winner.plot)}>@{yards.winner.instagram}</button> · {yards.winner.votes} {t('votes')}</p>}
        <ul className="list">{yards.leaders.map((h, i) => <li key={h.plot}><span className="n">{i + 1}</span><button type="button" className="plain" onClick={() => goToPlot(h.plot)}><b>@{h.instagram}</b></button><span className="muted">{h.votes} {t('votes')}</span></li>)}</ul>
        {yards.leaders.length === 0 && <p className="muted">{t('yardHow')}</p>}
      </Section>}
      <Section title={t('rankHouses')}>{data?.houses.length === 0 && <p className="muted">{t('listEmpty')}</p>}<ul className="list">{data?.houses.map((h, i) => <li key={h.plot}><span className="n">{i + 1}</span><button type="button" className="plain" onClick={() => goToPlot(h.plot)}><b>@{h.instagram}</b></button><span className="tag gold">{h.score}</span></li>)}</ul></Section>
      <Section title={t('rankDistricts')}><ul className="list">{data?.districts.map((d, i) => <li key={d.id}><span className="n">{i + 1}</span><span className="grow">{name(d.id)}</span><span className="muted">{d.active}</span></li>)}</ul></Section>
      <Section title={t('rankInviters')}>{data?.inviters.length === 0 && <p className="muted">{t('listEmpty')}</p>}<ul className="list">{data?.inviters.map((d, i) => <li key={d.nick}><span className="n">{i + 1}</span><span className="grow">{d.nick}</span><span className="muted">{d.n}</span></li>)}</ul></Section>
    </Sheet>
  );
}

interface Treasure { readonly state: 'hunt' | 'found' | 'done' | 'empty'; readonly district?: number; readonly heat?: 'hot' | 'warm' | 'cold' }
interface CoinRules {
  readonly founder: number; readonly daily: number; readonly streakBonus: number; readonly channel: number; readonly referral: number;
  readonly yardWinner: number; readonly treasure: number; readonly treasurePerDay: number; readonly sendDay: number; readonly receiveDay: number;
}
/** Sozlama kelmasa (TANGA-NARXLAR.md). */
const RULES: CoinRules = { founder: 1000, daily: 100, streakBonus: 300, channel: 300, referral: 500, yardWinner: 2000, treasure: 50, treasurePerDay: 3, sendDay: 500, receiveDay: 1000 };
const CHANNEL = 'citylanduz';

function SendCoins({ rules }: { readonly rules: CoinRules }): React.JSX.Element {
  const t = useT();
  const sent = useApp((s) => s.profile?.sent_today ?? 0);
  const { isBusy, run } = useAction();
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const submit = (e: React.FormEvent): void => {
    e.preventDefault();
    void run(async () => { await rpc('my_send_coins', { p_to: to, p_amount: Number(amount) }); buzz(BUZZ.coin); setTo(''); setAmount(''); await refreshProfile(); }, t('saved'));
  };
  const rulesText = t('sendRules').replace('{send}', money(rules.sendDay)).replace('{receive}', money(rules.receiveDay));
  return (
    <Section title={t('sendCoins')} icon="coin">
      <p className="muted">{rulesText}</p>
      <form className="row send-coins" onSubmit={submit}>
        <input className="input grow" value={to} onChange={(ev) => setTo(ev.target.value)} maxLength={31} placeholder="@nik" aria-label={t('sendTo')} required />
        <input className="input" type="number" inputMode="numeric" min={1} max={Math.max(1, rules.sendDay - sent)} value={amount} onChange={(ev) => setAmount(ev.target.value)} placeholder={t('amount')} aria-label={t('amount')} required />
        <button type="submit" className="btn small" disabled={isBusy || sent >= rules.sendDay}>{t('send')}</button>
      </form>
      <p className="muted">{t('sentToday')}: {money(sent)} / {money(rules.sendDay)}</p>
    </Section>
  );
}

function ChannelBonus({ gain }: { readonly gain: number }): React.JSX.Element {
  const t = useT();
  const isPaid = useApp((s) => s.profile?.channel_paid ?? false);
  const { isBusy, run } = useAction();
  const channel = setting('telegram_channel', '').replace(/^@/, '') || CHANNEL;
  if (isPaid) return <p className="muted"><Icon name="check" /> {t('channelDone')}</p>;
  const check = (): void => { void run(async () => { await post('/coins/channel', {}, true); buzz(BUZZ.coin); await refreshProfile(); toast(`+${gain}`); }); };
  return (
    <div className="row channel-bonus">
      <a className="btn soft grow" href={`https://t.me/${channel}`} target="_blank" rel="noopener noreferrer"><Icon name="telegram" />{t('channelJoin')} · +{gain}</a>
      <button type="button" className="btn small" disabled={isBusy} onClick={check}>{t('channelCheck')}</button>
    </div>
  );
}

export function CoinsPanel(): React.JSX.Element {
  const t = useT();
  const name = useDistrictName();
  const profile = useApp((s) => s.profile);
  const { isBusy, run } = useAction();
  const isWalking = useApp((s) => s.mode !== 'city');
  const rules: CoinRules = { ...RULES, ...setting<Partial<CoinRules>>('coins', {}) };
  if (!profile) return <Sheet title={t('coins')}><button type="button" className="btn" onClick={() => openAuth()}>{t('login')}</button></Sheet>;
  const dig = (): void => {
    void run(async () => {
      const r = await rpc<Treasure>('my_treasure', { p_x: Math.round(player.x * 10) / 10, p_z: Math.round(player.z * 10) / 10 });
      if (r.state === 'hunt') toast(r.heat === 'cold' ? `${t('heat_cold')} ${name(r.district ?? 0)}` : t(`heat_${r.heat ?? 'cold'}`));
      else toast(t(`tr_${r.state}`));
      if (r.state !== 'found') return;
      buzz(BUZZ.coin);
      setApp({ treasure: rules.treasure });
      await refreshProfile();
    });
  };
  const daily = (): void => { void run(async () => { const r = await rpc<{ gain: number }>('my_daily'); buzz(BUZZ.coin); await refreshProfile(); toast(`+${r.gain}`); }); };
  const earn: readonly (readonly [Key, number])[] = [['r_founder', rules.founder], ['r_daily', rules.daily], ['r_streak', rules.streakBonus], ['r_channel', rules.channel], ['r_referral', rules.referral], ['r_yard', rules.yardWinner], ['r_treasure', rules.treasure]];
  const isTreasureDone = profile.treasures_today >= rules.treasurePerDay;
  return (
    <Sheet title={t('coins')}>
      <p className="big-coins"><Icon name="coin" />{money(profile.coins)}</p>
      <button type="button" className="btn gold" disabled={isBusy || profile.daily_done} onClick={daily}><Icon name="gift" />{profile.daily_done ? t('dailyDone') : `${t('daily')} · ${profile.daily_next}-${t('dayRow')}`}</button>
      <ChannelBonus gain={rules.channel} />
      <Section title={t('treasure')}>
        <button type="button" className="btn" disabled={isBusy || !isWalking || isTreasureDone} onClick={dig}><Icon name="dig" />{t('treasureCheck')}</button>
        <p className="muted">{t('treasureLeft')}: {profile.treasures_today} / {rules.treasurePerDay}{isWalking ? '' : ` · ${t('walkFirst')}`}</p>
      </Section>
      <Section title={t('earn')}>
        <ul className="list">{earn.map(([key, n]) => <li key={key}><span className="grow">{t(key)}</span><span className="tag gold">+{money(n)}</span></li>)}</ul>
      </Section>
      <SendCoins rules={rules} />
    </Sheet>
  );
}

interface Election { readonly id: number; readonly kind: 'hokim' | 'rais'; readonly district: number | null; readonly ends: string; readonly mine: string | null; readonly candidates: readonly { readonly id: string; readonly nick: string; readonly slogan: string; readonly votes: number }[] }
function ElectionCard({ e, onChange }: { readonly e: Election; readonly onChange: () => void }): React.JSX.Element {
  const t = useT();
  const name = useDistrictName();
  const { isBusy, run } = useAction();
  const [slogan, setSlogan] = useState('');
  return (
    <details className="section">
      <summary><b>{t(e.kind)}</b>{e.district ? ` — ${name(e.district)}` : ''} · {new Date(e.ends).toLocaleDateString('ru-RU')} {t('until')}</summary>
      <ul className="list">{e.candidates.map((c) => (
        <li key={c.id}><span className="grow"><b>{c.nick}</b><br /><span className="muted">{c.slogan}</span></span><span className="muted">{c.votes} {t('votes')}</span>
          {e.mine === c.id ? <span className="tag">{t('voted')}</span> : <button type="button" className="btn small soft" disabled={isBusy} onClick={() => run(async () => { await rpc('my_vote', { p_election: e.id, p_candidate: c.id }); onChange(); }, t('saved'))}>{t('vote')}</button>}
        </li>))}</ul>
      <form className="row" onSubmit={(ev) => { ev.preventDefault(); void run(async () => { await rpc('my_run', { p_election: e.id, p_slogan: slogan }); onChange(); }, t('saved')); }}>
        <input className="input grow" value={slogan} onChange={(ev) => setSlogan(ev.target.value)} maxLength={60} placeholder={t('slogan')} aria-label={t('slogan')} required />
        <button type="submit" className="btn small" disabled={isBusy}>{t('run')}</button>
      </form>
    </details>
  );
}

export function CityPanel(): React.JSX.Element {
  const t = useT();
  const lang = useApp((s) => s.lang);
  const boot = useApp((s) => s.boot);
  const { isBusy, run } = useAction();
  const loaded = useLoad(() => rpc<readonly Election[]>('api_elections'), 'elections');
  const { data, reload } = loaded;
  const isGuest = useApp((s) => s.profile === null);
  return (
    <Sheet title={t('cityWorks')}>
      <Section title={t('projects')}>
        {boot?.projects.length === 0 && <p className="muted">{t('listEmpty')}</p>}
        {boot?.projects.map((p) => (
          <div key={p.id} className="field">
            <div className="row between"><b>{lang === 'uz' ? p.uz : p.ru}</b><span className="muted">{p.raised} / {p.goal}</span></div>
            <div className="bar"><i style={{ width: `${Math.min(100, (p.raised / p.goal) * 100)}%` }} /></div>
            {p.status === 'done' ? <span className="tag free">{t('projDone')}</span> : <div className="row">{[10, 50, 200].map((n) => <button type="button" key={n} className="btn small soft" disabled={isBusy} onClick={() => (isGuest ? openAuth() : void run(async () => { await rpc('my_contribute', { p_project: p.id, p_amount: n }); await Promise.all([refreshBoot(), refreshProfile()]); }, t('saved')))}><Icon name="coin" />+{n}</button>)}</div>}
          </div>
        ))}
        {boot?.hero && <p className="with-icon"><Icon name="rank" />{boot.hero.nick} — {boot.hero.total}</p>}
      </Section>
      <Section title={t('elections')}>
        <LoadState of={loaded} isEmpty={data?.length === 0} empty={t('noElections')} />
        {data?.map((e) => <ElectionCard key={e.id} e={e} onChange={reload} />)}
      </Section>
    </Sheet>
  );
}

interface Issue { readonly week: string; readonly content: { readonly new_count: number; readonly new: readonly string[]; readonly top: { readonly plot: string; readonly instagram: string } | null; readonly streets: readonly string[]; readonly total: number } }
export function GazettePanel(): React.JSX.Element {
  const t = useT();
  const loaded = useLoad(() => rpc<readonly Issue[]>('api_gazette'), 'gazette');
  const { data } = loaded;
  return (
    <Sheet title={t('gazette')}>
      <LoadState of={loaded} isEmpty={data?.length === 0} />
      {data?.map(({ week, content: c }) => (
        <Section key={week} title={new Date(week).toLocaleDateString('ru-RU')}>
          <p><b>{t('gNew')}:</b> {c.new_count} — {c.new.map((n) => `@${n}`).join(', ')}</p>
          {c.top && <p><b>{t('gTop')}:</b> <button type="button" className="link" onClick={() => c.top && goToPlot(c.top.plot)}>@{c.top.instagram}</button></p>}
          {c.streets.length > 0 && <p><b>{t('gStreets')}:</b> {c.streets.join(', ')}</p>}
          <p className="muted">{t('gTotal')}: {c.total}</p>
        </Section>
      ))}
    </Sheet>
  );
}
