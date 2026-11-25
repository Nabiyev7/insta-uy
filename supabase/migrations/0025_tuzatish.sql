/* 6a-qadam (TUZATISH-1): parol yo'li bayroqcha ortida, premium uy yashirilgan, yangi tanga paketlari, admin sinov rejimi va boshqalar. */
set check_function_bodies = off;

-- ---------- 5. Login + parol: kodda qoladi, `password_login` (sukut — false) ortida ----------
insert into public.settings (key, value, is_public) values ('password_login', 'false', true) on conflict (key) do nothing;
create function public.svc_password_login() returns boolean language sql stable security definer set search_path = '' as $$ select private.flag('password_login') $$;
create function public.svc_login_free(p_login text) returns boolean language sql stable security definer set search_path = '' as $$ select not exists (select 1 from public.profiles where login = p_login) $$;
create function public.svc_reset_begin(p_user uuid, p_code_hash text) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.flag('password_login') then perform private.fail('forbidden'); end if;
  delete from public.tg_tokens where purpose = 'reset' and user_id = p_user;
  insert into public.tg_tokens (token_hash, purpose, user_id, code_hash, expires_at) values ('reset:' || p_user, 'reset', p_user, p_code_hash, now() + interval '10 minutes');
end $$;
/* 5 ta urinish, keyin kod o'chadi. */
create function public.svc_reset_check(p_user uuid, p_code_hash text) returns boolean language plpgsql security definer set search_path = '' as $$
declare t public.tg_tokens;
begin
  if not private.flag('password_login') then return false; end if;
  select * into t from public.tg_tokens where purpose = 'reset' and user_id = p_user and expires_at > now() for update;
  if t.token_hash is null then return false; end if;
  if t.code_hash = p_code_hash then delete from public.tg_tokens where token_hash = t.token_hash; return true; end if;
  if t.attempts >= 4 then delete from public.tg_tokens where token_hash = t.token_hash;
  else update public.tg_tokens set attempts = attempts + 1 where token_hash = t.token_hash; end if;
  return false;
end $$;
/* Parol yo'li yoqilgan bo'lsa, Telegram'siz akkaunt ham to'liq ishlaydi (eski holat). */
create or replace function private.writable() returns public.profiles language plpgsql stable security definer set search_path = '' as $$
declare p public.profiles := private.me();
begin
  if private.flag('maintenance') and p.role = 'user' then perform private.fail('maintenance'); end if;
  if p.telegram_id is null and p.role = 'user' and not private.flag('password_login') then perform private.fail('telegram_required'); end if;
  return p;
end $$;
create or replace function public.svc_player(p_id uuid) returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('login', p.login, 'instagram', p.instagram, 'is_banned', p.is_banned, 'avatar', p.avatar, 'is_moderator', private.can_moderate(p),
    'can_write', p.telegram_id is not null or p.role <> 'user' or private.flag('password_login'),
    'homes', (select coalesce(jsonb_agg(distinct pl.district_id), '[]') from public.plot_state s join public.plots pl on pl.id = s.plot_id where s.owner = p.user_id and s.status = 'owned'))
  from public.profiles p where p.user_id = p_id
$$;

-- ---------- 6. Premium uy — sotuvdan olinadi (kod bayroqcha ortida; narxlarni keyin egasi belgilaydi) ----------
insert into public.settings (key, value, is_public) values ('premium_house_enabled', 'false', true) on conflict (key) do nothing;

-- ---------- 7. Tanga paketlari: 5 ta, Stars narxi alohida (yaxlit), kamida 50 ⭐ ----------
update public.settings set value = (value - 'packs') || '{"starsMin":50,"packs":[
  {"coins":500,"bonus":0,"uzs":3000,"stars":null},
  {"coins":1000,"bonus":200,"uzs":6000,"stars":null},
  {"coins":2500,"bonus":500,"uzs":12000,"stars":60},
  {"coins":5500,"bonus":1500,"uzs":25000,"stars":125,"tag":"popular"},
  {"coins":12000,"bonus":4000,"uzs":50000,"stars":250,"tag":"best"}]}' where key = 'premium';

/* Stars narxi: paket — o'z `stars` maydoni; boshqalar — kurs bo'yicha. 50 ⭐ dan kam bo'lsa null (Stars'da sotilmaydi). */
create function private.stars_price(p_kind text, p jsonb, p_uzs int) returns int language sql stable set search_path = '' as $$
  select case when v >= private.num('premium.starsMin', 50) then v end
  from (select case when p_kind = 'coins' then (private.pack(case when (p ->> 'pack') ~ '^[1-9]$' then (p ->> 'pack')::int end) ->> 'stars')::int else private.stars_of(p_uzs) end as v) x
