-- Admin panel (PLAN §6) va video navbati (§7).
set check_function_bodies = off;
create table public.map_versions (
  id int generated always as identity primary key, name text not null, status text not null default 'draft' check (status in ('draft','published','archived')),
  created_by uuid, created_at timestamptz not null default now(), published_at timestamptz
);
create unique index map_versions_published on public.map_versions ((true)) where status = 'published';
create table public.map_objects (
  id bigint generated always as identity primary key, version_id int not null references public.map_versions on delete cascade, model text not null,
  x numeric not null, z numeric not null, rot numeric not null default 0, scale numeric not null default 1 check (scale between 0.3 and 4)
);
create table public.video_jobs (
  id uuid primary key default gen_random_uuid(), kind text not null default 'houses' check (kind in ('houses','street','gazette')), plots text[] not null default '{}',
  style jsonb not null default '{}', status text not null default 'queued' check (status in ('queued','rendering','ready','failed','sent')), file text, error text,
  created_by uuid, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create function public.admin_me() returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare p public.profiles := private.me();
begin
  if p.role = 'user' then perform private.fail('forbidden'); end if;
  return jsonb_build_object('login', p.login, 'role', p.role, 'perms', p.perms);
end $$;

create function public.admin_stats() returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if (private.me()).role = 'user' then perform private.fail('forbidden'); end if;
  return jsonb_build_object(
    'users', (select count(*) from public.profiles), 'owned', (select count(*) from public.plot_state where status = 'owned'),
    'pending', (select count(*) from public.plot_state where status = 'pending'), 'reports', (select count(*) from public.reports where status = 'open'),
    'streets', (select count(*) from public.streets where pending_name is not null), 'ads', (select count(*) from public.commerce_state where status = 'review'),
    'waitlist', (select count(*) from public.waitlist), 'telegram', (select count(*) from public.profiles where telegram_id is not null),
    'revenue', case when (private.me()).role = 'admin' then (select coalesce(sum(amount), 0) from public.orders where status = 'paid') end,
    'days', (select jsonb_agg(jsonb_build_object('day', d::date, 'active', (select count(distinct user_id) from public.daily_active a where a.day = d::date),
       'signups', (select count(*) from public.profiles where created_at::date = d::date), 'claims', (select count(*) from public.plot_state where claimed_at::date = d::date and status <> 'reserved')) order by d)
       from generate_series(current_date - 13, current_date, interval '1 day') d),
    'districts', (select jsonb_agg(jsonb_build_object('id', d.id, 'name', d.name_uz, 'open', d.is_open, 'total', (select count(*) from public.plots where district_id = d.id),
       'taken', (select count(*) from public.plot_state s join public.plots p on p.id = s.plot_id where p.district_id = d.id and s.status <> 'reserved')) order by d.id) from public.districts d));
end $$;

-- ---------- Uylar ----------
create function public.admin_plots(p_q text default '', p_status text default '', p_offset int default 0) returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require('plots');
  return (select coalesce(jsonb_agg(q), '[]') from (
    select p.id, p.district_id as district, p.type, private.address(p.id) as address, coalesce(s.status, 'free') as status, s.instagram, s.bio, s.tier, s.label, s.is_free, s.claimed_at, pr.login
    from public.plots p left join public.plot_state s on s.plot_id = p.id left join public.profiles pr on pr.user_id = s.owner
    where (p_status = '' or coalesce(s.status, 'free') = p_status) and (p_q = '' or p.id ilike p_q || '%' or s.instagram ilike p_q || '%' or pr.login ilike p_q || '%')
    order by s.claimed_at desc nulls last, p.id offset greatest(p_offset, 0) limit 50) q);
end $$;
create function public.admin_plot(p_plot text, p_action text, p_data jsonb default '{}') returns void language plpgsql security definer set search_path = '' as $$
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
        (select case type when 'qasr' then 5 when 'villa' then 4 else 1 end from public.plots where id = p_plot))
      on conflict (plot_id) do update set owner = excluded.owner, instagram = excluded.instagram, status = 'owned', is_free = false, decor = '{}', bio = '', reserved_until = null, reserved_order = null;
    update public.transfers set status = 'cancelled' where plot_id = p_plot and status = 'pending';
    insert into public.ownership_log (plot_id, from_user, to_user, reason) values (p_plot, st.owner, v_uid, 'admin');
    perform private.notify(v_uid, 'approved', jsonb_build_object('plot', p_plot));
  when 'clear_bio' then update public.plot_state set bio = '' where plot_id = p_plot;
  else perform private.fail('bad_format');
  end case;
  perform private.audit('plot:' || p_action, p_data || jsonb_build_object('plot', p_plot));
