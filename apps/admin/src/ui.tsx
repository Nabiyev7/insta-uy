import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

export type Notify = (text: string, isError?: boolean) => void;
export const NotifyContext = createContext<Notify>(() => undefined);

const CODES: Readonly<Record<string, string>> = {
  forbidden: "Huquq yo'q", not_found: 'Topilmadi', not_free: 'Joy band', bad_format: "Noto'g'ri qiymat", open_inner_first: 'Avval ichki (oldingi) tumanlarni oching', district_not_empty: "Tumanda uylar bor, yopib bo'lmaydi",
  spot_not_free: "Obyekt uchastka yoki yo'l ustida", not_draft: 'Nashr qilingan versiya tahrirlanmaydi — nusxa oling', user_not_found: 'Foydalanuvchi topilmadi', not_enough_coins: 'Tanga yetmaydi',
};
export const errorText = (e: unknown): string => (e instanceof Error ? CODES[e.message] ?? e.message : 'Xatolik');

export const useAction = (): { readonly isBusy: boolean; readonly run: (fn: () => Promise<unknown>, ok?: string) => Promise<boolean> } => {
  const notify = useContext(NotifyContext);
  const [isBusy, setBusy] = useState(false);
  const run = useCallback(async (fn: () => Promise<unknown>, ok = 'Bajarildi'): Promise<boolean> => {
    setBusy(true);
    try {
      await fn();
      notify(ok);
      return true;
    } catch (error: unknown) {
      notify(errorText(error), true);
      return false;
    } finally {
      setBusy(false);
    }
  }, [notify]);
  return { isBusy, run };
};

export const useLoad = <T,>(load: () => Promise<T>, key = ''): { readonly data: T | null; readonly error: string; readonly reload: () => void } => {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  const ref = useRef(load);
  ref.current = load;
  useEffect(() => {
    let isActive = true;
    ref.current().then(
      (d) => { if (isActive) { setData(d); setError(''); } },
      (e: unknown) => { if (isActive) setError(errorText(e)); },
    );
    return () => { isActive = false; };
  }, [key, version]);
  return { data, error, reload: () => setVersion((v) => v + 1) };
};

interface Column<T> { readonly head: string; readonly cell: (row: T) => ReactNode }
interface TableProps<T> { readonly rows: readonly T[] | null; readonly columns: readonly Column<T>[]; readonly rowKey: (row: T) => string | number; readonly error?: string }
export function Table<T>({ rows, columns, rowKey, error }: TableProps<T>): React.JSX.Element {
  if (error) return <p className="error">{error}</p>;
  if (!rows) return <p className="muted">Yuklanmoqda…</p>;
  if (rows.length === 0) return <p className="muted">Bo'sh</p>;
  return (
    <div className="scroll"><table>
      <thead><tr>{columns.map((c) => <th key={c.head}>{c.head}</th>)}</tr></thead>
      <tbody>{rows.map((r) => <tr key={rowKey(r)}>{columns.map((c) => <td key={c.head}>{c.cell(r)}</td>)}</tr>)}</tbody>
    </table></div>
  );
}

interface BtnProps { readonly children: ReactNode; readonly onClick?: () => void; readonly kind?: 'main' | 'soft' | 'danger'; readonly disabled?: boolean; readonly type?: 'button' | 'submit' }
export function Btn({ children, onClick, kind = 'soft', disabled, type = 'button' }: BtnProps): React.JSX.Element {
  return <button type={type} className={`btn ${kind}`} disabled={disabled} onClick={onClick}>{children}</button>;
}
export const money = (n: number): string => `${n.toLocaleString('ru-RU')} so'm`;
export const when = (iso: string | null): string => (iso ? new Date(iso).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' }) : '—');
