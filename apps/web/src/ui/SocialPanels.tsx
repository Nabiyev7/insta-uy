import { useState } from 'react';
import { goToPlot } from '../app/actions.ts';
import { rpc } from '../app/api.ts';
import { useT, type Key } from '../app/i18n.ts';
import { player } from '../app/runtime.ts';
import { openPanel, refreshBoot, refreshProfile, toast, useApp } from '../app/store.ts';
import { Section, Sheet, useAction, useLoad } from './kit.tsx';

const useDistrictName = (): ((id: number) => string) => {
  const boot = useApp((s) => s.boot);
  const lang = useApp((s) => s.lang);
  return (id) => { const d = boot?.districts.find((x) => x.id === id); return d ? (lang === 'uz' ? d.name_uz : d.name_ru) : String(id); };
};
const back = (): void => openPanel({ kind: 'menu' });

interface Rankings {
  readonly houses: readonly { readonly plot: string; readonly instagram: string; readonly tier: number; readonly score: number }[];
  readonly districts: readonly { readonly id: number; readonly active: number }[]; readonly inviters: readonly { readonly nick: string; readonly n: number }[];
}
interface Yards { readonly leaders: readonly { readonly plot: string; readonly instagram: string; readonly votes: number }[]; readonly winner: { readonly plot: string; readonly instagram: string; readonly votes: number } | null }
export function RankPanel(): React.JSX.Element {
  const t = useT();
  const name = useDistrictName();
  const { data } = useLoad(() => rpc<Rankings>('api_rankings'), 'rank');
  const { data: yards } = useLoad(() => rpc<Yards>('api_yards'), 'yards');
  return (
    <Sheet title={t('rank')} onBack={back}>
      {yards && <Section title={`🌷 ${t('yardWeek')}`}>
        {yards.winner && <p>{t('lastWinner')}: <button type="button" className="link" onClick={() => yards.winner && goToPlot(yards.winner.plot)}>@{yards.winner.instagram}</button> · {yards.winner.votes} {t('votes')}</p>}
        <ul className="list">{yards.leaders.map((h, i) => <li key={h.plot}><span className="n">{i + 1}</span><button type="button" className="plain" onClick={() => goToPlot(h.plot)}><b>@{h.instagram}</b></button><span className="muted">{h.votes} {t('votes')}</span></li>)}</ul>
        {yards.leaders.length === 0 && <p className="muted">{t('yardHow')}</p>}
      </Section>}
      <Section title={t('rankHouses')}><ul className="list">{data?.houses.map((h, i) => <li key={h.plot}><span className="n">{i + 1}</span><button type="button" className="plain" onClick={() => goToPlot(h.plot)}><b>@{h.instagram}</b></button><span className="tag gold">{h.score}</span></li>)}</ul></Section>
      <Section title={t('rankDistricts')}><ul className="list">{data?.districts.map((d, i) => <li key={d.id}><span className="n">{i + 1}</span><span className="grow">{name(d.id)}</span><span className="muted">{d.active}</span></li>)}</ul></Section>
      <Section title={t('rankInviters')}><ul className="list">{data?.inviters.map((d, i) => <li key={d.nick}><span className="n">{i + 1}</span><span className="grow">{d.nick}</span><span className="muted">{d.n}</span></li>)}</ul></Section>
    </Sheet>
  );
}

