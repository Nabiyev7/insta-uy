import { rpc } from '../api.ts';
import { Btn, Table, money, useAction, useLoad, when } from '../ui.tsx';

interface OrderRow { readonly id: string; readonly kind: string; readonly payload: unknown; readonly amount: number; readonly status: string; readonly note: string | null; readonly created_at: string; readonly login: string }
interface PaymentRow { readonly id: number; readonly provider: string; readonly amount: number; readonly order_id: string | null; readonly status: string; readonly at: string }
const PAYABLE = ['pending', 'expired', 'failed'];

export function Orders(): React.JSX.Element {
  const { data, error, reload } = useLoad(() => rpc<{ orders: readonly OrderRow[]; payments: readonly PaymentRow[] }>('admin_orders'));
  const { isBusy, run } = useAction();
  const act = (fn: string, args: Record<string, unknown>): void => { void run(() => rpc(fn, args)).then(reload); };
  const link = (p: PaymentRow): void => {
    const id = prompt("Buyurtma ID (to'liq):");
    if (id) act('admin_payment', { p_id: p.id, p_action: 'link', p_order: id.trim() });
  };
  return (
    <>
      <h3>Mos kelmagan to'lovlar</h3>
      <Table rows={data?.payments ?? null} error={error} rowKey={(p) => p.id} columns={[
        { head: 'Summa', cell: (p) => <b>{money(p.amount)}</b> }, { head: 'Manba', cell: (p) => p.provider }, { head: 'Holat', cell: (p) => <span className={`tag ${p.status}`}>{p.status}</span> },
        { head: 'Buyurtma', cell: (p) => p.order_id?.slice(0, 8) ?? '—' }, { head: 'Vaqt', cell: (p) => when(p.at) },
        { head: '', cell: (p) => <>{p.status === 'unmatched' && <Btn kind="main" disabled={isBusy} onClick={() => link(p)}>Bog'lash</Btn>}<Btn disabled={isBusy} onClick={() => { if (confirm('Pul qaytarildi deb belgilansinmi?')) act('admin_payment', { p_id: p.id, p_action: 'refunded' }); }}>Qaytarildi</Btn></> },
      ]} />
      <h3>Buyurtmalar</h3>
      <Table rows={data?.orders ?? null} error={error} rowKey={(o) => o.id} columns={[
        { head: 'ID', cell: (o) => <code title={o.id}>{o.id.slice(0, 8)}</code> }, { head: 'Kim', cell: (o) => o.login }, { head: 'Nima', cell: (o) => <>{o.kind}<pre className="muted">{JSON.stringify(o.payload)}</pre></> }, { head: 'Summa', cell: (o) => money(o.amount) },
        { head: 'Holat', cell: (o) => <><span className={`tag ${o.status}`}>{o.status}</span> {o.note}</> }, { head: 'Vaqt', cell: (o) => when(o.created_at) },
        { head: '', cell: (o) => (
          <>
            {PAYABLE.includes(o.status) && <Btn kind="main" disabled={isBusy} onClick={() => { if (confirm(`${money(o.amount)} haqiqatan kelganmi?`)) act('admin_order', { p_id: o.id, p_action: 'paid' }); }}>To'landi</Btn>}
            {o.status === 'pending' && <Btn kind="danger" disabled={isBusy} onClick={() => act('admin_order', { p_id: o.id, p_action: 'cancel' })}>Bekor</Btn>}
            <Btn onClick={() => void navigator.clipboard.writeText(o.id)}>ID nusxa</Btn>
          </>
        ) },
      ]} />
    </>
  );
}
