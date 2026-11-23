import { useState } from 'react';
import { decorById } from '../../../../packages/shared/src/index.ts';
import { rpc } from '../api.ts';
import { Btn, Table, useAction, useLoad, when } from '../ui.tsx';

const TITLES: Readonly<Record<string, string>> = {
  city_name: 'Shahar nomi', maintenance: 'Texnik ishlar rejimi', require_approval: 'Uylarni admin tasdiqlaydi', free_claim_enabled: 'Bepul uy tarqatish', payments_enabled: "To'lovlar yoqilgan", payment_provider: "To'lov usuli (card/payme/click)", pay_card: "To'lov kartasi", reserve_minutes: 'Band qilish (daqiqa)',
  discount_pct: 'Chegirma (%)', coins_enabled: 'Tangalar', elections_enabled: 'Saylovlar', multiplayer_enabled: "Ko'p o'yinchi", release_inactive: "Faolsiz uylarni bo'shatish", inactive_days: 'Faolsizlik (kun)', founder_limit: 'Asoschi nishoni soni', sponsor_threshold: "Homiy chegarasi (so'm)",
  street_vote_min: "Ko'cha ovozi uchun uy egasi", commerce_days: 'Biznes ijarasi (kun)', chat_slow_seconds: 'Chat sekin rejimi (soniya, 0 = o‘chiq)', commerce_closed: 'Sotuvdan olingan tijorat joylari', day_minutes: 'Kun uzunligi (daqiqa, 0 = haqiqiy)', telegram_bot: 'Telegram bot (nomi)', support_url: 'Yordam havolasi', prices: 'Narxlar', coins: 'Tanga iqtisodi',
};
const ORDER = Object.keys(TITLES);

interface SettingRowProps { readonly name: string; readonly value: unknown; readonly onSaved: () => void }
function SettingRow({ name, value, onSaved }: SettingRowProps): React.JSX.Element {
  const { isBusy, run } = useAction();
  const isObject = typeof value === 'object' && value !== null;
  const [text, setText] = useState(isObject ? JSON.stringify(value, null, 2) : String(value));
  const save = (v: unknown): void => { void run(() => rpc('admin_setting', { p_key: name, p_value: v }), 'Saqlandi').then(onSaved); };
  const parse = (): unknown => {
    if (isObject) return JSON.parse(text) as unknown;
    return typeof value === 'number' ? Number(text) : text;
  };
  const saveText = (): void => {
    try {
      save(parse());
    } catch {
      alert("JSON noto'g'ri");
    }
  };
  const editor = (): React.JSX.Element => {
    if (typeof value === 'boolean') return <label><input type="checkbox" checked={value} disabled={isBusy} onChange={(e) => save(e.target.checked)} /> {value ? 'Yoqilgan' : "O'chirilgan"}</label>;
    if (isObject) return <textarea className="json" value={text} onChange={(e) => setText(e.target.value)} aria-label={name} />;
    return <input className="input" value={text} type={typeof value === 'number' ? 'number' : 'text'} onChange={(e) => setText(e.target.value)} aria-label={name} />;
  };
  return (
    <tr>
      <td><b>{TITLES[name] ?? name}</b><br /><span className="muted">{name}</span></td>
      <td>{editor()}</td>
      <td>{typeof value !== 'boolean' && <Btn kind="main" disabled={isBusy} onClick={saveText}>Saqlash</Btn>}</td>
    </tr>
  );
}

export function Settings(): React.JSX.Element {
  const { data, error, reload } = useLoad(() => rpc<Record<string, unknown>>('admin_settings'));
  if (error) return <p className="error">{error}</p>;
  const rows = Object.entries(data ?? {}).sort(([a], [b]) => ORDER.indexOf(a) - ORDER.indexOf(b));
  return <div className="scroll"><table><tbody>{rows.map(([k, v]) => <SettingRow key={`${k}${JSON.stringify(v)}`} name={k} value={v} onSaved={reload} />)}</tbody></table></div>;
}

