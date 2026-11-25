/* 6-qadam, D: tanga. Topish faqat shulardan: asoschi 1 000, kunlik 100 (7-kun +300, bir kun o'tkazilsa seriya noldan),
   kanalga obuna 300 (bir marta), do'st taklifi 500, "Haftaning hovlisi" 2 000, xazina 50 (kuniga 3 ta).
   Topshiriqlar olib tashlandi. Tanga o'tkazish: kuniga yuborish <= 500, qabul <= 1 000, komissiya yo'q. */
set check_function_bodies = off;

update public.settings set value = (value - 'quest' - 'streakStep' - 'tierBase')
  || '{"founder":1000,"daily":100,"streakBonus":300,"channel":300,"referral":500,"yardWinner":2000,"treasure":50,"treasurePerDay":3,"treasureSlots":100000,"sendDay":500,"receiveDay":1000}'
  where key = 'coins';

-- ---------- Topshiriqlar yo'q ----------
drop function if exists public.my_quests();
drop function if exists public.my_quest_claim(text);
drop function if exists private.quest_ok(uuid, text);
drop table if exists public.quest_claims;
drop table if exists public.quest_telegram;

-- ---------- Shahar asoschisi: nishon + 1 000 tanga ----------
create or replace function private.found_city(uid uuid) returns boolean language plpgsql security definer set search_path = '' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('founders'));
  if (select count(*) from public.profiles where 'asoschi' = any (badges)) >= private.num('founder_limit', 100) then return false; end if;
  if exists (select 1 from public.profiles where user_id = uid and 'asoschi' = any (badges)) then return false; end if;
  perform private.give_badge(uid, 'asoschi');
  perform private.coins(uid, private.num('coins.founder', 1000)::int, 'founder');
  return true;
end $$;

-- ---------- Kunlik kirish: 1..7 kun aylanadi, 7-kuni bonus ----------
create function private.next_streak(p public.profiles) returns int language sql stable set search_path = '' as $$
  select case when p.last_daily = current_date - 1 then p.streak % 7 + 1 else 1 end
$$;
create or replace function public.my_daily() returns jsonb language plpgsql security definer set search_path = '' as $$
declare me public.profiles := private.coins_on(); v_streak int; gain int;
begin
  select * into me from public.profiles where user_id = me.user_id for update;
  if me.last_daily = current_date then perform private.fail('already_claimed'); end if;
  v_streak := private.next_streak(me);
  gain := private.num('coins.daily', 100)::int + case when v_streak = 7 then private.num('coins.streakBonus', 300)::int else 0 end;
  update public.profiles set last_daily = current_date, streak = v_streak where user_id = me.user_id;
  return jsonb_build_object('gain', gain, 'streak', v_streak, 'coins', private.coins(me.user_id, gain, 'daily'));
end $$;

-- ---------- Telegram kanalga obuna (bir marta; obunani server getChatMember bilan tekshiradi) ----------
alter table public.profiles add column channel_paid boolean not null default false;
create table public.channel_bonus (telegram_id bigint primary key, user_id uuid references public.profiles on delete set null, at timestamptz not null default now());
/* Kimga tekshirish kerak: Telegram ID (yo'q bo'lsa — telegram_required). */
create function public.svc_channel_target(p_user uuid) returns bigint language plpgsql stable security definer set search_path = '' as $$
declare v bigint;
begin
  select telegram_id into v from public.profiles where user_id = p_user and not is_banned;
  if v is null then perform private.fail('telegram_required'); end if;
  return v;
end $$;
create function public.svc_channel_bonus(p_telegram bigint) returns jsonb language plpgsql security definer set search_path = '' as $$
declare p public.profiles;
begin
  if not private.flag('coins_enabled') then perform private.fail('coins_off'); end if;
  select * into p from public.profiles where telegram_id = p_telegram and not is_banned for update;
  if p.user_id is null then perform private.fail('user_not_found'); end if;
  insert into public.channel_bonus (telegram_id, user_id) values (p_telegram, p.user_id) on conflict do nothing;
  if not found or p.channel_paid then return jsonb_build_object('state', 'done', 'coins', p.coins); end if;
  update public.profiles set channel_paid = true where user_id = p.user_id;
  return jsonb_build_object('state', 'paid', 'gain', private.num('coins.channel', 300)::int, 'coins', private.coins(p.user_id, private.num('coins.channel', 300)::int, 'channel'));
end $$;

-- ---------- Do'st taklifi: 500, vaqt sharti yo'q, o'ziga ishlamaydi ----------
create or replace function private.pay_referral(p_guest uuid) returns void language plpgsql security definer set search_path = '' as $$
declare v_ref uuid; v_nick text; v_gain int := private.num('coins.referral', 500)::int;
begin
  update public.profiles set referral_paid = true where user_id = p_guest and referred_by is not null and referred_by <> p_guest and telegram_id is not null and not referral_paid
    returning referred_by, instagram into v_ref, v_nick;
  if v_ref is null then return; end if;
  perform private.coins(v_ref, v_gain, 'referral');
  perform private.notify(v_ref, 'referral', jsonb_build_object('nick', v_nick));
