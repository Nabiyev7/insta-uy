/* 14-qadam (1): "sinov rejimi" o'rniga — egasi-admin (rol + ADMIN_TELEGRAM_ID) uchun doimiy huquqlar, tugmasiz.
   Admin olgan narsalar haqiqiy (`is_test` endi qo'yilmaydi, ustun qoladi); xaridlari daromadga kirmaydi (`is_admin`). */
set check_function_bodies = off;

-- ---------- Egasi-admin: hamma tekshiruvlar shu orqali ----------
create function private.is_owner_admin(p public.profiles) returns boolean language sql stable security definer set search_path = '' as $$ select private.is_owner(p) $$;
create function private.is_owner_admin_uid(uid uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select private.is_owner(p) from public.profiles p where p.user_id = uid), false)
$$;
/* Eski nomlar (ko'p funksiya ichida) — endi faqat yangisiga yo'naltiradi; `test_mode` ustuni hisobga olinmaydi. */
create or replace function private.is_tester(p public.profiles) returns boolean language sql stable security definer set search_path = '' as $$ select private.is_owner_admin(p) $$;
create or replace function private.is_tester_uid(uid uuid) returns boolean language sql stable security definer set search_path = '' as $$ select private.is_owner_admin_uid(uid) $$;
revoke all on function private.is_owner_admin(public.profiles) from public, anon, authenticated;
revoke all on function private.is_owner_admin_uid(uuid) from public, anon, authenticated;

-- ---------- `is_test` belgisi endi qo'yilmaydi ----------
drop trigger plot_state_test on public.plot_state;
drop trigger owned_decor_test on public.owned_decor;
drop trigger orders_test on public.orders;
update public.profiles set test_mode = false where test_mode;
alter table public.profiles alter column test_mode set default false;

-- ---------- Admin xaridi: daromadga kirmaydi ----------
alter table public.orders add column is_admin boolean not null default false;
alter table public.payments add column is_admin boolean not null default false;
drop index public.orders_pay_amount;
create unique index orders_pay_amount on public.orders (pay_amount) where status = 'pending' and provider not in ('stars','test','admin');

create function private.admin_purchase(me public.profiles, p_kind text, p_payload jsonb) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_amount int; o public.orders; v_pay bigint;
begin
  if me.user_id is null or not private.is_owner_admin(me) then perform private.fail('forbidden'); end if;
  if p_kind not in ('coins','plot','decor','salute','tier','label','expansion') then perform private.fail('bad_format'); end if;
  v_amount := private.quote(me, p_kind, p_payload);
  insert into public.orders (user_id, kind, payload, amount, pay_amount, provider, expires_at, is_admin)
    values (me.user_id, p_kind, p_payload, v_amount, v_amount, 'admin', now() + interval '5 minutes', true) returning * into o;
  insert into public.payments (provider, external_id, amount, order_id, status, is_admin) values ('admin', o.id::text, v_amount, o.id, 'unmatched', true) returning id into v_pay;
  return jsonb_build_object('result', private.settle(o.id, v_pay), 'order', o.id);
end $$;
revoke all on function private.admin_purchase(public.profiles, text, jsonb) from public, anon, authenticated;
/* Saytdan (admin "Olish"). */
create function public.my_admin_purchase(p_kind text, p_payload jsonb) returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  return private.admin_purchase(private.me(), p_kind, p_payload);
end $$;
/* Botdan (premium kartasidagi "Olish"). */
create function public.svc_admin_purchase(p_telegram bigint, p_kind text, p_payload jsonb) returns jsonb language plpgsql security definer set search_path = '' as $$
declare me public.profiles;
begin
  select * into me from public.profiles where telegram_id = p_telegram;
  return private.admin_purchase(me, p_kind, p_payload);
end $$;
create function public.svc_is_owner_admin_tg(p_telegram bigint) returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select private.is_owner_admin(p) from public.profiles p where p.telegram_id = p_telegram), false)
$$;
/* Uyni istalgan levelga darhol. */
create function public.my_admin_tier(p_plot text, p_tier int) returns void language plpgsql security definer set search_path = '' as $$
declare st public.plot_state := private.own_plot(p_plot);
begin
  if not private.is_owner_admin(private.me()) then perform private.fail('forbidden'); end if;
  if p_tier not between 1 and private.max_tier() then perform private.fail('bad_format'); end if;
  update public.plot_state set tier = p_tier where plot_id = st.plot_id;
end $$;

-- Eski "sinov" funksiyalari olib tashlanadi.
drop function public.my_test_mode(boolean);
drop function public.my_test_tier(text, int);
drop function public.my_test_purchase(text, jsonb);
drop function public.svc_test_purchase(bigint, text, jsonb);
drop function public.svc_is_tester_tg(bigint);
drop function public.admin_test_cleanup();

-- ---------- Daromad: admin xaridlari kirmaydi ----------
alter function public.admin_stats() set schema private;
alter function private.admin_stats() rename to admin_stats_base;
revoke all on function private.admin_stats_base() from public, anon, authenticated;
create function public.admin_stats() returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare j jsonb := private.admin_stats_base();
begin
  if j ->> 'revenue' is null then return j; end if;
  return j || jsonb_build_object('revenue', (select coalesce(sum(amount), 0) from public.orders where status = 'paid' and not is_test and not is_admin));
end $$;
alter function public.svc_bot_stat(bigint) set schema private;
alter function private.svc_bot_stat(bigint) rename to bot_stat_v2;
revoke all on function private.bot_stat_v2(bigint) from public, anon, authenticated;
create function public.svc_bot_stat(p_telegram bigint) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare j jsonb := private.bot_stat_v2(p_telegram);
  today timestamptz := (now() at time zone 'Asia/Tashkent')::date::timestamp at time zone 'Asia/Tashkent'; week timestamptz := today - interval '6 days';
