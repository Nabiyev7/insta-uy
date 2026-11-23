import { createRoot } from 'react-dom/client';
import './ui/styles.css';
import { App } from './app/App.tsx';
import { initMonitoring } from './app/monitoring.ts';
import { player, remotes } from './app/runtime.ts';
import { start } from './app/start.ts';

initMonitoring();
// Faqat ishlab chiqish va e2e sinov uchun.
if (import.meta.env.DEV) Object.assign(window, { __player: player, __remotes: remotes });
const root = document.getElementById('root');
if (!root) throw new Error('#root topilmadi');
createRoot(root).render(<App />);
void start();