end $$;

-- ---------- Haftaning hovlisi g'olibi: 2 000 ----------
create or replace function private.close_yard_week() returns void language plpgsql security definer set search_path = '' as $$
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
  perform private.coins(w.owner, private.num('coins.yardWinner', 2000)::int, 'yard_winner');
  perform private.notify(w.owner, 'yard_winner', jsonb_build_object('plot', w.plot_id, 'votes', w.votes));
  insert into public.video_jobs (kind, plots, style) values ('houses', array[w.plot_id], jsonb_build_object('title', 'Haftaning hovlisi', 'text', w.votes || ' ovoz', 'seconds', 8));
end $$;

-- ---------- Xazina: kuniga 3 ta (har biri alohida joyda), har biri 50 ----------
alter table public.treasure_claims drop constraint treasure_claims_day_fkey;
alter table public.treasure_claims drop constraint treasure_claims_pkey;
alter table public.treasures drop constraint treasures_pkey;
alter table public.treasures add column n int not null default 1;
alter table public.treasures add primary key (day, n);
alter table public.treasure_claims add column n int not null default 1;
alter table public.treasure_claims add primary key (day, user_id, n);
alter table public.treasure_claims add foreign key (day, n) references public.treasures (day, n);
drop function if exists private.treasure_today();
create function private.treasure_today(p_n int) returns public.treasures language plpgsql security definer set search_path = '' as $$
declare t public.treasures;
begin
  select * into t from public.treasures where day = current_date and n = p_n;
  if t.day is null then
    insert into public.treasures (day, n, x, z, district_id, slots)
      select current_date, p_n, r.x + (random() - 0.5) * greatest(r.w - 8, 0), r.z + (random() - 0.5) * greatest(r.d - 8, 0), 0, private.num('coins.treasureSlots', 100000)::int
      from public.roads r where abs(r.x) < 480 and abs(r.z) < 480 order by random() limit 1 on conflict do nothing;
    update public.treasures set district_id = coalesce((select p.district_id from public.plots p order by (p.x - treasures.x) ^ 2 + (p.z - treasures.z) ^ 2 limit 1), 1)
      where day = current_date and n = p_n and district_id = 0;
    select * into t from public.treasures where day = current_date and n = p_n;
  end if;
  return t;
end $$;
create or replace function public.my_treasure(p_x numeric, p_z numeric) returns jsonb language plpgsql security definer set search_path = '' as $$
declare me public.profiles := private.coins_on(); t public.treasures; dist numeric; bal int; v_n int; v_max int := private.num('coins.treasurePerDay', 3)::int;
begin
  if p_x is null or p_z is null or abs(p_x) > 2000 or abs(p_z) > 2000 then perform private.fail('bad_format'); end if;
  perform private.rate('treasure:' || me.user_id, 8, 60);
  perform private.rate('treasure:' || me.user_id, 60, 86400);
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('treasure:' || me.user_id));
  v_n := (select count(*) from public.treasure_claims where day = current_date and user_id = me.user_id)::int + 1;
  if v_n > v_max then return jsonb_build_object('state', 'done'); end if;
  t := private.treasure_today(v_n);
  select * into t from public.treasures where day = t.day and n = v_n for update;
  if (select count(*) from public.treasure_claims where day = t.day and n = v_n) >= t.slots then return jsonb_build_object('state', 'empty'); end if;
  dist := sqrt((t.x - p_x) ^ 2 + (t.z - p_z) ^ 2);
  if dist is null or dist > 6 then return jsonb_build_object('state', 'hunt', 'n', v_n, 'district', t.district_id, 'heat', case when dist < 25 then 'hot' when dist < 80 then 'warm' else 'cold' end); end if;
  insert into public.treasure_claims (day, user_id, n) values (t.day, me.user_id, v_n);
  bal := private.coins(me.user_id, private.num('coins.treasure', 50)::int, 'treasure');
  return jsonb_build_object('state', 'found', 'n', v_n, 'left', v_max - v_n, 'coins', bal);
end $$;

-- ---------- Tanga o'tkazish ----------
create table public.coin_transfers (
  id bigint generated always as identity primary key, from_user uuid references public.profiles on delete set null, to_user uuid references public.profiles on delete set null,
  from_nick text, to_nick text, amount int not null check (amount > 0), day date not null default current_date, at timestamptz not null default now()
);
create index coin_transfers_from on public.coin_transfers (from_user, day);
create index coin_transfers_to on public.coin_transfers (to_user, day);
alter table public.coin_transfers enable row level security;
/* Uyi va Telegrami bor akkaunt. */
create function private.can_trade(uid uuid) returns boolean language sql stable set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.user_id = uid and p.telegram_id is not null and not p.is_banned)
     and exists (select 1 from public.plot_state s where s.owner = uid and s.status = 'owned')
