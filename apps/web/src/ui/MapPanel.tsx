/** Xarita: nik yoki manzil qidiruvi va butun shahar. */
import { useEffect, useRef, useState } from 'react';
import { addressOf, goToPlot } from '../app/actions.ts';
import { rpc } from '../app/api.ts';
import { useT } from '../app/i18n.ts';
import { goToPoint } from '../app/modes.ts';
import { getApp, openPanel, useApp } from '../app/store.ts';
import { findAddress } from '../logic/search.ts';
import { Icon } from './icons.tsx';
import { LoadState, Sheet, useLoad } from './kit.tsx';
import { MAP_SIZE, drawBigMap, fromMap } from './mapCanvas.ts';

interface Found { readonly plot: string; readonly instagram: string | null; readonly address: string }
const MIN_QUERY = 2;
const find = async (q: string): Promise<readonly Found[]> => {
  if (q.length < MIN_QUERY) return [];
  const s = getApp();
  const byAddress = findAddress(q, s.plan?.plots ?? [], addressOf).map((p): Found => ({ plot: p.id, instagram: s.houses.get(p.id)?.nick ?? null, address: addressOf(p) }));
  const byNick = await rpc<readonly Found[]>('api_search', { p_q: q });
  return [...byNick, ...byAddress.filter((a) => !byNick.some((n) => n.plot === a.plot))];
};

function SearchBox(): React.JSX.Element {
  const t = useT();
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(id);
  }, [q]);
  const found = useLoad(() => find(debounced), debounced);
  const isAsked = debounced.length >= MIN_QUERY;
  return (
    <div className="search">
      <div className="search-box"><Icon name="search" /><input className="input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('searchHint')} aria-label={t('search')} autoCapitalize="none" maxLength={40} /></div>
      <ul className="list">
        {found.data?.map((f) => <li key={f.plot}><button type="button" className="plain" onClick={() => goToPlot(f.plot)}><b>{f.instagram ? `@${f.instagram}` : f.address}</b><br /><span className="muted">{f.instagram ? f.address : t('free')}</span></button><Icon name="next" className="chev" /></li>)}
      </ul>
      {isAsked && <LoadState of={found} isEmpty={found.data?.length === 0} empty={t('nothing')} />}
    </div>
  );
}

export function MapPanel(): React.JSX.Element {
  const t = useT();
  const plots = useApp((s) => s.profile?.plots) ?? [];
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const draw = (): void => { if (ref.current) drawBigMap(ref.current); };
    draw();
    const id = setInterval(draw, 1000);
    return () => clearInterval(id);
  }, []);
  const go = (e: React.MouseEvent<HTMLCanvasElement>): void => {
    const r = e.currentTarget.getBoundingClientRect();
    goToPoint(fromMap(((e.clientX - r.left) / r.width) * MAP_SIZE), fromMap(((e.clientY - r.top) / r.height) * MAP_SIZE));
    if (matchMedia('(max-width: 640px)').matches) openPanel(null);
  };
  return (
    <Sheet title={t('map')} variant="full">
      <SearchBox />
      <canvas ref={ref} className="bigmap" width={MAP_SIZE} height={MAP_SIZE} onClick={go} aria-label={t('map')} />
      <div className="row">
        <button type="button" className="btn small soft" onClick={() => goToPoint(0, 40)}><Icon name="plaza" />{t('plaza')}</button>
        {plots.map((p) => <button type="button" key={p.plot} className="btn small" onClick={() => goToPlot(p.plot)}><Icon name="home" />{t('me')}</button>)}
      </div>
    </Sheet>
  );
}