end $$;
create function public.admin_district(p_id int, p_open boolean) returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.require('settings');
  -- Markazdan tashqariga (PLAN §2.3): oldingi tuman ochilmagan bo'lsa, ochib bo'lmaydi.
  if p_open and exists (select 1 from public.districts where id < p_id and not is_open) then perform private.fail('open_inner_first'); end if;
  if not p_open and exists (select 1 from public.plot_state s join public.plots p on p.id = s.plot_id where p.district_id = p_id) then perform private.fail('district_not_empty'); end if;
  update public.districts set is_open = p_open, opened_at = case when p_open then now() end where id = p_id;
  perform private.audit('district', jsonb_build_object('id', p_id, 'open', p_open));
end $$;
create function public.admin_district_name(p_id int, p_uz text, p_ru text) returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.require('settings');
  update public.districts set name_uz = private.clean_text(p_uz, 40, false), name_ru = private.clean_text(p_ru, 40, false) where id = p_id;
end $$;

create function public.admin_settings() returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require('settings');
  return (select jsonb_object_agg(key, value) from public.settings);
end $$;
create function public.admin_setting(p_key text, p_value jsonb) returns void language plpgsql security definer set search_path = '' as $$
declare old jsonb;
begin
  if (private.me()).role <> 'admin' then perform private.fail('forbidden'); end if;
  select value into old from public.settings where key = p_key;
  if old is null then perform private.fail('not_found'); end if;
  if jsonb_typeof(old) <> jsonb_typeof(p_value) then perform private.fail('bad_format'); end if;
  if p_key = 'discount_pct' and (p_value #>> '{}')::numeric not between 0 and 90 then perform private.fail('bad_format'); end if;
  update public.settings set value = p_value where key = p_key;
  perform private.audit('setting:' || p_key, jsonb_build_object('old', old, 'new', p_value));
end $$;
create function public.admin_catalog(p_id text default null, p_uzs int default null, p_coins int default null, p_stock int default null, p_active boolean default null) returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if (private.require('settings')).role <> 'admin' and p_id is not null then perform private.fail('forbidden'); end if;
  if p_id is not null then
    update public.decor_catalog set price_uzs = coalesce(p_uzs, price_uzs), price_coins = coalesce(p_coins, price_coins), stock = coalesce(p_stock, stock), is_active = coalesce(p_active, is_active) where id = p_id;
    perform private.audit('catalog', jsonb_build_object('id', p_id, 'uzs', p_uzs, 'coins', p_coins, 'stock', p_stock, 'active', p_active));
  end if;
  return (select jsonb_agg(to_jsonb(c) order by c.id) from public.decor_catalog c);
end $$;

-- ---------- Buyurtma / to'lov ----------
create function public.admin_orders() returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require('orders');
  return jsonb_build_object(
    'orders', (select coalesce(jsonb_agg(q), '[]') from (select o.id, o.kind, o.payload, o.pay_amount as amount, o.status, o.note, o.created_at, o.provider, p.login from public.orders o join public.profiles p using (user_id) order by o.created_at desc limit 100) q),
    'payments', (select coalesce(jsonb_agg(to_jsonb(y) - 'raw'), '[]') from (select * from public.payments where status in ('unmatched','needs_review') order by id desc limit 50) y));
end $$;
create function public.admin_order(p_id uuid, p_action text) returns text language plpgsql security definer set search_path = '' as $$
declare v_pay bigint; res text := 'ok'; o public.orders; me public.profiles := private.require('orders');
begin
  if p_action = 'paid' and me.role <> 'admin' then perform private.fail('forbidden'); end if;
  select * into o from public.orders where id = p_id;
  if o.id is null then perform private.fail('not_found'); end if;
  if p_action = 'paid' then
    if o.status not in ('pending','expired','failed') then perform private.fail('bad_format'); end if;
    insert into public.payments (provider, external_id, amount, order_id, status) values ('manual', o.id::text, o.pay_amount, o.id, 'unmatched')
      on conflict (provider, external_id) do update set at = now() returning id into v_pay;
    res := private.settle(o.id, v_pay);
  elsif p_action = 'cancel' then
    update public.orders set status = 'cancelled' where id = p_id and status = 'pending';
    delete from public.plot_state where reserved_order = p_id and status = 'reserved';
  else perform private.fail('bad_format');
  end if;
  perform private.audit('order:' || p_action, jsonb_build_object('order', p_id));
  return res;
end $$;
create function public.admin_payment(p_id bigint, p_action text, p_order uuid default null) returns text language plpgsql security definer set search_path = '' as $$
declare res text := 'ok';
begin
  if (private.require('orders')).role <> 'admin' then perform private.fail('forbidden'); end if;
  if p_action = 'link' then
    if not exists (select 1 from public.payments where id = p_id and status = 'unmatched') then perform private.fail('not_found'); end if;
    update public.payments set order_id = p_order where id = p_id;
    res := private.settle(p_order, p_id);
  elsif p_action = 'refunded' then update public.payments set status = 'refunded' where id = p_id;
  else perform private.fail('bad_format');
  end if;
  perform private.audit('payment:' || p_action, jsonb_build_object('payment', p_id, 'order', p_order));
  return res;
end $$;

-- ---------- Moderatsiya ----------
create function public.admin_queue() returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare p public.profiles := private.me();
begin
  if p.role = 'user' then perform private.fail('forbidden'); end if;
  return jsonb_build_object(
    'reports', case when p.role = 'admin' or 'reports' = any (p.perms) then (select coalesce(jsonb_agg(q), '[]') from (select r.id, r.target_kind, r.target_id, r.reason, r.created_at, f.login from public.reports r left join public.profiles f on f.user_id = r.reporter where r.status = 'open' order by r.id limit 100) q) end,
    'streets', case when p.role = 'admin' or 'streets' = any (p.perms) then (select coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'old', s.name, 'name', s.pending_name, 'kind', s.pending_kind, 'by', f.login)), '[]') from public.streets s left join public.profiles f on f.user_id = s.pending_by where s.pending_name is not null) end,
    'ads', case when p.role = 'admin' or 'ads' = any (p.perms) then (select coalesce(jsonb_agg(jsonb_build_object('id', c.commerce_id, 'title', c.title, 'image', c.image, 'link', c.link, 'by', f.login)), '[]') from public.commerce_state c left join public.profiles f on f.user_id = c.owner where c.status = 'review') end);