$$;

create or replace function private.quote(me public.profiles, p_kind text, p jsonb) returns int language plpgsql security definer set search_path = '' as $$
declare c public.decor_catalog; pl public.plots; v_tier int; pk jsonb;
begin
  if p_kind = 'commerce' and private.setting('commerce_closed') ? (p ->> 'id') then perform private.fail('not_for_sale'); end if;
  if p_kind = 'coins' then
    pk := private.pack(case when (p ->> 'pack') ~ '^[1-9]$' then (p ->> 'pack')::int end);
    if pk is null then perform private.fail('not_found'); end if;
    return (pk ->> 'uzs')::int;
  elsif p_kind = 'salute' then
    perform private.clean_salute(p ->> 'text');
    return private.num('premium.salute.uzs', 10000)::int;
  elsif p_kind = 'plot' then
    -- Pulga uchastka (premium uy) hozircha yopiq; admin sinov rejimida ochiq.
    if not private.flag('premium_house_enabled') and not private.is_tester(me) then perform private.fail('not_for_sale'); end if;
    select * into pl from public.plots where id = p ->> 'plot';
    if pl.type = 'kvartira' and not private.is_tester(me) then perform private.fail('apartments_closed'); end if;
    v_tier := coalesce((p ->> 'tier')::int, 1);
    if v_tier not between 1 and private.max_tier() then perform private.fail('bad_format'); end if;
    perform private.quote_base(me, p_kind, jsonb_build_object('plot', pl.id, 'instagram', coalesce(me.instagram, p ->> 'instagram')));
    return private.house_price(pl.type, v_tier);
  elsif p_kind = 'decor' then
    select * into c from public.decor_catalog where id = p ->> 'id';
    if c.id is null or not c.is_active then perform private.fail('not_found'); end if;
    if not private.in_season(c.season_from, c.season_to) then perform private.fail('out_of_season'); end if;
  elsif p_kind = 'tier' and coalesce((p ->> 'tier')::int, 0) > private.max_tier() then perform private.fail('bad_format');
  end if;
  return private.quote_base(me, p_kind, p);
end $$;
revoke all on function private.quote(public.profiles, text, jsonb) from public;

-- ---------- 8. Admin sinov rejimi: cheklov yo'q, tanga yechilmaydi, pulli narsa to'lovsiz; hammasi `is_test` ----------
alter table public.profiles add column test_mode boolean not null default true;
alter table public.plot_state add column is_test boolean not null default false;
alter table public.owned_decor add column is_test boolean not null default false;
alter table public.orders add column is_test boolean not null default false;
alter table public.payments add column is_test boolean not null default false;
drop index public.orders_pay_amount;
create unique index orders_pay_amount on public.orders (pay_amount) where status = 'pending' and provider not in ('stars','test');

/* Faqat admin roli + yoqilgan bayroqcha (serverda; mijozga ishonilmaydi). */
create function private.is_tester(p public.profiles) returns boolean language sql stable set search_path = '' as $$ select coalesce(p.role = 'admin' and p.test_mode, false) $$;
create function private.is_tester_uid(uid uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select role = 'admin' and test_mode from public.profiles where user_id = uid), false)
$$;
create function public.my_test_mode(p_on boolean) returns boolean language plpgsql security definer set search_path = '' as $$
declare me public.profiles := private.me();
begin
  if me.role <> 'admin' then perform private.fail('forbidden'); end if;
  update public.profiles set test_mode = p_on where user_id = me.user_id;
  return p_on;
end $$;

/* Sinovchi yaratgan hamma narsa avtomatik `is_test`. */
create function private.mark_test() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.is_test := new.is_test or private.is_tester_uid(new.user_id);
  return new;
end $$;
create function private.mark_test_plot() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.is_test := new.is_test or private.is_tester_uid(new.owner);
  return new;
end $$;
create trigger plot_state_test before insert or update of owner on public.plot_state for each row execute function private.mark_test_plot();
create trigger owned_decor_test before insert or update on public.owned_decor for each row execute function private.mark_test();
create trigger orders_test before insert on public.orders for each row execute function private.mark_test();

