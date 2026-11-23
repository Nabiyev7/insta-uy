/* 10 level: eski 5 daraja 1, 3, 5, 7, 9 ga ko'chadi, oralariga yangi uylar qo'shildi. */
set check_function_bodies = off;

alter table public.plot_state drop constraint plot_state_tier_check;
update public.plot_state set tier = tier * 2 - 1;
alter table public.plot_state add constraint plot_state_tier_check check (tier between 1 and 10);
update public.orders set payload = jsonb_set(payload, '{tier}', to_jsonb((payload ->> 'tier')::int * 2 - 1)) where kind = 'tier' and status = 'pending';
update public.settings set value = jsonb_set(value, '{tierUp}', '{"2":15000,"3":25000,"4":30000,"5":40000,"6":60000,"7":90000,"8":130000,"9":200000,"10":300000}') where key = 'prices';
update public.settings set value = value || '{"tierBase":250,"maxTier":5}' where key = 'coins';

create or replace function private.quote(me public.profiles, p_kind text, p jsonb) returns int language plpgsql security definer set search_path = '' as $$
declare st public.plot_state; pl public.plots; c public.decor_catalog; v int; s public.streets; off numeric := 1 - private.num('discount_pct', 0) / 100;
begin
  if p_kind = 'plot' then
    select * into pl from public.plots where id = p ->> 'plot';
    if pl.id is null then perform private.fail('not_found'); end if;
    if not (select is_open from public.districts where id = pl.district_id) then perform private.fail('district_closed'); end if;
    if exists (select 1 from public.plot_state where plot_id = pl.id and (status <> 'reserved' or reserved_until > now())) then perform private.fail('not_free'); end if;
    if private.nick_taken(me.user_id, private.clean_instagram(p ->> 'instagram')) then perform private.fail('nick_taken'); end if;
    return private.plot_price(pl.id);
  elsif p_kind = 'commerce' then
    if not exists (select 1 from public.commerce where id = p ->> 'id') then perform private.fail('not_found'); end if;
    if exists (select 1 from public.commerce_state where commerce_id = p ->> 'id' and (until is null or until > now())) then perform private.fail('not_free'); end if;
    return (private.num('prices.commerce.' || (select type from public.commerce where id = p ->> 'id'), 100000) * off)::int;
  elsif p_kind = 'decor' then
    select * into c from public.decor_catalog where id = p ->> 'id' and is_active;
    if c.id is null then perform private.fail('not_found'); end if;
    if c.stock is not null and c.sold + (select count(*) from public.orders where kind = 'decor' and status = 'pending' and expires_at > now() and payload ->> 'id' = c.id) >= c.stock then perform private.fail('sold_out'); end if;
    return greatest(1, (c.price_uzs * off)::int);
  elsif p_kind = 'street_name' then
    select * into s from public.streets where id = (p ->> 'street')::int;
    if s.id is null or not s.is_central then perform private.fail('not_found'); end if;
    if s.name_status = 'paid' or s.pending_name is not null then perform private.fail('not_free'); end if;
    perform private.clean_street(p ->> 'name');
    return (private.num('prices.streetName', 200000) * off)::int;
  end if;
  select * into st from public.plot_state where plot_id = p ->> 'plot' and owner = me.user_id and status = 'owned';
  if st.plot_id is null then perform private.fail('not_owner'); end if;
  if p_kind = 'tier' then
    v := (p ->> 'tier')::int;
    if (select type from public.plots where id = st.plot_id) = 'kvartira' then perform private.fail('no_yard'); end if;
    if v is null or v <= st.tier or v > 10 then perform private.fail('bad_format'); end if;
    return (select sum(private.num('prices.tierUp.' || g, 50000) * off)::int from generate_series(st.tier + 1, v) g);
  elsif p_kind = 'expansion' then
    if st.has_expansion or not exists (select 1 from public.expansions where plot_id = st.plot_id) then perform private.fail('not_free'); end if;
    return (private.num('prices.expansion', 80000) * off)::int;
  elsif p_kind = 'label' then
    if coalesce(p ->> 'label', '') not in ('silver','gold') or st.label = 'gold' or st.label = p ->> 'label' then perform private.fail('bad_format'); end if;
    return (private.label_price(p ->> 'label') * off)::int;
  end if;
  perform private.fail('bad_format');
end $$;

create or replace function private.fulfil(o public.orders) returns void language plpgsql security definer set search_path = '' as $$
declare pl public.plots; st public.plot_state; v int; nick text;
begin
  case o.kind
  when 'plot' then
    select * into pl from public.plots where id = o.payload ->> 'plot';
    select * into st from public.plot_state where plot_id = pl.id for update;
    if st.plot_id is not null and not (st.status = 'reserved' and (st.reserved_order = o.id or st.reserved_until < now())) then perform private.fail('not_free'); end if;
    delete from public.plot_state where plot_id = pl.id;
    -- To'lov kelguncha nik band bo'lib qolsa, uy baribir beriladi — niksiz (egasi keyin yozadi).
    nick := private.clean_instagram(o.payload ->> 'instagram');
    if private.nick_taken(o.user_id, nick) then nick := null; end if;
    insert into public.plot_state (plot_id, status, owner, instagram, tier) values
      (pl.id, case when nick is null then 'owned' else private.nick_status(o.user_id, nick) end, o.user_id, nick, case pl.type when 'qasr' then 9 when 'villa' then 7 else 1 end);
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