end $$;
create function public.admin_report(p_id bigint, p_status text, p_note text default null) returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.require('reports');
  update public.reports set status = p_status, note = left(p_note, 300) where id = p_id;
  perform private.audit('report', jsonb_build_object('id', p_id, 'status', p_status));
end $$;
create function public.admin_street(p_id int, p_approve boolean) returns void language plpgsql security definer set search_path = '' as $$
declare s public.streets;
begin
  perform private.require('streets');
  select * into s from public.streets where id = p_id for update;
  if s.pending_name is null then perform private.fail('not_found'); end if;
  if p_approve then
    update public.streets set name = s.pending_name, name_status = s.pending_kind, named_at = now(), pending_name = null, pending_kind = null, pending_by = null where id = p_id;
    -- Nomlangan kuni avtomatik reels (PLAN §5).
    insert into public.video_jobs (kind, plots, style) select 'street', array(select id from public.plots where street_id = p_id order by number, unit limit 1), jsonb_build_object('title', s.pending_name, 'street', p_id);
  else
    update public.streets set pending_name = null, pending_kind = null, pending_by = null where id = p_id;
    -- Pullik nom rad etilsa, buyurtma qaytarish uchun belgilanadi.
    if s.pending_kind = 'paid' then
      update public.orders set status = 'failed', note = 'street_rejected' where kind = 'street_name' and status = 'paid' and user_id = s.pending_by and (payload ->> 'street')::int = p_id;
    end if;
  end if;
  perform private.notify(s.pending_by, case when p_approve then 'street_named' else 'street_rejected' end, jsonb_build_object('street', p_id, 'name', s.pending_name));
  perform private.audit('street', jsonb_build_object('id', p_id, 'approve', p_approve));