/* Chastota chegarasi sinovchiga yo'q. */
create or replace function private.rate(k text, max_hits int, seconds int) returns void language plpgsql security definer set search_path = '' as $$
declare b bigint := floor(extract(epoch from now()) / seconds); n int;
begin
  if private.is_tester_uid(auth.uid()) then return; end if;
  insert into public.rate_limits as r (key, bucket) values (k || '/' || seconds, b) on conflict (key, bucket) do update set hits = r.hits + 1 returning hits into n;
  if n > max_hits then perform private.fail('rate_limited'); end if;
end $$;
/* Sinovchining o'z xaridlari uchun tanga yechilmaydi (o'tkazma va admin amallaridan tashqari). */
create or replace function private.coins(uid uuid, delta int, why text) returns int language plpgsql security definer set search_path = '' as $$
declare bal int;
begin
  if delta < 0 and uid = auth.uid() and why not in ('send','admin','refund') and private.is_tester_uid(uid) then
    insert into public.coin_ledger (user_id, delta, reason) values (uid, 0, 'test:' || why);
    return (select coins from public.profiles where user_id = uid);
  end if;
  update public.profiles set coins = coins + delta where user_id = uid and coins + delta >= 0 returning coins into bal;
  if bal is null then perform private.fail('not_enough_coins'); end if;
  insert into public.coin_ledger (user_id, delta, reason) values (uid, delta, why);
  return bal;
end $$;
/* Level cheklovi sinovchiga yo'q (sotuv). */
create or replace function private.check_decor_sale(uid uuid, c public.decor_catalog) returns void language plpgsql stable set search_path = '' as $$
begin
  if c.id is null or not c.is_active then perform private.fail('not_found'); end if;
  if not private.in_season(c.season_from, c.season_to) then perform private.fail('out_of_season'); end if;
  if c.min_level > 1 and private.best_tier(uid) < c.min_level and not private.is_tester_uid(uid) then perform private.fail('level_low'); end if;
end $$;
/* Joylashtirish: sinovchiga level, joylar soni va pulli nusxa cheklovi yo'q (nuqta turi va egalik qoladi). */
alter function public.my_place_decor(text, jsonb) set schema private;
alter function private.my_place_decor(text, jsonb) rename to place_decor_base;
create function public.my_place_decor(p_plot text, p_places jsonb) returns void language plpgsql security definer set search_path = '' as $$
declare st public.plot_state;
begin
  if not private.is_tester(private.me()) then perform private.place_decor_base(p_plot, p_places); return; end if;
  st := private.own_plot(p_plot);
  if jsonb_typeof(p_places) is distinct from 'object' or exists (select 1 from jsonb_each_text(p_places) e left join public.decor_anchors a on a.id = e.key left join public.decor_catalog c on c.id = e.value
      where a.id is null or c.id is null) then perform private.fail('bad_format'); end if;
  if exists (select 1 from jsonb_each_text(p_places) e join public.decor_anchors a on a.id = e.key join public.decor_catalog c on c.id = e.value where not a.kind = any (c.spots)) then perform private.fail('wrong_spot'); end if;
  if exists (select 1 from (select value as d, count(*) as k from jsonb_each_text(p_places) group by value) x
      where x.k + (select count(*) from public.plot_state o, jsonb_each_text(o.places) e where o.owner = st.owner and o.plot_id <> p_plot and o.status <> 'reserved' and e.value = x.d)
        > coalesce((select qty from public.owned_decor where user_id = st.owner and decor_id = x.d), 0)) then perform private.fail('not_owned'); end if;
  update public.plot_state set places = p_places where plot_id = p_plot;
end $$;
/* Sinov: uyni 1–5 istalgan levelga darhol. */
create function public.my_test_tier(p_plot text, p_tier int) returns void language plpgsql security definer set search_path = '' as $$
declare st public.plot_state := private.own_plot(p_plot);
begin
  if not private.is_tester(private.me()) then perform private.fail('forbidden'); end if;
  if p_tier not between 1 and private.max_tier() then perform private.fail('bad_format'); end if;
  update public.plot_state set tier = p_tier where plot_id = st.plot_id;
