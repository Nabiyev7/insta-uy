/* Yangi bezaklar va sotuv: noyob raqamlar, to'plamlar, sovg'a, yangilik xabari, haftaning hovlisi. */
set check_function_bodies = off;

insert into public.decor_catalog as c (id, slot, model_id, name_uz, name_ru, price_uzs, price_coins, stock, spots, min_level, sort) values
('yard_tandir','yard','yard_tandir','Tandir','Тандыр',15000,300,null,array['small','medium','big'],2,260),
('yard_tokzor','yard','yard_tokzor','Tokzor','Виноградные ряды',15000,300,null,array['medium','big'],3,270),
('yard_umbrella','yard','yard_umbrella','Bog'' soyaboni','Садовый зонт',12000,240,null,array['medium','big'],1,280),
('yard_bike','yard','yard_bike','Velosiped','Велосипед',8000,160,null,array['small','medium','wall','back'],1,290),
('sign_mailbox','sign','sign_mailbox','Pochta qutisi','Почтовый ящик',4000,80,null,array['sign','pet','small'],1,300),
('yard_besedka','yard','yard_besedka','Besedka','Беседка',30000,600,null,array['big'],4,310),
('yard_mangal','yard','yard_mangal','Mangal','Мангал',10000,200,null,array['small','medium','wall','big'],2,320),
('yard_batut','yard','yard_batut','Batut','Батут',25000,500,null,array['big'],4,330),
('yard_basketball','yard','yard_basketball','Basketbol halqasi','Баскетбольное кольцо',15000,300,null,array['small','medium','wall','back','big'],3,340),
('roof_solar','roof','roof_solar','Quyosh panellari','Солнечные панели',40000,800,null,array['roof'],5,350),
('yard_garage','car','yard_garage','Garaj','Гараж',50000,1000,null,array['big'],6,360),
('yard_hammock','yard','yard_hammock','Hamak','Гамак',12000,240,null,array['medium','big'],2,370),
('yard_playground','yard','yard_playground','Bolalar maydonchasi','Детская площадка',40000,800,null,array['big'],5,380),
('pet_house','pet','pet_house','It uyi','Конура',8000,160,null,array['pet','small','wall','back'],2,390),
('tree_orik','tree','tree_orik','O''rik','Абрикос',5000,100,null,array['small','medium','wall','back','big'],1,400),
('tree_olma','tree','tree_olma','Olma','Яблоня',5000,100,null,array['small','medium','wall','back','big'],1,410),
('tree_tut','tree','tree_tut','Tut','Тутовник',6000,120,null,array['small','medium','wall','back','big'],1,420),
('tree_behi','tree','tree_behi','Behi','Айва',6000,120,null,array['small','medium','wall','back','big'],1,430),
('pet_sheep','pet','pet_sheep','Qo''y','Овца',12000,240,null,array['pet','small','medium'],2,440),
('pet_hens','pet','pet_hens','Tovuqlar','Куры',8000,160,null,array['pet','small','medium'],1,450),
('pet_horse','pet','pet_horse','Ot','Лошадь',60000,1200,null,array['small','medium','wall','back','big'],6,460),
('pet_dovecote','pet','pet_dovecote','Kaptarxona','Голубятня',20000,400,null,array['small','medium','wall','back'],4,470),
('special_sumalak','special','special_sumalak','Sumalak qozoni (Navro''z)','Котёл сумаляка (Навруз)',20000,400,null,array['medium','big'],1,480),
('light_newyear','light','light_newyear','Yangi yil chiroqlari','Новогодние огни',12000,240,null,array['lamps'],3,490),
('tree_newyear','special','tree_newyear','Yangi yil archasi','Новогодняя ёлка',20000,400,null,array['small','medium','big'],1,500),
('light_hayit','light','light_hayit','Hayit fonarlari','Фонари на Хайит',15000,300,null,array['lamps'],3,510)
on conflict (id) do nothing;
update public.decor_catalog set is_new = true where id in ('yard_tandir', 'yard_tokzor', 'yard_umbrella', 'yard_bike', 'sign_mailbox', 'yard_besedka', 'yard_mangal', 'yard_batut', 'yard_basketball', 'roof_solar', 'yard_garage', 'yard_hammock', 'yard_playground', 'pet_house', 'tree_orik', 'tree_olma', 'tree_tut', 'tree_behi', 'pet_sheep', 'pet_hens', 'pet_horse', 'pet_dovecote', 'special_sumalak', 'light_newyear', 'tree_newyear', 'light_hayit');
update public.decor_catalog set season_from = '2026-03-10', season_to = '2026-04-05' where id in ('special_sumalak', 'special_yurt');
update public.decor_catalog set season_from = '2026-12-10', season_to = '2027-01-15' where id in ('light_newyear', 'tree_newyear');
update public.decor_catalog set season_from = '2026-05-10', season_to = '2026-05-31' where id = 'light_hayit';

