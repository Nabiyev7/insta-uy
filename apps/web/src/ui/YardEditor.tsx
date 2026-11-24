/** Hovlini bezash: reja ustidagi nuqtani bosing → bezak tanlang, ko'chiring yoki olib qo'ying. */
import { useState, type FormEvent } from 'react';
import { ANCHORS, REF_YARD, anchorById, decorSlots, type Anchor } from '../../../../packages/shared/src/index.ts';
import { rpc, type MyPlot } from '../app/api.ts';
import { useT } from '../app/i18n.ts';
import { openPanel, refreshHouses, refreshProfile, setting, useApp } from '../app/store.ts';
import type { CatalogRow } from '../logic/decorCatalog.ts';
import { Section, useAction } from './kit.tsx';

type Places = Readonly<Record<string, string>>;
const without = (places: Places, anchor: string): Places => Object.fromEntries(Object.entries(places).filter(([a]) => a !== anchor));
const countOf = (places: Places, decor: string): number => Object.values(places).filter((d) => d === decor).length;

const HOUSE = { x: -8.6, z: -14.6, w: 17.2, d: 15.4 } as const;
const DOT = 1.15;
/** Butun hovliga tegishli nuqtalar rejada chetda ko'rsatiladi. */
const MARKS: Readonly<Record<string, readonly [number, number]>> = { fence: [-12, 16.6], gate: [0, 16.4], path: [0, 8.6], lamps: [1.9, 11.6], luxe: [0, -0.4], roof: [0, -7] };
const markOf = (a: Anchor): readonly [number, number] => MARKS[a.id] ?? [a.x, a.z];

interface YardMapProps { readonly level: number; readonly places: Places; readonly selected: string | null; readonly onPick: (id: string) => void }
function YardMap({ level, places, selected, onPick }: YardMapProps): React.JSX.Element {
  const t = useT();
  const lang = useApp((s) => s.lang);
  const { w, d } = REF_YARD;
  return (
    <svg className="yard" viewBox={`${-w / 2 - 1} ${-d / 2 - 1} ${w + 2} ${d + 2.4}`} role="group" aria-label={t('yardPlan')}>
      <rect className="ground" x={-w / 2} y={-d / 2} width={w} height={d} rx="0.6" />
      <rect className="house" x={HOUSE.x} y={HOUSE.z} width={HOUSE.w} height={HOUSE.d} rx="0.5" />
      <rect className="path" x="-0.9" y="1" width="1.8" height="16" />
      {ANCHORS.map((a) => {
        const [x, z] = markOf(a);
        // Yopiq nuqtada eski bezak tursa, uni olib qo'yish yoki ko'chirish mumkin.
        const isLocked = a.minLevel > level && !places[a.id];
        const label = isLocked ? `${a[lang]}: ${a.minLevel}-${t('opensAt')}` : a[lang];
        const state = isLocked ? 'locked' : places[a.id] ? 'full' : 'free';
        return (
          <g key={a.id} className={`spot ${state}`} tabIndex={isLocked ? -1 : 0} role="button" aria-label={label} aria-pressed={selected === a.id} aria-disabled={isLocked}
            onClick={() => { if (!isLocked) onPick(a.id); }} onKeyDown={(e) => { if (!isLocked && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onPick(a.id); } }}>
            <title>{label}</title>
            <circle cx={x} cy={z} r={DOT} />
            <text x={x} y={z + 0.42} textAnchor="middle">{isLocked ? a.minLevel : places[a.id] ? '✓' : '+'}</text>
          </g>
        );
      })}
    </svg>
  );
}

/** Qo'lda bo'sh turgan bezakni nik bo'yicha sovg'a qilish. */
function GiftDecor({ freeQty }: { readonly freeQty: (id: string) => number }): React.JSX.Element | null {
  const t = useT();
  const lang = useApp((s) => s.lang);
  const catalog = useApp((s) => s.catalog);
  const serials = useApp((s) => s.profile?.serials) ?? {};
  const { isBusy, run } = useAction();
  const [id, setId] = useState('');
  const [to, setTo] = useState('');
  const [message, setMessage] = useState('');
  const mine = catalog.filter((c) => freeQty(c.id) > 0);
  if (mine.length === 0) return null;
  const submit = (e: FormEvent): void => {
    e.preventDefault();
    if (!confirm(`${mine.find((c) => c.id === id)?.[lang] ?? ''} → ${to}?`)) return;
    void run(async () => { await rpc('my_gift_decor', { p_id: id, p_to: to, p_message: message }); await refreshProfile(); setId(''); setTo(''); setMessage(''); }, t('sent'));
  };
  return (
    <details className="section">
      <summary>🎁 {t('giftDecor')}</summary>
      <form className="section" onSubmit={submit}>
        <label className="field"><span>{t('decor')}</span><select className="input" value={id} onChange={(e) => setId(e.target.value)} required><option value="" disabled>{t('choose')}…</option>{mine.map((c) => <option key={c.id} value={c.id}>{c[lang]}{serials[c.id]?.length ? ` №${serials[c.id]?.at(-1)}` : ''} ×{freeQty(c.id)}</option>)}</select></label>
        <label className="field"><span>{t('giftToNick')}</span><input value={to} onChange={(e) => setTo(e.target.value)} placeholder="@nik" required autoCapitalize="none" maxLength={40} /></label>
        <label className="field"><span>{t('giftMsg')}</span><input value={message} onChange={(e) => setMessage(e.target.value)} maxLength={100} /></label>
        <button type="submit" className="btn small" disabled={isBusy}>{t('giftDecor')}</button>
      </form>
    </details>
  );
}

