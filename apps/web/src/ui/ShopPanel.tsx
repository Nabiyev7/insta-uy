/** Do'kon: tablar, rasmli kartochkalar, pastda "Sinab ko'rish" va "Olish". Mashina tanlash oynasi ham shu yerda. */
import { isOnSale, timeLeft } from '../logic/sale.ts';
import { isOwnerAdmin } from '../logic/admin.ts';
import { useEffect, useState } from 'react';
import { BUZZ, buzz, tryDecor } from '../app/actions.ts';
import { rpc } from '../app/api.ts';
import { money, useT, type Key } from '../app/i18n.ts';
import { car } from '../app/runtime.ts';
import { openAuth, openPanel, openRoot, refreshCatalog, refreshProfile, setting, toast, useApp, write } from '../app/store.ts';
import type { CatalogRow, SetRow } from '../logic/decorCatalog.ts';
import { CARS, ownedCars } from '../logic/drive.ts';
import { goodState, shopTabs, type PremiumTab, type ShopTab } from '../logic/shopTabs.ts';
import { PremiumShop } from './PremiumShop.tsx';
import { Icon } from './icons.tsx';
import { DecorImage, LoadState, Sheet, useAction, useLoad } from './kit.tsx';

const TAB_NAMES: Readonly<Record<ShopTab, Key>> = { sale: 'tabSale', new: 'tabNew', yard: 'tabYard', garden: 'tabGarden', car: 'tabCar', luxe: 'tabLuxe', pet: 'tabPet', set: 'tabSet', special: 'tabSpecial' };
const useAdmin = (): boolean => useApp((s) => isOwnerAdmin(s.profile));

interface BestPlot { readonly level: number; readonly id: string | null }
/** Eng yuqori levelli hovlim (kvartira hisobga olinmaydi). */
const useBestPlot = (): BestPlot => {
  const profile = useApp((x) => x.profile);
  const plotById = useApp((x) => x.plotById);
  return (profile?.plots ?? []).filter((p) => plotById.get(p.plot)?.type !== 'kvartira').reduce<BestPlot>((best, p) => (p.tier > best.level ? { level: p.tier, id: p.plot } : best), { level: 0, id: null });
};
const refreshShop = async (): Promise<void> => { await Promise.all([refreshProfile(), refreshCatalog()]); };

function Price({ coins, old }: { readonly coins: number; readonly old?: number }): React.JSX.Element {
  return <span className="cost"><Icon name="coin" />{old !== undefined && old > coins && <s className="old">{money(old)}</s>}{money(coins)}</span>;
}
/** Chegirma belgisi: "-30%" va tugashiga qolgan vaqt. */
function SaleTag({ row }: { readonly row: CatalogRow }): React.JSX.Element | null {
  const t = useT();
  if (!isOnSale(row) || !row.saleEnds) return null;
  const left = timeLeft(row.saleEnds, Date.now(), { day: t('wDay'), hour: t('wHour'), min: t('wMin') });
  return <i className="flag sale"><Icon name="fire" />-{row.sale}% · {t('saleLeft').replace('{t}', left)}</i>;
}

interface GoodProps { readonly row: CatalogRow; readonly level: number; readonly isPicked: boolean; readonly onPick: () => void }
function Good({ row, level, isPicked, onPick }: GoodProps): React.JSX.Element {
  const t = useT();
  const lang = useApp((s) => s.lang);
  const qty = useApp((s) => s.profile?.decor[row.id] ?? 0);
  const state = goodState(row, level, useAdmin());
  const note = { free: '', locked: `${row.min}-${t('atLevel')}`, soldOut: t('soldOut'), seasonOver: t('seasonOver') }[state];
  return (
    <button type="button" className={`good ${state}`} aria-label={row[lang]} aria-pressed={isPicked} data-id={row.id} onClick={onPick}>
      <span className="frame"><DecorImage model={row.model} />{note && <em>{state === 'locked' && <Icon name="lock" />}{note}</em>}</span>
      {isOnSale(row) ? <SaleTag row={row} /> : row.isNew && <i className="flag">{t('isNew')}</i>}
      {qty > 0 && <i className="flag mine">{t('have')}{qty > 1 ? `: ${qty}` : ''}</i>}
      <b>{row[lang]}</b>
      <span className="row between"><Price coins={row.coins} old={isOnSale(row) ? row.oldCoins : undefined} />{row.left !== null && row.left > 0 ? <small>{row.left} {t('left')}</small> : row.from && <small>{t('seasonal')}</small>}</span>
    </button>
  );
}