-- ---------- Noyob raqamlar ----------
create table public.decor_serials (
  decor_id text not null references public.decor_catalog, serial int not null check (serial > 0), owner uuid not null references public.profiles on delete cascade, at timestamptz not null default now(), primary key (decor_id, serial)
);
create index decor_serials_owner on public.decor_serials (owner, decor_id);
/* Oldin sotilgan noyoblarga ham raqam beriladi. */
insert into public.decor_serials (decor_id, serial, owner)
  select o.decor_id, row_number() over (partition by o.decor_id order by o.user_id), o.user_id from public.owned_decor o join public.decor_catalog c on c.id = o.decor_id, generate_series(1, o.qty) where c.stock is not null;

create or replace function private.grant_decor(uid uuid, d text) returns void language plpgsql security definer set search_path = '' as $$
declare c public.decor_catalog;
begin
  update public.decor_catalog set sold = sold + 1 where id = d and (stock is null or sold < stock) returning * into c;
  if not found then perform private.fail('sold_out'); end if;
  insert into public.owned_decor as o (user_id, decor_id) values (uid, d) on conflict (user_id, decor_id) do update set qty = o.qty + 1;
  if c.stock is not null then
    insert into public.decor_serials (decor_id, serial, owner) values (d, greatest(c.sold, (select coalesce(max(serial), 0) + 1 from public.decor_serials where decor_id = d)), uid);
  end if;
end $$;

/* Bezak butunlay o'chsa (akkaunt o'chirilganda) raqami ham o'chadi. */
create function private.drop_serials() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  delete from public.decor_serials where owner = old.user_id and decor_id = old.decor_id;
  return old;
end $$;
create trigger owned_decor_serials after delete on public.owned_decor for each row execute function private.drop_serials();

/* Uyda turgan noyob bezaklar: [{id, serial, stock}]. Bir xilidan bir nechta bo'lsa kichik raqamdan. */
create function private.rare_decor(p_plot text) returns jsonb language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'serial', x.serial, 'stock', x.stock) order by x.id, x.serial), '[]') from (
    select c.id, c.stock, s.serial, row_number() over (partition by c.id order by s.serial) as k, (select count(*) from jsonb_each_text(st.places) e where e.value = c.id) as placed
    from public.plot_state st join public.decor_serials s on s.owner = st.owner join public.decor_catalog c on c.id = s.decor_id where st.plot_id = p_plot and st.status <> 'reserved') x where x.k <= x.placed
$$;
create or replace function public.api_plot(p_plot text) returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', p.id, 'district', p.district_id, 'type', p.type, 'value', p.value, 'address', private.address(p.id),
    'open', d.is_open, 'status', case when s.status = 'reserved' and s.reserved_until < now() then 'free' else coalesce(s.status, 'free') end,
    'instagram', s.instagram, 'bio', s.bio, 'tier', s.tier, 'decor', s.decor, 'label', s.label, 'badges', coalesce(pr.badges, '{}'), 'rare', private.rare_decor(p.id),
    'votes', (select count(*) from public.yard_votes v where v.plot_id = p.id and v.week = private.this_week()),
    'since', s.claimed_at, 'price', private.plot_price(p.id))
  from public.plots p join public.districts d on d.id = p.district_id
  left join public.plot_state s on s.plot_id = p.id left join public.profiles pr on pr.user_id = s.owner where p.id = p_plot
$$;