$$;
create function private.sent_today(uid uuid) returns int language sql stable set search_path = '' as $$
  select coalesce(sum(amount), 0)::int from public.coin_transfers where from_user = uid and day = current_date
$$;
create function private.received_today(uid uuid) returns int language sql stable set search_path = '' as $$
  select coalesce(sum(amount), 0)::int from public.coin_transfers where to_user = uid and day = current_date
$$;
create function public.my_send_coins(p_to text, p_amount int) returns jsonb language plpgsql security definer set search_path = '' as $$
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
  if private.sent_today(me.user_id) + p_amount > private.num('coins.sendDay', 500) then perform private.fail('send_limit'); end if;
  if private.received_today(target.user_id) + p_amount > private.num('coins.receiveDay', 1000) then perform private.fail('receive_limit'); end if;
  bal := private.coins(me.user_id, -p_amount, 'send');
  perform private.coins(target.user_id, p_amount, 'receive');
  insert into public.coin_transfers (from_user, to_user, from_nick, to_nick, amount) values (me.user_id, target.user_id, me.instagram, target.instagram, p_amount);
  perform private.notify(target.user_id, 'coins_got', jsonb_build_object('nick', me.instagram, 'amount', p_amount));
  return jsonb_build_object('coins', bal, 'sent', private.sent_today(me.user_id));
end $$;
create function public.admin_coin_transfers(p_q text default '') returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require('users');
  return (select coalesce(jsonb_agg(q), '[]') from (select id, from_user, to_user, from_nick, to_nick, amount, at from public.coin_transfers
    where p_q = '' or from_nick ilike p_q || '%' or to_nick ilike p_q || '%' order by id desc limit 200) q);
end $$;
/* Iqtisod sahifasi: so'nggi 7 kunda qancha tanga qayerdan keldi va qayerga ketdi. */
create function public.admin_economy() returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require('users');
  return jsonb_build_object(
    'total', (select coalesce(sum(coins), 0) from public.profiles),
    'reasons', (select coalesce(jsonb_agg(jsonb_build_object('reason', r, 'plus', plus, 'minus', minus) order by plus + minus desc), '[]') from
      (select split_part(reason, ':', 1) r, sum(greatest(delta, 0)) plus, sum(greatest(-delta, 0)) minus from public.coin_ledger where at > now() - interval '7 days' group by 1) x),
    'founders', (select count(*) from public.profiles where 'asoschi' = any (badges)));
end $$;

-- ---------- Profil: seriya 1..7, kanal bonusi, bugungi o'tkazmalar ----------
create or replace function public.my_profile() returns jsonb language plpgsql security definer set search_path = '' as $$
declare p public.profiles := private.me();
begin
  update public.profiles set last_seen = now() where user_id = p.user_id and last_seen < now() - interval '1 hour';
  return jsonb_build_object('id', p.user_id, 'login', p.login, 'instagram', p.instagram, 'role', p.role, 'perms', p.perms, 'badges', p.badges, 'avatar', p.avatar,
    'telegram', p.telegram_id is not null, 'coins', p.coins, 'ref', p.ref_code, 'free_used', p.free_used, 'wants_news', p.wants_news,
    'serials', (select coalesce(jsonb_object_agg(decor_id, list), '{}') from (select decor_id, jsonb_agg(serial order by serial) as list from public.decor_serials where owner = p.user_id group by decor_id) x), 'streak', p.streak, 'daily_done', coalesce(p.last_daily = current_date, false), 'daily_next', private.next_streak(p),
    'channel_paid', p.channel_paid, 'sent_today', private.sent_today(p.user_id),
    'treasures_today', (select count(*) from public.treasure_claims where day = current_date and user_id = p.user_id),
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

-- ---------- Bezak narxlari toifalar bo'yicha (TANGA-NARXLAR.md) ----------
update public.decor_catalog set price_coins = 500 where id = 'light_newyear';
update public.decor_catalog set price_coins = 600 where id = 'tree_newyear';
update public.decor_catalog set price_coins = 500 where id = 'light_hayit';
update public.decor_catalog set price_coins = 600 where id = 'special_sumalak';
update public.decor_catalog set price_coins = 400 where id = 'yard_mangal';
update public.decor_catalog set price_coins = 400 where id = 'pet_house';
update public.decor_catalog set price_coins = 1000 where id = 'yard_playground';
update public.decor_catalog set price_coins = 200 where id = 'sign_nick';

select private.apply_grants();
