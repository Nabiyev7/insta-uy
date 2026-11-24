/* Bezaklar tizimi: katalog to'liq bazada, hovlida oldindan belgilangan joy nuqtalari, level bo'yicha chegara, tashqi ko'rinish. */
set check_function_bodies = off;

-- ---------- Katalog ----------
alter table public.decor_catalog add column model_id text, add column name_uz text not null default '', add column name_ru text not null default '', add column spots text[] not null default '{}',
  add column min_level int not null default 1 check (min_level between 1 and 10), add column season_from date, add column season_to date, add column set_id text, add column is_new boolean not null default false,
  add column tint text check (tint ~ '^#[0-9a-f]{6}$'), add column sort int not null default 1000;
insert into public.decor_catalog as c (id, slot, model_id, name_uz, name_ru, price_uzs, price_coins, stock, spots, min_level, sort) values
('fence_wood','fence','fence_wood','Yog''och panjara','Деревянный забор',5000,100,null,array['fence'],1,0),
('fence_brick','fence','fence_brick','G''isht devor','Кирпичная стена',12000,260,null,array['fence'],3,10),
('fence_ornate','fence','fence_ornate','Naqshli panjara','Кованый забор',25000,600,null,array['fence'],6,20),
('gate_wood','gate','gate_wood','Yog''och darvoza','Деревянные ворота',6000,120,null,array['gate'],1,30),
('gate_carved','gate','gate_carved','Naqshli darvoza','Резные ворота',20000,450,null,array['gate'],4,40),
('gate_gold','gate','gate_gold','Oltin darvoza','Золотые ворота',60000,1500,null,array['gate'],7,50),
('path_stone','path','path_stone','Tosh yo''lak','Каменная дорожка',4000,80,null,array['path'],1,60),
('tree_anor','tree','tree_anor','Anor','Гранат',4000,80,null,array['small','medium','wall','back','big'],1,70),
('tree_chinor','tree','tree_chinor','Chinor','Чинара',7000,150,null,array['medium','big'],1,80),
('tree_archa','tree','tree_archa','Archa','Ель',7000,150,null,array['small','medium','wall','back','big'],1,90),
('yard_sori','yard','yard_sori','So''ri','Топчан',8000,180,null,array['medium','big'],1,100),
('yard_tok','yard','yard_tok','Tok (ishkom)','Виноградник',10000,220,null,array['big'],4,110),
('yard_flowers','yard','yard_flowers','Gulzor','Цветник',5000,100,null,array['medium','big'],1,120),
('water_pool','water','water_pool','Hovuz','Бассейн',45000,1000,null,array['big'],5,130),
('water_fountain','water','water_fountain','Kichik favvora','Фонтанчик',35000,800,null,array['medium','big'],5,140),
('car_van','car','car_van','Oq furgon','Белый фургон',15000,350,null,array['car','big'],2,150),
('car_sedan','car','car_sedan','Sedan','Седан',25000,600,null,array['car','big'],3,160),
('car_sport','car','car_sport','Sport mashina','Спорткар',70000,1800,null,array['car','big'],6,170),
('light_lamps','light','light_lamps','Hovli chiroqlari','Фонари',8000,180,null,array['lamps'],3,180),
('light_luxe','light','light_luxe','Hashamatli yoritish','Роскошная подсветка',30000,700,null,array['luxe'],6,190),
('pet_dog','pet','pet_dog','Kuchuk','Собака',10000,220,null,array['pet','small','medium'],1,200),
('pet_cat','pet','pet_cat','Mushuk','Кошка',8000,180,null,array['pet','small','medium'],1,210),
('special_peacock','special','special_peacock','Tovus (noyob)','Павлин (редкий)',150000,4000,10,array['small','medium','big'],5,220),
('special_statue','special','special_statue','Humo haykali (noyob)','Статуя Хумо (редкая)',200000,5000,10,array['medium','big'],6,230),
('special_yurt','special','special_yurt','Navro''z o''tovi (mavsumiy)','Юрта Навруза (сезон)',60000,1500,100,array['big'],4,240),
('sign_nick','sign','sign_nick','Nik lavhasi','Табличка с ником',5000,100,null,array['sign'],1,250)
on conflict (id) do update set model_id = excluded.model_id, name_uz = excluded.name_uz, name_ru = excluded.name_ru, spots = excluded.spots, min_level = excluded.min_level, sort = excluded.sort;
alter table public.decor_catalog alter column model_id set not null, add check (cardinality(spots) > 0), add check ((season_from is null) = (season_to is null));

