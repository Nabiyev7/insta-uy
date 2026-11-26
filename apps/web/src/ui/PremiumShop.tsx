/** Do‘konning "Premium" bo‘limi: faqat pulga (karta so'm yoki Telegram Stars), tangaga sotilmaydi. Uylar · Bezaklar · Mashinalar · Tanga paketlari. */
import { tryDecor } from '../app/actions.ts';
import { money, useT, type Key } from '../app/i18n.ts';
import { setting, toast, useApp } from '../app/store.ts';
import type { CatalogRow } from '../logic/decorCatalog.ts';
import { premiumTabs, type PremiumTab } from '../logic/shopTabs.ts';
import { BotBuy } from './BotBuy.tsx';
import { starsFromUzs } from '../logic/stars.ts';
import { Icon } from './icons.tsx';
import { DecorImage, Section, Sheet } from './kit.tsx';

const TAB_NAMES: Readonly<Record<PremiumTab, Key>> = { houses: 'ptHouses', decor: 'ptDecor', cars: 'ptCars', packs: 'ptPacks' };
const SOON: Readonly<Record<Exclude<PremiumTab, 'packs'>, Key>> = { houses: 'premiumSoonHouses', decor: 'premiumSoonDecor', cars: 'premiumSoonCars' };

interface Pack { readonly coins: number; readonly bonus: number; readonly uzs: number; readonly stars?: number | null; readonly tag?: 'best' | 'popular' }
/** Sozlama kelmaguncha: faqat Stars bilan sotiladigan 3 paket (13-qadam). */
const PACKS: readonly Pack[] = [
  { coins: 2500, bonus: 500, uzs: 12000, stars: 60 }, { coins: 5500, bonus: 1500, uzs: 25000, stars: 125, tag: 'popular' }, { coins: 12000, bonus: 4000, uzs: 50000, stars: 250, tag: 'best' },
];

function CoinPacks(): React.JSX.Element {
  const t = useT();
  const packs = setting<{ readonly packs?: readonly Pack[] }>('premium', {}).packs ?? PACKS;
  return (
    <Section title={t('buyCoins')} icon="coin">
      {/* Karta: tepada tanga soni, ostida bonus, keyin Stars narxi, belgi (matn ustiga tushmaydi), pastda to'liq enli tugma. */}
      <ul className="pack-cards">{packs.map((p, i) => p.stars ? (
        <li key={p.uzs} className={`pack-card ${p.tag ?? ''}`}>
          <b className="pack-coins"><Icon name="coin" />{money(p.coins)}</b>
          {p.bonus > 0 && <span className="pack-bonus">+{money(p.bonus)} {t('bonusWord')}</span>}
          <span className="pack-price"><Icon name="star" />{p.stars}</span>
          {p.tag && <span className={`pack-tag ${p.tag}`}>{t(p.tag === 'best' ? 'packBest' : 'packPopular')}</span>}
          {/* Kod — sozlamadagi tartib raqami (bot shu bo'yicha topadi). */}
          <BotBuy code={`pack${i + 1}`} />
        </li>) : null)}</ul>
    </Section>
  );
}

/** Salyut — pulga faqat botda (matn botda yoziladi: /salyut matn). */
function SalutePremium(): React.JSX.Element {
  const t = useT();
  return (
    <Section title={t('salute')} icon="star">
      <p className="muted">{t('saluteHint')}</p>
      <BotBuy code="salute" />
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
  // Bot bilan bir xil: 50 yulduzdan (starsMin) kam bo'lsa Stars narxi ko'rsatilmaydi.
  const stars = starsFromUzs(row.uzs, setting<{ readonly starsRate?: number }>('premium', {}).starsRate);
  const starsMin = setting<{ readonly starsMin?: number }>('premium', {}).starsMin ?? 50;
  return (
    <button type="button" className="good premium" aria-label={row[lang]} aria-pressed={isPicked} data-id={row.id} onClick={onPick}>
      <span className="frame"><DecorImage model={row.model} /></span>
      <b>{row[lang]}</b>
      <span className="row between"><span className="cost">{money(row.uzs)} {t('som')}</span>{stars >= starsMin && <small><Icon name="star" />{stars}</small>}</span>
    </button>
  );
}

function PremiumBar({ row }: { readonly row: CatalogRow }): React.JSX.Element {
  const t = useT();
  const lang = useApp((s) => s.lang);
  return (
    <div className="row two">
      <button type="button" className="btn soft" aria-label={`${row[lang]}: ${t('tryIt')}`} onClick={() => { if (!tryDecor(row)) toast(t('noHouse'), true); }}>{t('tryIt')}</button>
      {row.left === 0 ? <button type="button" className="btn soft" disabled>{t('soldOut')}</button> : <BotBuy code={`d_${row.id}`} />}
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
      {current?.tab === 'packs' && <><CoinPacks /><SalutePremium /></>}
      {current && current.tab !== 'packs' && current.rows.length === 0 && <Soon text={SOON[current.tab]} />}
      {current && current.rows.length > 0 && <div className="goods">{current.rows.map((c) => <PremiumGood key={c.id} row={c} isPicked={c.id === row?.id} onPick={() => onPick(c.id)} />)}</div>}
    </Sheet>
  );
}
