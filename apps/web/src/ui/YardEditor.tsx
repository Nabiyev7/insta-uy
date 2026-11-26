/** Hovlini bezash: reja ustidagi nuqtani bosing → bezak tanlang, ko'chiring yoki olib qo'ying. */
import { useState, type FormEvent } from 'react';
import { ANCHORS, DECOR_LEVEL, REF_YARD, anchorById, decorSlots, usedSlots, type Anchor } from '../../../../packages/shared/src/index.ts';
import { rpc, type MyPlot } from '../app/api.ts';
import { useT } from '../app/i18n.ts';
import { refreshHouses, refreshProfile, setting, useApp } from '../app/store.ts';
import type { CatalogRow } from '../logic/decorCatalog.ts';
import { Icon } from './icons.tsx';
import { DecorImage, askConfirm, useAction, useLoad } from './kit.tsx';

type Places = Readonly<Record<string, string>>;
const without = (places: Places, anchor: string): Places => Object.fromEntries(Object.entries(places).filter(([a]) => a !== anchor));
const countOf = (places: Places, decor: string): number => Object.values(places).filter((d) => d === decor).length;

const HOUSE = { x: -9.8, z: -13.4, w: 21, d: 13.6 } as const;
const DRIVE = { x: 5.1, z: 0.2, w: 5.8, d: 16.8 } as const;
const DOT = 1.3;
/** Barmoq uchun: 360 px ekranda ham kamida 44 px. */
const HIT = 1.95;
/** Rejadagi o'rni: barmoq adashmasligi uchun nuqtalar bir-biridan kamida 2 × HIT uzoqda (haqiqiy joyidan sal surilgan). */
const MARKS: Readonly<Record<string, readonly [number, number]>> = {
  fence: [-11.6, 0.4], gate: [0.4, 16.7], path: [0, 6.2], lamps: [0, 10.6], luxe: [-6.4, -1.6], roof: [0, -7], sign: [-3.6, 16.7], garaj_oldi: [8.4, 5.8], old_hovli_chap: [-6.4, 9], old_hovli_ong: [4.4, 8.4], darvoza_yoni: [-7.6, 15.4],
  burchak_1: [-11, 13], burchak_2: [4.6, 13.4], burchak_3: [-10.4, -14.9], burchak_4: [10.4, -14.9], p1: [-4.2, 3.2], p2: [4.2, 3.2],
};
const markOf = (a: Anchor): readonly [number, number] => MARKS[a.id] ?? [a.x, a.z];

/** Sinov rejimida hamma nuqta ochiq. */
const TESTER_TIER = 99;
interface YardMapProps { readonly level: number; readonly places: Places; readonly selected: string | null; readonly onPick: (id: string) => void; /** Pulga olingan bezak uchun ochiq nuqtalar. */ readonly paidOpen: ReadonlySet<string> }
function YardMap({ level, places, selected, onPick, paidOpen }: YardMapProps): React.JSX.Element {
  const t = useT();
  const lang = useApp((s) => s.lang);
  const { w, d } = REF_YARD;
  return (
    <svg className="yard" viewBox={`${-w / 2 - 1} ${-d / 2 - 1} ${w + 2} ${d + 2.4}`} role="group" aria-label={t('yardPlan')}>
      <rect className="ground" x={-w / 2} y={-d / 2} width={w} height={d} rx="0.6" />
      <rect className="house" x={HOUSE.x} y={HOUSE.z} width={HOUSE.w} height={HOUSE.d} rx="0.5" />
      <rect className="path" x={DRIVE.x} y={DRIVE.z} width={DRIVE.w} height={DRIVE.d} />
      <rect className="path" x="-0.9" y="1" width="1.8" height="16" />
      {ANCHORS.map((a) => {
        const [x, z] = markOf(a);
        // Yopiq nuqtada eski bezak tursa, uni olib qo'yish yoki ko'chirish mumkin.
        const isLocked = a.minLevel > level && !places[a.id] && !paidOpen.has(a.id);
        const label = isLocked ? `${a[lang]}: ${a.minLevel}-${t('opensAt')}` : a[lang];
        const state = isLocked ? 'locked' : places[a.id] ? 'full' : 'free';
        return (
          <g key={a.id} className={`spot ${state}`} tabIndex={isLocked ? -1 : 0} role="button" aria-label={label} aria-pressed={selected === a.id} aria-disabled={isLocked}
            onClick={() => { if (!isLocked) onPick(a.id); }} onKeyDown={(e) => { if (!isLocked && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onPick(a.id); } }}>
            <title>{label}</title>
            <circle className="hit" cx={x} cy={z} r={HIT} />
            <circle className="point" cx={x} cy={z} r={DOT} />
            {state === 'full' ? <path d="M-0.5 0l0.38 0.4l0.65 -0.75" transform={`translate(${x} ${z})`} /> : <text x={x} y={z + 0.42} textAnchor="middle">{isLocked ? a.minLevel : '+'}</text>}
          </g>
        );
      })}
    </svg>
  );
}

