import { FILES, rpc } from '../api.ts';
import { Btn, Table, useAction, useLoad } from '../ui.tsx';

interface Queue {
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
    </>
  );
}
