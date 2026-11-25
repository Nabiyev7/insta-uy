/* 6-qadam, A: uy leveli 1–5 (6–10 keyin), kuchaytirish narxlari, lyuks 5-leveldan; uy va avatar ranglarini tanlash, shikoyat va nik tasdig'i olib tashlandi. */
set check_function_bodies = off;

-- ---------- Level 1–5 ----------
/* Eng yuqori level: kodda MAX_TIER (packages/shared/src/catalog.ts), bu yerda private.max_tier() — ikkalasi test bilan solishtiriladi. */
create function private.max_tier() returns int language sql immutable as $$ select 5 $$;
alter table public.plot_state drop constraint plot_state_tier_check;
update public.plot_state set tier = least(tier, private.max_tier());
alter table public.plot_state add constraint plot_state_tier_check check (tier between 1 and 5);
update public.orders set status = 'cancelled' where kind = 'tier' and status = 'pending' and (payload ->> 'tier')::int > 5;
update public.decor_catalog set min_level = least(min_level, private.max_tier());
/* Admin yuqoriroq level yozsa ham — eng yuqori levelda ochiladi. */
create function private.clamp_min_level() returns trigger language plpgsql set search_path = '' as $$
begin
  new.min_level := greatest(1, least(new.min_level, private.max_tier()));
  return new;
end $$;
create trigger decor_catalog_min_level before insert or update of min_level on public.decor_catalog for each row execute function private.clamp_min_level();
update public.decor_anchors set min_level = least(min_level, private.max_tier());
/* Hovli bezaklari joyi (nik lavhasisiz): 5-levelda hamma 16 nuqta. */
update public.settings set value = '[0,0,0,0,16]' where key = 'decor_slots';
create or replace function private.decor_slots(p_tier int) returns int language sql stable set search_path = '' as $$
  select least(20, coalesce((select v::int from (select private.setting('decor_slots') ->> (greatest(1, least(private.max_tier(), p_tier)) - 1) as v) x where v ~ '^[0-9]{1,3}$'), 0))
$$;

-- ---------- Kuchaytirish (tanga): 2 — 300, 3 — 1 000, 4 — 2 000, 5 — 3 500 (docs/chat/TANGA-NARXLAR.md) ----------
update public.settings set value = (value - 'tierBase') || '{"maxTier":5,"tier":{"2":300,"3":1000,"4":2000,"5":3500}}' where key = 'coins';
update public.settings set value = jsonb_set(value, '{tierUp}', '{"2":15000,"3":25000,"4":30000,"5":40000}') where key = 'prices';
create function private.tier_price(p_next int) returns int language sql stable set search_path = '' as $$
  select private.num('coins.tier.' || p_next, case p_next when 2 then 300 when 3 then 1000 when 4 then 2000 else 3500 end)::int
$$;
create or replace function public.my_tier_coins(p_plot text) returns int language plpgsql security definer set search_path = '' as $$
declare st public.plot_state := private.own_plot(p_plot); bal int;
begin
  if not private.flag('coins_enabled') then perform private.fail('coins_off'); end if;
  if (select type from public.plots where id = p_plot) = 'kvartira' then perform private.fail('no_yard'); end if;
  if st.tier >= least(private.max_tier(), private.num('coins.maxTier', 5)) then perform private.fail('max_tier'); end if;
  bal := private.coins(st.owner, -private.tier_price(st.tier + 1), 'tier:' || p_plot);
  update public.plot_state set tier = tier + 1 where plot_id = p_plot;
  return bal;
end $$;
create or replace function private.quote(me public.profiles, p_kind text, p jsonb) returns int language plpgsql security definer set search_path = '' as $$
declare c public.decor_catalog;
begin
  if p_kind = 'commerce' and private.setting('commerce_closed') ? (p ->> 'id') then perform private.fail('not_for_sale'); end if;
  if p_kind = 'plot' and (select type from public.plots where id = p ->> 'plot') = 'kvartira' then perform private.fail('apartments_closed'); end if;
  if p_kind = 'tier' and coalesce((p ->> 'tier')::int, 0) > private.max_tier() then perform private.fail('bad_format'); end if;
  if p_kind = 'decor' then
    select * into c from public.decor_catalog where id = p ->> 'id';
    perform private.check_decor_sale(me.user_id, c);
  end if;
  return private.quote_base(me, p_kind, p);
end $$;