end $$;
create function public.admin_ad(p_id text, p_approve boolean, p_note text default null) returns void language plpgsql security definer set search_path = '' as $$
declare v uuid;
begin
  perform private.require('ads');
  update public.commerce_state set status = case when p_approve then 'live' else 'rejected' end, note = left(p_note, 200) where commerce_id = p_id and status = 'review' returning owner into v;
  perform private.notify(v, case when p_approve then 'ad_live' else 'ad_rejected' end, jsonb_build_object('id', p_id));
  perform private.audit('ad', jsonb_build_object('id', p_id, 'approve', p_approve));
end $$;

-- ---------- Foydalanuvchilar ----------
create function public.admin_users(p_q text default '') returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require('users');
  return (select coalesce(jsonb_agg(q), '[]') from (select user_id as id, login, instagram, role, perms, badges, coins, is_banned as banned, telegram_id is not null as telegram, created_at, last_seen,
    (select count(*) from public.plot_state s where s.owner = profiles.user_id and s.status <> 'reserved') as plots
    from public.profiles where p_q = '' or login ilike p_q || '%' or instagram ilike p_q || '%' order by created_at desc limit 50) q);
end $$;
create function public.admin_user(p_id uuid, p_action text, p_data jsonb default '{}') returns void language plpgsql security definer set search_path = '' as $$
declare me public.profiles := private.require('users'); target public.profiles;
begin
  select * into target from public.profiles where user_id = p_id;
  if target.user_id is null then perform private.fail('not_found'); end if;
  -- Moderator faqat oddiy foydalanuvchini bloklay oladi; rol va tangani faqat admin o'zgartiradi.
  if me.role <> 'admin' and (p_action not in ('ban','unban') or target.role <> 'user') then perform private.fail('forbidden'); end if;
  case p_action
  when 'ban' then if target.user_id = me.user_id then perform private.fail('forbidden'); end if; update public.profiles set is_banned = true where user_id = p_id;
  when 'unban' then update public.profiles set is_banned = false where user_id = p_id;
  when 'role' then
    if target.user_id = me.user_id then perform private.fail('forbidden'); end if;
    update public.profiles set role = p_data ->> 'role', perms = coalesce((select array_agg(x) from jsonb_array_elements_text(p_data -> 'perms') x where x in ('plots','reports','streets','ads','orders','users','map','video','settings')), '{}') where user_id = p_id;
  when 'badge' then perform private.give_badge(p_id, p_data ->> 'badge');
  when 'unbadge' then update public.profiles set badges = array_remove(badges, p_data ->> 'badge') where user_id = p_id;
  when 'coins' then perform private.coins(p_id, (p_data ->> 'delta')::int, 'admin');
  else perform private.fail('bad_format');
  end case;
  perform private.audit('user:' || p_action, p_data || jsonb_build_object('user', p_id));
end $$;

-- ---------- Xarita muharriri ----------
create function public.admin_map() returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require('map');
  return (select coalesce(jsonb_agg(jsonb_build_object('id', v.id, 'name', v.name, 'status', v.status, 'created_at', v.created_at, 'published_at', v.published_at,
    'count', (select count(*) from public.map_objects o where o.version_id = v.id)) order by v.id desc), '[]') from public.map_versions v);
end $$;
create function public.admin_map_objects(p_version int) returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require('map');
  return (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'm', model, 'x', x, 'z', z, 'r', rot, 's', scale)), '[]') from public.map_objects where version_id = p_version);
end $$;
create function private.map_spot_free(px numeric, pz numeric, r numeric) returns boolean language sql stable set search_path = '' as $$
  select not exists (
    select 1 from (
      select x, z, case when rot % 2 = 0 then w else d end w, case when rot % 2 = 0 then d else w end d from public.plots where unit <= 1
      union all select x, z, case when rot % 2 = 0 then w else d end, case when rot % 2 = 0 then d else w end from public.expansions
      union all select x, z, case when rot % 2 = 0 then w else d end, case when rot % 2 = 0 then d else w end from public.commerce
      union all select x, z, w, d from public.roads) b
    where abs(b.x - px) < b.w / 2 + r and abs(b.z - pz) < b.d / 2 + r)