end $$;
/* Sinov xaridi: to'lovsiz, lekin haqiqiy buyurtma yo'li (`is_test`, daromadga kirmaydi). */
create function public.my_test_purchase(p_kind text, p_payload jsonb) returns jsonb language plpgsql security definer set search_path = '' as $$
declare me public.profiles := private.me(); v_amount int; o public.orders; v_pay bigint;
begin
  if not private.is_tester(me) then perform private.fail('forbidden'); end if;
  if p_kind not in ('coins','plot','decor','salute','tier','label','expansion') then perform private.fail('bad_format'); end if;
  v_amount := private.quote(me, p_kind, p_payload);
  insert into public.orders (user_id, kind, payload, amount, pay_amount, provider, expires_at, is_test)
    values (me.user_id, p_kind, p_payload, v_amount, v_amount, 'test', now() + interval '5 minutes', true) returning * into o;
  insert into public.payments (provider, external_id, amount, order_id, status, is_test) values ('test', o.id::text, v_amount, o.id, 'unmatched', true) returning id into v_pay;
  return jsonb_build_object('result', private.settle(o.id, v_pay), 'order', o.id);
end $$;
/* Ochilishdan oldin: admin sinov uylari, bezaklari, buyurtmalari o'chadi, uchastkalar bo'shaydi. */
create function public.admin_test_cleanup() returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_plots int; v_decor int; v_orders int;
begin
  if (private.require('settings')).role <> 'admin' then perform private.fail('forbidden'); end if;
  select count(*) into v_plots from public.plot_state where is_test;
  perform private.release_plot(plot_id, 'test') from public.plot_state where is_test and status <> 'reserved';
  delete from public.plot_state where is_test;
  delete from public.owned_decor where is_test;
  get diagnostics v_decor = row_count;
  delete from public.payments where is_test or order_id in (select id from public.orders where is_test);
  delete from public.orders where is_test;
  get diagnostics v_orders = row_count;
  perform private.audit('test_cleanup', jsonb_build_object('plots', v_plots, 'decor', v_decor, 'orders', v_orders));
  return jsonb_build_object('plots', v_plots, 'decor', v_decor, 'orders', v_orders);
end $$;

create or replace function public.my_claim(p_plot text, p_instagram text default null, p_bio text default '') returns jsonb language plpgsql security definer set search_path = '' as $$
declare me public.profiles := private.writable(); pl public.plots; nick text; st public.plot_state; is_test boolean := private.is_tester(me);
begin
  perform private.rate('claim:' || me.user_id, 10, 3600);
  if not private.flag('free_claim_enabled') then perform private.fail('free_closed'); end if;
  select * into me from public.profiles where user_id = me.user_id for update;
  if me.free_used and not is_test then perform private.fail('free_used'); end if;
  nick := coalesce(me.instagram, private.clean_instagram(p_instagram));
  select * into pl from public.plots where id = p_plot;
  if pl.id is null then perform private.fail('not_found'); end if;
  -- Admin sinov rejimida: yopiq tuman, villa/qasr/kvartira va bir nechta bepul uy mumkin.
  if not is_test then
    if pl.type = 'kvartira' then perform private.fail('apartments_closed'); end if;
    if pl.type <> 'hovli' then perform private.fail('paid_only'); end if;
    if not (select is_open from public.districts where id = pl.district_id) then perform private.fail('district_closed'); end if;
  end if;
  if coalesce(p_bio, '') ~* '(https?://|www\.|t\.me/)' then perform private.fail('bad_format'); end if;
  if (private.nick_taken(me.user_id, nick) and not is_test) or (me.instagram is null and exists (select 1 from public.profiles where lower(instagram) = nick)) then perform private.fail('nick_taken'); end if;
  select * into st from public.plot_state where plot_id = p_plot for update;
  if st.plot_id is not null and (st.status <> 'reserved' or st.reserved_until > now()) then perform private.fail('not_free'); end if;
  delete from public.plot_state where plot_id = p_plot and status = 'reserved' and reserved_until <= now();
  insert into public.plot_state (plot_id, status, owner, instagram, bio, is_free) values (p_plot, 'owned', me.user_id, nick, private.clean_text(p_bio, 120, true), not is_test)
    on conflict (plot_id) do nothing;
  if not found then perform private.fail('not_free'); end if;
  update public.profiles set free_used = free_used or not is_test, instagram = coalesce(instagram, nick) where user_id = me.user_id;
  -- Sinov uyi asoschilar joyini egallamaydi.
  if not is_test then perform private.found_city(me.user_id); end if;
  insert into public.ownership_log (plot_id, to_user, reason) values (p_plot, me.user_id, 'free');
  perform private.pay_referral(me.user_id);
  return jsonb_build_object('status', 'owned', 'address', private.address(p_plot));
