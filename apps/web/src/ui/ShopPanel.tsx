/** Do'kon (bezaklar) va mashina tanlash. */
import { useEffect } from 'react';
import type { DecorSlot } from '../../../../packages/shared/src/index.ts';
import { rpc } from '../app/api.ts';
import { money, useT, type Key } from '../app/i18n.ts';
import { car } from '../app/runtime.ts';
import { tryDecor } from '../app/actions.ts';
import { openPanel, refreshCatalog, refreshProfile, setting, toast, useApp, write } from '../app/store.ts';
import type { CatalogRow, SetRow } from '../logic/decorCatalog.ts';
import { CARS, ownedCars } from '../logic/drive.ts';
import { createOrder } from './OrderPanels.tsx';
import { Section, Sheet, useAction } from './kit.tsx';

const SECTIONS: readonly (readonly [Key, readonly DecorSlot[]])[] = [
  ['sGate', ['fence', 'gate', 'path', 'sign']], ['sGarden', ['tree', 'yard', 'water']], ['sCars', ['car']], ['sLight', ['light', 'roof']], ['sPets', ['pet']], ['sSpecial', ['special']],
];

const useBestLevel = (): number => {
  const profile = useApp((x) => x.profile);
  const plotById = useApp((x) => x.plotById);
  return Math.max(0, ...(profile?.plots ?? []).filter((p) => plotById.get(p.plot)?.type !== 'kvartira').map((p) => p.tier));
};

interface GoodsProps { readonly row: CatalogRow; readonly level: number }
function Goods({ row, level }: GoodsProps): React.JSX.Element {
  const t = useT();
  const lang = useApp((s) => s.lang);
  const profile = useApp((s) => s.profile);
  const { isBusy, run } = useAction();
  const isPaid = setting('payments_enabled', false);
  const isCoins = setting('coins_enabled', true);
  const qty = profile?.decor[row.id] ?? 0;
  const isSoldOut = row.left === 0;
  const isLocked = row.min > 1 && level < row.min;
  const buy = (): void => {
    if (!profile) { openPanel({ kind: 'auth' }); return; }
    void run(async () => { await rpc('my_buy_decor_coins', { p_id: row.id }); await Promise.all([refreshProfile(), refreshCatalog()]); }, t('bought'));
  };
  return (
    <li className={isLocked ? 'locked' : ''}>
      <span className="grow"><b>{row[lang]}</b>{row.isNew && <span className="tag clay">{t('isNew')}</span>}{row.from && <span className="tag">{t('seasonal')}</span>}{row.left !== null && <span className="tag gold">{row.left} {t('left')}</span>}<br />
        <span className="muted">{isLocked ? `🔒 ${row.min}-${t('opensAt')}` : `${isCoins ? `💰 ${row.coins}` : ''}${isPaid ? ` · ${money(row.uzs)} ${t('som')}` : ''}${qty > 0 ? ` · ${t('owned2')}: ${qty}` : ''}`}</span></span>
      {profile && profile.plots.length > 0 && <button type="button" className="btn small soft" title={t('tryIt')} aria-label={`${row[lang]}: ${t('tryIt')}`} onClick={() => { if (!tryDecor(row)) toast(t('noHouse'), true); }}>👁</button>}
      {!isLocked && isCoins && <button type="button" className="btn small" disabled={isBusy || isSoldOut} aria-label={`${row[lang]}: ${t('buy')}`} onClick={buy}>{isSoldOut ? t('e_sold_out') : '💰'}</button>}
      {!isLocked && isPaid && <button type="button" className="btn small clay" disabled={isBusy || isSoldOut} onClick={() => run(() => createOrder('decor', { id: row.id }))}>{t('buy')}</button>}
    </li>
  );
}

