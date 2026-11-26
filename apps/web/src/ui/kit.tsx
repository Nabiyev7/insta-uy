/** Kichik umumiy UI bo'laklari: oyna, maydon, bo'lim, ro'yxat holati, tasdiq oynasi. */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { errorText, useT } from '../app/i18n.ts';
import { backPanel, getApp, openPanel, setApp, toast, useApp } from '../app/store.ts';
import { Icon, type IconName } from './icons.tsx';

interface SheetProps {
  readonly title: string;
  readonly children: ReactNode;
  /** Sarlavha yonidagi belgi (holat, tanga soni). */
  readonly extra?: ReactNode;
  /** Pastda doim ko'rinib turadigan tugmalar. */
  readonly footer?: ReactNode;
  /** half — pastki yarim ekran, full — telefonda to'liq ekran. */
  readonly variant?: 'half' | 'half chat' | 'full';
}
export function Sheet({ title, children, extra, footer, variant }: SheetProps): React.JSX.Element {
  const t = useT();
  const canGoBack = useApp((s) => s.trail.length > 0);
  const ref = useRef<HTMLElement>(null);
  useEffect(() => { ref.current?.focus({ preventScroll: true }); }, []);
  return (
    <aside className={`sheet ${variant ?? ''}`} role="dialog" aria-label={title} tabIndex={-1} ref={ref}>
      <header>
        {canGoBack && <button type="button" className="x" onClick={backPanel} aria-label={t('back')}><Icon name="back" /></button>}
        <h2>{title}</h2>
        {extra}
        <button type="button" className="x" onClick={() => openPanel(null)} aria-label={t('close')}><Icon name="close" /></button>
      </header>
      <div className="body">{children}</div>
      {footer && <footer>{footer}</footer>}
    </aside>
  );
}

interface FieldProps { readonly label: string; readonly children: ReactNode }
export function Field({ label, children }: FieldProps): React.JSX.Element {
  return <label className="field"><span>{label}</span>{children}</label>;
}

interface SectionProps { readonly title: string; readonly icon?: IconName; readonly children: ReactNode }
export function Section({ title, icon, children }: SectionProps): React.JSX.Element {
  return <section className="section"><h3>{icon && <Icon name={icon} />}{title}</h3>{children}</section>;
}

interface RowLinkProps { readonly icon: IconName; readonly text: string; readonly onClick: () => void; readonly note?: ReactNode; readonly isDanger?: boolean; readonly isDisabled?: boolean }
/** Ro'yxatdagi bitta band: belgi, matn, o'ngda izoh va strelka. */
export function RowLink({ icon, text, onClick, note, isDanger = false, isDisabled = false }: RowLinkProps): React.JSX.Element {
  return <button type="button" className={`row-link ${isDanger ? 'danger' : ''}`} onClick={onClick} disabled={isDisabled}><Icon name={icon} /><span className="grow">{text}</span>{note}<Icon name="next" className="chev" /></button>;
}

interface SwatchesProps { readonly colors: readonly string[]; readonly value: number; readonly onPick: (i: number) => void; readonly label: string }
export function Swatches({ colors, value, onPick, label }: SwatchesProps): React.JSX.Element {
  return (
    <div className="swatches" role="group" aria-label={label}>
      {colors.map((c, i) => <button type="button" key={`${i}${c}`} style={{ background: c }} aria-label={`${label} ${i + 1}`} aria-pressed={i === value} onClick={() => onPick(i)} />)}
    </div>
  );
}

interface SegProps<T extends string> { readonly options: readonly (readonly [T, string])[]; readonly value: T; readonly onPick: (v: T) => void; readonly label: string }
export function Seg<T extends string>({ options, value, onPick, label }: SegProps<T>): React.JSX.Element {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map(([v, text]) => <button type="button" key={v} aria-pressed={v === value} onClick={() => onPick(v)}>{text}</button>)}
    </div>
  );
}

/** Bezakning 3D rasmi (`npm run models` da yasaladi). */
export function DecorImage({ model }: { readonly model: string }): React.JSX.Element {
  return <img className="thumb" src={`/assets/decor/${model}.webp`} alt="" width={128} height={128} loading="lazy" draggable={false} />;
}