interface SetProps { readonly set: SetRow; readonly rows: readonly CatalogRow[]; readonly level: number; readonly isPicked: boolean; readonly onPick: () => void }
function SetCard({ set, rows, level, isPicked, onPick }: SetProps): React.JSX.Element {
  const t = useT();
  const lang = useApp((s) => s.lang);
  const need = Math.max(...rows.map((c) => c.min));
  // To'plam narxi chegirmasiz (asosiy narxlardan) — server ham shunday.
  const full = rows.reduce((n, c) => n + (c.oldCoins ?? c.coins), 0);
  const isLocked = need > 1 && level < need && !useAdmin();
  return (
    <button type="button" className={`good set ${isLocked ? 'locked' : ''}`} aria-label={set[lang]} aria-pressed={isPicked} data-id={set.id} onClick={onPick}>
      <span className="frame">{rows.map((c) => <DecorImage key={c.id} model={c.model} />)}{isLocked && <em><Icon name="lock" />{need}-{t('atLevel')}</em>}</span>
      <i className="flag">−{set.discount}%</i>
      <b>{set[lang]}</b>
      <small>{rows.map((c) => c[lang]).join(', ')}</small>
      <span className="row"><s>{money(full)}</s><Price coins={set.coins} /></span>
    </button>
  );
}

/** Tanlangan tovar tugmalari. Kirmagan odam "Olish" ni bossa — kirish oynasi, keyin shu yerga qaytadi. */
function BuyBar({ row, best }: { readonly row: CatalogRow; readonly best: BestPlot }): React.JSX.Element {
  const t = useT();
  const lang = useApp((s) => s.lang);
  const profile = useApp((s) => s.profile);
  const { isBusy, run } = useAction();
  const qty = profile?.decor[row.id] ?? 0;
  const isAdmin = isOwnerAdmin(profile);
  const state = goodState(row, best.level, isAdmin);
  const yard = best.id;
  const short = profile && !isAdmin && state === 'free' ? row.coins - profile.coins : 0;
  const buy = (): void => {
    if (!profile) { openAuth(); return; }
    void run(async () => {
      await rpc('my_buy_decor_coins', { p_id: row.id });
      buzz(BUZZ.coin);
      await refreshShop();
    }, t('bought'));
  };
  const offer = `${t(qty > 0 ? 'getMore' : 'get')} · ${money(row.coins)}`;
  const label = { free: offer, locked: profile ? `${row.min}-${t('opensAt')}` : offer, soldOut: t('soldOut'), seasonOver: t('seasonOver') }[state];
  const isClosed = isBusy || state === 'soldOut' || state === 'seasonOver' || (state === 'locked' && profile !== null);
  return (
    <>
    {short > 0 && <p className="need-coins">{t('needCoins').replace('{n}', money(short))}</p>}
    {state === 'locked' && profile && <p className="need-coins locked-note">{label}</p>}
    <div className="row two">
      {qty > 0 && yard
        ? <button type="button" className="btn soft" onClick={() => openPanel({ kind: 'yard', id: yard })}><Icon name="plus" />{t('putYard')}</button>
        : <button type="button" className="btn soft" aria-label={`${row[lang]}: ${t('tryIt')}`} onClick={() => { if (!tryDecor(row)) toast(t('noHouse'), true); }}>{t('tryIt')}</button>}
      {setting('coins_enabled', true) && (state === 'locked' && profile && yard
        // 15-qadam: level yetmasa — "N-levelda ochiladi" yozuvi va uyni kuchaytirish (uy oynasida "Kuchaytirish").
        ? <button type="button" className="btn gold" aria-label={`${row[lang]}: ${label}. ${t('upgradeHouse')}`} onClick={() => openPanel({ kind: 'plot', id: yard })}><Icon name="star" />{t('upgradeHouse')}</button>
        : short > 0
        ? <button type="button" className="btn gold" onClick={() => openCoinShop()}><Icon name="coin" />{t('getCoins')}</button>
        : <button type="button" className="btn" disabled={isClosed} aria-label={`${row[lang]}: ${label}`} onClick={buy}>{label}{isAdmin && <small className="admin-tag">{t('adminTag')}</small>}</button>)}
    </div>
    </>
  );
}
function BuySetBar({ set, level, need }: { readonly set: SetRow; readonly level: number; readonly need: number }): React.JSX.Element {
  const t = useT();
  const lang = useApp((s) => s.lang);
  const profile = useApp((s) => s.profile);
  const { isBusy, run } = useAction();
  const isAdmin = isOwnerAdmin(profile);
  const isLocked = need > 1 && level < need && !isAdmin;
  const buy = (): void => {
    if (!profile) { openAuth(); return; }
    void run(async () => { await rpc('my_buy_set_coins', { p_set: set.id }); buzz(BUZZ.coin); await refreshShop(); }, t('bought'));
  };
  const label = isLocked && profile ? `${need}-${t('opensAt')}` : `${t('get')} · ${money(set.coins)}`;
  return <button type="button" className="btn block" disabled={isBusy || (isLocked && profile !== null)} aria-label={`${set[lang]}: ${label}`} onClick={buy}>{label}</button>;
}

