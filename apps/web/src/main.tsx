import { createRoot } from 'react-dom/client';
import './ui/styles.css';
import { App } from './app/App.tsx';
import { initMonitoring } from './app/monitoring.ts';
import { setMode } from './app/modes.ts';
import { director, car, city, player, remotes, session } from './app/runtime.ts';
import { start } from './app/start.ts';
import { useApp } from './app/store.ts';

initMonitoring();
// Faqat ishlab chiqish va e2e sinov uchun.
if (import.meta.env.DEV) Object.assign(window, { __player: player, __remotes: remotes, __city: city, __car: car, __session: session, __director: director, __setMode: setMode, __app: useApp });
const root = document.getElementById('root');
if (!root) throw new Error('#root topilmadi');
createRoot(root).render(<App />);
void start();
