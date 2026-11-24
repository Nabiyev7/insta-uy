/* 11-qadam (yangi interfeys): bezak joylari bitta manbada, asoschilar soni, kunlik bonus kuni, katalogda "sotuvda" belgisi. */
set check_function_bodies = off;

-- ---------- Bezak joylari ----------
/* Hovli bezaklari 5-leveldan. Nik lavhasi (va ranglar, material) bu hisobga kirmaydi. Koddagi nusxasi — DEFAULT_DECOR_SLOTS (test solishtiradi). */
update public.settings set value = '[0,0,0,0,8,10,12,14,15,16]' where key = 'decor_slots';
create or replace function private.decor_slots(p_tier int) returns int language sql stable set search_path = '' as $$
  select least(20, coalesce((select v::int from (select private.setting('decor_slots') ->> (greatest(1, least(10, p_tier)) - 1) as v) x where v ~ '^[0-9]{1,3}$'), 0))
$$;
create function private.decor_used(p_places jsonb) returns int language sql stable set search_path = '' as $$
  select count(*)::int from jsonb_object_keys(p_places) k where k not in (select id from public.decor_anchors where kind = 'sign')
$$;
create or replace function public.my_place_decor(p_plot text, p_places jsonb) returns void language plpgsql security definer set search_path = '' as $$
declare st public.plot_state := private.own_plot(p_plot); n int; old_n int;
begin
  perform private.rate('decor:' || st.owner, 120, 3600);
  if (select type from public.plots where id = p_plot) = 'kvartira' then perform private.fail('no_yard'); end if;
  if jsonb_typeof(p_places) is distinct from 'object' or exists (select 1 from jsonb_each(p_places) where jsonb_typeof(value) <> 'string') then perform private.fail('bad_format'); end if;
  if exists (select 1 from jsonb_each_text(p_places) e left join public.decor_anchors a on a.id = e.key left join public.decor_catalog c on c.id = e.value
      where a.id is null or c.id is null) then perform private.fail('bad_format'); end if;
  -- Allaqachon turgan joyi o'zgarmagan bezaklar qayta tekshirilmaydi.
  if exists (select 1 from jsonb_each_text(p_places) e join public.decor_anchors a on a.id = e.key join public.decor_catalog c on c.id = e.value
      where st.places ->> e.key is distinct from e.value and (a.min_level > st.tier or (c.min_level > st.tier and not exists (select 1 from jsonb_each_text(st.places) o where o.value = e.value)))) then perform private.fail('level_low'); end if;
  if exists (select 1 from jsonb_each_text(p_places) e join public.decor_anchors a on a.id = e.key join public.decor_catalog c on c.id = e.value
      where st.places ->> e.key is distinct from e.value and not a.kind = any (c.spots)) then perform private.fail('wrong_spot'); end if;
  n := private.decor_used(p_places);
  old_n := private.decor_used(st.places);
  -- Eskidan ko'p bezagi bor uy kamaytirishi mumkin, ko'paytirolmaydi.
  if n > greatest(private.decor_slots(st.tier), old_n) then perform private.fail('no_slots'); end if;
  if exists (select 1 from (select value as d, count(*) as k from jsonb_each_text(p_places) group by value) x
      where x.k + (select count(*) from public.plot_state o, jsonb_each_text(o.places) e where o.owner = st.owner and o.plot_id <> p_plot and o.status <> 'reserved' and e.value = x.d)
        > coalesce((select qty from public.owned_decor where user_id = st.owner and decor_id = x.d), 0)) then perform private.fail('not_owned'); end if;
  update public.plot_state set places = p_places where plot_id = p_plot;
end $$;

