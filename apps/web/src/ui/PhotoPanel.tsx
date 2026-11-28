/** Foto rejimi paneli (17-qadam): yorug'lik, maket effekti, format, "Mening uyim", suratga olish va natija oynasi. */
import { useEffect, useState } from 'react';
import { openHousePhoto } from '../app/actions.ts';
import { savePhoto, sharePhoto } from '../app/share.ts';
import { useT } from '../app/i18n.ts';
import { houseShot, snapshotters } from '../app/runtime.ts';
import type { MyPlot } from '../app/api.ts';
import { setApp, toast, useApp } from '../app/store.ts';
import { aspectOf, frameRect, type PhotoFormat, type PhotoLight, type PhotoSettings, type PhotoTilt } from '../logic/photo.ts';
import { Icon } from './icons.tsx';

const LIGHTS: readonly (readonly [PhotoLight, 'photoNow' | 'photoGolden' | 'photoNight'])[] = [['now', 'photoNow'], ['golden', 'photoGolden'], ['night', 'photoNight']];
const TILTS: readonly (readonly [PhotoTilt, 'tiltOff' | 'tiltLow' | 'tiltMid' | 'tiltHigh'])[] = [['off', 'tiltOff'], ['low', 'tiltLow'], ['mid', 'tiltMid'], ['high', 'tiltHigh']];
const FORMATS: readonly PhotoFormat[] = ['9:16', '4:5', '1:1'];
/** Profil yo'q paytda ham bir xil havola (zustand tanlovchisi har safar yangi massiv qaytarmasin — cheksiz qayta chizish). */
const NO_PLOTS: readonly MyPlot[] = [];

const setPhoto = (patch: Partial<PhotoSettings>): void => setApp({ photo: { ...useApp.getState().photo, ...patch } });
const nextFrame = (): Promise<void> => new Promise((r) => { requestAnimationFrame(() => r()); });
const blobOf = (c: HTMLCanvasElement): Promise<Blob> => new Promise((ok, bad) => { c.toBlob((b) => (b ? ok(b) : bad(new Error('shot'))), 'image/jpeg', 0.92); });

interface Shot { readonly canvas: HTMLCanvasElement; readonly url: string; readonly width: number; readonly height: number }

function Result({ shot, onClose }: { readonly shot: Shot; readonly onClose: () => void }): React.JSX.Element {
  const t = useT();
  const [isBusy, setBusy] = useState(false);
  const act = (fn: (c: HTMLCanvasElement) => Promise<void>): void => { setBusy(true); void fn(shot.canvas).finally(() => setBusy(false)); };
  return (
    <div className="photo-result" role="dialog" aria-label={t('photoResult')}>
      <img src={shot.url} alt={t('photoResult')} data-w={shot.width} data-h={shot.height} />
      <div className="row">
        <button type="button" className="btn gold" disabled={isBusy} onClick={() => act(savePhoto)}><Icon name="check" />{t('save')}</button>
        <button type="button" className="btn soft" disabled={isBusy} onClick={() => act(sharePhoto)}><Icon name="share" />{t('share')}</button>
        <button type="button" className="round glass" aria-label={t('close')} onClick={onClose}><Icon name="close" /></button>
      </div>
    </div>
  );
}

export function PhotoPanel(): React.JSX.Element {
  const t = useT();
  const photo = useApp((s) => s.photo);
  const mine = useApp((s) => s.profile?.plots[0]?.plot ?? null);
  const plots = useApp((s) => s.profile?.plots ?? NO_PLOTS);
  // Uy surati rejimi: kamera faqat shu uy atrofida; bir nechta uy bo'lsa — ro'yxatdan tanlanadi.
  const housePlot = houseShot.orbit?.plot ?? null;
  const [shot, setShot] = useState<Shot | null>(null);
  const [isBusy, setBusy] = useState(false);
  const [view, setView] = useState({ w: innerWidth, h: innerHeight });
  useEffect(() => {
    const fit = (): void => setView({ w: innerWidth, h: innerHeight });
    addEventListener('resize', fit);
    return () => removeEventListener('resize', fit);
  }, []);
  // Kadr olishdagi bilan bir xil ramka (logic/photo.ts → frameRect).
  const frame = frameRect(view.w, view.h, aspectOf(photo.format));
  useEffect(() => () => { if (shot) URL.revokeObjectURL(shot.url); }, [shot]);
  // Foto rejimidan chiqqanda effektlar o'chadi (yorug'lik — o'yindagi vaqt); tanlangan sozlamalar keyingi safar uchun eslab qolinadi.
  const close = (): void => setApp({ isPhoto: false });
  const take = async (): Promise<void> => {
    setBusy(true);
    try {
      await nextFrame();
      const canvas = snapshotters.photo?.();
      if (!canvas) return;
      setShot({ canvas, url: URL.createObjectURL(await blobOf(canvas)), width: canvas.width, height: canvas.height });
    } catch {
      // Xotira yoki brauzer cheklovi: xabar chiqadi, Foto rejimi ishlashda davom etadi.
      toast(t('photoFail'), true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="hud photo-mode">
      <div className="photo-frame" style={{ left: frame.x, top: frame.y, width: frame.w, height: frame.h }} aria-hidden="true" />
      {shot ? <Result shot={shot} onClose={() => setShot(null)} /> : (
        <div className="photo-panel">
          <div className="seg" role="group" aria-label={t('photoLight')}>{LIGHTS.map(([k, key]) => <button type="button" key={k} aria-pressed={photo.light === k} onClick={() => setPhoto({ light: k })}>{t(key)}</button>)}</div>
          <div className="photo-row">
            <span className="muted small">{t('tiltShift')}</span>
            <div className="seg small" role="group" aria-label={t('tiltShift')}>{TILTS.map(([k, key]) => <button type="button" key={k} aria-pressed={photo.tilt === k} onClick={() => setPhoto({ tilt: k })}>{t(key)}</button>)}</div>
          </div>
          <div className="photo-row">
            <span className="muted small">{t('photoFormat')}</span>
            <div className="seg small" role="group" aria-label={t('photoFormat')}>{FORMATS.map((f) => <button type="button" key={f} aria-pressed={photo.format === f} onClick={() => setPhoto({ format: f })}>{f}</button>)}</div>
            <label className="small check"><input type="checkbox" checked={photo.hasLink} onChange={(e) => setPhoto({ hasLink: e.target.checked })} />{t('photoLink')}</label>
          </div>
          {housePlot && plots.length > 1 && (
            <label className="photo-row small">{t('whichHouse')}
              <select className="input" value={housePlot} onChange={(e) => openHousePhoto(e.target.value)}>{plots.map((p) => <option key={p.plot} value={p.plot}>{p.address}{p.instagram ? ` · @${p.instagram}` : ''}</option>)}</select>
            </label>
          )}
          <div className="photo-row actions">
            <button type="button" className="btn soft" onClick={close}>{t('close')}</button>
            {mine && !housePlot && <button type="button" className="round glass" aria-label={t('myHouse')} title={t('myHouse')} onClick={() => openHousePhoto(mine)}><Icon name="home" /></button>}
            <button type="button" className="btn gold big shoot" disabled={isBusy} onClick={() => void take()}><Icon name="photo" />{t('shoot')}</button>
            <button type="button" className="round glass" aria-label={t('hideUi')} title={t('hideUi')} onClick={() => setApp({ isPhoto: false, isClean: true })}><Icon name="eyeOff" /></button>
          </div>
        </div>
      )}
    </div>
  );
}
