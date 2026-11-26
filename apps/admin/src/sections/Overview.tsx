import { rpc } from '../api.ts';
import { Btn, Table, money, useAction, useLoad } from '../ui.tsx';

interface DistrictRow { readonly id: number; readonly name: string; readonly open: boolean; readonly total: number; readonly taken: number }
interface StatsData {
  readonly users: number; readonly owned: number; readonly streets: number; readonly ads: number; readonly waitlist: number; readonly telegram: number; readonly revenue: number | null;
  readonly days: readonly { readonly day: string; readonly active: number; readonly signups: number; readonly claims: number }[]; readonly districts: readonly DistrictRow[];
}

interface SparkProps { readonly title: string; readonly values: readonly number[]; readonly days: readonly string[] }
/** Uch ko'rsatkich turli o'lchovda, shuning uchun uchta alohida kichik grafik. */
function Spark({ title, values, days }: SparkProps): React.JSX.Element {
  const max = Math.max(1, ...values);
  const w = 300 / values.length;
  return (
    <figure className="card" style={{ margin: 0 }}>
      <figcaption className="row" style={{ justifyContent: 'space-between', margin: 0 }}><b>{title}</b><span className="muted">bugun {values.at(-1)} · eng ko'p {max}</span></figcaption>
      <svg viewBox="0 0 300 84" role="img" aria-label={`${title}: ${values.join(', ')}`}>
        {values.map((v, i) => (
          <rect key={days[i]} x={i * w + 2} y={80 - (v / max) * 74} width={w - 4} height={Math.max(1.5, (v / max) * 74)} rx="2" fill={i === values.length - 1 ? 'var(--clay)' : 'var(--tile)'}>
            <title>{`${days[i]}: ${v}`}</title>
          </rect>
        ))}
      </svg>
    </figure>
  );
}

interface SourceRow { readonly source: string; readonly users: number }
const SOURCE_NAMES: Readonly<Record<string, string>> = { bio: 'Instagram bio', reels: 'Reels', '': 'Belgisiz' };
/** Yangi foydalanuvchilar qayerdan kelgani (7 kun): havolada `?from=bio`, `?from=reels`. */
function Sources(): React.JSX.Element {
  const { data, error } = useLoad(() => rpc<readonly SourceRow[]>('admin_sources'));
  return (
    <>
      <h3>Qayerdan kelishdi (7 kun)</h3>
      <p className="muted">Instagram bio havolasiga <code>?from=bio</code>, reels havolasiga <code>?from=reels</code> qo‘shing. Saytga necha kishi kirgani — <a href="https://dash.cloudflare.com/?to=/:account/web-analytics" target="_blank" rel="noopener noreferrer">Cloudflare Web Analytics</a> (cookie’siz, bepul).</p>
      <Table rows={data} error={error} rowKey={(r) => r.source || '-'} columns={[{ head: 'Manba', cell: (r) => SOURCE_NAMES[r.source] ?? r.source }, { head: 'Yangi foydalanuvchi', cell: (r) => r.users }]} />
    </>
  );
}

export function Stats(): React.JSX.Element {
  const { data: s, error } = useLoad(() => rpc<StatsData>('admin_stats'));
  if (error) return <p className="error">{error}</p>;
  if (!s) return <p className="muted">Yuklanmoqda…</p>;
  const days = s.days.map((d) => d.day);
  const kpis: readonly (readonly [string, string | number])[] = [
    ['Uy egalari', s.owned], ['Foydalanuvchi', s.users], ['Telegram ulagan', s.telegram], ["Ko'cha nomi", s.streets], ['Reklama', s.ads], ["Kutish ro'yxati", s.waitlist],
    ...(s.revenue === null ? [] : [['Tushum', money(s.revenue)] as const]),
  ];
  return (
    <>
      <div className="kpis">{kpis.map(([k, v]) => <div key={k}><b>{v}</b>{k}</div>)}</div>
      <h3>So'nggi 14 kun</h3>
      <div className="cards">
        <Spark title="Faol odamlar" days={days} values={s.days.map((d) => d.active)} />
        <Spark title="Ro'yxatdan o'tgan" days={days} values={s.days.map((d) => d.signups)} />
        <Spark title="Olingan uylar" days={days} values={s.days.map((d) => d.claims)} />
      </div>
      <Sources />
    </>
  );
}

export function Districts(): React.JSX.Element {
  const { data, error, reload } = useLoad(() => rpc<StatsData>('admin_stats'));
  const { isBusy, run } = useAction();
  const set = (d: DistrictRow): void => {
    if (!d.open && !confirm(`${d.name} ochilsinmi?`)) return;
    void run(() => rpc('admin_district', { p_id: d.id, p_open: !d.open })).then(reload);
  };
  return (
    <>
      <p className="muted">Tumanlar markazdan tashqariga, tartib bilan ochiladi. Uyi bor tuman yopilmaydi.</p>
      <Table rows={data?.districts ?? null} error={error} rowKey={(d) => d.id} columns={[
        { head: '№', cell: (d) => d.id }, { head: 'Tuman', cell: (d) => d.name }, { head: 'Band', cell: (d) => `${d.taken} / ${d.total}` },
        { head: 'Holat', cell: (d) => <span className={`tag ${d.open ? 'live' : ''}`}>{d.open ? 'Ochiq' : 'Yopiq'}</span> },
        { head: '', cell: (d) => <Btn disabled={isBusy} kind={d.open ? 'danger' : 'main'} onClick={() => set(d)}>{d.open ? 'Yopish' : 'Ochish'}</Btn> },
      ]} />
    </>
  );
}