-- ---------- Nik tasdig'i yo'q: uy darhol tayyor ----------
delete from public.settings where key = 'require_approval';
create or replace function private.nick_status(uid uuid, nick text) returns text language sql stable set search_path = '' as $$ select 'owned' $$;
update public.plot_state set status = 'owned' where status = 'pending';

-- ---------- Uy ranglari: har level o'z standart rangida ----------
update public.plot_state set wall = 0, roof = 0, wall_material = 0, frame = 0, door = 0;
drop function public.my_edit_house(text, text, int, int, int, int, int);
create function public.my_edit_bio(p_plot text, p_bio text) returns void language plpgsql security definer set search_path = '' as $$
declare st public.plot_state := private.own_plot(p_plot);
begin
  perform private.rate('edit:' || st.owner, 30, 3600);
  if coalesce(p_bio, '') ~* '(https?://|www\.|t\.me/)' then perform private.fail('bad_format'); end if;
  update public.plot_state set bio = private.clean_text(p_bio, 120, true) where plot_id = p_plot;
end $$;

-- ---------- Avatar: faqat bosh kiyim va libos; ranglar odamga qarab o'zgarmas ----------
create function private.avatar_of(uid uuid, p jsonb) returns jsonb language sql immutable set search_path = '' as $$
  select jsonb_build_object(
    'skin', (array['#f1c9a5','#e0ac7e','#c58c5c','#8d5a3a'])[1 + abs(pg_catalog.hashtext(uid::text || 's')) % 4],
    'hair', (array['#1d1512','#3b2417','#6b4423','#b8863b','#8a8a8a'])[1 + abs(pg_catalog.hashtext(uid::text || 'h')) % 5],
    'top', (array['#1f6f8b','#b5452f','#3f7d4e','#5a3e85','#222831','#e0b84f','#f0f0f0'])[1 + abs(pg_catalog.hashtext(uid::text || 't')) % 7],
    'pants', (array['#26303c','#4a3b2f','#6b7280','#1c1c1c'])[1 + abs(pg_catalog.hashtext(uid::text || 'p')) % 4],
    'hat', case when p ->> 'hat' in ('none','doppi','kepka') then p ->> 'hat' else 'none' end,
    'outfit', case when p ->> 'outfit' in ('oddiy','chopon') then p ->> 'outfit' else 'oddiy' end)
$$;
create or replace function public.my_avatar(p_avatar jsonb) returns void language plpgsql security definer set search_path = '' as $$
declare me public.profiles := private.writable();
begin
  if pg_catalog.length(p_avatar::text) > 400 or jsonb_typeof(p_avatar) <> 'object' then perform private.fail('bad_format'); end if;
  update public.profiles set avatar = private.avatar_of(me.user_id, p_avatar) where user_id = me.user_id;
end $$;
update public.profiles set avatar = private.avatar_of(user_id, avatar);

-- ---------- Shikoyat yo'q: so'z filtri, havola taqiqi, bloklash va xabarni o'chirish qoladi ----------
drop function public.my_report(text, text, text);
drop function public.svc_chat_report(uuid, uuid, text);
drop function public.admin_report(bigint, text, text);
create or replace function public.admin_queue() returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare p public.profiles := private.me();
begin
  if p.role = 'user' then perform private.fail('forbidden'); end if;
  return jsonb_build_object(
    'streets', case when p.role = 'admin' or 'streets' = any (p.perms) then (select coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'old', s.name, 'name', s.pending_name, 'kind', s.pending_kind, 'by', f.login)), '[]') from public.streets s left join public.profiles f on f.user_id = s.pending_by where s.pending_name is not null) end,
    'ads', case when p.role = 'admin' or 'ads' = any (p.perms) then (select coalesce(jsonb_agg(jsonb_build_object('id', c.commerce_id, 'title', c.title, 'image', c.image, 'link', c.link, 'by', f.login)), '[]') from public.commerce_state c left join public.profiles f on f.user_id = c.owner where c.status = 'review') end);