-- ---------- To'plamlar ----------
create table public.decor_sets (
  id text primary key check (id ~ '^[a-z0-9_]{3,40}$'), name_uz text not null, name_ru text not null, discount_pct int not null default 15 check (discount_pct between 0 and 80), is_active boolean not null default true
);
insert into public.decor_sets (id, name_uz, name_ru, discount_pct) values ('dam_olish', 'Dam olish to''plami', 'Набор «Отдых»', 20), ('bolalar', 'Bolalar to''plami', 'Детский набор', 20);
update public.decor_catalog set set_id = 'dam_olish' where id in ('yard_besedka', 'yard_mangal', 'yard_hammock', 'yard_flowers');
update public.decor_catalog set set_id = 'bolalar' where id in ('yard_playground', 'yard_batut', 'yard_basketball');

create function private.set_price(p_set text) returns int language sql stable set search_path = '' as $$
  select ceil(sum(c.price_coins) * (1 - s.discount_pct / 100.0))::int from public.decor_sets s join public.decor_catalog c on c.set_id = s.id where s.id = p_set and s.is_active group by s.discount_pct
$$;
create function public.api_sets() returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'uz', s.name_uz, 'ru', s.name_ru, 'discount', s.discount_pct, 'coins', private.set_price(s.id),
    'items', (select jsonb_agg(c.id order by c.sort) from public.decor_catalog c where c.set_id = s.id)) order by s.id), '[]')
  from public.decor_sets s where s.is_active and exists (select 1 from public.decor_catalog c where c.set_id = s.id)
$$;
create function public.my_buy_set_coins(p_set text) returns int language plpgsql security definer set search_path = '' as $$
declare me public.profiles := private.writable(); c public.decor_catalog; v int := private.set_price(p_set); bal int;
begin
  if not private.flag('coins_enabled') then perform private.fail('coins_off'); end if;
  if v is null then perform private.fail('not_found'); end if;
  for c in select * from public.decor_catalog where set_id = p_set order by id for update loop
    perform private.check_decor_sale(me.user_id, c);
  end loop;
  bal := private.coins(me.user_id, -v, 'set:' || p_set);
  for c in select * from public.decor_catalog where set_id = p_set order by id loop
    perform private.grant_decor(me.user_id, c.id);
  end loop;
  return bal;
end $$;
create function public.admin_set_save(p_id text, p_uz text, p_ru text, p_discount int, p_active boolean) returns void language plpgsql security definer set search_path = '' as $$
begin
  if (private.require('settings')).role <> 'admin' then perform private.fail('forbidden'); end if;
  insert into public.decor_sets (id, name_uz, name_ru, discount_pct, is_active) values (p_id, private.clean_text(p_uz, 40, false), private.clean_text(p_ru, 40, false), p_discount, p_active)
    on conflict (id) do update set name_uz = excluded.name_uz, name_ru = excluded.name_ru, discount_pct = excluded.discount_pct, is_active = excluded.is_active;
  perform private.audit('set:save', jsonb_build_object('id', p_id, 'discount', p_discount, 'active', p_active));
end $$;
create function public.admin_sets() returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require('settings');
  return (select coalesce(jsonb_agg(to_jsonb(s) order by s.id), '[]') from public.decor_sets s);
end $$;

-- ---------- Sovg'a ----------
create function private.placed_qty(uid uuid, d text) returns int language sql stable set search_path = '' as $$
  select count(*)::int from public.plot_state s, jsonb_each_text(s.places) e where s.owner = uid and s.status <> 'reserved' and e.value = d
