/** Do‘konning "Premium" bo‘limi: faqat pulga (karta so'm yoki Telegram Stars), tangaga sotilmaydi. Uylar · Bezaklar · Mashinalar · Tanga paketlari. */
import { tryDecor } from '../app/actions.ts';
import { money, useT, type Key } from '../app/i18n.ts';
import { setting, toast, useApp } from '../app/store.ts';
import type { CatalogRow } from '../logic/decorCatalog.ts';
import { premiumTabs, type PremiumTab } from '../logic/shopTabs.ts';
import { PayButtons, starsOf } from './PayButtons.tsx';
import { Icon } from './icons.tsx';
import { DecorImage, Section, Sheet } from './kit.tsx';

const TAB_NAMES: Readonly<Record<PremiumTab, Key>> = { houses: 'ptHouses', decor: 'ptDecor', cars: 'ptCars', packs: 'ptPacks' };
const SOON: Readonly<Record<Exclude<PremiumTab, 'packs'>, Key>> = { houses: 'premiumSoonHouses', decor: 'premiumSoonDecor', cars: 'premiumSoonCars' };

interface Pack { readonly coins: number; readonly bonus: number; readonly uzs: number; readonly stars?: number | null; readonly tag?: 'best' | 'popular' }
const PACKS: readonly Pack[] = [
  { coins: 500, bonus: 0, uzs: 3000, stars: null }, { coins: 1000, bonus: 200, uzs: 6000, stars: null }, { coins: 2500, bonus: 500, uzs: 12000, stars: 60 },
  { coins: 5500, bonus: 1500, uzs: 25000, stars: 125, tag: 'popular' }, { coins: 12000, bonus: 4000, uzs: 50000, stars: 250, tag: 'best' },
];

function CoinPacks(): React.JSX.Element {
  const t = useT();
  const packs = setting<{ readonly packs?: readonly Pack[] }>('premium', {}).packs ?? PACKS;
  return (
    <Section title={t('buyCoins')} icon="coin">
      <ul className="list packs">{packs.map((p, i) => (
        <li key={p.uzs}><span className="grow"><b>{money(p.coins)}</b>{p.bonus > 0 && <span className="tag gold">+{money(p.bonus)} {t('bonusWord')}</span>}{p.tag && <span className={`tag ${p.tag}`}>{t(p.tag === 'best' ? 'packBest' : 'packPopular')}</span>}{!p.stars && <span className="muted"> · {t('cardOnly')}</span>}</span>
          <PayButtons kind="coins" payload={{ pack: i + 1 }} uzs={p.uzs} code={`pack${i + 1}`} stars={p.stars ?? null} /></li>))}</ul>
    </Section>
  );
}

function Soon({ text }: { readonly text: Key }): React.JSX.Element {
  const t = useT();
  return <div className="premium-soon"><Icon name="star" /><b>{t(text)}</b><span className="muted">{t('soon')}</span></div>;
}

function PremiumGood({ row, isPicked, onPick }: { readonly row: CatalogRow; readonly isPicked: boolean; readonly onPick: () => void }): React.JSX.Element {
  const t = useT();
  const lang = useApp((s) => s.lang);
  return (
    <button type="button" className="good premium" aria-label={row[lang]} aria-pressed={isPicked} data-id={row.id} onClick={onPick}>
      <span className="frame"><DecorImage model={row.model} /></span>
      <b>{row[lang]}</b>
      <span className="row between"><span className="cost">{money(row.uzs)} {t('som')}</span><small><Icon name="star" />{starsOf(row.uzs)}</small></span>
    </button>
  );
}

function PremiumBar({ row }: { readonly row: CatalogRow }): React.JSX.Element {
  const t = useT();
  const lang = useApp((s) => s.lang);
  return (
    <div className="row two">
      <button type="button" className="btn soft" aria-label={`${row[lang]}: ${t('tryIt')}`} onClick={() => { if (!tryDecor(row)) toast(t('noHouse'), true); }}>{t('tryIt')}</button>
      <PayButtons kind="decor" payload={{ id: row.id }} uzs={row.uzs} code={`d_${row.id}`} isDisabled={row.left === 0} />
    </div>
  );
}

interface PremiumShopProps {
  readonly parts: React.ReactNode; readonly wallet: React.ReactNode; readonly tab: PremiumTab; readonly onTab: (tab: PremiumTab) => void;
  readonly picked: string | null; readonly onPick: (id: string) => void;
}
export function PremiumShop({ parts, wallet, tab, onTab, picked, onPick }: PremiumShopProps): React.JSX.Element {
  const t = useT();
  const catalog = useApp((s) => s.catalog);
  const tabs = premiumTabs(catalog);
  const current = tabs.find((x) => x.tab === tab) ?? tabs[1];
  const row = current?.rows.find((c) => c.id === picked) ?? current?.rows[0];
  return (
    <Sheet title={t('shop')} variant="full" extra={wallet} footer={row && <PremiumBar row={row} />}>
      {parts}
      <div className="tabs premium-tabs" role="tablist" aria-label={t('shopPremium')}>
        {tabs.map((x) => <button type="button" role="tab" key={x.tab} aria-selected={x.tab === current?.tab} onClick={() => onTab(x.tab)}>{t(TAB_NAMES[x.tab])}</button>)}
      </div>
      {current?.tab === 'packs' && <CoinPacks />}
      {current && current.tab !== 'packs' && current.rows.length === 0 && <Soon text={SOON[current.tab]} />}
      {current && current.rows.length > 0 && <div className="goods">{current.rows.map((c) => <PremiumGood key={c.id} row={c} isPicked={c.id === row?.id} onPick={() => onPick(c.id)} />)}</div>}
    </Sheet>
  );
}
