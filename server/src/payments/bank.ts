import { sha256 } from '../util.ts';

export interface BankPayment { readonly amount: number; readonly id: string }

const INCOMING = /(kirim|tushum|o['‘’ʻ`]?tkazma qabul|hisobga o['‘’ʻ`]?tdi|to['‘’ʻ`]?ldirildi|popolneni|пополнен|зачислен|поступлен|перевод получен|credit|➕|\+\s?\d)/i;
const OUTGOING = /(chiqim|to['‘’ʻ`]?lov amalga|xarid|yechildi|списан|оплата|покупка|снятие|➖)/i;
const AMOUNT = /(\d{1,3}(?:[  .,']\d{3})+|\d{4,9})(?:[.,](\d{2}))?\s*(?:uzs|so['‘’ʻ`]?m|sum|сум)/iu;

/** Bank bildirishnomasidan faqat KIRIM summasini ajratadi. Tiyin 00 bo'lmasa — qabul qilinmaydi. */
export const parseBankMessage = (text: string): BankPayment | null => {
  if (!INCOMING.test(text) || OUTGOING.test(text)) return null;
  // Birinchi summa — operatsiya; keyingisi odatda "qoldiq".
  const m = AMOUNT.exec(text);
  if (!m?.[1] || (m[2] && m[2] !== '00')) return null;
  const amount = Number(m[1].replace(/\D/g, ''));
  if (!Number.isSafeInteger(amount) || amount < 1000 || amount > 100_000_000) return null;
  return { amount, id: `msg:${sha256(text.replace(/\s+/g, ' ').trim()).slice(0, 40)}` };
};
