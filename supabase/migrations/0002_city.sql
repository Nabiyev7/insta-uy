-- Shahar: o'qish, uy olish, bezash, sovg'a, shikoyat.
set check_function_bodies = off;
create function private.address(p_plot text) returns text language sql stable set search_path = '' as $$
  select coalesce(s.name, s.id || '-ko''cha') || ', ' || p.number || '-uy' || case when p.unit > 0 then ', ' || p.unit || '-xonadon' else '' end
  from public.plots p join public.streets s on s.id = p.street_id where p.id = p_plot
$$;

/* Kirishda bir marta: ochiq sozlamalar, tumanlar, ko'cha nomlari, xarita obyektlari. */
create function public.api_boot() returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'settings', (select coalesce(jsonb_object_agg(key, value), '{}') from public.settings where is_public),
    'districts', (select jsonb_agg(jsonb_build_object('id', d.id, 'open', d.is_open, 'name_uz', d.name_uz, 'name_ru', d.name_ru,
        'taken', (select count(*) from public.plot_state s join public.plots p on p.id = s.plot_id where p.district_id = d.id and s.status <> 'reserved'))
        order by d.id) from public.districts d),
    'streets', (select coalesce(jsonb_object_agg(id, name), '{}') from public.streets where name is not null),
    'commerce', (select coalesce(jsonb_agg(jsonb_build_object('id', commerce_id, 'title', title, 'image', image, 'link', link)), '[]')
        from public.commerce_state where status = 'live' and (until is null or until > now())),
    'objects', (select coalesce(jsonb_agg(jsonb_build_object('id', o.id, 'm', o.model, 'x', o.x, 'z', o.z, 'r', o.rot, 's', o.scale)), '[]')
        from public.map_objects o join public.map_versions v on v.id = o.version_id where v.status = 'published'),
    'projects', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'kind', kind, 'uz', title_uz, 'ru', title_ru, 'goal', goal, 'raised', raised, 'status', status) order by id), '[]') from public.projects where status <> 'draft'),
    'hero', (select jsonb_build_object('nick', coalesce(p.instagram, p.login), 'total', t.total) from
        (select user_id, sum(amount) total from public.project_contributions group by user_id order by total desc limit 1) t join public.profiles p using (user_id))
  )
$$;

/* Ixcham: [plot, nik, daraja, devor, tom, bezaklar, yorliq, nishon, holat, kengaytirilgan] */
create function public.api_city(p_districts int[] default null) returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_array(s.plot_id, s.instagram, s.tier, s.wall, s.roof, s.decor, s.label,
      (select b from unnest(array['hokim','rais','investor','homiy','asoschi']) b where b = any (pr.badges) limit 1), s.status, s.has_expansion)), '[]')
  from public.plot_state s join public.plots p on p.id = s.plot_id left join public.profiles pr on pr.user_id = s.owner
  where s.status <> 'reserved' and (p_districts is null or p.district_id = any (p_districts))
$$;

create function public.api_plot(p_plot text) returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', p.id, 'district', p.district_id, 'type', p.type, 'value', p.value, 'address', private.address(p.id),
    'open', d.is_open, 'status', case when s.status = 'reserved' and s.reserved_until < now() then 'free' else coalesce(s.status, 'free') end,
    'instagram', s.instagram, 'bio', s.bio, 'tier', s.tier, 'decor', s.decor, 'label', s.label, 'badges', coalesce(pr.badges, '{}'),
    'since', s.claimed_at, 'price', private.plot_price(p.id))
  from public.plots p join public.districts d on d.id = p.district_id
  left join public.plot_state s on s.plot_id = p.id left join public.profiles pr on pr.user_id = s.owner where p.id = p_plot
$$;

create function private.plot_price(p_plot text) returns int language sql stable set search_path = '' as $$
  select (round(private.num('prices.base.' || type, 30000) * (1 + value / 50.0) * (1 - private.num('discount_pct', 0) / 100) / 1000) * 1000)::int from public.plots where id = p_plot
$$;

