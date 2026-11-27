/** Bezaklar (15-qadam, soddaroq): ro'yxat — rasm · nom · kategoriya · tanga narxi (joyida) · level (joyida, "avto") · chegirma · sotilgan · holat.
 *  So'm ustuni yo'q (bezaklar faqat tanga); premium tovarlar — alohida "⭐ Premium" tabida. Eski tovarlar — "Arxiv"da. Hamma o'zgarish — "Jurnal"da. */
import { useMemo, useState } from 'react';
import { rpc } from '../api.ts';
import { Btn, Table, useAction, useLoad } from '../ui.tsx';
import { NO_FILTER, SLOT_NAMES, TABS, visibleRows, type DecorRow, type Filter, type Sort, type Tab } from '../decor.ts';
import { DecorForm, imageOf } from './DecorForm.tsx';
import { DiscountForm, DiscountList } from './Discounts.tsx';

function CoinsCell({ row, onSave }: { readonly row: DecorRow; readonly onSave: (p: Record<string, unknown>) => void }): React.JSX.Element {
  return <input className="input coins" type="number" min={0} aria-label={`${row.name_uz}: tanga narxi`} defaultValue={row.price_coins} key={row.price_coins}
    onBlur={(e) => { const v = Number(e.target.value); if (Number.isFinite(v) && v >= 0 && v !== row.price_coins) onSave({ id: row.id, price_coins: v }); }} />;
}
function LevelCell({ row, onSave }: { readonly row: DecorRow; readonly onSave: (p: Record<string, unknown>) => void }): React.JSX.Element {
  return (
    <select className="input level" aria-label={`${row.name_uz}: level`} value={row.level_auto ? 'auto' : String(row.min_level)}
      onChange={(e) => onSave(e.target.value === 'auto' ? { id: row.id, level_auto: true } : { id: row.id, min_level: Number(e.target.value) })}>
      <option value="auto">{row.min_level} · avto</option>{[1, 2, 3, 4, 5].map((l) => <option key={l} value={l}>{l}</option>)}
    </select>
  );
}