$$;
create function public.my_gift_decor(p_id text, p_to text, p_message text default '') returns text language plpgsql security definer set search_path = '' as $$
declare me public.profiles := private.writable(); v_to uuid; v_nick text := lower(btrim(coalesce(p_to, ''), ' @')); v_serial int; have int;
begin
  perform private.rate('gift:' || me.user_id, 20, 86400);
  -- Nik uydagi nik bo'yicha, bo'lmasa login bo'yicha.
  select owner into v_to from public.plot_state where lower(instagram) = v_nick and status = 'owned' order by claimed_at limit 1;
  if v_to is null then select user_id, private.public_nick(p) into v_to, v_nick from public.profiles p where login = v_nick; end if;
  if v_to is null or v_to = me.user_id or exists (select 1 from public.profiles where user_id = v_to and is_banned) then perform private.fail('user_not_found'); end if;
  select qty into have from public.owned_decor where user_id = me.user_id and decor_id = p_id for update;
  if coalesce(have, 0) = 0 then perform private.fail('not_owned'); end if;
  -- Hovlida turgani emas, faqat qo'lda bo'sh turgani sovg'a qilinadi.
  if have - private.placed_qty(me.user_id, p_id) < 1 then perform private.fail('decor_in_use'); end if;
  update public.owned_decor set qty = qty - 1 where user_id = me.user_id and decor_id = p_id;
  insert into public.owned_decor as o (user_id, decor_id) values (v_to, p_id) on conflict (user_id, decor_id) do update set qty = o.qty + 1;
  select max(serial) into v_serial from public.decor_serials where decor_id = p_id and owner = me.user_id;
  if v_serial is not null then update public.decor_serials set owner = v_to, at = now() where decor_id = p_id and serial = v_serial; end if;
  perform private.notify(v_to, 'decor_gift', jsonb_build_object('decor', p_id, 'from', private.public_nick(me), 'message', private.clean_text(p_message, 100, true), 'serial', v_serial));
  insert into public.audit_log (actor, action, data) values (me.user_id, 'decor:gift', jsonb_build_object('to', v_to, 'id', p_id, 'serial', v_serial));
  return v_nick;
end $$;

-- ---------- Yangilik xabari (o'chirsa bo'ladi) ----------
alter table public.profiles add column wants_news boolean not null default true;
create function public.my_news(p_on boolean) returns void language plpgsql security definer set search_path = '' as $$
declare me public.profiles := private.me();
begin
  update public.profiles set wants_news = p_on where user_id = me.user_id;
end $$;
create function public.admin_decor_announce(p_id text) returns int language plpgsql security definer set search_path = '' as $$
declare c public.decor_catalog; n int;
begin
  if (private.require('settings')).role <> 'admin' then perform private.fail('forbidden'); end if;
  select * into c from public.decor_catalog where id = p_id and is_active;
  if c.id is null then perform private.fail('not_found'); end if;
  insert into public.notifications (user_id, kind, data) select user_id, 'new_decor', jsonb_build_object('decor', c.id, 'uz', c.name_uz, 'ru', c.name_ru)
    from public.profiles where telegram_id is not null and wants_news and not is_banned;
  get diagnostics n = row_count;
  perform private.audit('decor:announce', jsonb_build_object('id', p_id, 'sent', n));
  return n;
end $$;

-- ---------- Haftaning eng chiroyli hovlisi ----------
create table public.yard_votes (week date not null, voter uuid not null references public.profiles on delete cascade, plot_id text not null references public.plots, at timestamptz not null default now(), primary key (week, voter));
create index yard_votes_plot on public.yard_votes (week, plot_id);
create table public.yard_winners (week date primary key, plot_id text not null, owner uuid references public.profiles on delete set null, instagram text, votes int not null);
/* Hafta Toshkent vaqti bilan dushanbadan boshlanadi. */
create function private.this_week() returns date language sql stable set search_path = '' as $$ select date_trunc('week', now() at time zone 'Asia/Tashkent')::date $$;

create function public.my_yard_vote(p_plot text) returns int language plpgsql security definer set search_path = '' as $$
declare me public.profiles := private.writable(); st public.plot_state;
begin
  perform private.rate('yardvote:' || me.user_id, 20, 86400);
  select * into st from public.plot_state where plot_id = p_plot and status = 'owned';
  if st.plot_id is null then perform private.fail('not_found'); end if;
  if st.owner = me.user_id then perform private.fail('own_house'); end if;
  if (select type from public.plots where id = p_plot) = 'kvartira' then perform private.fail('no_yard'); end if;
  insert into public.yard_votes (week, voter, plot_id) values (private.this_week(), me.user_id, p_plot) on conflict (week, voter) do nothing;
  if not found then perform private.fail('already_voted'); end if;
  return (select count(*) from public.yard_votes where week = private.this_week() and plot_id = p_plot);
