/** Kichik umumiy UI bo'laklari. */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { errorText, useT } from '../app/i18n.ts';
import { getApp, openPanel, toast } from '../app/store.ts';

interface SheetProps { readonly title: string; readonly children: ReactNode; readonly onBack?: () => void; /** 'half' — pastki yarim ekran. */ readonly variant?: 'half' }
export function Sheet({ title, children, onBack, variant }: SheetProps): React.JSX.Element {
  const t = useT();
  const ref = useRef<HTMLElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <aside className={`sheet ${variant ?? ''}`} role="dialog" aria-label={title} tabIndex={-1} ref={ref}>
      <header>
        {onBack && <button type="button" className="x" onClick={onBack} aria-label={t('back')}>←</button>}
        <h2>{title}</h2>
        <button type="button" className="x" onClick={() => openPanel(null)} aria-label={t('close')}>✕</button>
      </header>
      <div className="body">{children}</div>
    </aside>
  );
}

interface FieldProps { readonly label: string; readonly children: ReactNode }
export function Field({ label, children }: FieldProps): React.JSX.Element {
  return <label className="field"><span>{label}</span>{children}</label>;
}

interface SectionProps { readonly title: string; readonly children: ReactNode }
export function Section({ title, children }: SectionProps): React.JSX.Element {
  return <section className="section"><h3>{title}</h3>{children}</section>;
}

interface SwatchesProps { readonly colors: readonly string[]; readonly value: number; readonly onPick: (i: number) => void; readonly label: string }
export function Swatches({ colors, value, onPick, label }: SwatchesProps): React.JSX.Element {
  return (
    <div className="swatches" role="group" aria-label={label}>
      {colors.map((c, i) => <button type="button" key={c} style={{ background: c }} aria-label={`${label} ${i + 1}`} aria-pressed={i === value} onClick={() => onPick(i)} />)}
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

/** Panel ma'lumotini yuklash; kalit o'zgarsa eski javob e'tiborsiz qoladi. */
export const useLoad = <T,>(load: () => Promise<T>, key: string): { readonly data: T | null; readonly hasError: boolean; readonly reload: () => void } => {
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
