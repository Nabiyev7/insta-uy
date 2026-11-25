/* 6-qadam, IQTISOD-PROMT qoldiqlari: bot orqali xabar yuborish (hammaga / tumanga / kutish ro'yxatiga, navbat bilan),
   so'rovnomalar (2–6 variant, natija admin panelda), "Elchi" nishonlari (10 / 50 / 100 taklif). */
set check_function_bodies = off;

-- ---------- Xabar yuborish navbati ----------
create table public.broadcasts (
  id int generated always as identity primary key, text text not null, target text not null check (target in ('all','district','waitlist')), district_id int references public.districts,
  poll_id int, created_by uuid references public.profiles on delete set null, created_at timestamptz not null default now(), total int not null default 0
);
create table public.broadcast_queue (id bigint generated always as identity primary key, broadcast_id int not null references public.broadcasts on delete cascade, chat bigint not null);
create table public.polls (id int generated always as identity primary key, question text not null, options text[] not null check (cardinality(options) between 2 and 6), created_at timestamptz not null default now(), is_open boolean not null default true);
create table public.poll_votes (poll_id int not null references public.polls on delete cascade, telegram_id bigint not null, option int not null, at timestamptz not null default now(), primary key (poll_id, telegram_id));
alter table public.broadcasts add foreign key (poll_id) references public.polls on delete set null;

/* Admin: matn va kimga. Bildirishnomani o'chirganlarga (wants_news=false) umumiy xabar bormaydi. */
create function private.queue_broadcast(p_text text, p_target text, p_district int, p_poll int) returns int language plpgsql security definer set search_path = '' as $$
declare v_id int; n int;
begin
  insert into public.broadcasts (text, target, district_id, poll_id, created_by) values (p_text, p_target, p_district, p_poll, auth.uid()) returning id into v_id;
  if p_target = 'waitlist' then
    insert into public.broadcast_queue (broadcast_id, chat) select v_id, telegram_id from public.tg_waitlist;
  elsif p_target = 'district' then
    insert into public.broadcast_queue (broadcast_id, chat) select distinct v_id, pr.telegram_id from public.profiles pr join public.plot_state s on s.owner = pr.user_id and s.status = 'owned' join public.plots p on p.id = s.plot_id
      where p.district_id = p_district and pr.telegram_id is not null and not pr.is_banned and pr.wants_news;
  else
    insert into public.broadcast_queue (broadcast_id, chat) select v_id, telegram_id from public.profiles where telegram_id is not null and not is_banned and wants_news;
  end if;
  get diagnostics n = row_count;
  update public.broadcasts set total = n where id = v_id;
  return n;
end $$;
create function public.admin_broadcast(p_text text, p_target text, p_district int default null) returns int language plpgsql security definer set search_path = '' as $$
begin
  if (private.require('settings')).role <> 'admin' then perform private.fail('forbidden'); end if;
  if p_target not in ('all','district','waitlist') or (p_target = 'district' and not exists (select 1 from public.districts where id = p_district)) then perform private.fail('bad_format'); end if;
  perform private.audit('broadcast', jsonb_build_object('target', p_target, 'district', p_district));
  return private.queue_broadcast(private.clean_text(p_text, 1000, false), p_target, p_district, null);
end $$;
create function public.admin_poll(p_question text, p_options text[], p_target text default 'all', p_district int default null) returns int language plpgsql security definer set search_path = '' as $$
declare v_poll int;
begin
  if (private.require('settings')).role <> 'admin' then perform private.fail('forbidden'); end if;
  if cardinality(p_options) not between 2 and 6 or p_target not in ('all','district','waitlist') or (p_target = 'district' and not exists (select 1 from public.districts where id = p_district)) then perform private.fail('bad_format'); end if;
  perform private.audit('poll', jsonb_build_object('target', p_target, 'district', p_district));
  insert into public.polls (question, options) values (private.clean_text(p_question, 300, false), (select array_agg(private.clean_text(o, 60, false) order by k) from unnest(p_options) with ordinality u(o, k))) returning id into v_poll;
  perform private.queue_broadcast((select question from public.polls where id = v_poll), p_target, p_district, v_poll);
  return v_poll;