interface Quest { readonly id: string; readonly daily: boolean; readonly reward: number; readonly ready: boolean; readonly done: boolean }
interface Treasure { readonly state: 'hunt' | 'found' | 'done' | 'empty'; readonly district?: number; readonly heat?: 'hot' | 'warm' | 'cold' }
export function CoinsPanel(): React.JSX.Element {
  const t = useT();
  const name = useDistrictName();
  const profile = useApp((s) => s.profile);
  const { isBusy, run } = useAction();
  const { data, reload } = useLoad(() => (profile ? rpc<readonly Quest[]>('my_quests') : Promise.resolve([])), profile?.id ?? '');
  const isWalking = useApp((s) => s.mode !== 'city');
  if (!profile) return <Sheet title={t('coins')} onBack={back}><button type="button" className="btn" onClick={() => openPanel({ kind: 'auth' })}>{t('login')}</button></Sheet>;
  const dig = (): void => {
    void run(async () => {
      const r = await rpc<Treasure>('my_treasure', { p_x: Math.round(player.x * 10) / 10, p_z: Math.round(player.z * 10) / 10 });
      if (r.state === 'hunt') toast(r.heat === 'cold' ? `${t('heat_cold')} ${name(r.district ?? 0)}` : t(`heat_${r.heat ?? 'cold'}`));
      else toast(t(`tr_${r.state}`));
      if (r.state === 'found') await refreshProfile();
    });
  };
  return (
    <Sheet title={t('coins')} onBack={back}>
      <p className="big-coins">💰 {profile.coins}</p>
      <button type="button" className="btn clay" disabled={isBusy || profile.daily_done} onClick={() => run(async () => { const r = await rpc<{ gain: number }>('my_daily'); await refreshProfile(); toast(`+${r.gain} 💰`); })}>{profile.daily_done ? t('dailyDone') : `${t('daily')} · 🔥 ${profile.streak}`}</button>
      <Section title={t('treasure')}><button type="button" className="btn" disabled={isBusy || !isWalking} onClick={dig}>🔎 {t('treasureCheck')}</button>{!isWalking && <p className="muted">{t('walkFirst')}</p>}</Section>
      <Section title={t('quests')}>
        <ul className="list">{data?.map((q) => (
          <li key={q.id}><span className="grow">{t(`q_${q.id}` as Key)}</span><span className="tag gold">+{q.reward}</span>
            {q.done ? <span className="tag free">✓</span> : <button type="button" className="btn small" disabled={isBusy || !q.ready} onClick={() => run(async () => { await rpc('my_quest_claim', { p_quest: q.id }); await refreshProfile(); reload(); }, t('saved'))}>{t('take')}</button>}
          </li>))}</ul>
      </Section>
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
  const { data, reload } = useLoad(() => rpc<readonly Election[]>('api_elections'), 'elections');
  return (
    <Sheet title={t('city')} onBack={back}>
      <Section title={t('projects')}>
        {boot?.projects.map((p) => (
          <div key={p.id} className="field">
            <div className="row between"><b>{lang === 'uz' ? p.uz : p.ru}</b><span className="muted">{p.raised} / {p.goal} 💰</span></div>
            <div className="bar"><i style={{ width: `${Math.min(100, (p.raised / p.goal) * 100)}%` }} /></div>
            {p.status === 'done' ? <span className="tag free">{t('projDone')}</span> : <div className="row">{[10, 50, 200].map((n) => <button type="button" key={n} className="btn small soft" disabled={isBusy} onClick={() => run(async () => { await rpc('my_contribute', { p_project: p.id, p_amount: n }); await Promise.all([refreshBoot(), refreshProfile()]); }, t('saved'))}>+{n} 💰</button>)}</div>}
          </div>
        ))}
        {boot?.hero && <p>🏆 {boot.hero.nick} — {boot.hero.total} 💰</p>}
      </Section>
      <Section title={t('elections')}>
        {data?.length === 0 && <p className="muted">{t('noElections')}</p>}
        {data?.map((e) => <ElectionCard key={e.id} e={e} onChange={reload} />)}
      </Section>
    </Sheet>
  );
}

interface Issue { readonly week: string; readonly content: { readonly new_count: number; readonly new: readonly string[]; readonly top: { readonly plot: string; readonly instagram: string } | null; readonly streets: readonly string[]; readonly total: number } }
export function GazettePanel(): React.JSX.Element {
  const t = useT();
  const { data } = useLoad(() => rpc<readonly Issue[]>('api_gazette'), 'gazette');
  return (
    <Sheet title={t('gazette')} onBack={back}>
      {data?.length === 0 && <p className="muted">{t('nothing')}</p>}
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
