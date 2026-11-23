import { FILES, rpc, SITE_URL } from '../api.ts';
import { Btn, Table, useAction, useLoad, when } from '../ui.tsx';

interface Queue {
  readonly reports: readonly { readonly id: number; readonly target_kind: string; readonly target_id: string; readonly reason: string; readonly created_at: string; readonly login: string | null }[] | null;
  readonly streets: readonly { readonly id: number; readonly old: string | null; readonly name: string; readonly kind: string; readonly by: string | null }[] | null;
  readonly ads: readonly { readonly id: string; readonly title: string; readonly image: string | null; readonly link: string | null; readonly by: string | null }[] | null;
}
const KINDS: Readonly<Record<string, string>> = { temp: 'Vaqtincha', voted: 'Ovoz', paid: 'Pullik' };

export function Moderation(): React.JSX.Element {
  const { data, error, reload } = useLoad(() => rpc<Queue>('admin_queue'));
  const { isBusy, run } = useAction();
  const act = (fn: string, args: Record<string, unknown>): void => { void run(() => rpc(fn, args)).then(reload); };
  if (error) return <p className="error">{error}</p>;
  return (
    <>
      {data?.streets && <><h3>Ko'cha nomlari</h3><Table rows={data.streets} rowKey={(r) => r.id} columns={[
        { head: "Ko'cha", cell: (r) => r.old ?? `${r.id}-ko'cha` }, { head: 'Yangi nom', cell: (r) => <b>{r.name}</b> }, { head: 'Turi', cell: (r) => KINDS[r.kind] ?? r.kind }, { head: 'Kim', cell: (r) => r.by },
        { head: '', cell: (r) => <><Btn kind="main" disabled={isBusy} onClick={() => act('admin_street', { p_id: r.id, p_approve: true })}>Tasdiqlash</Btn><Btn kind="danger" disabled={isBusy} onClick={() => act('admin_street', { p_id: r.id, p_approve: false })}>Rad</Btn></> },
      ]} /></>}
      {data?.ads && <><h3>Reklama</h3>
        {data.ads.length === 0 && <p className="muted">Bo'sh</p>}
        <div className="cards">{data.ads.map((a) => (
          <div className="card" key={a.id}>
            <b>{a.id} — {a.title}</b>
            {a.image && <img src={FILES + a.image} alt={a.title} />}
            {a.link && <code>{a.link}</code>}
            <span className="muted">{a.by}</span>
            <div><Btn kind="main" disabled={isBusy} onClick={() => act('admin_ad', { p_id: a.id, p_approve: true })}>Chiqarish</Btn><Btn kind="danger" disabled={isBusy} onClick={() => act('admin_ad', { p_id: a.id, p_approve: false, p_note: prompt('Sabab:') ?? '' })}>Rad</Btn></div>
          </div>
        ))}</div></>}
      {data?.reports && <><h3>Shikoyatlar</h3><Table rows={data.reports} rowKey={(r) => r.id} columns={[
        { head: 'Nima', cell: (r) => (r.target_kind === 'plot' ? <a href={`${SITE_URL}/?uy=${encodeURIComponent(r.target_id)}`} target="_blank" rel="noopener noreferrer">{r.target_id}</a> : `${r.target_kind}: ${r.target_id}`) },
        { head: 'Sabab', cell: (r) => r.reason }, { head: 'Kim', cell: (r) => r.login }, { head: 'Vaqt', cell: (r) => when(r.created_at) },
        { head: '', cell: (r) => <><Btn kind="main" disabled={isBusy} onClick={() => act('admin_report', { p_id: r.id, p_status: 'resolved' })}>Hal qilindi</Btn><Btn disabled={isBusy} onClick={() => act('admin_report', { p_id: r.id, p_status: 'rejected' })}>Asossiz</Btn></> },
      ]} /></>}
    </>
  );
}