export function Catalog(): React.JSX.Element {
  const { data, error, reload } = useLoad(() => rpc<readonly DecorRow[]>('admin_decor_list'));
  const { isBusy, run } = useAction();
  const [tab, setTab] = useState<Tab>('decor');
  const [filter, setFilter] = useState<Filter>(NO_FILTER);
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());
  const [editing, setEditing] = useState<DecorRow | 'new' | null>(null);
  const [discountFor, setDiscountFor] = useState<readonly string[] | null>(null);
  const [version, setVersion] = useState(0);
  const all = data ?? [];
  const rows = useMemo(() => visibleRows(all, tab, filter), [all, tab, filter]);
  const names = useMemo(() => new Map(all.map((r) => [r.id, r.name_uz])), [all]);
  const models = useMemo(() => [...new Set(all.map((r) => r.model_id))].sort((a, b) => a.localeCompare(b)), [all]);
  const done = (): void => { setPicked(new Set()); setVersion((v) => v + 1); reload(); };
  const save = (p: Record<string, unknown>): void => { void run(() => rpc('admin_decor_save', { p }), 'Saqlandi').then(done); };
  const bulk = (action: string, value = 0): void => { void run(() => rpc('admin_decor_bulk', { p_ids: [...picked], p_action: action, p_value: value })).then(done); };
  const pricePct = (): void => {
    const v = Number(prompt('Narxni necha foizga o‘zgartirish? (masalan 20 yoki −10)', '10'));
    if (Number.isInteger(v) && v !== 0 && v >= -90 && v <= 300) bulk('price_pct', v);
  };
  const toggle = (id: string): void => { const next = new Set(picked); if (next.has(id)) next.delete(id); else next.add(id); setPicked(next); };
  const pickAll = (): void => setPicked(picked.size === rows.length ? new Set() : new Set(rows.map((r) => r.id)));
  const set = (patch: Partial<Filter>): void => setFilter({ ...filter, ...patch });

  if (editing) return <DecorForm row={editing === 'new' ? null : editing} models={models} onCancel={() => setEditing(null)} onDone={() => { setEditing(null); done(); }} />;
  return (
    <>
      <div className="row">
        <Btn kind="main" onClick={() => setEditing('new')}>+ Yangi tovar</Btn>
        <div className="seg" role="tablist" aria-label="Bo'lim">{TABS.map(([k, v]) => <button type="button" role="tab" key={k} aria-selected={tab === k} onClick={() => { setTab(k); setPicked(new Set()); }}>{v} <span className="muted">{visibleRows(all, k, NO_FILTER).length}</span></button>)}</div>
      </div>
      <div className="row filters">
        <input className="input" placeholder="Qidirish: nom yoki ID" aria-label="Qidirish" value={filter.q} onChange={(e) => set({ q: e.target.value })} />
        <select className="input" aria-label="Kategoriya" value={filter.slot} onChange={(e) => set({ slot: e.target.value })}><option value="">Hamma kategoriya</option>{Object.entries(SLOT_NAMES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select className="input" aria-label="Level" value={filter.level} onChange={(e) => set({ level: e.target.value })}><option value="">Hamma level</option>{[1, 2, 3, 4, 5].map((l) => <option key={l} value={l}>{l}-level</option>)}</select>
        <select className="input" aria-label="Holat" value={filter.state} onChange={(e) => set({ state: e.target.value as Filter['state'] })}><option value="">Hamma holat</option><option value="on">Sotuvda</option><option value="off">Yashirin</option></select>
        <select className="input" aria-label="Tartib" value={filter.sort} onChange={(e) => set({ sort: e.target.value as Sort })}><option value="sort">Tartib: do'kondagidek</option><option value="price">Narx</option><option value="level">Level</option><option value="sold">Sotilgan</option></select>
      </div>
      {picked.size > 0 && (
        <div className="row bulk" role="toolbar" aria-label="Belgilanganlar bilan">
          <b>{picked.size} ta belgilangan:</b>
          <Btn disabled={isBusy} onClick={pricePct}>Narx ± %</Btn>
          <Btn disabled={isBusy} onClick={() => bulk('level_auto')}>Levelni avtomatik</Btn>
          <Btn disabled={isBusy} onClick={() => setDiscountFor([...picked])}>Chegirma…</Btn>
          <Btn disabled={isBusy} onClick={() => bulk('hide')}>Yashirish</Btn>
          <Btn disabled={isBusy} onClick={() => bulk('show')}>Ko'rsatish</Btn>
          {tab !== 'archive' && <Btn kind="danger" disabled={isBusy} onClick={() => { if (confirm('Arxivga o‘tkazilsinmi? Egalarida qoladi, do‘konda ko‘rinmaydi.')) bulk('archive'); }}>Arxivga</Btn>}
        </div>
      )}
      {discountFor && <DiscountForm ids={discountFor} names={discountFor.map((id) => names.get(id) ?? id).join(', ')} onCancel={() => setDiscountFor(null)} onDone={() => { setDiscountFor(null); done(); }} />}
      <Table rows={data ? rows : null} error={error} rowKey={(r) => r.id} columns={[
        { head: '✓', cell: (r) => <input type="checkbox" aria-label={`${r.name_uz}: belgilash`} checked={picked.has(r.id)} onChange={() => toggle(r.id)} /> },
        { head: 'Rasm', cell: (r) => <img className="thumb" src={imageOf(r.model_id)} alt="" width={40} height={40} /> },
        { head: 'Nom', cell: (r) => <><b>{r.name_uz}</b>{r.is_new && <span className="tag">Yangi</span>}<br /><span className="muted small">{r.id}</span></> },
        { head: 'Kategoriya', cell: (r) => SLOT_NAMES[r.slot] ?? r.slot },
        tab === 'premium'
          ? { head: 'Narx (so‘m; Stars shundan)', cell: (r) => `${r.price_uzs.toLocaleString('ru-RU')} so‘m` }
          : { head: 'Tanga', cell: (r) => <CoinsCell row={r} onSave={save} /> },
        { head: 'Level', cell: (r) => <LevelCell row={r} onSave={save} /> },
        { head: 'Chegirma', cell: (r) => (r.discount ? <span className={`tag ${r.discount.live ? 'live' : 'pending'}`}>−{r.discount.pct}%</span> : <Btn disabled={isBusy || r.is_premium} onClick={() => setDiscountFor([r.id])}>+</Btn>) },
        { head: 'Sotilgan', cell: (r) => (r.stock === null ? r.sold : `${r.sold} / ${r.stock}`) },
        { head: 'Holat', cell: (r) => <button type="button" className={`tag ${r.is_active ? 'live' : ''}`} disabled={isBusy} onClick={() => save({ id: r.id, is_active: !r.is_active, ...(r.is_archived ? { is_archived: false } : {}) })}>{r.is_active ? 'Sotuvda' : r.is_archived ? 'Arxiv' : 'Yashirin'}</button> },
        { head: '', cell: (r) => <Btn disabled={isBusy} onClick={() => setEditing(r)}>Tahrirlash</Btn> },
      ]} />
      {rows.length > 0 && <p><Btn onClick={pickAll}>{picked.size === rows.length ? 'Belgini olish' : 'Hammasini belgilash'}</Btn></p>}
      <DiscountList names={names} version={version} />
      <Sets />
    </>
  );
}

interface SetRow { readonly id: string; readonly name_uz: string; readonly name_ru: string; readonly discount_pct: number; readonly is_active: boolean }
/** To'plam tarkibi bezakning «To'plam ID» maydonida; narxi — tarkib yig'indisidan chegirma (avtomatik). */
function Sets(): React.JSX.Element {
  const { data, error, reload } = useLoad(() => rpc<readonly SetRow[]>('admin_sets'));
  const { isBusy, run } = useAction();
  const save = (s: SetRow): void => { void run(() => rpc('admin_set_save', { p_id: s.id, p_uz: s.name_uz, p_ru: s.name_ru, p_discount: s.discount_pct, p_active: s.is_active })).then(reload); };
  const create = (): void => {
    const id = prompt('To‘plam ID (lotin harf, raqam, _)')?.trim();
    const uz = id && prompt('Nomi (uz)');
    const ru = uz && prompt('Nomi (ru)');
    if (id && uz && ru) save({ id, name_uz: uz, name_ru: ru, discount_pct: 20, is_active: true });
  };
  return (
    <>
      <h3>To‘plamlar</h3>
      <p className="muted">Narxi — tarkibidagi tovarlar yig‘indisidan chegirma (standart 20%), avtomatik hisoblanadi.</p>
      <p><Btn onClick={create}>+ Yangi to‘plam</Btn></p>
      <Table rows={data} error={error} rowKey={(s) => s.id} columns={[
        { head: 'To‘plam', cell: (s) => <><b>{s.name_uz}</b><br /><span className="muted">{s.id}</span></> }, { head: 'Chegirma', cell: (s) => `${s.discount_pct}%` },
        { head: '', cell: (s) => <Btn disabled={isBusy} kind={s.is_active ? 'danger' : 'main'} onClick={() => save({ ...s, is_active: !s.is_active })}>{s.is_active ? 'Yashirish' : 'Ko‘rsatish'}</Btn> },
      ]} />
    </>
  );
}