end $$;
create or replace function public.admin_stats() returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if (private.me()).role = 'user' then perform private.fail('forbidden'); end if;
  return jsonb_build_object(
    'users', (select count(*) from public.profiles), 'owned', (select count(*) from public.plot_state where status = 'owned'),
    'streets', (select count(*) from public.streets where pending_name is not null), 'ads', (select count(*) from public.commerce_state where status = 'review'),
    'waitlist', (select count(*) from public.waitlist), 'telegram', (select count(*) from public.profiles where telegram_id is not null),
    'revenue', case when (private.me()).role = 'admin' then (select coalesce(sum(amount), 0) from public.orders where status = 'paid') end,
    'days', (select jsonb_agg(jsonb_build_object('day', d::date, 'active', (select count(distinct user_id) from public.daily_active a where a.day = d::date),
       'signups', (select count(*) from public.profiles where created_at::date = d::date), 'claims', (select count(*) from public.plot_state where claimed_at::date = d::date and status <> 'reserved')) order by d)
       from generate_series(current_date - 13, current_date, interval '1 day') d),
    'districts', (select jsonb_agg(jsonb_build_object('id', d.id, 'name', d.name_uz, 'open', d.is_open, 'total', (select count(*) from public.plots where district_id = d.id),
       'taken', (select count(*) from public.plot_state s join public.plots p on p.id = s.plot_id where p.district_id = d.id and s.status <> 'reserved')) order by d.id) from public.districts d));
end $$;