/** Kirish (Telegramdan qaytish — sahifa qayta yuklanadi) yoki boshqa oynadan qaytganda do'kon o'sha joyida ochiladi. */
const MEMORY_KEY = 'shopPick';
type ShopPart = 'coins' | 'premium';
type ShopMemory = { part?: ShopPart; tab: ShopTab | null; premium?: PremiumTab; picked: string | null };
const readMemory = (): ShopMemory => {
  try {
    const raw = JSON.parse(localStorage.getItem(MEMORY_KEY) ?? 'null') as Partial<ShopMemory> | null;
    return { part: raw?.part === 'premium' ? 'premium' : 'coins', tab: typeof raw?.tab === 'string' ? raw.tab : null, premium: typeof raw?.premium === 'string' ? raw.premium : 'decor', picked: typeof raw?.picked === 'string' ? raw.picked : null };
  } catch {
    return { tab: null, picked: null };
  }
};
let memory: ShopMemory = readMemory();
const saveMemory = (next: ShopMemory): void => {
  memory = next;
  try { localStorage.setItem(MEMORY_KEY, JSON.stringify(next)); } catch { /* maxfiy rejim */ }
};
/** "Tanga olish": do'konning Premium → Tanga paketlari tabi. */
export const openCoinShop = (): void => {
  saveMemory({ ...memory, part: 'premium', premium: 'packs', picked: null });
  openPanel({ kind: 'shop' });
};