/* Joy nuqtalari: koordinatasi kodda (packages/shared/src/anchors.ts), turi va leveli bu yerda tekshiriladi. */
create table public.decor_anchors (id text primary key, kind text not null, min_level int not null, sort int not null);
insert into public.decor_anchors (id, kind, min_level, sort) values
('fence','fence',1,0),
('gate','gate',1,1),
('path','path',1,2),
('lamps','lamps',3,3),
('luxe','luxe',6,4),
('sign','sign',1,5),
('s1','small',1,6),
('s2','small',1,7),
('m1','medium',1,8),
('p1','pet',2,9),
('car','car',2,10),
('w1','wall',3,11),
('big1','big',4,12),
('w3','wall',4,13),
('s3','small',5,14),
('m2','medium',5,15),
('roof','roof',5,16),
('p2','pet',6,17),
('w2','wall',6,18),
('w4','wall',7,19),
('big2','big',7,20),
('b1','back',8,21),
('b2','back',9,22),
('s4','wall',10,23);
insert into public.settings (key, value, is_public) values ('decor_slots', '[3,4,5,6,8,10,12,14,17,20]', true);

create function private.decor_slots(p_tier int) returns int language sql stable set search_path = '' as $$
  select least(20, coalesce((select v::int from (select private.setting('decor_slots') ->> (greatest(1, least(10, p_tier)) - 1) as v) x where v ~ '^[0-9]{1,3}$'), 3))
$$;

-- ---------- Uydagi joylashuv ----------
alter table public.plot_state add column places jsonb not null default '{}', add column wall_material int not null default 0 check (wall_material between 0 and 3),
  add column frame int not null default 0 check (frame between 0 and 7), add column door int not null default 0 check (door between 0 and 7);

/* Nuqtasiz ro'yxatni (eski ma'lumot, demo) bo'sh nuqtalarga taqsimlaydi: hech bir bezak yo'qolmaydi. */
create function private.default_places(p_decor text[]) returns jsonb language plpgsql stable set search_path = '' as $$
declare d text; a text; res jsonb := '{}';
begin
  -- Tanlovi kam (masalan faqat katta nuqtaga sig'adigan) bezak oldin joylashadi.
  for d in select u.d from unnest(p_decor) with ordinality u(d, k) join public.decor_catalog c on c.id = u.d order by (select count(*) from public.decor_anchors an where an.kind = any (c.spots)), u.k loop
    select an.id into a from public.decor_anchors an join public.decor_catalog c on c.id = d where an.kind = any (c.spots) and not res ? an.id order by array_position(c.spots, an.kind), an.sort limit 1;
    if a is not null then res := res || jsonb_build_object(a, d); end if;
    a := null;
  end loop;
  return res;
end $$;
/* `decor` — joylashuvdan hosil bo'ladigan ro'yxat (reyting, topshiriq, qidiruv shuni ishlatadi). */
create function private.sync_places() returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if new.places = '{}' and cardinality(new.decor) > 0 then new.places := private.default_places(new.decor); end if;
  elsif new.places = old.places and new.decor is distinct from old.decor then
    new.places := private.default_places(new.decor);
  end if;
  new.decor := coalesce((select array_agg(value order by key) from jsonb_each_text(new.places)), '{}');
  return new;
end $$;
update public.plot_state set places = private.default_places(decor) where cardinality(decor) > 0;
create trigger plot_state_places before insert or update of places, decor on public.plot_state for each row execute function private.sync_places();

drop function public.my_set_decor(text, text[]);
create function public.my_place_decor(p_plot text, p_places jsonb) returns void language plpgsql security definer set search_path = '' as $$
declare st public.plot_state := private.own_plot(p_plot); n int; old_n int;
begin
  perform private.rate('decor:' || st.owner, 120, 3600);
  if (select type from public.plots where id = p_plot) = 'kvartira' then perform private.fail('no_yard'); end if;
  if jsonb_typeof(p_places) is distinct from 'object' or exists (select 1 from jsonb_each(p_places) where jsonb_typeof(value) <> 'string') then perform private.fail('bad_format'); end if;
  select count(*) into n from jsonb_object_keys(p_places);
  select count(*) into old_n from jsonb_object_keys(st.places);
  -- Eskidan ko'p bezagi bor uy kamaytirishi mumkin, ko'paytirolmaydi.
  if n > greatest(private.decor_slots(st.tier), old_n) then perform private.fail('no_slots'); end if;
  if exists (select 1 from jsonb_each_text(p_places) e left join public.decor_anchors a on a.id = e.key left join public.decor_catalog c on c.id = e.value
      where a.id is null or c.id is null) then perform private.fail('bad_format'); end if;
  -- Allaqachon turgan joyi o'zgarmagan bezaklar qayta tekshirilmaydi.
  if exists (select 1 from jsonb_each_text(p_places) e join public.decor_anchors a on a.id = e.key join public.decor_catalog c on c.id = e.value
      where st.places ->> e.key is distinct from e.value and (a.min_level > st.tier or (c.min_level > st.tier and not exists (select 1 from jsonb_each_text(st.places) o where o.value = e.value)))) then perform private.fail('level_low'); end if;
  if exists (select 1 from jsonb_each_text(p_places) e join public.decor_anchors a on a.id = e.key join public.decor_catalog c on c.id = e.value
      where st.places ->> e.key is distinct from e.value and not a.kind = any (c.spots)) then perform private.fail('wrong_spot'); end if;
  if exists (select 1 from (select value as d, count(*) as k from jsonb_each_text(p_places) group by value) x
      where x.k + (select count(*) from public.plot_state o, jsonb_each_text(o.places) e where o.owner = st.owner and o.plot_id <> p_plot and o.status <> 'reserved' and e.value = x.d)
        > coalesce((select qty from public.owned_decor where user_id = st.owner and decor_id = x.d), 0)) then perform private.fail('not_owned'); end if;
  update public.plot_state set places = p_places where plot_id = p_plot;
end $$;

-- ---------- Tashqi ko'rinish ----------
drop function public.my_edit_house(text, text, int, int);
create function public.my_edit_house(p_plot text, p_bio text, p_wall int, p_roof int, p_material int default null, p_frame int default null, p_door int default null) returns void language plpgsql security definer set search_path = '' as $$
declare st public.plot_state := private.own_plot(p_plot);
begin
  perform private.rate('edit:' || st.owner, 30, 3600);
  if coalesce(p_bio, '') ~* '(https?://|www\.|t\.me/)' then perform private.fail('bad_format'); end if;
  if p_wall not between 0 and 7 or p_roof not between 0 and 5 or coalesce(p_material, 0) not between 0 and 3 or coalesce(p_frame, 0) not between 0 and 7 or coalesce(p_door, 0) not between 0 and 7 then perform private.fail('bad_format'); end if;
  update public.plot_state set bio = private.clean_text(p_bio, 120, true), wall = p_wall, roof = p_roof, wall_material = coalesce(p_material, wall_material), frame = coalesce(p_frame, frame), door = coalesce(p_door, door) where plot_id = p_plot;
end $$;

/* Ixcham: [plot, nik, daraja, devor, tom, ["nuqta:bezak"], yorliq, nishon, holat, kengaytirilgan, material, ramka, eshik] */
create or replace function public.api_city(p_districts int[] default null) returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_array(s.plot_id, s.instagram, s.tier, s.wall, s.roof, (select coalesce(jsonb_agg(key || ':' || value), '[]') from jsonb_each_text(s.places)), s.label,
      (select b from unnest(array['hokim','rais','investor','homiy','asoschi']) b where b = any (pr.badges) limit 1), s.status, s.has_expansion, s.wall_material, s.frame, s.door)), '[]')
  from public.plot_state s join public.plots p on p.id = s.plot_id left join public.profiles pr on pr.user_id = s.owner
  where s.status <> 'reserved' and (p_districts is null or p.district_id = any (p_districts))