interface CatalogRow { readonly id: string; readonly price_uzs: number; readonly price_coins: number; readonly stock: number | null; readonly sold: number; readonly is_active: boolean }
const askNumber = (label: string, old: number | null, apply: (n: number) => void): void => {
  const raw = prompt(label, String(old ?? ''));
  const n = Number(raw);
  if (raw && Number.isInteger(n) && n >= 0) apply(n);
};
export function Catalog(): React.JSX.Element {
  const { data, error, reload } = useLoad(() => rpc<readonly CatalogRow[]>('admin_catalog'));
  const { isBusy, run } = useAction();
  const set = (id: string, patch: Record<string, unknown>): void => { void run(() => rpc('admin_catalog', { p_id: id, ...patch })).then(reload); };
  return (
    <Table rows={data} error={error} rowKey={(c) => c.id} columns={[
      { head: 'Bezak', cell: (c) => <><b>{decorById(c.id)?.uz ?? c.id}</b> <span className="muted">{c.id}</span></> },
      { head: "So'm", cell: (c) => <Btn disabled={isBusy} onClick={() => askNumber("Narx (so'm)", c.price_uzs, (n) => set(c.id, { p_uzs: n }))}>{c.price_uzs}</Btn> },
      { head: 'Tanga', cell: (c) => <Btn disabled={isBusy} onClick={() => askNumber('Narx (tanga)', c.price_coins, (n) => set(c.id, { p_coins: n }))}>{c.price_coins}</Btn> },
      { head: 'Zaxira', cell: (c) => <Btn disabled={isBusy} onClick={() => askNumber('Jami soni', c.stock, (n) => set(c.id, { p_stock: n }))}>{c.stock ?? '∞'}</Btn> }, { head: 'Sotilgan', cell: (c) => c.sold },
      { head: '', cell: (c) => <Btn disabled={isBusy} kind={c.is_active ? 'danger' : 'main'} onClick={() => set(c.id, { p_active: !c.is_active })}>{c.is_active ? 'Yashirish' : "Ko'rsatish"}</Btn> },
    ]} />
  );
}

interface Project { readonly id: number; readonly kind: string; readonly uz: string; readonly ru: string; readonly goal: number; readonly raised: number; readonly status: string }
export function Projects(): React.JSX.Element {
  const { data, error, reload } = useLoad(() => rpc<{ projects: readonly Project[] }>('api_boot'));
  const { isBusy, run } = useAction();
  const save = (p: Project, goal: number, status: string): void => { void run(() => rpc('admin_project', { p_id: p.id, p_kind: p.kind, p_uz: p.uz, p_ru: p.ru, p_goal: goal, p_status: status })).then(reload); };
  return (
    <Table rows={data?.projects ?? null} error={error} rowKey={(p) => p.id} columns={[
      { head: 'Loyiha', cell: (p) => p.uz }, { head: "Yig'ildi", cell: (p) => `${p.raised} / ${p.goal}` }, { head: 'Holat', cell: (p) => <span className="tag">{p.status}</span> },
      { head: '', cell: (p) => <><Btn disabled={isBusy} onClick={() => askNumber('Maqsad (tanga)', p.goal, (n) => save(p, n, p.status))}>Maqsad</Btn><Btn disabled={isBusy} onClick={() => save(p, p.goal, p.status === 'done' ? 'open' : 'done')}>{p.status === 'done' ? 'Qayta ochish' : 'Tugatish'}</Btn></> },
    ]} />
  );
}

interface AuditRow { readonly id: number; readonly login: string | null; readonly action: string; readonly data: unknown; readonly at: string }
export function Audit(): React.JSX.Element {
  const { data, error } = useLoad(() => rpc<readonly AuditRow[]>('admin_audit'));
  return (
    <Table rows={data} error={error} rowKey={(a) => a.id} columns={[
      { head: 'Vaqt', cell: (a) => when(a.at) }, { head: 'Kim', cell: (a) => a.login }, { head: 'Amal', cell: (a) => a.action }, { head: "Ma'lumot", cell: (a) => <pre>{JSON.stringify(a.data)}</pre> },
    ]} />
  );
}