create or replace function public.my_tier_coins(p_plot text) returns int language plpgsql security definer set search_path = '' as $$
declare st public.plot_state := private.own_plot(p_plot); bal int;
begin
  if not private.flag('coins_enabled') then perform private.fail('coins_off'); end if;
  if (select type from public.plots where id = p_plot) = 'kvartira' then perform private.fail('no_yard'); end if;
  if st.tier >= private.num('coins.maxTier', 5) then perform private.fail('max_tier'); end if;
  bal := private.coins(st.owner, -(private.num('coins.tierBase', 250) * st.tier)::int, 'tier:' || p_plot);
  update public.plot_state set tier = tier + 1 where plot_id = p_plot;
  return bal;
end $$;

create or replace function public.api_rankings() returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'houses', (select coalesce(jsonb_agg(h), '[]') from (
      select s.plot_id as plot, s.instagram, s.tier, (s.tier * 50 + case s.label when 'gold' then 60 when 'silver' then 25 else 0 end
        + coalesce((select sum(c.price_uzs) from unnest(s.decor) x join public.decor_catalog c on c.id = x), 0) / 1000)::int as score
      from public.plot_state s where s.status = 'owned' order by score desc, s.claimed_at limit 20) h),
    'districts', (select coalesce(jsonb_agg(q), '[]') from (
      select district_id as id, count(*)::int as active from public.daily_active where day > current_date - 7 and district_id > 0 group by 1 order by 2 desc limit 12) q),
    'inviters', (select coalesce(jsonb_agg(q), '[]') from (
      select private.public_nick(r) as nick, count(*)::int as n from public.profiles p join public.profiles r on r.user_id = p.referred_by where p.referral_paid group by r.user_id, 1 order by 2 desc limit 10) q))
$$;

create or replace function public.admin_plot(p_plot text, p_action text, p_data jsonb default '{}') returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid; st public.plot_state; me public.profiles := private.require('plots');
begin
  -- Mulkni boshqaga o'tkazish faqat adminda.
  if p_action = 'assign' and me.role <> 'admin' then perform private.fail('forbidden'); end if;
  if not exists (select 1 from public.plots where id = p_plot) then perform private.fail('not_found'); end if;
  select * into st from public.plot_state where plot_id = p_plot for update;
  case p_action
  when 'approve' then
    update public.plot_state set status = 'owned' where plot_id = p_plot and status = 'pending';
    if found then
      perform private.pay_referral(st.owner);
      perform private.notify(st.owner, 'approved', jsonb_build_object('plot', p_plot));
    end if;
  when 'reject' then
    if st.status is distinct from 'pending' then perform private.fail('bad_format'); end if;
    -- Pullik yoki sovg'a uy bo'shatilmaydi: faqat nik o'chadi.
    if st.is_free then perform private.release_plot(p_plot, 'rejected');
    else
      update public.plot_state set status = 'owned', instagram = null where plot_id = p_plot;
      perform private.notify(st.owner, 'nick_rejected', jsonb_build_object('plot', p_plot));
    end if;
  when 'release' then perform private.release_plot(p_plot, 'admin');
  when 'assign' then
    select user_id into v_uid from public.profiles where login = lower(btrim(p_data ->> 'login', ' @'));
    if v_uid is null then perform private.fail('user_not_found'); end if;
    if st.status = 'reserved' and st.reserved_until > now() then perform private.fail('not_free'); end if;
    insert into public.plot_state (plot_id, status, owner, instagram, tier) values (p_plot, 'owned', v_uid, private.clean_instagram(p_data ->> 'instagram'),
        (select case type when 'qasr' then 9 when 'villa' then 7 else 1 end from public.plots where id = p_plot))
      on conflict (plot_id) do update set owner = excluded.owner, instagram = excluded.instagram, status = 'owned', is_free = false, decor = '{}', bio = '', reserved_until = null, reserved_order = null;
    update public.transfers set status = 'cancelled' where plot_id = p_plot and status = 'pending';
    insert into public.ownership_log (plot_id, from_user, to_user, reason) values (p_plot, st.owner, v_uid, 'admin');
    perform private.notify(v_uid, 'approved', jsonb_build_object('plot', p_plot));
  when 'clear_bio' then update public.plot_state set bio = '' where plot_id = p_plot;
  else perform private.fail('bad_format');
  end case;
  perform private.audit('plot:' || p_action, p_data || jsonb_build_object('plot', p_plot));
end $$;

select private.apply_grants();