function SetCard({ set, rows, level }: { readonly set: SetRow; readonly rows: readonly CatalogRow[]; readonly level: number }): React.JSX.Element | null {
  const t = useT();
  const lang = useApp((s) => s.lang);
  const profile = useApp((s) => s.profile);
  const { isBusy, run } = useAction();
  const items = set.items.flatMap((id) => rows.find((c) => c.id === id) ?? []);
  if (items.length < set.items.length) return null;
  const full = items.reduce((n, c) => n + c.coins, 0);
  const need = Math.max(...items.map((c) => c.min));
  const buy = (): void => {
    if (!profile) { openPanel({ kind: 'auth' }); return; }
    void run(async () => { await rpc('my_buy_set_coins', { p_set: set.id }); await Promise.all([refreshProfile(), refreshCatalog()]); }, t('bought'));
  };
  return (
    <li className={need > 1 && level < need ? 'locked' : ''}>
      <span className="grow"><b>{set[lang]}</b><span className="tag gold">−{set.discount}%</span><br /><span className="muted">{items.map((c) => c[lang]).join(' + ')}</span><br />{need > 1 && level < need ? <span className="muted">🔒 {need}-{t('opensAt')}</span> : <span className="muted"><s>{full}</s> 💰 {set.coins}</span>}</span>
      {level >= need && <button type="button" className="btn small" disabled={isBusy} aria-label={`${set[lang]}: ${t('buy')}`} onClick={buy}>💰</button>}
    </li>
  );
}

export function ShopPanel(): React.JSX.Element {
  const t = useT();
  const profile = useApp((s) => s.profile);
  const catalog = useApp((s) => s.catalog);
  const level = useBestLevel();
  useEffect(() => { void refreshCatalog().catch(() => undefined); }, []);
  const sets = useApp((s) => s.sets);
  const rows = catalog.filter((c) => c.onSale);
  const fresh = rows.filter((c) => c.isNew);
  return (
    <Sheet title={t('shop')}>
      {profile && <p className="muted">💰 {profile.coins}</p>}
      {fresh.length > 0 && <Section title={`✨ ${t('newGoods')}`}><ul className="list">{fresh.map((c) => <Goods key={c.id} row={c} level={level} />)}</ul></Section>}
      {sets.length > 0 && <Section title={t('sets')}><ul className="list">{sets.map((x) => <SetCard key={x.id} set={x} rows={rows} level={level} />)}</ul></Section>}
      {SECTIONS.map(([key, slots]) => {
        const list = rows.filter((c) => slots.includes(c.slot) && !c.isNew);
        return list.length > 0 && <Section key={key} title={t(key)}><ul className="list">{list.map((c) => <Goods key={c.id} row={c} level={level} />)}</ul></Section>;
      })}
      {profile && profile.plots.length > 0 && <button type="button" className="btn soft" onClick={() => openPanel({ kind: 'me' })}>{t('decor')} → {t('myHouse')}</button>}
    </Sheet>
  );
}

const KMH = 3.6;
export function CarsPanel(): React.JSX.Element {
  const t = useT();
  const lang = useApp((s) => s.lang);
  const decor = useApp((s) => s.profile?.decor);
  const mine = new Set(ownedCars(decor).map((c) => c.id));
  const pick = (id: string): void => {
    car.id = id;
    write('car', id);
    openPanel(null);
  };
  return (
    <Sheet title={t('cars')}>
      <ul className="list">
        {CARS.map((c) => (
          <li key={c.id}>
            <span className="grow"><b>{c[lang]}</b><br /><span className="muted">{Math.round(c.top * KMH)} km/h</span></span>
            {mine.has(c.id)
              ? <button type="button" className={`btn small ${car.id === c.id ? '' : 'soft'}`} onClick={() => pick(c.id)}>{car.id === c.id ? `✓ ${t('chosen')}` : t('choose')}</button>
              : <button type="button" className="btn small clay" onClick={() => openPanel({ kind: 'shop' })}>{t('buy')}</button>}
          </li>
        ))}
      </ul>
    </Sheet>
  );
}