end $$;
create function public.admin_messages() returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require('settings');
  return jsonb_build_object(
    'waitlist', (select count(*) from public.tg_waitlist),
    'queued', (select count(*) from public.broadcast_queue),
    'broadcasts', (select coalesce(jsonb_agg(b order by b.id desc), '[]') from (select id, text, target, district_id, total, created_at, (select count(*) from public.broadcast_queue q where q.broadcast_id = x.id) as left from public.broadcasts x order by id desc limit 20) b),
    'polls', (select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'question', p.question, 'options', p.options, 'open', p.is_open,
       'votes', (select jsonb_agg((select count(*) from public.poll_votes v where v.poll_id = p.id and v.option = i)) from generate_series(1, cardinality(p.options)) i)) order by p.id desc), '[]') from public.polls p));
end $$;
create function public.admin_poll_close(p_id int) returns void language plpgsql security definer set search_path = '' as $$
begin
  if (private.require('settings')).role <> 'admin' then perform private.fail('forbidden'); end if;
  update public.polls set is_open = false where id = p_id;
end $$;
/* Server (cron) navbatdan N ta oladi. */
create function public.svc_broadcast_next(p_limit int) returns jsonb language plpgsql security definer set search_path = '' as $$
declare ids bigint[]; res jsonb;
begin
  ids := array(select id from public.broadcast_queue order by id limit greatest(1, least(p_limit, 1000)) for update skip locked);
  select coalesce(jsonb_agg(jsonb_build_object('chat', q.chat, 'text', b.text, 'poll', b.poll_id, 'options', p.options) order by q.id), '[]') into res
    from public.broadcast_queue q join public.broadcasts b on b.id = q.broadcast_id left join public.polls p on p.id = b.poll_id where q.id = any (ids);
  delete from public.broadcast_queue where id = any (ids);
  return res;
end $$;
/* Bot tugmasi: ovoz (bitta Telegram — bitta ovoz, o'zgartirish mumkin). */
create function public.svc_poll_vote(p_telegram bigint, p_poll int, p_option int) returns text language plpgsql security definer set search_path = '' as $$
declare p public.polls;
begin
  select * into p from public.polls where id = p_poll;
  if p.id is null or not p.is_open then return 'closed'; end if;
  if p_option not between 1 and cardinality(p.options) then perform private.fail('bad_format'); end if;
  insert into public.poll_votes (poll_id, telegram_id, option) values (p_poll, p_telegram, p_option) on conflict (poll_id, telegram_id) do update set option = excluded.option, at = now();
  return p.options[p_option];
end $$;

-- ---------- "Elchi" nishonlari: 10, 50, 100 taklif ----------
create or replace function private.pay_referral(p_guest uuid) returns void language plpgsql security definer set search_path = '' as $$
declare v_ref uuid; v_nick text; v_gain int := private.num('coins.referral', 500)::int; v_count int; v_gift text;
begin
  update public.profiles set referral_paid = true where user_id = p_guest and referred_by is not null and referred_by <> p_guest and telegram_id is not null and not referral_paid
    returning referred_by, instagram into v_ref, v_nick;
  if v_ref is null then return; end if;
  perform private.coins(v_ref, v_gain, 'referral');
  perform private.notify(v_ref, 'referral', jsonb_build_object('nick', v_nick));
  v_count := (select count(*) from public.profiles where referred_by = v_ref and referral_paid);
  v_gift := private.setting('referral_gifts') ->> v_count::text;
  if v_gift is not null and exists (select 1 from public.decor_catalog where id = v_gift) then
    insert into public.owned_decor as o (user_id, decor_id, qty, paid) values (v_ref, v_gift, 1, 1)
      on conflict (user_id, decor_id) do update set qty = o.qty + 1, paid = o.paid + 1;
    perform private.notify(v_ref, 'decor_gift', jsonb_build_object('id', v_gift, 'friends', v_count));
  end if;
  -- Chegaradan o'tganlar (migratsiyadan oldin ham) keyingi taklifda nishonini oladi.
  if v_count >= 10 then perform private.give_badge(v_ref, 'elchi10'); end if;
  if v_count >= 50 then perform private.give_badge(v_ref, 'elchi50'); end if;
  if v_count >= 100 then perform private.give_badge(v_ref, 'elchi100'); end if;
end $$;

select private.apply_grants();