end $$;
create or replace function public.my_send_coins(p_to text, p_amount int) returns jsonb language plpgsql security definer set search_path = '' as $$
declare me public.profiles := private.coins_on(); target public.profiles; nick text := private.clean_instagram(p_to); bal int;
begin
  if p_amount is null or p_amount < 1 or p_amount > 100000 then perform private.fail('bad_format'); end if;
  perform private.rate('coins_send:' || me.user_id, 10, 3600);
  select * into target from public.profiles where lower(instagram) = nick;
  if target.user_id is null then perform private.fail('user_not_found'); end if;
  if target.user_id = me.user_id or target.telegram_id = me.telegram_id then perform private.fail('self_transfer'); end if;
  if not private.can_trade(me.user_id) or not private.can_trade(target.user_id) then perform private.fail('trade_needs_house'); end if;
  -- Ikkala tomon bir tartibda qulflanadi (bir vaqtda qarama-qarshi o'tkazmada tiqilib qolmasin).
  perform 1 from public.profiles where user_id in (me.user_id, target.user_id) order by user_id for update;
  if not private.is_tester(me) then
    if private.sent_today(me.user_id) + p_amount > private.num('coins.sendDay', 500) then perform private.fail('send_limit'); end if;
    if private.received_today(target.user_id) + p_amount > private.num('coins.receiveDay', 1000) then perform private.fail('receive_limit'); end if;
  end if;
  bal := private.coins(me.user_id, -p_amount, 'send');
  perform private.coins(target.user_id, p_amount, 'receive');
  insert into public.coin_transfers (from_user, to_user, from_nick, to_nick, amount) values (me.user_id, target.user_id, me.instagram, target.instagram, p_amount);
  perform private.notify(target.user_id, 'coins_got', jsonb_build_object('nick', me.instagram, 'amount', p_amount));
  return jsonb_build_object('coins', bal, 'sent', private.sent_today(me.user_id));
end $$;
create or replace function public.admin_stats() returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if (private.me()).role = 'user' then perform private.fail('forbidden'); end if;
  return jsonb_build_object(
    'users', (select count(*) from public.profiles), 'owned', (select count(*) from public.plot_state where status = 'owned'),
    'streets', (select count(*) from public.streets where pending_name is not null), 'ads', (select count(*) from public.commerce_state where status = 'review'),
    'waitlist', (select count(*) from public.waitlist), 'telegram', (select count(*) from public.profiles where telegram_id is not null),
    'revenue', case when (private.me()).role = 'admin' then (select coalesce(sum(amount), 0) from public.orders where status = 'paid' and not is_test) end,
    'days', (select jsonb_agg(jsonb_build_object('day', d::date, 'active', (select count(distinct user_id) from public.daily_active a where a.day = d::date),
       'signups', (select count(*) from public.profiles where created_at::date = d::date), 'claims', (select count(*) from public.plot_state where claimed_at::date = d::date and status <> 'reserved')) order by d)
       from generate_series(current_date - 13, current_date, interval '1 day') d),
    'districts', (select jsonb_agg(jsonb_build_object('id', d.id, 'name', d.name_uz, 'open', d.is_open, 'total', (select count(*) from public.plots where district_id = d.id),
       'taken', (select count(*) from public.plot_state s join public.plots p on p.id = s.plot_id where p.district_id = d.id and s.status <> 'reserved')) order by d.id) from public.districts d));
end $$;
create or replace function public.my_profile() returns jsonb language plpgsql security definer set search_path = '' as $$
declare p public.profiles := private.me();
begin
  update public.profiles set last_seen = now() where user_id = p.user_id and last_seen < now() - interval '1 hour';
  return jsonb_build_object('id', p.user_id, 'login', p.login, 'instagram', p.instagram, 'role', p.role, 'perms', p.perms, 'badges', p.badges, 'avatar', p.avatar,
    'telegram', p.telegram_id is not null, 'coins', p.coins, 'ref', p.ref_code, 'free_used', p.free_used, 'wants_news', p.wants_news,
    'serials', (select coalesce(jsonb_object_agg(decor_id, list), '{}') from (select decor_id, jsonb_agg(serial order by serial) as list from public.decor_serials where owner = p.user_id group by decor_id) x), 'streak', p.streak, 'daily_done', coalesce(p.last_daily = current_date, false), 'daily_next', private.next_streak(p),
    'channel_paid', p.channel_paid, 'test_mode', private.is_tester(p), 'sent_today', private.sent_today(p.user_id),
    'treasures_today', (select count(*) from public.treasure_claims where day = current_date and user_id = p.user_id),
    'invited', (select count(*) from public.profiles where referred_by = p.user_id and referral_paid),
    'plots', (select coalesce(jsonb_agg(jsonb_build_object('plot', s.plot_id, 'status', s.status, 'address', private.address(s.plot_id), 'instagram', s.instagram, 'bio', s.bio,
       'tier', s.tier, 'wall', s.wall, 'roof', s.roof, 'decor', s.decor, 'places', s.places, 'material', s.wall_material, 'frame', s.frame, 'door', s.door, 'label', s.label, 'has_expansion', s.has_expansion,
       'expansion', (select id from public.expansions e where e.plot_id = s.plot_id), 'is_test', s.is_test) order by s.claimed_at), '[]') from public.plot_state s where s.owner = p.user_id and s.status <> 'reserved'),
    'decor', (select coalesce(jsonb_object_agg(decor_id, qty), '{}') from public.owned_decor where user_id = p.user_id and qty > 0),
    'transfers', (select coalesce(jsonb_agg(jsonb_build_object('id', t.id, 'plot', t.plot_id, 'from', private.public_nick(f), 'message', t.message)), '[]')
       from public.transfers t join public.profiles f on f.user_id = t.from_user where t.to_user = p.user_id and t.status = 'pending'),
    'notes', (select coalesce(jsonb_agg(jsonb_build_object('id', n.id, 'kind', n.kind, 'data', n.data, 'at', n.created_at) order by n.id desc), '[]')
       from (select * from public.notifications where user_id = p.user_id and read_at is null order by id desc limit 30) n));
end $$;

/* Bot buyurtmasi: Stars narxi alohida, 50 ⭐ dan kam — sotilmaydi. */
create or replace function public.svc_stars_order(p_telegram bigint, p_kind text, p_payload jsonb) returns jsonb language plpgsql security definer set search_path = '' as $$
declare me public.profiles; v_amount int; v_stars int; o public.orders; mins int := private.num('reserve_minutes', 30)::int;
begin
  if not private.flag('payments_enabled') then perform private.fail('payments_off'); end if;
  select * into me from public.profiles where telegram_id = p_telegram;
  if me.user_id is null then perform private.fail('user_not_found'); end if;
  if me.is_banned then perform private.fail('banned'); end if;
  if p_kind not in ('coins','plot','decor','salute','tier') then perform private.fail('bad_format'); end if;
  perform private.rate('order:' || me.user_id, 15, 3600);
  if (select count(*) from public.orders where user_id = me.user_id and status = 'pending' and expires_at > now()) >= 3 then perform private.fail('too_many_orders'); end if;
  if p_kind = 'plot' and exists (select 1 from public.orders where user_id = me.user_id and kind = 'plot' and status = 'pending' and expires_at > now()) then perform private.fail('too_many_orders'); end if;
  perform pg_catalog.pg_advisory_xact_lock(421001); -- band qilish ketma-ket (my_order bilan bir xil)
  v_amount := private.quote(me, p_kind, p_payload);
  -- Stars narxi kamida 50 ⭐ (premium.starsMin); kichik paketlar va arzon tovarlar faqat karta/tanga bilan.
  v_stars := private.stars_price(p_kind, p_payload, v_amount);
  if v_stars is null then perform private.fail('stars_unavailable'); end if;
  insert into public.orders (user_id, kind, payload, amount, pay_amount, provider, expires_at)
    values (me.user_id, p_kind, p_payload, v_amount, v_stars, 'stars', now() + make_interval(mins => mins)) returning * into o;
  if p_kind = 'plot' then
    delete from public.plot_state where plot_id = p_payload ->> 'plot' and status = 'reserved';
    insert into public.plot_state (plot_id, status, owner, reserved_until, reserved_order) values (p_payload ->> 'plot', 'reserved', me.user_id, o.expires_at, o.id);
  end if;
  return jsonb_build_object('id', o.id, 'stars', o.pay_amount, 'title', private.order_title(p_kind, p_payload));
end $$;

create function public.svc_premium() returns jsonb language sql stable security definer set search_path = '' as $$ select private.setting('premium') $$;

-- ---------- 11.2. Telegram xabarlari saytda emas, botda: /stop va /xabar ----------
create function public.svc_news(p_telegram bigint, p_on boolean) returns void language sql security definer set search_path = '' as $$
  update public.profiles set wants_news = p_on where telegram_id = p_telegram
$$;

-- ---------- 9. Egasi (ADMIN_TELEGRAM_ID) birinchi kirishdayoq admin ----------
create function public.svc_make_admin(p_telegram bigint) returns void language sql security definer set search_path = '' as $$
  update public.profiles set role = 'admin' where telegram_id = p_telegram and role <> 'admin'
$$;

-- ---------- 10.6. Uyni sovg'a qilish olib tashlandi (faqat bezak sovg'asi qoladi) ----------
update public.transfers set status = 'cancelled' where status = 'pending';
drop function if exists public.my_transfer(text, text, text);
drop function if exists public.my_transfer_answer(uuid, boolean, text);