begin
  if j -> 'revenue' is null or jsonb_typeof(j -> 'revenue') = 'null' then return j; end if;
  return j || jsonb_build_object('revenue', jsonb_build_array(
    (select coalesce(sum(amount), 0) from public.orders where status = 'paid' and not is_test and not is_admin and paid_at >= today),
    (select coalesce(sum(amount), 0) from public.orders where status = 'paid' and not is_test and not is_admin and paid_at >= week)));
end $$;

-- ---------- Profil: `test_mode` yo'q; `owner` — admin huquqlari ----------
create or replace function public.my_profile() returns jsonb language plpgsql security definer set search_path = '' as $$
declare j jsonb := private.profile_base(); p public.profiles := private.me();
begin
  return (j - 'test_mode') || jsonb_build_object('owner', private.is_owner(p), 'role', case when private.is_owner(p) then 'admin' else 'user' end, 'perms', '[]'::jsonb);
end $$;

-- ---------- Bepul uy: admin ham bitta, oddiy yo'l bilan (yopiq tuman va turlar unga ochiq) ----------
create or replace function public.my_claim(p_plot text, p_instagram text default null, p_bio text default '') returns jsonb language plpgsql security definer set search_path = '' as $$
declare me public.profiles := private.writable(); pl public.plots; nick text; st public.plot_state; is_admin boolean := private.is_owner_admin(me);
begin
  perform private.rate('claim:' || me.user_id, 10, 3600);
  if not private.flag('free_claim_enabled') and not is_admin then perform private.fail('free_closed'); end if;
  select * into me from public.profiles where user_id = me.user_id for update;
  if me.free_used then perform private.fail('free_used'); end if;
  nick := coalesce(me.instagram, private.clean_instagram(p_instagram));
  select * into pl from public.plots where id = p_plot;
  if pl.id is null then perform private.fail('not_found'); end if;
  if not is_admin then
    if pl.type = 'kvartira' then perform private.fail('apartments_closed'); end if;
    if pl.type <> 'hovli' then perform private.fail('paid_only'); end if;
    if not (select is_open from public.districts where id = pl.district_id) then perform private.fail('district_closed'); end if;
  end if;
  if coalesce(p_bio, '') ~* '(https?://|www\.|t\.me/)' then perform private.fail('bad_format'); end if;
  if private.nick_taken(me.user_id, nick) or (me.instagram is null and exists (select 1 from public.profiles where lower(instagram) = nick)) then perform private.fail('nick_taken'); end if;
  select * into st from public.plot_state where plot_id = p_plot for update;
  if st.plot_id is not null and (st.status <> 'reserved' or st.reserved_until > now()) then perform private.fail('not_free'); end if;
  delete from public.plot_state where plot_id = p_plot and status = 'reserved' and reserved_until <= now();
  insert into public.plot_state (plot_id, status, owner, instagram, bio, is_free) values (p_plot, 'owned', me.user_id, nick, private.clean_text(p_bio, 120, true), true)
    on conflict (plot_id) do nothing;
  if not found then perform private.fail('not_free'); end if;
  update public.profiles set free_used = true, instagram = coalesce(instagram, nick) where user_id = me.user_id;
  perform private.found_city(me.user_id);
  insert into public.ownership_log (plot_id, to_user, reason) values (p_plot, me.user_id, 'free');
  perform private.pay_referral(me.user_id);
  return jsonb_build_object('status', 'owned', 'address', private.address(p_plot));
end $$;

-- ---------- Admin: qo'shimcha uy berish (admin panel → Uylar → "Uy berish" yoki saytda "Admin: shu yerga uy qo'yish") ----------
/* Nik bo'yicha akkaunt topilsa — unga; topilmasa — adminning o'ziga shu nik bilan. Asoschilar hisobiga kirmaydi. */
create function public.admin_give_house(p_plot text, p_nick text default null, p_tier int default 1) returns jsonb language plpgsql security definer set search_path = '' as $$
declare me public.profiles := private.require('plots'); nick text; v_uid uuid; st public.plot_state;
begin
  if not private.is_owner_admin(me) then perform private.fail('forbidden'); end if;
  if not exists (select 1 from public.plots where id = p_plot) then perform private.fail('not_found'); end if;
  if coalesce(p_tier, 0) not between 1 and private.max_tier() then perform private.fail('bad_format'); end if;
  nick := coalesce(private.clean_instagram(nullif(btrim(coalesce(p_nick, '')), '')), me.instagram);
  if nick is null then perform private.fail('bad_format'); end if;
  select user_id into v_uid from public.profiles where lower(instagram) = nick or login = nick order by (lower(instagram) = nick) desc limit 1;
  v_uid := coalesce(v_uid, me.user_id);
  select * into st from public.plot_state where plot_id = p_plot for update;
  if st.plot_id is not null and (st.status <> 'reserved' or st.reserved_until > now()) then perform private.fail('not_free'); end if;
  delete from public.plot_state where plot_id = p_plot and status = 'reserved' and reserved_until <= now();
  insert into public.plot_state (plot_id, status, owner, instagram, tier, is_free) values (p_plot, 'owned', v_uid, nick, p_tier, false) on conflict (plot_id) do nothing;
  if not found then perform private.fail('not_free'); end if;
  insert into public.ownership_log (plot_id, to_user, reason) values (p_plot, v_uid, 'admin');
  perform private.audit('plot:give', jsonb_build_object('plot', p_plot, 'nick', nick, 'tier', p_tier));
  return jsonb_build_object('status', 'owned', 'address', private.address(p_plot), 'nick', nick);
end $$;

select private.apply_grants();