$$;

create or replace function public.my_profile() returns jsonb language plpgsql security definer set search_path = '' as $$
declare p public.profiles := private.me();
begin
  update public.profiles set last_seen = now() where user_id = p.user_id and last_seen < now() - interval '1 hour';
  return jsonb_build_object('id', p.user_id, 'login', p.login, 'instagram', p.instagram, 'role', p.role, 'perms', p.perms, 'badges', p.badges, 'avatar', p.avatar,
    'telegram', p.telegram_id is not null, 'coins', p.coins, 'ref', p.ref_code, 'free_used', p.free_used, 'streak', p.streak, 'daily_done', coalesce(p.last_daily = current_date, false),
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

-- ---------- Sotuv qoidalari ----------
/* Mavsum har yili takrorlanadi: faqat kun va oy solishtiriladi (yil oxiridan o'tsa ham ishlaydi). */
create function private.in_season(p_from date, p_to date, p_now date default current_date) returns boolean language sql stable set search_path = '' as $$
  select case when p_from is null or p_to is null then true
    when to_char(p_from, 'MMDD') <= to_char(p_to, 'MMDD') then to_char(p_now, 'MMDD') between to_char(p_from, 'MMDD') and to_char(p_to, 'MMDD')
    else to_char(p_now, 'MMDD') >= to_char(p_from, 'MMDD') or to_char(p_now, 'MMDD') <= to_char(p_to, 'MMDD') end
$$;
create function private.best_tier(uid uuid) returns int language sql stable set search_path = '' as $$
  select coalesce(max(s.tier), 0) from public.plot_state s join public.plots p on p.id = s.plot_id where s.owner = uid and s.status <> 'reserved' and p.type <> 'kvartira'
$$;
create function private.check_decor_sale(uid uuid, c public.decor_catalog) returns void language plpgsql stable set search_path = '' as $$
begin
  if c.id is null or not c.is_active then perform private.fail('not_found'); end if;
  if not private.in_season(c.season_from, c.season_to) then perform private.fail('out_of_season'); end if;
  if c.min_level > 1 and private.best_tier(uid) < c.min_level then perform private.fail('level_low'); end if;
end $$;

create or replace function private.quote(me public.profiles, p_kind text, p jsonb) returns int language plpgsql security definer set search_path = '' as $$
declare c public.decor_catalog;
begin
  if p_kind = 'commerce' and private.setting('commerce_closed') ? (p ->> 'id') then perform private.fail('not_for_sale'); end if;
  if p_kind = 'decor' then
    select * into c from public.decor_catalog where id = p ->> 'id';
    perform private.check_decor_sale(me.user_id, c);
  end if;
  return private.quote_base(me, p_kind, p);
end $$;
revoke all on function private.quote(public.profiles, text, jsonb) from public;

create or replace function public.my_buy_decor_coins(p_id text) returns int language plpgsql security definer set search_path = '' as $$
declare me public.profiles := private.writable(); c public.decor_catalog; bal int;
begin
  if not private.flag('coins_enabled') then perform private.fail('coins_off'); end if;
  select * into c from public.decor_catalog where id = p_id for update;
  perform private.check_decor_sale(me.user_id, c);
  bal := private.coins(me.user_id, -c.price_coins, 'decor:' || p_id);
  perform private.grant_decor(me.user_id, p_id);
  return bal;
end $$;

create or replace function public.api_catalog() returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'slot', slot, 'model', model_id, 'uz', name_uz, 'ru', name_ru, 'uzs', price_uzs, 'coins', price_coins, 'left', case when stock is null then null else stock - sold end,
    'spots', spots, 'min', min_level, 'from', season_from, 'to', season_to, 'set', set_id, 'isNew', is_new, 'tint', tint, 'onSale', is_active and private.in_season(season_from, season_to)) order by sort, id), '[]')
  from public.decor_catalog