-- ---------- 11.6–11.7. Faqat yurak; "Haftaning hovlisi" — bot so'rovnomasi (eng ko'p yurak olgan 5 uy, 48 soat) ----------
create table public.yard_polls (
  week date primary key, poll_id int references public.polls on delete set null, plots text[] not null, status text not null default 'open' check (status in ('open','closed','cancelled')),
  ends_at timestamptz not null, winner_plot text
);
alter table public.broadcasts drop constraint broadcasts_target_check;
alter table public.broadcasts add constraint broadcasts_target_check check (target in ('all','district','waitlist','channel'));

/* O'tgan hafta eng ko'p yurak olgan uylar (egali, 5 ta). */
create function private.yard_candidates(p_week date) returns text[] language sql stable set search_path = '' as $$
  select coalesce(array_agg(plot_id order by n desc, plot_id), '{}') from (
    select h.plot_id, count(*) n from public.hearts h join public.plot_state s on s.plot_id = h.plot_id and s.status = 'owned'
    where (h.at at time zone 'Asia/Tashkent')::date >= p_week - 7 and (h.at at time zone 'Asia/Tashkent')::date < p_week group by 1 order by 2 desc, 1 limit 5) x
$$;
/* So'rovnomani boshlash: variantlar — "@nik"; bot matniga uy havolalarini server qo'shadi. */
create function private.start_yard_poll(p_week date, p_plots text[]) returns int language plpgsql security definer set search_path = '' as $$
declare v_poll int; v_opts text[];
begin
  select array_agg(coalesce('@' || s.instagram, u.p) order by u.k) into v_opts from unnest(p_plots) with ordinality u(p, k) left join public.plot_state s on s.plot_id = u.p;
  if coalesce(cardinality(v_opts), 0) < 2 then return null; end if;
  insert into public.polls (question, options) values ('🌷 Haftaning hovlisi — eng chiroyli hovliga ovoz bering! / Двор недели — голосуйте!', v_opts) returning id into v_poll;
  insert into public.yard_polls (week, poll_id, plots, ends_at) values (p_week, v_poll, p_plots, now() + interval '48 hours')
    on conflict (week) do update set poll_id = excluded.poll_id, plots = excluded.plots, status = 'open', ends_at = excluded.ends_at, winner_plot = null;
  perform private.queue_broadcast((select question from public.polls where id = v_poll), 'all', null, v_poll);
  return v_poll;
