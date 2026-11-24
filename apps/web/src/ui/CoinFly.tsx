/** Tanga ko'payganda tangalar yuqoridagi hisobga uchadi. */
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useApp } from '../app/store.ts';
import { Icon } from './icons.tsx';

const COUNT = 7;
const FLY_MS = 1100;
const SPREAD = 90;

export function CoinFly(): React.JSX.Element | null {
  const coins = useApp((s) => s.profile?.coins);
  const owner = useApp((s) => s.profile?.id);
  const last = useRef<{ readonly id: string | undefined; readonly coins: number | undefined }>({ id: undefined, coins: undefined });
  const [burst, setBurst] = useState(0);
  useEffect(() => {
    const before = last.current;
    last.current = { id: owner, coins };
    if (before.id === undefined || before.id !== owner || before.coins === undefined || coins === undefined || coins <= before.coins) return undefined;
    setBurst((n) => n + 1);
    const id = setTimeout(() => setBurst(0), FLY_MS);
    return () => clearTimeout(id);
  }, [coins, owner]);
  if (burst === 0) return null;
  const target = document.querySelector('.pill.coins')?.getBoundingClientRect();
  const from = { x: innerWidth / 2, y: innerHeight * 0.72 };
  const to = target ? { x: target.left + target.width / 2 - from.x, y: target.top + target.height / 2 - from.y } : { x: 0, y: -from.y };
  return (
    <div className="coin-fly" key={burst} aria-hidden="true">
      {Array.from({ length: COUNT }, (_, i) => {
        const a = (i / COUNT) * Math.PI * 2;
        const style = { left: from.x, top: from.y, '--sx': `${Math.cos(a) * SPREAD}px`, '--sy': `${Math.sin(a) * SPREAD * 0.6}px`, '--tx': `${to.x}px`, '--ty': `${to.y}px`, animationDelay: `${i * 45}ms` } as CSSProperties;
        return <i key={a} style={style}><Icon name="coin" /></i>;
      })}
    </div>
  );
}
