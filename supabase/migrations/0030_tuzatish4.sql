/* Tuzatish 4 (6f): tanga yuborish va xazina ovi o'chirildi (kod qoladi, bayroqchalar ortida); premium xaridi botda. */
set check_function_bodies = off;

-- ---------- 1. Tanga o'tkazish — `coins_transfer_enabled` (sukut false); admin sinov rejimida ham o'chiq ----------
insert into public.settings (key, value, is_public) values ('coins_transfer_enabled', 'false', true) on conflict (key) do nothing;
alter function public.my_send_coins(text, int) set schema private;
alter function private.my_send_coins(text, int) rename to send_coins_base;
create function public.my_send_coins(p_to text, p_amount int) returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not private.flag('coins_transfer_enabled') then perform private.fail('forbidden'); end if;
  return private.send_coins_base(p_to, p_amount);
end $$;

-- ---------- 5. Xazina ovi — vaqtincha o'chiq (`treasure_enabled`, sukut false); kod qoladi ----------
insert into public.settings (key, value, is_public) values ('treasure_enabled', 'false', true) on conflict (key) do nothing;
alter function public.my_treasure(numeric, numeric) set schema private;
alter function private.my_treasure(numeric, numeric) rename to treasure_base;
create function public.my_treasure(p_x numeric, p_z numeric) returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not private.flag('treasure_enabled') then perform private.fail('forbidden'); end if;
  return private.treasure_base(p_x, p_z);
end $$;

-- ---------- 3. Premium xaridi botda: admin sinov rejimida botda "Sinov xaridi" ----------
create function public.svc_is_tester_tg(p_telegram bigint) returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select private.is_tester(p) from public.profiles p where p.telegram_id = p_telegram), false)
$$;
create function public.svc_test_purchase(p_telegram bigint, p_kind text, p_payload jsonb) returns jsonb language plpgsql security definer set search_path = '' as $$
declare me public.profiles; v_amount int; o public.orders; v_pay bigint;
begin
  select * into me from public.profiles where telegram_id = p_telegram;
  if me.user_id is null or not private.is_tester(me) then perform private.fail('forbidden'); end if;
  if p_kind not in ('coins','plot','decor','salute','tier') then perform private.fail('bad_format'); end if;
  v_amount := private.quote(me, p_kind, p_payload);
  insert into public.orders (user_id, kind, payload, amount, pay_amount, provider, expires_at, is_test)
    values (me.user_id, p_kind, p_payload, v_amount, v_amount, 'test', now() + interval '5 minutes', true) returning * into o;
  insert into public.payments (provider, external_id, amount, order_id, status, is_test) values ('test', o.id::text, v_amount, o.id, 'unmatched', true) returning id into v_pay;
  return jsonb_build_object('result', private.settle(o.id, v_pay), 'order', o.id);
end $$;

-- `set schema private` eski EXECUTE ruxsatini saqlaydi: private sxemasi ochiq bo'lmasa ham, qo'shimcha tozalash.
revoke all on function private.send_coins_base(text, int) from anon, authenticated;
revoke all on function private.treasure_base(numeric, numeric) from anon, authenticated;
revoke all on function private.buy_decor_coins_base(text) from anon, authenticated;
revoke all on function private.buy_set_coins_base(text) from anon, authenticated;
revoke all on function private.decor_save_base(jsonb) from anon, authenticated;
revoke all on function private.profile_base() from anon, authenticated;
revoke all on function private.boot_base() from anon, authenticated;

select private.apply_grants();
