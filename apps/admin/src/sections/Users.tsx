import { useState } from 'react';
import { BADGES } from '../../../../packages/shared/src/index.ts';
import { rpc } from '../api.ts';
import { Btn, Table, useAction, useLoad, when } from '../ui.tsx';

interface UserRow {
  readonly id: string; readonly login: string; readonly instagram: string | null; readonly role: string; readonly perms: readonly string[]; readonly badges: readonly string[]; readonly coins: number; readonly banned: boolean; readonly last_seen: string; readonly plots: number;
}
const PERMS = 'plots, reports, streets, ads, orders, users, map, video, settings';

export function Users(): React.JSX.Element {
  const [q, setQ] = useState('');
  const { isBusy, run } = useAction();
  const { data, error, reload } = useLoad(() => rpc<readonly UserRow[]>('admin_users', { p_q: q.trim() }), q);
  const act = (id: string, action: string, payload: Record<string, unknown> = {}): void => { void run(() => rpc('admin_user', { p_id: id, p_action: action, p_data: payload })).then(reload); };
  const setRole = (u: UserRow): void => {
    const role = prompt('Rol: user / moderator / admin', u.role);
    if (!role || !['user', 'moderator', 'admin'].includes(role)) return;
    const perms = role === 'moderator' ? prompt(`Huquqlar: ${PERMS}`, u.perms.join(',')) ?? '' : '';
    act(u.id, 'role', { role, perms: perms.split(',').map((s) => s.trim()).filter(Boolean) });
  };
  const addCoins = (u: UserRow): void => {
    const n = Number(prompt('Tanga (+/−):'));
    if (n) act(u.id, 'coins', { delta: n });
  };
  const actions = (u: UserRow): React.JSX.Element => (
    <>
      <select aria-label="Nishon berish" value="" onChange={(e) => act(u.id, 'badge', { badge: e.target.value })}>
        <option value="">+ nishon</option>
        {Object.entries(BADGES).map(([id, b]) => <option key={id} value={id}>{b.uz}</option>)}
      </select>
      <Btn disabled={isBusy} onClick={() => addCoins(u)}>Tanga</Btn>
      <Btn disabled={isBusy} onClick={() => setRole(u)}>Rol</Btn>
      <Btn kind="danger" disabled={isBusy} onClick={() => { if (confirm(u.banned ? 'Blokdan chiqarilsinmi?' : 'Bloklansinmi?')) act(u.id, u.banned ? 'unban' : 'ban'); }}>{u.banned ? 'Blokdan chiqarish' : 'Bloklash'}</Btn>
    </>
  );
  return (
    <>
      <div className="row"><input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Login yoki nik" aria-label="Qidirish" /></div>
      <Table rows={data} error={error} rowKey={(u) => u.id} columns={[
        { head: 'Login', cell: (u) => <b>{u.login}</b> }, { head: 'Nik', cell: (u) => u.instagram ?? '—' }, { head: 'Rol', cell: (u) => `${u.role} ${u.perms.join(', ')}` }, { head: 'Uy', cell: (u) => u.plots }, { head: 'Tanga', cell: (u) => u.coins },
        { head: 'Nishon', cell: (u) => u.badges.map((b) => <Btn key={b} disabled={isBusy} onClick={() => act(u.id, 'unbadge', { badge: b })}>{b} ✕</Btn>) }, { head: 'Kirgan', cell: (u) => when(u.last_seen) }, { head: '', cell: actions },
      ]} />
    </>
  );
}