$$;
create function public.admin_map_create(p_name text, p_from int default null) returns int language plpgsql security definer set search_path = '' as $$
declare v int;
begin
  perform private.require('map');
  insert into public.map_versions (name, created_by) values (left(btrim(p_name), 60), auth.uid()) returning id into v;
  if p_from is not null then insert into public.map_objects (version_id, model, x, z, rot, scale) select v, model, x, z, rot, scale from public.map_objects where version_id = p_from; end if;
  return v;
end $$;
create function public.admin_map_save(p_version int, p_objects jsonb) returns void language plpgsql security definer set search_path = '' as $$
declare bad record;
begin
  perform private.require('map');
  if not exists (select 1 from public.map_versions where id = p_version and status = 'draft') then perform private.fail('not_draft'); end if;
  if jsonb_array_length(p_objects) > 2000 then perform private.fail('too_long'); end if;
  select * into bad from jsonb_to_recordset(p_objects) as o(m text, x numeric, z numeric, r numeric, s numeric)
    where m !~ '^[a-z0-9_]{2,40}$' or x is null or z is null or abs(x) > 1200 or abs(z) > 1200 or not private.map_spot_free(x, z, 0.6 * coalesce(s, 1)) limit 1;
  if bad.m is not null then perform private.fail('spot_not_free'); end if;
  delete from public.map_objects where version_id = p_version;
  insert into public.map_objects (version_id, model, x, z, rot, scale) select p_version, m, x, z, coalesce(r, 0), coalesce(s, 1) from jsonb_to_recordset(p_objects) as o(m text, x numeric, z numeric, r numeric, s numeric);
  perform private.audit('map:save', jsonb_build_object('version', p_version));
end $$;
/* Nashr = orqaga qaytish ham: eski versiyani qayta nashr qilish kifoya. */
create function public.admin_map_publish(p_version int) returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.require('map');
  if not exists (select 1 from public.map_versions where id = p_version) then perform private.fail('not_found'); end if;
  update public.map_versions set status = 'archived' where status = 'published' and id <> p_version;
  update public.map_versions set status = 'published', published_at = now() where id = p_version;
  perform private.audit('map:publish', jsonb_build_object('version', p_version));
end $$;

-- ---------- Loyihalar, video, jurnal ----------
create function public.admin_project(p_id int, p_kind text, p_uz text, p_ru text, p_goal int, p_status text) returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.require('settings');
  if p_id is null then insert into public.projects (kind, title_uz, title_ru, goal, status) values (p_kind, p_uz, p_ru, p_goal, p_status);
  else update public.projects set title_uz = p_uz, title_ru = p_ru, goal = greatest(p_goal, raised, 1), status = p_status where id = p_id; end if;
end $$;
create function public.admin_videos() returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require('video');
  return (select coalesce(jsonb_agg(to_jsonb(v) order by v.created_at desc), '[]') from (select * from public.video_jobs order by created_at desc limit 60) v);
end $$;
create function public.admin_video_create(p_kind text, p_plots text[], p_style jsonb) returns uuid language plpgsql security definer set search_path = '' as $$
declare v uuid;
begin
  perform private.require('video');
  if cardinality(p_plots) > 30 or (p_kind = 'houses' and cardinality(p_plots) = 0) or pg_catalog.length(p_style::text) > 2000 then perform private.fail('bad_format'); end if;
  if exists (select 1 from unnest(p_plots) pid where not exists (select 1 from public.plots pp where pp.id = pid)) then perform private.fail('not_found'); end if;
  insert into public.video_jobs (kind, plots, style, created_by) values (p_kind, p_plots, p_style, auth.uid()) returning id into v;
  return v;
end $$;
create function public.admin_video(p_id uuid, p_action text, p_style jsonb default null) returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.require('video');
  case p_action
  when 'rerender' then update public.video_jobs set status = 'queued', style = coalesce(p_style, style), error = null, updated_at = now() where id = p_id and status <> 'rendering';
  when 'send' then update public.video_jobs set status = 'sent', updated_at = now() where id = p_id and status = 'ready';
  when 'delete' then delete from public.video_jobs where id = p_id;
  else perform private.fail('bad_format');
  end case;
end $$;
create function public.admin_audit() returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if (private.me()).role <> 'admin' then perform private.fail('forbidden'); end if;
  return (select coalesce(jsonb_agg(q), '[]') from (select a.id, p.login, a.action, a.data, a.at from public.audit_log a left join public.profiles p on p.user_id = a.actor order by a.id desc limit 100) q);
end $$;
