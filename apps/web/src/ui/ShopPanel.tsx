/** Do'kon (bezaklar) va mashina tanlash. */
import { DECOR } from '../../../../packages/shared/src/index.ts';
import { rpc } from '../app/api.ts';
import { money, useT } from '../app/i18n.ts';
import { car } from '../app/runtime.ts';
import { openPanel, refreshProfile, setting, useApp, write } from '../app/store.ts';
import { CARS, ownedCars } from '../logic/drive.ts';
import { createOrder, useCatalog } from './OrderPanels.tsx';
import { Sheet, useAction } from './kit.tsx';

export function ShopPanel(): React.JSX.Element {
  const t = useT();
  const lang = useApp((s) => s.lang);
  const profile = useApp((s) => s.profile);
  const catalog = useCatalog();
  const { isBusy, run } = useAction();
  const isPaid = setting('payments_enabled', false);
  const isCoins = setting('coins_enabled', true);
  const owned = profile?.decor ?? {};
  const buyWithCoins = (id: string): void => {
    if (!profile) { openPanel({ kind: 'auth' }); return; }
    void run(async () => { await rpc('my_buy_decor_coins', { p_id: id }); await refreshProfile(); }, t('bought'));
  };
  return (
    <Sheet title={t('shop')}>
      {profile && <p className="muted">💰 {profile.coins}</p>}
      <ul className="list">
        {DECOR.filter((d) => catalog.has(d.id)).map((d) => {
          const c = catalog.get(d.id);
          const isSoldOut = c?.left === 0;
          return (
            <li key={d.id}>
              <span className="grow"><b>{d[lang]}</b>{c?.left !== null && c?.left !== undefined && <span className="tag gold"> {c.left} {t('left')}</span>}<br />
                <span className="muted">{c && `${isCoins ? `💰 ${c.coins}` : ''}${isPaid ? ` · ${money(c.uzs)} ${t('som')}` : ''}`}</span></span>
              {owned[d.id] ? <button type="button" className="btn small soft" onClick={() => openPanel({ kind: 'me' })}>{t('owned2')} →</button>
                : <>{isCoins && <button type="button" className="btn small" disabled={isBusy || isSoldOut} aria-label={`${d[lang]}: ${t('buy')}`} onClick={() => buyWithCoins(d.id)}>💰</button>}
                  {isPaid && <button type="button" className="btn small clay" disabled={isBusy || isSoldOut} onClick={() => run(() => createOrder('decor', { id: d.id }))}>{t('buy')}</button>}</>}
            </li>
          );
        })}
      </ul>
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
