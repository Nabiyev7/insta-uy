import { useState } from 'react';
import { rpc, SITE_URL } from '../api.ts';
import { Btn, Table, useAction, useLoad, when } from '../ui.tsx';

interface HouseRow {
  readonly id: string; readonly type: string; readonly address: string; readonly status: string; readonly instagram: string | null; readonly bio: string | null; readonly claimed_at: string | null; readonly login: string | null;
}
const STATUSES = [['owned', 'Egali'], ['reserved', 'Band'], ['free', "Bo'sh"], ['', 'Hammasi']] as const;
const PAGE = 50;

export function Houses(): React.JSX.Element {
  const [status, setStatus] = useState('owned');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const { isBusy, run } = useAction();
  const { data, error, reload } = useLoad(() => rpc<readonly HouseRow[]>('admin_plots', { p_q: q.trim(), p_status: status, p_offset: page * PAGE }), `${status}|${q}|${page}`);
  const act = (id: string, action: string, payload: Record<string, unknown> = {}): void => { void run(() => rpc('admin_plot', { p_plot: id, p_action: action, p_data: payload })).then(reload); };
  const assign = (id: string): void => {
    const login = prompt('Yangi egasining logini:');
    const instagram = login && prompt('Instagram niki:');
    if (login && instagram) act(id, 'assign', { login, instagram });
  };
  const actions = (r: HouseRow): React.JSX.Element => (
    <>
      {r.status === 'owned' && <><Btn disabled={isBusy} onClick={() => act(r.id, 'clear_bio')}>Yozuvni o'chirish</Btn><Btn kind="danger" disabled={isBusy} onClick={() => { if (confirm(`${r.id} bo'shatilsinmi?`)) act(r.id, 'release'); }}>Bo'shatish</Btn></>}
      <Btn disabled={isBusy} onClick={() => assign(r.id)}>Egasi…</Btn>
      {r.status === 'owned' && <Btn disabled={isBusy} onClick={() => { const n = Number(prompt('Level (1–5):')); if (n >= 1 && n <= 5) act(r.id, 'tier', { tier: n }); }}>Level…</Btn>}
    </>
  );
  return (
    <>
      <div className="row">
        <select value={status} aria-label="Holat" onChange={(e) => { setStatus(e.target.value); setPage(0); }}>{STATUSES.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select>
        <input className="input" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Nik, login yoki P0001" aria-label="Qidirish" />
        <Btn disabled={page === 0} onClick={() => setPage(page - 1)}>←</Btn><span>{page + 1}</span><Btn disabled={(data?.length ?? 0) < PAGE} onClick={() => setPage(page + 1)}>→</Btn>
      </div>
      <Table rows={data} error={error} rowKey={(r) => r.id} columns={[
        { head: 'ID', cell: (r) => <a href={`${SITE_URL}/?uy=${r.id}`} target="_blank" rel="noopener noreferrer">{r.id}</a> },
        { head: 'Nik', cell: (r) => (r.instagram ? <a href={`https://www.instagram.com/${encodeURIComponent(r.instagram)}/`} target="_blank" rel="noopener noreferrer">@{r.instagram}</a> : '—') },
        { head: 'Login', cell: (r) => r.login ?? '—' }, { head: 'Manzil', cell: (r) => r.address }, { head: 'Yozuv', cell: (r) => r.bio ?? '' },
        { head: 'Holat', cell: (r) => <span className={`tag ${r.status}`}>{r.status}</span> }, { head: 'Olingan', cell: (r) => when(r.claimed_at) }, { head: '', cell: actions },
      ]} />
    </>
  );
}