end $$;
/* Cron (svc_tick ichida): dushanba — boshlash; 48 soatdan keyin — g'olib, 2 000 tanga, nishon, e'lon (bot va kanal). */
create or replace function private.close_yard_week() returns void language plpgsql security definer set search_path = '' as $$
declare wk date := private.this_week(); y public.yard_polls; w record; old uuid; v_owner uuid; v_bid int; v_text text;
begin
  if not exists (select 1 from public.yard_polls where week = wk) then perform private.start_yard_poll(wk, private.yard_candidates(wk)); end if;
  for y in select * from public.yard_polls where status = 'open' and ends_at < now() for update loop
    update public.polls set is_open = false where id = y.poll_id;
    select y.plots[v.option] as plot_id, count(*)::int as votes into w from public.poll_votes v where v.poll_id = y.poll_id group by v.option order by 2 desc, v.option limit 1;
    update public.yard_polls set status = 'closed', winner_plot = w.plot_id where week = y.week;
    continue when w.plot_id is null;
    select owner into old from public.yard_winners order by week desc limit 1;
    insert into public.yard_winners (week, plot_id, owner, instagram, votes) select y.week, s.plot_id, s.owner, s.instagram, w.votes from public.plot_state s where s.plot_id = w.plot_id
      on conflict (week) do nothing;
    v_owner := (select owner from public.plot_state where plot_id = w.plot_id);
    update public.profiles set badges = array_remove(badges, 'hovli') where user_id = old and user_id is distinct from v_owner;
    perform private.give_badge(v_owner, 'hovli');
    perform private.coins(v_owner, private.num('coins.yardWinner', 2000)::int, 'yard_winner');
    perform private.notify(v_owner, 'yard_winner', jsonb_build_object('plot', w.plot_id, 'votes', w.votes));
    v_text := '🏆 Haftaning hovlisi: @' || coalesce((select instagram from public.yard_winners where week = y.week), '') || ' (' || w.votes || ' ovoz). Tabriklaymiz! / Двор недели!';
    perform private.queue_broadcast(v_text, 'all', null, null);
    -- Kanalga e'lon: navbatdagi chat = 0 → server kanalga yuboradi.
    insert into public.broadcasts (text, target, total) values (v_text, 'channel', 1) returning id into v_bid;
    insert into public.broadcast_queue (broadcast_id, chat) values (v_bid, 0);
  end loop;