interface GiftProps { /** Kimga — uy oynasidan ochilsa tayyor turadi. */ readonly to?: string }
/** Qo'lda bo'sh turgan bezakni nik bo'yicha sovg'a qilish. */
export function GiftDecor({ to: preset = '' }: GiftProps): React.JSX.Element {
  const t = useT();
  const lang = useApp((s) => s.lang);
  const catalog = useApp((s) => s.catalog);
  const profile = useApp((s) => s.profile);
  const serials = profile?.serials ?? {};
  const { isBusy, run } = useAction();
  const [id, setId] = useState('');
  const [to, setTo] = useState(preset ? `@${preset}` : '');
  const [message, setMessage] = useState('');
  const freeQty = (d: string): number => (profile?.decor[d] ?? 0) - (profile?.plots ?? []).reduce((n, p) => n + countOf(p.places, d), 0);
  const mine = catalog.filter((c) => freeQty(c.id) > 0);
  if (mine.length === 0) return <p className="muted">{t('noGifts')}</p>;
  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!(await askConfirm(`${mine.find((c) => c.id === id)?.[lang] ?? ''} — ${to}`))) return;
    await run(async () => { await rpc('my_gift_decor', { p_id: id, p_to: to, p_message: message }); await refreshProfile(); setId(''); setMessage(''); }, t('sent'));
  };
  return (
    <form className="stack" onSubmit={(e) => void submit(e)}>
      <label className="field"><span>{t('decor')}</span><select className="input" value={id} onChange={(e) => setId(e.target.value)} required><option value="" disabled>{t('choose')}…</option>{mine.map((c) => <option key={c.id} value={c.id}>{c[lang]}{serials[c.id]?.length ? ` №${serials[c.id]?.at(-1)}` : ''} ×{freeQty(c.id)}</option>)}</select></label>
      <label className="field"><span>{t('giftToNick')}</span><input value={to} onChange={(e) => setTo(e.target.value)} placeholder="@nik" required autoCapitalize="none" maxLength={40} /></label>
      <label className="field"><span>{t('giftMsg')}</span><input value={message} onChange={(e) => setMessage(e.target.value)} maxLength={100} /></label>
      <button type="submit" className="btn" disabled={isBusy}><Icon name="gift" />{t('giftDecor')}</button>
    </form>
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
  // Admin sinov rejimida level va joylar soni cheklovi yo'q (server ham shunday).
  const isTester = profile?.test_mode === true;
  const tier = isTester ? TESTER_TIER : plot.tier;
  const max = isTester ? Number.POSITIVE_INFINITY : decorSlots(plot.tier, setting<readonly number[] | undefined>('decor_slots', undefined));
  const used = usedSlots(places);
  const anchor = selected ? anchorById(selected) : undefined;
  const current = selected ? places[selected] : undefined;
  const paidLoaded = useLoad(() => (profile ? rpc<Readonly<Record<string, number>>>('my_paid_decor') : Promise.resolve({})), `${profile?.id ?? ''}:${JSON.stringify(profile?.decor ?? {})}`);
  const paid: Readonly<Record<string, number>> = paidLoaded.data ?? {};

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
  /** Level yetmagan joy: faqat pulga olingan bezak, faqat pulli bezak nuqtasida. */
  const isPaidPlace = (c: CatalogRow, a: Anchor): boolean => a.minLevel > tier || (c.min > tier && c.premium !== true);
  const fits = (c: CatalogRow, a: Anchor): boolean => c.spots.includes(a.kind) && (!isPaidPlace(c, a) || (a.paidLevel <= tier && (paid[c.id] ?? 0) > 0));
  const choices = anchor ? catalog.filter((c) => fits(c, anchor) && freeQty(c.id) > 0) : [];
  const paidOpen = new Set(ANCHORS.filter((a) => a.minLevel > tier && a.paidLevel <= tier && catalog.some((c) => (paid[c.id] ?? 0) > 0 && c.spots.includes(a.kind) && freeQty(c.id) > 0)).map((a) => a.id));
  const moves = current && anchor ? ANCHORS.filter((a) => a.id !== anchor.id && a.minLevel <= tier && !places[a.id] && (byId.get(current)?.spots.includes(a.kind) ?? false)) : [];
  const place = (id: string): void => { if (selected) save({ ...places, [selected]: id }); };
  const moveTo = (to: string): void => {
    if (!selected || !current) return;
    save({ ...without(places, selected), [to]: current });
    setSelected(to);
  };
  const isFull = used >= max && !current && anchor?.kind !== 'sign' && !(anchor && paidOpen.has(anchor.id));
  return (
    <>
      <p className="row between"><b>{t('decor')}</b><span className="tag">{isTester ? used : `${used}/${max}`}</span></p>
      <YardMap level={tier} places={places} selected={selected} onPick={setSelected} paidOpen={paidOpen} />
      <p className="muted">{tier < DECOR_LEVEL ? `${t('decor')}: ${DECOR_LEVEL}-${t('opensAt')}. ${t('paidAnyLevel')}` : t('yardHint')}</p>
      {anchor && (
        <div className="spot-panel">
          <b>{anchor[lang]}</b>
          {current && <div className="row between"><DecorImage model={byId.get(current)?.model ?? current} /><span className="grow">{byId.get(current)?.[lang] ?? current}</span><button type="button" className="btn small soft" disabled={isBusy} onClick={() => save(without(places, anchor.id))}>{t('remove')}</button></div>}
          {moves.length > 0 && (
            <label className="field"><span>{t('moveTo')}</span>
              <select className="input" value="" disabled={isBusy} onChange={(e) => moveTo(e.target.value)}><option value="" disabled>{t('choose')}…</option>{moves.map((a) => <option key={a.id} value={a.id}>{a[lang]}</option>)}</select>
            </label>
          )}
          {isFull && <p className="muted">{t('e_no_slots')}</p>}
          {!isFull && (anchor.minLevel <= tier || paidOpen.has(anchor.id)) && choices.map((c) => <div className="row between" key={c.id}><DecorImage model={c.model} /><span className="grow">{c[lang]} <span className="muted">×{freeQty(c.id)}</span></span><button type="button" className="btn small" disabled={isBusy} onClick={() => place(c.id)}>{t('place')}</button></div>)}
          {!isFull && choices.length === 0 && !current && <p className="muted">{t('noFit')}</p>}
        </div>
      )}
    </>
  );
}
