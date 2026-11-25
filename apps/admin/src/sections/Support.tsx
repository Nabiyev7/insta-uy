import { useState } from 'react';
import { rpc, serverBlob, serverPost } from '../api.ts';
import { Btn, Table, useAction, useLoad, when } from '../ui.tsx';

/** "Nik nizolari": ariza → egasiga yuborish → qaror (bitta tugma). Dalil skrinshotlari Telegram'da saqlanadi, server orqali ko'rsatiladi. */
interface Dispute { readonly id: number; readonly nick: string; readonly claimant: number; readonly owner: string | null; readonly owner_tg: number | null; readonly status: string; readonly claim_proof: boolean; readonly owner_proof: boolean; readonly owner_gave: boolean; readonly created_at: string; readonly sent_at: string | null }
function Proof({ id, side }: { readonly id: number; readonly side: 'claimant' | 'owner' }): React.JSX.Element {
  const [url, setUrl] = useState<string | null>(null);
  const { isBusy, run } = useAction();
  if (url) return <a href={url} target="_blank" rel="noopener noreferrer"><img src={url} alt="dalil" style={{ maxWidth: 160, maxHeight: 220 }} /></a>;
  return <Btn disabled={isBusy} onClick={() => void run(async () => setUrl(URL.createObjectURL(await serverBlob('/admin/dispute/proof', { id, side }))))}>Ko‘rish</Btn>;
}
export function Disputes(): React.JSX.Element {
  const { data, error, reload } = useLoad(() => rpc<readonly Dispute[]>('admin_disputes'));
  const { isBusy, run } = useAction();
  const act = (id: number, action: string, ask: string): void => { if (confirm(ask)) void run(() => rpc('admin_dispute', { p_id: id, p_action: action }), 'Saqlandi').then(reload); };
  return (
    <Table rows={data} error={error} rowKey={(d) => String(d.id)} columns={[
      { head: '№', cell: (d) => d.id }, { head: 'Nik', cell: (d) => <b>@{d.nick}</b> }, { head: 'Da‘vogar (Telegram)', cell: (d) => d.claimant }, { head: 'Hozirgi egasi', cell: (d) => d.owner ?? '—' },
      { head: 'Holat', cell: (d) => <span className={`tag ${d.status}`}>{d.status}{d.owner_gave ? ' · berdi' : ''}</span> }, { head: 'Sana', cell: (d) => when(d.created_at) },
      { head: 'Da‘vogar dalili', cell: (d) => (d.claim_proof ? <Proof id={d.id} side="claimant" /> : '—') }, { head: 'Egasi dalili', cell: (d) => (d.owner_proof ? <Proof id={d.id} side="owner" /> : '—') },
      { head: '', cell: (d) => (
        <>
          {d.status === 'new' && <Btn disabled={isBusy} onClick={() => act(d.id, 'send', 'Hozirgi egasiga tekshirish xabari yuborilsinmi (7 kun)?')}>Tekshirishga yuborish</Btn>}
          {(d.status === 'new' || d.status === 'sent') && <Btn kind="main" disabled={isBusy} onClick={() => act(d.id, 'grant', `@${d.nick} da‘vogarga o‘tsinmi? Eski egasining uyi va tangalari o‘zida qoladi.`)}>Da‘vogar haq</Btn>}
          {(d.status === 'new' || d.status === 'sent') && <Btn kind="danger" disabled={isBusy} onClick={() => act(d.id, 'reject', 'Ariza rad etilsinmi (egasi haq)?')}>Rad etish</Btn>}
        </>
      ) },
    ]} />
  );
}

/** "Murojaatlar": botdagi "Adminga yozish" xabarlari; paneldan ham javob. */
interface TicketMsg { readonly admin: boolean; readonly text: string | null; readonly photo: boolean; readonly at: string }
interface Ticket { readonly id: number; readonly status: string; readonly telegram: number; readonly nick: string | null; readonly login: string | null; readonly updated_at: string; readonly messages: readonly TicketMsg[] }
function Reply({ id, onDone }: { readonly id: number; readonly onDone: () => void }): React.JSX.Element {
  const [text, setText] = useState('');
  const { isBusy, run } = useAction();
  return (
    <form className="row" onSubmit={(e) => { e.preventDefault(); void run(() => serverPost('/admin/support/reply', { ticket: id, text }), 'Yuborildi').then((ok) => { if (ok) { setText(''); onDone(); } }); }}>
      <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Javob" aria-label="Javob" maxLength={3000} required />
      <Btn kind="main" type="submit" disabled={isBusy}>Javob</Btn>
    </form>
  );
}
export function Tickets(): React.JSX.Element {
  const { data, error, reload } = useLoad(() => rpc<readonly Ticket[]>('admin_tickets'));
  const { isBusy, run } = useAction();
  return (
    <Table rows={data} error={error} rowKey={(t) => String(t.id)} columns={[
      { head: '№', cell: (t) => t.id }, { head: 'Kim', cell: (t) => <>{t.nick ? `@${t.nick}` : t.login ?? '—'}<br /><span className="muted">{t.telegram}</span></> },
      { head: 'Holat', cell: (t) => <span className={`tag ${t.status}`}>{t.status === 'new' ? 'yangi' : t.status === 'answered' ? 'javob berilgan' : 'yopilgan'}</span> },
      { head: 'Yozishma', cell: (t) => t.messages.map((m, i) => <p key={i} className={m.admin ? 'muted' : ''}>{m.admin ? 'Admin: ' : ''}{m.text}{m.photo ? ' [rasm]' : ''} <span className="muted">{when(m.at)}</span></p>) },
      { head: '', cell: (t) => (t.status === 'closed' ? null : <><Reply id={t.id} onDone={reload} /><Btn disabled={isBusy} onClick={() => void run(() => rpc('admin_ticket_close', { p_id: t.id })).then(reload)}>Yopish</Btn></>) },
    ]} />
  );
}
