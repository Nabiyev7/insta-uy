import { useState, type FormEvent } from 'react';
import { rpc, uploadAd } from '../app/api.ts';
import { hasKey, money, useT, type Key } from '../app/i18n.ts';
import { openPanel, refreshHouses, useApp } from '../app/store.ts';
import { Field, Sheet, useAction, useLoad } from './kit.tsx';

interface Order { readonly id: string; readonly kind: string; readonly payload: Readonly<Record<string, unknown>>; readonly amount: number; readonly status: string; readonly expires: string; readonly provider: string; readonly card: string | null; readonly at: string }

export const createOrder = async (kind: string, payload: Readonly<Record<string, unknown>>): Promise<void> => {
  await rpc('my_order', { p_kind: kind, p_payload: payload });
  openPanel({ kind: 'orders' });
  void refreshHouses();
};

/** Provayderga mos to'lov ko'rsatmasi (PLAN §8: A va B variant bir interfeysda). */
const checkoutUrl = (o: Order): string | null => {
  const payme = import.meta.env.VITE_PAYME_MERCHANT as string | undefined;
  const click = import.meta.env.VITE_CLICK_MERCHANT as string | undefined;
  const service = import.meta.env.VITE_CLICK_SERVICE as string | undefined;
  if (o.provider === 'payme' && payme) return `https://checkout.paycom.uz/${btoa(`m=${payme};ac.order=${o.id};a=${o.amount * 100}`)}`;
  if (o.provider === 'click' && click && service) return `https://my.click.uz/services/pay?service_id=${service}&merchant_id=${click}&amount=${o.amount}&transaction_param=${o.id}`;
  return null;
};

export function OrdersPanel(): React.JSX.Element {
  const t = useT();
  const { isBusy, run } = useAction();
  const { data, reload } = useLoad(() => rpc<readonly Order[]>('my_orders'), 'orders');
  const open = data?.filter((o) => o.status === 'pending' && Date.parse(o.expires) > Date.now()) ?? [];
  return (
    <Sheet title={t('orders')} onBack={() => openPanel({ kind: 'me' })}>
      {open.map((o) => {
        const url = checkoutUrl(o);
        return (
          <div className="pay" key={o.id}>
            <span>{t('payTitle')} · {o.kind}</span>
            <strong>{money(o.amount)} {t('som')}</strong>
            {o.provider === 'card' && <><span>{t('payExact')}</span>{o.card && <span>{t('payCard')}: <b style={{ userSelect: 'all' }}>{o.card}</b></span>}</>}
            {url && <a className="btn" href={url} target="_blank" rel="noopener noreferrer">{t('payTitle')}</a>}
            <small>{t('payUntil')}: {new Date(o.expires).toLocaleTimeString('ru-RU')}</small>
            <button type="button" className="btn small soft" disabled={isBusy} onClick={() => run(async () => { await rpc('my_order_cancel', { p_id: o.id }); reload(); await refreshHouses(); })}>{t('cancel')}</button>
          </div>
        );
      })}
      <ul className="list">
        {data?.filter((o) => !open.includes(o)).map((o) => {
          const key = `st_${o.status}`;
          return <li key={o.id}><span className="grow">{o.kind}<br /><span className="muted">{new Date(o.at).toLocaleString('ru-RU')}</span></span><b>{money(o.amount)}</b><span className="tag">{hasKey(key) ? t(key as Key) : o.status}</span></li>;
        })}
      </ul>
      {data?.length === 0 && <p className="muted">{t('nothing')}</p>}
    </Sheet>
  );
}

const toWebp = async (file: File): Promise<Blob> => {
  const bmp = await createImageBitmap(file);
  const c = document.createElement('canvas');
  c.width = 1040;
  c.height = 400;
  const k = Math.max(c.width / bmp.width, c.height / bmp.height);
  c.getContext('2d')?.drawImage(bmp, (c.width - bmp.width * k) / 2, (c.height - bmp.height * k) / 2, bmp.width * k, bmp.height * k);
  bmp.close();
  return new Promise((resolve, reject) => { c.toBlob((b) => (b ? resolve(b) : reject(new Error('upload'))), 'image/webp', 0.85); });
};

interface MyAd { readonly commerce_id: string; readonly title: string; readonly link: string | null; readonly image: string | null; readonly status: 'draft' | 'review' | 'live' | 'rejected'; readonly note: string | null; readonly until: string | null }
function AdForm({ ad, onDone }: { readonly ad: MyAd; readonly onDone: () => void }): React.JSX.Element {
  const t = useT();
  const userId = useApp((s) => s.profile?.id);
  const { isBusy, run } = useAction();
  const [title, setTitle] = useState(ad.title);
  const [link, setLink] = useState(ad.link ?? '');
  const [file, setFile] = useState<File | null>(null);
  const submit = (e: FormEvent): void => {
    e.preventDefault();
    void run(async () => {
      const image = file && userId ? await uploadAd(userId, await toWebp(file)) : ad.image;
      await rpc('my_commerce_edit', { p_id: ad.commerce_id, p_title: title, p_link: link, p_image: image ?? '' });
      onDone();
    }, t('sent'));
  };
  return (
    <form className="section" onSubmit={submit}>
      <div className="row between"><h3>{ad.commerce_id}</h3><span className="tag">{t(`ad_${ad.status}`)}</span></div>
      {ad.note && <p className="muted">{ad.note}</p>}
      <Field label={t('adTitle')}><input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={40} required /></Field>
      <Field label={t('adLink')}><input value={link} onChange={(e) => setLink(e.target.value)} type="url" maxLength={200} /></Field>
      <Field label={t('adImage')}><input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></Field>
      <button type="submit" className="btn" disabled={isBusy}>{t('adSubmit')}</button>
    </form>
  );
}
export function AdsPanel(): React.JSX.Element {
  const t = useT();
  const { data, reload } = useLoad(() => rpc<readonly MyAd[]>('my_commerce'), 'ads');
  return (
    <Sheet title={t('myAds')} onBack={() => openPanel({ kind: 'me' })}>
      {data?.length === 0 && <p className="muted">{t('nothing')}</p>}
      {data?.map((ad) => <AdForm key={ad.commerce_id} ad={ad} onDone={reload} />)}
    </Sheet>
  );
}

interface CatalogRow { readonly id: string; readonly uzs: number; readonly coins: number; readonly left: number | null }
export const useCatalog = (): ReadonlyMap<string, CatalogRow> => {
  const { data } = useLoad(() => rpc<readonly CatalogRow[]>('api_catalog'), 'catalog');
  return new Map(data?.map((c) => [c.id, c]));
};
