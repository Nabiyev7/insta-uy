/** Chat xabarlari: saqlash, o'qilmaganlar soni, "jim qilish" (faqat o'zi uchun). */
import { getApp, setApp, write, type ChatLine } from './store.ts';

const KEEP = 300;

export const addMessages = (list: readonly ChatLine[], isLive: boolean): void => {
  setApp((s) => {
    const known = new Set(s.chat.map((m) => m.id));
    const fresh = list.filter((m) => !known.has(m.id));
    const heard = fresh.filter((m) => !s.muted.includes(m.nick)).length;
    return {
      chat: [...s.chat, ...fresh].sort((a, b) => a.at - b.at).slice(-KEEP),
      unread: isLive && s.panel?.kind !== 'chat' ? s.unread + heard : s.unread,
    };
  });
};
export const dropMessage = (id: string): void => setApp((s) => ({ chat: s.chat.filter((m) => m.id !== id) }));

export const setMuted = (nick: string, isMuted: boolean): void => {
  const muted = isMuted ? [...new Set([...getApp().muted, nick])] : getApp().muted.filter((n) => n !== nick);
  write('muted', JSON.stringify(muted));
  setApp({ muted });
};