end $$;
/* O'z uyiga ovoz yo'q. */
create or replace function public.svc_poll_vote(p_telegram bigint, p_poll int, p_option int) returns text language plpgsql security definer set search_path = '' as $$
declare p public.polls; y public.yard_polls;
begin
  select * into p from public.polls where id = p_poll;
  if p.id is null or not p.is_open then return 'closed'; end if;
  if p_option not between 1 and cardinality(p.options) then perform private.fail('bad_format'); end if;
  select * into y from public.yard_polls where poll_id = p_poll;
  if y.week is not null and exists (select 1 from public.plot_state s join public.profiles pr on pr.user_id = s.owner where s.plot_id = y.plots[p_option] and pr.telegram_id = p_telegram) then return 'own'; end if;
  insert into public.poll_votes (poll_id, telegram_id, option) values (p_poll, p_telegram, p_option) on conflict (poll_id, telegram_id) do update set option = excluded.option, at = now();
  return p.options[p_option];
end $$;
/* Navbatdan olishda hovli so'rovnomasining uchastkalari ham (bot matniga havola). */
create or replace function public.svc_broadcast_next(p_limit int) returns jsonb language plpgsql security definer set search_path = '' as $$
declare ids bigint[]; res jsonb;
begin
  ids := array(select id from public.broadcast_queue order by id limit greatest(1, least(p_limit, 1000)) for update skip locked);
  select coalesce(jsonb_agg(jsonb_build_object('chat', q.chat, 'text', b.text, 'poll', b.poll_id, 'options', p.options, 'plots', y.plots) order by q.id), '[]') into res
    from public.broadcast_queue q join public.broadcasts b on b.id = q.broadcast_id left join public.polls p on p.id = b.poll_id left join public.yard_polls y on y.poll_id = b.poll_id where q.id = any (ids);
  delete from public.broadcast_queue where id = any (ids);
  return res;
end $$;
/* Admin: nomzodlarni qo'lda almashtirib, so'rovnomani hoziroq boshlash (bo'sh — avtomatik nomzodlar). */
create function public.admin_yard_start(p_plots text[] default null) returns int language plpgsql security definer set search_path = '' as $$
declare v_plots text[];
begin
  if (private.require('settings')).role <> 'admin' then perform private.fail('forbidden'); end if;
  v_plots := coalesce(p_plots, private.yard_candidates(private.this_week()));
  if cardinality(v_plots) not between 2 and 6 or exists (select 1 from unnest(v_plots) x where not exists (select 1 from public.plot_state s where s.plot_id = x and s.status = 'owned')) then perform private.fail('bad_format'); end if;
  update public.polls set is_open = false where id in (select poll_id from public.yard_polls where week = private.this_week() and status = 'open');
  perform private.audit('yard_start', jsonb_build_object('plots', v_plots));
  return private.start_yard_poll(private.this_week(), v_plots);
end $$;
create function public.admin_yard() returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require('settings');
  return jsonb_build_object('candidates', private.yard_candidates(private.this_week()),
    'current', (select to_jsonb(y) from public.yard_polls y order by week desc limit 1));
end $$;
/* Saytda Top → "Haftaning hovlisi": faqat o'tgan haftalar g'oliblari. */
create or replace function public.api_yards() returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('leaders', '[]'::jsonb,
    'winner', (select jsonb_build_object('plot', plot_id, 'instagram', instagram, 'votes', votes, 'week', week) from public.yard_winners order by week desc limit 1),
    'winners', (select coalesce(jsonb_agg(jsonb_build_object('plot', plot_id, 'instagram', instagram, 'votes', votes, 'week', week) order by week desc), '[]') from (select * from public.yard_winners order by week desc limit 12) w))
$$;

select private.apply_grants();