create function public.api_search(p_q text) returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('plot', plot_id, 'instagram', instagram, 'address', private.address(plot_id))), '[]') from (
    select plot_id, instagram from public.plot_state where status <> 'reserved' and instagram like
      replace(replace(replace(lower(btrim(p_q, ' @')), '\', ''), '%', ''), '_', '\_') || '%' and char_length(btrim(p_q, ' @')) >= 2
    order by char_length(instagram), instagram limit 8) q
$$;

create function public.api_rankings() returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'houses', (select coalesce(jsonb_agg(h), '[]') from (
      select s.plot_id as plot, s.instagram, s.tier, (s.tier * 100 + case s.label when 'gold' then 60 when 'silver' then 25 else 0 end
        + coalesce((select sum(c.price_uzs) from unnest(s.decor) x join public.decor_catalog c on c.id = x), 0) / 1000)::int as score
      from public.plot_state s where s.status = 'owned' order by score desc, s.claimed_at limit 20) h),
    'districts', (select coalesce(jsonb_agg(q), '[]') from (
      select district_id as id, count(*)::int as active from public.daily_active where day > current_date - 7 and district_id > 0 group by 1 order by 2 desc limit 12) q),
    'inviters', (select coalesce(jsonb_agg(q), '[]') from (
      select coalesce(r.instagram, r.login) as nick, count(*)::int as n from public.profiles p join public.profiles r on r.user_id = p.referred_by where p.free_used group by 1 order by 2 desc limit 10) q))
$$;

-- ---------- Mening ----------
create function public.my_profile() returns jsonb language plpgsql security definer set search_path = '' as $$
declare p public.profiles := private.me();
begin
  update public.profiles set last_seen = now() where user_id = p.user_id and last_seen < now() - interval '1 hour';
  return jsonb_build_object('id', p.user_id, 'login', p.login, 'instagram', p.instagram, 'role', p.role, 'perms', p.perms, 'badges', p.badges, 'avatar', p.avatar,
    'telegram', p.telegram_id is not null, 'coins', p.coins, 'ref', p.ref_code, 'free_used', p.free_used, 'streak', p.streak, 'daily_done', coalesce(p.last_daily = current_date, false),
    'invited', (select count(*) from public.profiles where referred_by = p.user_id and free_used),
    'plots', (select coalesce(jsonb_agg(jsonb_build_object('plot', s.plot_id, 'status', s.status, 'address', private.address(s.plot_id), 'instagram', s.instagram, 'bio', s.bio,
       'tier', s.tier, 'wall', s.wall, 'roof', s.roof, 'decor', s.decor, 'label', s.label, 'has_expansion', s.has_expansion,
       'expansion', (select id from public.expansions e where e.plot_id = s.plot_id)) order by s.claimed_at), '[]') from public.plot_state s where s.owner = p.user_id and s.status <> 'reserved'),
    'decor', (select coalesce(jsonb_object_agg(decor_id, qty), '{}') from public.owned_decor where user_id = p.user_id and qty > 0),
    'transfers', (select coalesce(jsonb_agg(jsonb_build_object('id', t.id, 'plot', t.plot_id, 'from', coalesce(f.instagram, f.login), 'message', t.message)), '[]')
       from public.transfers t join public.profiles f on f.user_id = t.from_user where t.to_user = p.user_id and t.status = 'pending'),
    'notes', (select coalesce(jsonb_agg(jsonb_build_object('id', n.id, 'kind', n.kind, 'data', n.data, 'at', n.created_at) order by n.id desc), '[]')
       from (select * from public.notifications where user_id = p.user_id and read_at is null order by id desc limit 30) n));
end $$;

create function public.my_notes_read() returns void language sql security definer set search_path = '' as $$
  update public.notifications set read_at = now() where user_id = auth.uid() and read_at is null
$$;

create function private.give_badge(uid uuid, b text) returns void language sql security definer set search_path = '' as $$
  update public.profiles set badges = array_append(badges, b) where user_id = uid and not b = any (badges)
$$;

/* Bepul uy: 1 kishiga 1 ta, 1 nikka 1 ta, faqat ochiq tumanda. */
create function public.my_claim(p_plot text, p_instagram text, p_bio text default '') returns jsonb language plpgsql security definer set search_path = '' as $$
declare me public.profiles := private.writable(); pl public.plots; nick text := private.clean_instagram(p_instagram); st public.plot_state; v_status text;
begin
  perform private.rate('claim:' || me.user_id, 10, 3600);
  if not private.flag('free_claim_enabled') then perform private.fail('free_closed'); end if;
  select * into me from public.profiles where user_id = me.user_id for update;
  if me.free_used then perform private.fail('free_used'); end if;
  select * into pl from public.plots where id = p_plot;
  if pl.id is null then perform private.fail('not_found'); end if;
  if pl.type not in ('hovli', 'kvartira') then perform private.fail('paid_only'); end if;
  if not (select is_open from public.districts where id = pl.district_id) then perform private.fail('district_closed'); end if;
  if coalesce(p_bio, '') ~* '(https?://|www\.|t\.me/)' then perform private.fail('bad_format'); end if;
  -- Bir nikka bitta bepul uy: parallel so'rovlar navbatga turadi.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('nick:' || nick));
  if exists (select 1 from public.plot_state where lower(instagram) = nick and status <> 'reserved') then perform private.fail('nick_taken'); end if;
  select * into st from public.plot_state where plot_id = p_plot for update;
  if st.plot_id is not null and (st.status <> 'reserved' or st.reserved_until > now()) then perform private.fail('not_free'); end if;
  v_status := case when private.flag('require_approval') then 'pending' else 'owned' end;
  delete from public.plot_state where plot_id = p_plot;
  insert into public.plot_state (plot_id, status, owner, instagram, bio, is_free, wall, roof)
    values (p_plot, v_status, me.user_id, nick, private.clean_text(p_bio, 120, true), true, abs(pg_catalog.hashtext(p_plot)) % 8, abs(pg_catalog.hashtext(nick)) % 6)
    on conflict (plot_id) do nothing;
  if not found then perform private.fail('not_free'); end if;
  update public.profiles set free_used = true, instagram = coalesce(instagram, nick) where user_id = me.user_id;
  if (select count(*) from public.profiles where 'asoschi' = any (badges)) < private.num('founder_limit', 100) then perform private.give_badge(me.user_id, 'asoschi'); end if;
  insert into public.ownership_log (plot_id, to_user, reason) values (p_plot, me.user_id, 'free');
  if me.referred_by is not null then
    update public.profiles set coins = coins + private.num('coins.referral', 50)::int where user_id = me.referred_by;
    insert into public.coin_ledger (user_id, delta, reason) values (me.referred_by, private.num('coins.referral', 50)::int, 'referral');
    perform private.notify(me.referred_by, 'referral', jsonb_build_object('nick', nick));
  end if;
  return jsonb_build_object('status', v_status, 'address', private.address(p_plot));
end $$;

create function private.own_plot(p_plot text) returns public.plot_state language plpgsql security definer set search_path = '' as $$
declare me public.profiles := private.writable(); st public.plot_state;
begin
  select * into st from public.plot_state where plot_id = p_plot and owner = me.user_id and status <> 'reserved' for update;
  if st.plot_id is null then perform private.fail('not_owner'); end if;
  return st;
end $$;

create function public.my_edit_house(p_plot text, p_bio text, p_wall int, p_roof int) returns void language plpgsql security definer set search_path = '' as $$
declare st public.plot_state := private.own_plot(p_plot);
begin
  perform private.rate('edit:' || st.owner, 30, 3600);
  if coalesce(p_bio, '') ~* '(https?://|www\.|t\.me/)' then perform private.fail('bad_format'); end if;
  if p_wall not between 0 and 7 or p_roof not between 0 and 5 then perform private.fail('bad_format'); end if;
  update public.plot_state set bio = private.clean_text(p_bio, 120, true), wall = p_wall, roof = p_roof where plot_id = p_plot;
end $$;

/* Bezak joylash: faqat egalik qilingan miqdorda; slot qoidasi serverda. */
create function public.my_set_decor(p_plot text, p_decor text[]) returns void language plpgsql security definer set search_path = '' as $$
declare st public.plot_state := private.own_plot(p_plot);
begin
  if (select type from public.plots where id = p_plot) = 'kvartira' then perform private.fail('no_yard'); end if;
  if cardinality(p_decor) > 25 or (select count(distinct x) from unnest(p_decor) x) <> cardinality(p_decor) then perform private.fail('bad_format'); end if;
  if exists (select 1 from unnest(p_decor) x left join public.decor_catalog c on c.id = x where c.id is null) then perform private.fail('bad_format'); end if;
  if exists (select 1 from unnest(p_decor) x join public.decor_catalog c on c.id = x where c.slot not in ('tree','yard','light','special') group by c.slot having count(*) > 1) then perform private.fail('slot_taken'); end if;
  if exists (select 1 from unnest(p_decor) x where coalesce((select qty from public.owned_decor where user_id = st.owner and decor_id = x), 0)
      <= (select count(*) from public.plot_state o where o.owner = st.owner and o.plot_id <> p_plot and x = any (o.decor))) then perform private.fail('not_owned'); end if;
  update public.plot_state set decor = p_decor where plot_id = p_plot;
end $$;

create function public.my_avatar(p_avatar jsonb) returns void language plpgsql security definer set search_path = '' as $$
declare me public.profiles := private.writable();
begin
  if pg_catalog.length(p_avatar::text) > 400 or jsonb_typeof(p_avatar) <> 'object' then perform private.fail('bad_format'); end if;
  update public.profiles set avatar = p_avatar where user_id = me.user_id;
end $$;

create function public.my_report(p_kind text, p_target text, p_reason text) returns void language plpgsql security definer set search_path = '' as $$
declare me public.profiles := private.me();
begin
  perform private.rate('report:' || me.user_id, 10, 86400);
  if p_kind not in ('plot','chat','street','ad','player') or char_length(p_target) > 300 then perform private.fail('bad_format'); end if;
  if char_length(btrim(p_reason)) not between 3 and 500 then perform private.fail('bad_format'); end if;
  insert into public.reports (reporter, target_kind, target_id, reason) values (me.user_id, p_kind, p_target, btrim(p_reason));
end $$;

-- ---------- Sovg'a qilish ----------
create function public.my_transfer(p_plot text, p_to text, p_message text default '') returns uuid language plpgsql security definer set search_path = '' as $$
declare st public.plot_state := private.own_plot(p_plot); v_to uuid; v_id uuid;
begin
  perform private.rate('transfer:' || st.owner, 5, 86400);
  if st.status <> 'owned' then perform private.fail('not_approved'); end if;
  select user_id into v_to from public.profiles where login = lower(btrim(p_to, ' @')) and not is_banned;
  if v_to is null or v_to = st.owner then perform private.fail('user_not_found'); end if;
  update public.transfers set status = 'cancelled' where plot_id = p_plot and status = 'pending';
  insert into public.transfers (plot_id, from_user, to_user, message) values (p_plot, st.owner, v_to, private.clean_text(p_message, 100, true)) returning id into v_id;
  perform private.notify(v_to, 'transfer', jsonb_build_object('plot', p_plot));
  return v_id;
end $$;
create function public.my_transfer_answer(p_id uuid, p_accept boolean, p_instagram text default null) returns void language plpgsql security definer set search_path = '' as $$
declare me public.profiles := private.writable(); t public.transfers; nick text;
begin
  select * into t from public.transfers where id = p_id and to_user = me.user_id and status = 'pending' for update;
  if t.id is null then perform private.fail('not_found'); end if;
  if not p_accept then update public.transfers set status = 'declined' where id = p_id; return; end if;
  nick := private.clean_instagram(coalesce(p_instagram, me.instagram));
  -- Egasi o'zgarmagan bo'lsagina; bezaklar sotib olgan odamda qoladi.
  update public.plot_state set owner = me.user_id, instagram = nick, bio = '', decor = '{}', is_free = false, claimed_at = now() where plot_id = t.plot_id and owner = t.from_user and status = 'owned';
  if not found then perform private.fail('not_owner'); end if;
  update public.transfers set status = 'accepted' where id = p_id;
  insert into public.ownership_log (plot_id, from_user, to_user, reason) values (t.plot_id, t.from_user, me.user_id, 'gift');
  perform private.notify(t.from_user, 'transfer_done', jsonb_build_object('plot', t.plot_id));
end $$;