$$;

-- ---------- Admin ----------
/* Yangi tovar faqat mavjud modeldan yaratiladi (yangi 3D model kod orqali qo'shiladi). */
create function public.admin_decor_save(p jsonb) returns void language plpgsql security definer set search_path = '' as $$
declare me public.profiles := private.require('settings'); base public.decor_catalog; v_id text := p ->> 'id'; old public.decor_catalog;
begin
  if me.role <> 'admin' then perform private.fail('forbidden'); end if;
  if v_id is null or v_id !~ '^[a-z0-9_]{3,40}$' then perform private.fail('bad_format'); end if;
  select * into old from public.decor_catalog where id = v_id;
  select * into base from public.decor_catalog where model_id = coalesce(p ->> 'model_id', old.model_id) order by sort limit 1;
  if base.id is null then perform private.fail('not_found'); end if;
  insert into public.decor_catalog as c (id, slot, model_id, spots, name_uz, name_ru, price_uzs, price_coins, stock, min_level, season_from, season_to, set_id, is_new, tint, is_active, sort)
  values (v_id, base.slot, base.model_id, base.spots, private.clean_text(coalesce(p ->> 'name_uz', old.name_uz), 40, false), private.clean_text(coalesce(p ->> 'name_ru', old.name_ru), 40, false),
    coalesce((p ->> 'price_uzs')::int, old.price_uzs, base.price_uzs), coalesce((p ->> 'price_coins')::int, old.price_coins, base.price_coins), case when p ? 'stock' then (p ->> 'stock')::int else old.stock end,
    coalesce((p ->> 'min_level')::int, old.min_level, base.min_level), case when p ? 'season_from' then nullif(p ->> 'season_from', '')::date else old.season_from end, case when p ? 'season_to' then nullif(p ->> 'season_to', '')::date else old.season_to end,
    case when p ? 'set_id' then nullif(p ->> 'set_id', '') else old.set_id end, coalesce((p ->> 'is_new')::boolean, old.is_new, false), case when p ? 'tint' then nullif(lower(p ->> 'tint'), '') else old.tint end,
    coalesce((p ->> 'is_active')::boolean, old.is_active, true), coalesce((p ->> 'sort')::int, old.sort, base.sort + 1))
  on conflict (id) do update set name_uz = excluded.name_uz, name_ru = excluded.name_ru, price_uzs = excluded.price_uzs, price_coins = excluded.price_coins, stock = excluded.stock, min_level = excluded.min_level,
    season_from = excluded.season_from, season_to = excluded.season_to, set_id = excluded.set_id, is_new = excluded.is_new, tint = excluded.tint, is_active = excluded.is_active, sort = excluded.sort;
  perform private.audit('decor:save', p);
end $$;

select private.apply_grants();