end $$;
create function public.api_yards() returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'leaders', (select coalesce(jsonb_agg(q), '[]') from (select v.plot_id as plot, s.instagram, count(*)::int as votes from public.yard_votes v join public.plot_state s on s.plot_id = v.plot_id and s.status = 'owned'
      where v.week = private.this_week() group by 1, 2 order by 3 desc, min(v.at) limit 10) q),
    'winner', (select jsonb_build_object('plot', plot_id, 'instagram', instagram, 'votes', votes, 'week', week) from public.yard_winners order by week desc limit 1))
$$;
/* O'tgan haftaning g'olibi bir marta aniqlanadi: nishon, xabar va reels navbati. */
create function private.close_yard_week() returns void language plpgsql security definer set search_path = '' as $$
declare wk date := private.this_week() - 7; w record; old uuid;
begin
  if exists (select 1 from public.yard_winners where week = wk) then return; end if;
  select v.plot_id, s.owner, s.instagram, count(*)::int as votes into w from public.yard_votes v join public.plot_state s on s.plot_id = v.plot_id and s.status = 'owned' and s.owner <> v.voter
    where v.week = wk group by 1, 2, 3 order by 4 desc, min(v.at) limit 1;
  if w.plot_id is null then return; end if;
  select owner into old from public.yard_winners order by week desc limit 1;
  insert into public.yard_winners (week, plot_id, owner, instagram, votes) values (wk, w.plot_id, w.owner, w.instagram, w.votes) on conflict do nothing;
  if not found then return; end if;
  update public.profiles set badges = array_remove(badges, 'hovli') where user_id = old and user_id <> w.owner;
  perform private.give_badge(w.owner, 'hovli');
  perform private.notify(w.owner, 'yard_winner', jsonb_build_object('plot', w.plot_id, 'votes', w.votes));
  insert into public.video_jobs (kind, plots, style) values ('houses', array[w.plot_id], jsonb_build_object('title', 'Haftaning hovlisi', 'text', w.votes || ' ovoz', 'seconds', 8));
end $$;
alter function public.svc_tick() rename to svc_tick_base;
alter function public.svc_tick_base() set schema private;
revoke all on function private.svc_tick_base() from public, anon, authenticated, service_role;
create function public.svc_tick() returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  perform private.close_yard_week();
  return private.svc_tick_base();
end $$;

-- Nishonlar ro'yxatida haftaning hovlisi ham ko'rinadi.
create or replace function public.api_city(p_districts int[] default null) returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_array(s.plot_id, s.instagram, s.tier, s.wall, s.roof, (select coalesce(jsonb_agg(key || ':' || value), '[]') from jsonb_each_text(s.places)), s.label,
      (select b from unnest(array['hokim','rais','hovli','investor','homiy','asoschi']) b where b = any (pr.badges) limit 1), s.status, s.has_expansion, s.wall_material, s.frame, s.door)), '[]')
  from public.plot_state s join public.plots p on p.id = s.plot_id left join public.profiles pr on pr.user_id = s.owner
  where s.status <> 'reserved' and (p_districts is null or p.district_id = any (p_districts))
$$;

create or replace function public.my_profile() returns jsonb language plpgsql security definer set search_path = '' as $$
declare p public.profiles := private.me();
begin
  update public.profiles set last_seen = now() where user_id = p.user_id and last_seen < now() - interval '1 hour';
  return jsonb_build_object('id', p.user_id, 'login', p.login, 'instagram', p.instagram, 'role', p.role, 'perms', p.perms, 'badges', p.badges, 'avatar', p.avatar,
    'telegram', p.telegram_id is not null, 'coins', p.coins, 'ref', p.ref_code, 'free_used', p.free_used, 'wants_news', p.wants_news,
    'serials', (select coalesce(jsonb_object_agg(decor_id, list), '{}') from (select decor_id, jsonb_agg(serial order by serial) as list from public.decor_serials where owner = p.user_id group by decor_id) x), 'streak', p.streak, 'daily_done', coalesce(p.last_daily = current_date, false),
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

select private.apply_grants();