interface YardEditorProps { readonly plot: MyPlot }
export function YardEditor({ plot }: YardEditorProps): React.JSX.Element {
  const t = useT();
  const lang = useApp((s) => s.lang);
  const catalog = useApp((s) => s.catalog);
  const profile = useApp((s) => s.profile);
  const { isBusy, run } = useAction();
  const [selected, setSelected] = useState<string | null>(null);
  const byId = new Map(catalog.map((c) => [c.id, c]));
  const { places } = plot;
  const max = decorSlots(plot.tier, setting<readonly number[] | undefined>('decor_slots', undefined));
  const used = Object.keys(places).length;
  const anchor = selected ? anchorById(selected) : undefined;
  const current = selected ? places[selected] : undefined;

  /** Boshqa uylarga qo'yilganlardan tashqari qo'lda qolgan soni. */
  const freeQty = (id: string): number => {
    const elsewhere = (profile?.plots ?? []).filter((p) => p.plot !== plot.plot).reduce((n, p) => n + countOf(p.places, id), 0);
    return (profile?.decor[id] ?? 0) - elsewhere - countOf(places, id);
  };
  const save = (next: Places): void => {
    void run(async () => {
      await rpc('my_place_decor', { p_plot: plot.plot, p_places: next });
      await Promise.all([refreshProfile(), refreshHouses()]);
    }, t('saved'));
  };
  const fits = (c: CatalogRow, a: Anchor): boolean => c.spots.includes(a.kind) && c.min <= plot.tier;
  const choices = anchor ? catalog.filter((c) => fits(c, anchor) && freeQty(c.id) > 0) : [];
  const moves = current && anchor ? ANCHORS.filter((a) => a.id !== anchor.id && a.minLevel <= plot.tier && !places[a.id] && (byId.get(current)?.spots.includes(a.kind) ?? false)) : [];
  const place = (id: string): void => { if (selected) save({ ...places, [selected]: id }); };
  const moveTo = (to: string): void => {
    if (!selected || !current) return;
    save({ ...without(places, selected), [to]: current });
    setSelected(to);
  };
  const isFull = used >= max && !current;
  return (
    <Section title={`${t('decor')} · ${used}/${max}`}>
      <YardMap level={plot.tier} places={places} selected={selected} onPick={setSelected} />
      <p className="muted">{t('yardHint')}</p>
      {anchor && (
        <div className="spot-panel">
          <b>{anchor[lang]}</b>
          {current && <div className="row between"><span>{byId.get(current)?.[lang] ?? current}</span><button type="button" className="btn small soft" disabled={isBusy} onClick={() => save(without(places, anchor.id))}>{t('remove')}</button></div>}
          {moves.length > 0 && (
            <label className="field"><span>{t('moveTo')}</span>
              <select className="input" value="" disabled={isBusy} onChange={(e) => moveTo(e.target.value)}><option value="" disabled>{t('choose')}…</option>{moves.map((a) => <option key={a.id} value={a.id}>{a[lang]}</option>)}</select>
            </label>
          )}
          {isFull && <p className="muted">{t('e_no_slots')}</p>}
          {!isFull && anchor.minLevel <= plot.tier && choices.map((c) => <div className="row between" key={c.id}><span>{c[lang]} <span className="muted">×{freeQty(c.id)}</span></span><button type="button" className="btn small" disabled={isBusy} onClick={() => place(c.id)}>{t('place')}</button></div>)}
          {!isFull && choices.length === 0 && !current && <p className="muted">{t('noFit')}</p>}
        </div>
      )}
      <GiftDecor freeQty={freeQty} />
      <button type="button" className="btn small clay" onClick={() => openPanel({ kind: 'shop' })}>{t('shop')} →</button>
    </Section>
  );
}