export function ShopPanel(): React.JSX.Element {
  const t = useT();
  const coins = useApp((s) => s.profile?.coins);
  const catalog = useApp((s) => s.catalog);
  const sets = useApp((s) => s.sets);
  const best = useBestPlot();
  const [part, setPart] = useState<ShopPart>(memory.part ?? 'coins');
  const [tab, setTab] = useState(memory.tab);
  const [premium, setPremium] = useState<PremiumTab>(memory.premium ?? 'decor');
  const [picked, setPicked] = useState(memory.picked);
  useEffect(() => { saveMemory({ part, tab, premium, picked }); }, [part, tab, premium, picked]);
  const loaded = useLoad(refreshCatalog, 'catalog');
  const tabs = shopTabs(catalog, sets);
  const current = tabs.find((x) => x.tab === tab) ?? tabs[0];
  const row = current?.rows.find((c) => c.id === picked) ?? current?.rows[0];
  const set = current?.sets.find((x) => x.id === picked) ?? current?.sets[0];
  const rowsOf = (x: SetRow): readonly CatalogRow[] => x.items.flatMap((id) => catalog.find((c) => c.id === id) ?? []);
  const footer = set ? <BuySetBar set={set} level={best.level} need={Math.max(...rowsOf(set).map((c) => c.min))} /> : row && <BuyBar row={row} best={best} />;
  const wallet = coins !== undefined && <button type="button" className="pill coins flat" aria-label={`${t('coins')}: ${coins}`} onClick={() => openPanel({ kind: 'coins' })}><Icon name="coin" /><b>{money(coins)}</b></button>;
  const parts = (
    <div className="shop-parts" role="tablist" aria-label={t('shop')}>
      <button type="button" role="tab" aria-selected={part === 'coins'} onClick={() => { setPart('coins'); setPicked(null); }}><Icon name="coin" />{t('shopCoins')}</button>
      <button type="button" role="tab" className="premium" aria-selected={part === 'premium'} onClick={() => { setPart('premium'); setPicked(null); }}><Icon name="star" />{t('shopPremium')}</button>
    </div>
  );
  if (part === 'premium') return <PremiumShop parts={parts} wallet={wallet} tab={premium} onTab={(x) => { setPremium(x); setPicked(null); }} picked={picked} onPick={setPicked} />;
  return (
    <Sheet title={t('shop')} variant="full" extra={wallet} footer={footer}>
      {parts}
      <div className="tabs" role="tablist" aria-label={t('shopCoins')}>
        {tabs.map((x) => <button type="button" role="tab" key={x.tab} aria-selected={x.tab === current?.tab} onClick={() => { setTab(x.tab); setPicked(null); }}>{x.tab === 'sale' && <Icon name="fire" />}{t(TAB_NAMES[x.tab])}</button>)}
      </div>
      {(loaded.hasError || !current) && <LoadState of={loaded} isEmpty={!current} empty={t('shopEmpty')} />}
      <div className="goods">
        {current?.rows.map((c) => <Good key={c.id} row={c} level={best.level} isPicked={c.id === row?.id} onPick={() => setPicked(c.id)} />)}
        {current?.sets.map((x) => <SetCard key={x.id} set={x} rows={rowsOf(x)} level={best.level} isPicked={x.id === set?.id} onPick={() => setPicked(x.id)} />)}
      </div>
    </Sheet>
  );
}

const KMH = 3.6;
export function CarsPanel(): React.JSX.Element {
  const t = useT();
  const lang = useApp((s) => s.lang);
  const decor = useApp((s) => s.profile?.decor);
  const mine = new Set(ownedCars(decor).map((c) => c.id));
  const onSale = new Set(useApp((s) => s.catalog).filter((c) => c.onSale).map((c) => c.id));
  const pick = (id: string): void => {
    car.id = id;
    write('car', id);
    openRoot(null);
  };
  return (
    <Sheet title={t('myCars')} variant="half">
      <ul className="list">
        {CARS.filter((c) => mine.has(c.id)).map((c) => (
          <li key={c.id}>
            <DecorImage model={c.model} />
            <span className="grow"><b>{c[lang]}</b><br /><span className="muted">{Math.round(c.top * KMH)} {t('kmh')}</span></span>
            {mine.has(c.id)
              ? <button type="button" className={`btn small ${car.id === c.id ? '' : 'soft'}`} onClick={() => pick(c.id)}>{car.id === c.id && <Icon name="check" />}{t(car.id === c.id ? 'chosen' : 'choose')}</button>
              : null}
          </li>
        ))}
      </ul>
      {CARS.some((c) => !mine.has(c.id) && c.decor !== null && onSale.has(c.decor)) && <button type="button" className="btn block gold" onClick={() => { saveMemory({ tab: 'car', picked: null }); openPanel({ kind: 'shop' }); }}><Icon name="shop" />{t('moreCars')}</button>}
    </Sheet>
  );
}
