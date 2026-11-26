/** Saytdagi xatolar (foydalanuvchilar brauzeridan, /log orqali): oxirgi 100 ta. 30 kundan eskilari o'zi o'chadi. */
import { rpc } from '../api.ts';
import { Btn, Table, useLoad } from '../ui.tsx';

interface ErrorRow { readonly id: number; readonly at: string; readonly message: string; readonly place: string | null; readonly ua: string | null }
const when = (iso: string): string => new Date(iso).toLocaleString('ru-RU');

export function Errors(): React.JSX.Element {
  const { data, error, reload } = useLoad(() => rpc<readonly ErrorRow[]>('admin_errors'));
  return (
    <>
      <p className="muted">Foydalanuvchilar brauzerida yuz bergan xatolar (kuniga ko‘pi bilan 2 000 ta yoziladi). Bir xil xato ko‘p takrorlansa — tuzatish kerak.</p>
      <p><Btn onClick={() => void reload()}>Yangilash</Btn></p>
      <Table rows={data} error={error} rowKey={(r) => String(r.id)} columns={[
        { head: 'Vaqt', cell: (r) => when(r.at) },
        { head: 'Xato', cell: (r) => <pre className="muted" style={{ whiteSpace: 'pre-wrap', margin: 0, maxWidth: 560 }}>{r.message}</pre> },
        { head: 'Sahifa', cell: (r) => r.place ?? '—' },
        { head: 'Brauzer', cell: (r) => <span className="muted">{r.ua?.slice(0, 60) ?? '—'}</span> },
      ]} />
    </>
  );
}
