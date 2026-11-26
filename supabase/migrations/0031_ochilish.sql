/* 13-qadam (ochilish): to'lov — faqat Telegram Stars, faqat botda; kichik paketlar olib tashlandi; ochilish uchun kuzatuv va manba. */
set check_function_bodies = off;

-- ---------- A. To'lov: faqat Stars (karta yo'li kodda qoladi, o'chiq) ----------
insert into public.settings (key, value, is_public) values ('payments_stars', 'true', true), ('payments_card', 'false', true)
  on conflict (key) do nothing;
update public.settings set value = 'true' where key = 'payments_enabled';
update public.settings set value = '"stars"' where key = 'payment_provider' and value = '"card"';
/* Kichik paketlar (500 va 1 200 tanga) olib tashlandi: qoladi 3 000 (60 ⭐), 7 000 (125 ⭐), 16 000 (250 ⭐). */
update public.settings set value = jsonb_set(value, '{packs}', '[
  {"coins": 2500, "bonus": 500, "uzs": 12000, "stars": 60},
  {"coins": 5500, "bonus": 1500, "uzs": 25000, "stars": 125, "tag": "popular"},
  {"coins": 12000, "bonus": 4000, "uzs": 50000, "stars": 250, "tag": "best"}
]'::jsonb) where key = 'premium';

/* Karta buyurtmasi (saytdan) — `payments_card` o'chiq bo'lsa rad. */
alter function public.my_order(text, jsonb) set schema private;
alter function private.my_order(text, jsonb) rename to order_base;
revoke all on function private.order_base(text, jsonb) from anon, authenticated;
create function public.my_order(p_kind text, p_payload jsonb) returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not private.flag('payments_card') then perform private.fail('card_off'); end if;
  return private.order_base(p_kind, p_payload);
end $$;
/* Stars buyurtmasi (bot) — `payments_stars` o'chiq bo'lsa rad. */
alter function public.svc_stars_order(bigint, text, jsonb) set schema private;
alter function private.svc_stars_order(bigint, text, jsonb) rename to stars_order_base;
revoke all on function private.stars_order_base(bigint, text, jsonb) from anon, authenticated;
create function public.svc_stars_order(p_telegram bigint, p_kind text, p_payload jsonb) returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not private.flag('payments_stars') then perform private.fail('payments_off'); end if;
  return private.stars_order_base(p_telegram, p_kind, p_payload);
end $$;

select private.apply_grants();