-- ---------- Ekran uchun ma'lumot ----------
create or replace function public.api_boot() returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'settings', (select coalesce(jsonb_object_agg(key, value), '{}') from public.settings where is_public),
    'founders', jsonb_build_object('taken', (select count(*) from public.profiles where 'asoschi' = any (badges)), 'limit', private.num('founder_limit', 100)),
    'districts', (select jsonb_agg(jsonb_build_object('id', d.id, 'open', d.is_open, 'name_uz', d.name_uz, 'name_ru', d.name_ru,
        'taken', (select count(*) from public.plot_state s join public.plots p on p.id = s.plot_id where p.district_id = d.id and s.status <> 'reserved'))
        order by d.id) from public.districts d),
    'streets', (select coalesce(jsonb_object_agg(id, name), '{}') from public.streets where name is not null),
    'commerce', (select coalesce(jsonb_agg(jsonb_build_object('id', commerce_id, 'title', title, 'image', image, 'link', link)), '[]')
        from public.commerce_state where status = 'live' and (until is null or until > now())),
    'objects', (select coalesce(jsonb_agg(jsonb_build_object('id', o.id, 'm', o.model, 'x', o.x, 'z', o.z, 'r', o.rot, 's', o.scale)), '[]')
        from public.map_objects o join public.map_versions v on v.id = o.version_id where v.status = 'published'),
    'projects', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'kind', kind, 'uz', title_uz, 'ru', title_ru, 'goal', goal, 'raised', raised, 'status', status) order by id), '[]') from public.projects where status <> 'draft'),
    'hero', (select jsonb_build_object('nick', private.public_nick(p), 'total', t.total) from
        (select user_id, sum(amount) total from public.project_contributions group by user_id order by total desc limit 1) t join public.profiles p using (user_id))
  )
$$;

create or replace function public.my_profile() returns jsonb language plpgsql security definer set search_path = '' as $$
declare p public.profiles := private.me();
begin
  update public.profiles set last_seen = now() where user_id = p.user_id and last_seen < now() - interval '1 hour';
  return jsonb_build_object('id', p.user_id, 'login', p.login, 'instagram', p.instagram, 'role', p.role, 'perms', p.perms, 'badges', p.badges, 'avatar', p.avatar,
    'telegram', p.telegram_id is not null, 'coins', p.coins, 'ref', p.ref_code, 'free_used', p.free_used, 'wants_news', p.wants_news,
    'serials', (select coalesce(jsonb_object_agg(decor_id, list), '{}') from (select decor_id, jsonb_agg(serial order by serial) as list from public.decor_serials where owner = p.user_id group by decor_id) x), 'streak', p.streak, 'daily_done', coalesce(p.last_daily = current_date, false), 'daily_next', case when p.last_daily = current_date - 1 then least(p.streak + 1, 7) else 1 end,
    'invited', (select count(*) from public.profiles where referred_by = p.user_id and referral_paid),
    'plots', (select coalesce(jsonb_agg(jsonb_build_object('plot', s.plot_id, 'status', s.status, 'address', private.address(s.plot_id), 'instagram', s.instagram, 'bio', s.bio,
       'tier', s.tier, 'wall', s.wall, 'roof', s.roof, 'decor', s.decor, 'places', s.places, 'material', s.wall_material, 'frame', s.frame, 'door', s.door, 'label', s.label, 'has_expansion', s.has_expansion,
       'expansion', (select id from public.expansions e where e.plot_id = s.plot_id)) order by s.claimed_at), '[]') from public.plot_state s where s.owner = p.user_id and s.status <> 'reserved'),
    'decor', (select coalesce(jsonb_object_agg(decor_id, qty), '{}') from public.owned_decor where user_id = p.user_id and qty > 0),
    'transfers', (select coalesce(jsonb_agg(jsonb_build_object('id', t.id, 'plot', t.plot_id, 'from', private.public_nick(f), 'message', t.message)), '[]')
       from public.transfers t join public.profiles f on f.user_id = t.from_user where t.to_user = p.user_id and t.status = 'pending'),
    'notes', (select coalesce(jsonb_agg(jsonb_build_object('id', n.id, 'kind', n.kind, 'data', n.data, 'at', n.created_at) order by n.id desc), '[]')
       from (select * from public.notifications where user_id = p.user_id and read_at is null order by id desc limit 30) n));
end $$;

create or replace function public.api_catalog() returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'slot', slot, 'model', model_id, 'uz', name_uz, 'ru', name_ru, 'uzs', price_uzs, 'coins', price_coins, 'left', case when stock is null then null else stock - sold end,
    'spots', spots, 'min', min_level, 'from', season_from, 'to', season_to, 'set', set_id, 'isNew', is_new, 'tint', tint, 'active', is_active, 'onSale', is_active and private.in_season(season_from, season_to)) order by sort, id), '[]')
  from public.decor_catalog
$$;

select private.apply_grants();
