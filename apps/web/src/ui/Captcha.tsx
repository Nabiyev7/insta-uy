/** Cloudflare Turnstile (bepul). VITE_TURNSTILE_KEY bo'lmasa ko'rinmaydi — server tomoni lokalda ham so'ramaydi. */
import { useEffect, useRef } from 'react';

interface TurnstileApi { render(el: HTMLElement, o: { sitekey: string; callback: (token: string) => void; 'expired-callback': () => void }): string; remove(id: string): void }
declare global {
  interface Window { turnstile?: TurnstileApi }
}
const KEY = import.meta.env.VITE_TURNSTILE_KEY as string | undefined;
const SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let loading: Promise<void> | null = null;
const load = (): Promise<void> => {
  loading ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => { loading = null; reject(new Error('network')); };
    document.head.append(s);
  });
  return loading;
};

interface CaptchaProps { readonly onToken: (token: string) => void }
export function Captcha({ onToken }: CaptchaProps): React.JSX.Element | null {
  const ref = useRef<HTMLDivElement>(null);
  const callback = useRef(onToken);
  useEffect(() => { callback.current = onToken; }, [onToken]);
  useEffect(() => {
    if (!KEY) return undefined;
    let id = '';
    let isActive = true;
    load().then(() => {
      if (isActive && ref.current && window.turnstile) id = window.turnstile.render(ref.current, { sitekey: KEY, callback: (t) => callback.current(t), 'expired-callback': () => callback.current('') });
    }).catch(() => undefined); // yuklanmasa server "bot_check" qaytaradi va xabar chiqadi
    return () => {
      isActive = false;
      if (id) window.turnstile?.remove(id);
    };
  }, []);
  return KEY ? <div ref={ref} /> : null;
}