-- ---------- Admin: uy (tasdiq/rad yo'q; berilgan uy 1-level) ----------
create or replace function public.admin_plot(p_plot text, p_action text, p_data jsonb default '{}') returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid; st public.plot_state; me public.profiles := private.require('plots');
begin
  -- Mulkni boshqaga o'tkazish faqat adminda.
  if p_action in ('assign', 'tier') and me.role <> 'admin' then perform private.fail('forbidden'); end if;
  if not exists (select 1 from public.plots where id = p_plot) then perform private.fail('not_found'); end if;
  select * into st from public.plot_state where plot_id = p_plot for update;
  case p_action
  when 'release' then perform private.release_plot(p_plot, 'admin');
  when 'assign' then
    select user_id into v_uid from public.profiles where login = lower(btrim(p_data ->> 'login', ' @'));
    if v_uid is null then perform private.fail('user_not_found'); end if;
    if st.status = 'reserved' and st.reserved_until > now() then perform private.fail('not_free'); end if;
    insert into public.plot_state (plot_id, status, owner, instagram, tier) values (p_plot, 'owned', v_uid, private.clean_instagram(p_data ->> 'instagram'), 1)
      on conflict (plot_id) do update set owner = excluded.owner, instagram = excluded.instagram, status = 'owned', is_free = false, decor = '{}', bio = '', reserved_until = null, reserved_order = null;
    update public.transfers set status = 'cancelled' where plot_id = p_plot and status = 'pending';
    insert into public.ownership_log (plot_id, from_user, to_user, reason) values (p_plot, st.owner, v_uid, 'admin');
  when 'tier' then
    if st.plot_id is null or coalesce((p_data ->> 'tier')::int, 0) not between 1 and private.max_tier() then perform private.fail('bad_format'); end if;
    update public.plot_state set tier = (p_data ->> 'tier')::int where plot_id = p_plot;
  when 'clear_bio' then update public.plot_state set bio = '' where plot_id = p_plot;
  else perform private.fail('bad_format');
  end case;
  perform private.audit('plot:' || p_action, p_data || jsonb_build_object('plot', p_plot));
end $$;

/* Pulga olingan uchastka darhol egali (nik tasdig'i yo'q). Level — buyurtmadagi, bo'lmasa 1. */
create or replace function private.fulfil(o public.orders) returns void language plpgsql security definer set search_path = '' as $$
declare pl public.plots; st public.plot_state; v int; nick text;
begin
  case o.kind
  when 'plot' then
    select * into pl from public.plots where id = o.payload ->> 'plot';
    select * into st from public.plot_state where plot_id = pl.id for update;
    if st.plot_id is not null and not (st.status = 'reserved' and (st.reserved_order = o.id or st.reserved_until < now())) then perform private.fail('not_free'); end if;
    delete from public.plot_state where plot_id = pl.id;
    nick := coalesce((select instagram from public.profiles where user_id = o.user_id), private.clean_instagram(o.payload ->> 'instagram'));
    if nick is not null and private.nick_taken(o.user_id, nick) then nick := null; end if;
    insert into public.plot_state (plot_id, status, owner, instagram, tier) values
      (pl.id, 'owned', o.user_id, nick, greatest(1, least(private.max_tier(), coalesce((o.payload ->> 'tier')::int, 1))));
    insert into public.ownership_log (plot_id, to_user, reason) values (pl.id, o.user_id, 'paid');
    perform private.give_badge(o.user_id, 'investor');
  when 'tier' then
    v := (o.payload ->> 'tier')::int;
    update public.plot_state set tier = v where plot_id = o.payload ->> 'plot' and owner = o.user_id and tier < v;
    if not found then perform private.fail('not_owner'); end if;
  when 'decor' then perform private.grant_decor(o.user_id, o.payload ->> 'id');
  when 'expansion' then
    update public.plot_state set has_expansion = true where plot_id = o.payload ->> 'plot' and owner = o.user_id and not has_expansion;
    if not found then perform private.fail('not_owner'); end if;
  when 'label' then
    update public.plot_state set label = o.payload ->> 'label' where plot_id = o.payload ->> 'plot' and owner = o.user_id;
    if not found then perform private.fail('not_owner'); end if;
  when 'street_name' then
    update public.streets set pending_name = private.clean_street(o.payload ->> 'name'), pending_kind = 'paid', pending_by = o.user_id
      where id = (o.payload ->> 'street')::int and pending_name is null;
    if not found then perform private.fail('not_free'); end if;
  when 'commerce' then
    if exists (select 1 from public.commerce_state where commerce_id = o.payload ->> 'id' and (until is null or until > now())) then perform private.fail('not_free'); end if;
    delete from public.commerce_state where commerce_id = o.payload ->> 'id';
    insert into public.commerce_state (commerce_id, owner, status, until) values (o.payload ->> 'id', o.user_id, 'draft', now() + make_interval(days => private.num('commerce_days', 30)::int));
  end case;
  if (select sum(amount) from public.orders where user_id = o.user_id and status = 'paid') >= private.num('sponsor_threshold', 500000) then perform private.give_badge(o.user_id, 'homiy'); end if;
end $$;

/* Bepul uy: 1 kishiga 1 ta, faqat ochiq tumandagi hovli, darhol egali. Tom va devor — levelning standart rangi. */
create or replace function public.my_claim(p_plot text, p_instagram text, p_bio text default '') returns jsonb language plpgsql security definer set search_path = '' as $$
declare me public.profiles := private.writable(); pl public.plots; nick text := private.clean_instagram(p_instagram); st public.plot_state;
begin
  perform private.rate('claim:' || me.user_id, 10, 3600);
  if not private.flag('free_claim_enabled') then perform private.fail('free_closed'); end if;
  select * into me from public.profiles where user_id = me.user_id for update;
  if me.free_used then perform private.fail('free_used'); end if;
  select * into pl from public.plots where id = p_plot;
  if pl.id is null then perform private.fail('not_found'); end if;
  if pl.type = 'kvartira' then perform private.fail('apartments_closed'); end if;
  if pl.type <> 'hovli' then perform private.fail('paid_only'); end if;
  if not (select is_open from public.districts where id = pl.district_id) then perform private.fail('district_closed'); end if;
  if coalesce(p_bio, '') ~* '(https?://|www\.|t\.me/)' then perform private.fail('bad_format'); end if;
  if private.nick_taken(me.user_id, nick) or exists (select 1 from public.plot_state where lower(instagram) = nick and is_free and status <> 'reserved') then perform private.fail('nick_taken'); end if;
  select * into st from public.plot_state where plot_id = p_plot for update;
  if st.plot_id is not null and (st.status <> 'reserved' or st.reserved_until > now()) then perform private.fail('not_free'); end if;
  delete from public.plot_state where plot_id = p_plot and status = 'reserved' and reserved_until <= now();
  insert into public.plot_state (plot_id, status, owner, instagram, bio, is_free) values (p_plot, 'owned', me.user_id, nick, private.clean_text(p_bio, 120, true), true)
    on conflict (plot_id) do nothing;
  if not found then perform private.fail('not_free'); end if;
  update public.profiles set free_used = true, instagram = coalesce(instagram, nick) where user_id = me.user_id;
  if (select count(*) from public.profiles where 'asoschi' = any (badges)) < private.num('founder_limit', 100) then perform private.give_badge(me.user_id, 'asoschi'); end if;
  insert into public.ownership_log (plot_id, to_user, reason) values (p_plot, me.user_id, 'free');
  perform private.pay_referral(me.user_id);
  return jsonb_build_object('status', 'owned', 'address', private.address(p_plot));
end $$;

select private.apply_grants();
