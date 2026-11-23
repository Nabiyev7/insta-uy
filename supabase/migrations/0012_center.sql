/* Markazdagi 12 burchak minorasi hozircha faqat ko'rinish: sotilmaydi (joylari bazada qoladi). */
set check_function_bodies = off;

insert into public.settings (key, value, is_public) values
  ('commerce_closed', '["B101","B102","B103","B104","B105","B106","B107","B108","B109","B110","B111","B112"]', true);

/* Narx so'rashdan oldingi umumiy to'siq; qolgan qoidalar o'zgarmagan. */
alter function private.quote(public.profiles, text, jsonb) rename to quote_base;
create function private.quote(me public.profiles, p_kind text, p jsonb) returns int language plpgsql security definer set search_path = '' as $$
begin
  if p_kind = 'commerce' and private.setting('commerce_closed') ? (p ->> 'id') then perform private.fail('not_for_sale'); end if;
  return private.quote_base(me, p_kind, p);
end $$;
revoke all on function private.quote(public.profiles, text, jsonb), private.quote_base(public.profiles, text, jsonb) from public;

create or replace function public.api_commerce(p_id text) returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', c.id, 'type', c.type, 'price', (private.num('prices.commerce.' || c.type, 100000) * (1 - private.num('discount_pct', 0) / 100))::int,
    'free', (s.commerce_id is null or s.until < now()) and not coalesce(private.setting('commerce_closed') ? c.id, false),
    'title', case when s.status = 'live' then s.title end, 'link', case when s.status = 'live' then s.link end)
  from public.commerce c left join public.commerce_state s on s.commerce_id = c.id where c.id = p_id
$$;

select private.apply_grants();
