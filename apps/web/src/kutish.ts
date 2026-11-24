import './ui/styles.css';
import './ui/kutish.css';

const API = import.meta.env.VITE_API_URL || location.origin;
const form = document.querySelector<HTMLFormElement>('#f');
const out = document.querySelector<HTMLElement>('#r');

const MESSAGES: Readonly<Record<string, string>> = {
  bad_format: "Nik noto'g'ri / Неверный ник", banned_word: 'Bu nik mumkin emas / Недопустимый ник', rate_limited: 'Juda tez-tez / Слишком часто',
};

form?.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!out) return;
  const data = Object.fromEntries(new FormData(form)) as Record<string, string>;
  const button = form.querySelector('button');
  if (button) button.disabled = true;
  fetch(`${API}/waitlist`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ instagram: data.instagram, contact: data.contact || undefined }) })
    .then(async (res) => {
      const body = (await res.json()) as { error?: string };
      out.textContent = res.ok ? "Yozildingiz! Ochilganda birinchilardan bo'lasiz. / Вы записаны!" : MESSAGES[body.error ?? ''] ?? 'Xatolik / Ошибка';
      if (res.ok) form.reset();
    })
    .catch(() => { out.textContent = 'Internet bilan muammo / Проблема с интернетом'; })
    .finally(() => { if (button) button.disabled = false; });
});