/** Amal: ikki marta bosishdan himoya + xatoni ko'rsatish. */
export const useAction = (): { readonly isBusy: boolean; readonly run: (fn: () => Promise<unknown>, okText?: string) => Promise<boolean> } => {
  const [isBusy, setBusy] = useState(false);
  const lock = useRef(false);
  const run = useCallback(async (fn: () => Promise<unknown>, okText?: string): Promise<boolean> => {
    if (lock.current) return false;
    lock.current = true;
    setBusy(true);
    try {
      await fn();
      if (okText) toast(okText);
      return true;
    } catch (error: unknown) {
      toast(errorText(error, getApp().lang), true);
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }, []);
  return { isBusy, run };
};

export interface Loaded<T> { readonly data: T | null; readonly hasError: boolean; readonly reload: () => void }
/** Panel ma'lumotini yuklash; kalit o'zgarsa eski javob e'tiborsiz qoladi. */
export const useLoad = <T,>(load: () => Promise<T>, key: string): Loaded<T> => {
  const [state, setState] = useState<{ data: T | null; hasError: boolean }>({ data: null, hasError: false });
  const [version, setVersion] = useState(0);
  const loader = useRef(load);
  loader.current = load;
  useEffect(() => {
    let isActive = true;
    loader.current().then(
      (data) => { if (isActive) setState({ data, hasError: false }); },
      () => { if (isActive) setState({ data: null, hasError: true }); },
    );
    return () => { isActive = false; };
  }, [key, version]);
  return { ...state, reload: () => setVersion((v) => v + 1) };
};

interface LoadStateProps { readonly of: Loaded<unknown>; /** Ro'yxat bo'sh bo'lsa shu matn. */ readonly empty?: string; readonly isEmpty?: boolean }
/** Yuklanmoqda / internet yo'q / server javob bermadi / bo'sh — har birida tushunarli matn. */
export function LoadState({ of, empty, isEmpty = false }: LoadStateProps): React.JSX.Element | null {
  const t = useT();
  const isOffline = useApp((s) => s.isOffline);
  if (of.hasError) return <div className="state" role="alert"><Icon name="offline" /><p>{t(isOffline ? 'offline' : 'serverDown')}</p><button type="button" className="btn small" onClick={of.reload}><Icon name="refresh" />{t('retry')}</button></div>;
  if (of.data === null) return <p className="state muted">{t('wait')}</p>;
  return isEmpty ? <p className="state muted">{empty ?? t('listEmpty')}</p> : null;
}

/** Tasdiq so'rash: "Ha" bosilsa true. Oynasi — `ConfirmDialog`. */
export const askConfirm = (text: string, isDanger = false): Promise<boolean> => new Promise((resolve) => {
  getApp().ask?.resolve(false);
  setApp({ ask: { text, isDanger, resolve } });
});
export function ConfirmDialog(): React.JSX.Element | null {
  const t = useT();
  const ask = useApp((s) => s.ask);
  if (!ask) return null;
  const answer = (isYes: boolean): void => {
    setApp({ ask: null });
    ask.resolve(isYes);
  };
  return (
    <div className="modal" role="alertdialog" aria-modal="true" aria-label={t('confirmTitle')} onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); answer(false); } }}>
      <div className="box">
        <h2>{t('confirmTitle')}</h2>
        <p>{ask.text}</p>
        <div className="row two">
          <button type="button" className="btn soft" autoFocus onClick={() => answer(false)}>{t('no')}</button>
          <button type="button" className={`btn ${ask.isDanger ? 'danger' : ''}`} onClick={() => answer(true)}>{t('yes')}</button>
        </div>
      </div>
    </div>
  );
}

/** Bitta oyna xato bersa — butun ilova emas, faqat shu oyna: "Yuklab bo'lmadi · Qayta urinish". */
export function PanelCrash({ onRetry }: { readonly onRetry: () => void }): React.JSX.Element {
  const t = useT();
  return (
    <Sheet title={t('loadFailed')}>
      <p className="muted">{t('loadFailed')}</p>
      <button type="button" className="btn block" onClick={onRetry}><Icon name="refresh" />{t('retry')}</button>
    </Sheet>
  );
}

