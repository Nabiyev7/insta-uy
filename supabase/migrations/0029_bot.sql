/* 6c: Telegram bot — til (bir marta tanlanadi, sayt bilan bitta maydon), taklif, kanalga avtomatik postlar, egasining buyruqlari (/stat, /hammaga). */
set check_function_bodies = off;

-- ---------- 2. Til: bot suhbatida (akkaunt ochilguncha) va profilda ----------
alter table public.tg_sessions add column lang text check (lang in ('uz','ru'));
alter table public.tg_sessions add column draft jsonb;
alter table public.tg_sessions drop constraint tg_sessions_step_check;
alter table public.tg_sessions add constraint tg_sessions_step_check check (step in ('nick','confirm','dispute','dispute_owner','renick','support','broadcast','idle'));

drop function public.svc_bot_start(bigint, text, text);
/* p_lang — Telegram tilidan taxmin (birinchi marta); keyin tanlangani o'zgarmaydi. */
create function public.svc_bot_start(p_telegram bigint, p_ref text default null, p_name text default null, p_lang text default null) returns jsonb language plpgsql security definer set search_path = '' as $$
declare p public.profiles; v_lang text := case when p_lang in ('uz','ru') then p_lang end; is_first boolean;
begin
  select * into p from public.profiles where telegram_id = p_telegram;
  if p.user_id is not null then
    if p.is_banned then
      delete from public.tg_sessions where telegram_id = p_telegram;
      return jsonb_build_object('state', 'banned', 'user', p.user_id, 'lang', p.lang);
    end if;
    if p.instagram is null and exists (select 1 from public.nick_disputes d where d.owner = p.user_id and d.status = 'granted') then
      insert into public.tg_sessions as s (telegram_id, step) values (p_telegram, 'renick') on conflict (telegram_id) do update set step = 'renick', nick = null, updated_at = now();
      return jsonb_build_object('state', 'renick', 'user', p.user_id, 'lang', p.lang);
    end if;
    delete from public.tg_sessions where telegram_id = p_telegram and step <> 'broadcast';
    return jsonb_build_object('state', 'ready', 'user', p.user_id, 'nick', p.instagram, 'lang', p.lang,
      'has_house', exists (select 1 from public.plot_state s where s.owner = p.user_id and s.status = 'owned'));
  end if;
  -- Birinchi marta: til hali tanlanmagan — xabarda til tugmalari chiqadi.
  is_first := not exists (select 1 from public.tg_sessions where telegram_id = p_telegram and lang is not null);
  insert into public.tg_sessions as s (telegram_id, step, ref, name, lang) values (p_telegram, 'nick', nullif(left(p_ref, 20), ''), left(p_name, 60), v_lang)
    on conflict (telegram_id) do update set step = 'nick', ref = coalesce(excluded.ref, s.ref), name = coalesce(excluded.name, s.name), lang = coalesce(s.lang, excluded.lang), updated_at = now();
  return jsonb_build_object('state', 'need_nick', 'lang', coalesce((select lang from public.tg_sessions where telegram_id = p_telegram), 'uz'), 'is_first', is_first);
end $$;

/* Har xabarda: til, qadam, uyi bormi, xabarlar yoqiqmi. */
create function public.svc_bot_ctx(p_telegram bigint) returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'lang', coalesce(p.lang, s.lang, 'uz'), 'user', p.user_id, 'nick', p.instagram, 'banned', coalesce(p.is_banned, false), 'news', coalesce(p.wants_news, true),
    'has_house', p.user_id is not null and exists (select 1 from public.plot_state x where x.owner = p.user_id and x.status = 'owned'),
    'step', s.step, 'sess_nick', s.nick, 'ref_id', s.ref_id, 'draft', s.draft)
  from (select 1) one left join public.profiles p on p.telegram_id = p_telegram left join public.tg_sessions s on s.telegram_id = p_telegram
$$;
create function public.svc_bot_lang(p_telegram bigint, p_lang text) returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_lang not in ('uz','ru') then perform private.fail('bad_format'); end if;
  update public.profiles set lang = p_lang where telegram_id = p_telegram;
  update public.tg_sessions set lang = p_lang where telegram_id = p_telegram;
  if not found and not exists (select 1 from public.profiles where telegram_id = p_telegram) then
    insert into public.tg_sessions (telegram_id, step, lang) values (p_telegram, 'nick', p_lang);
  end if;
end $$;
/* Sayt tili = bot tili (bitta maydon). */
create function public.my_lang(p_lang text) returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_lang not in ('uz','ru') then perform private.fail('bad_format'); end if;
  update public.profiles set lang = p_lang where user_id = (private.me()).user_id;
end $$;

-- ---------- 4. Do'st taklif ----------
create function public.svc_bot_invite(p_telegram bigint) returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('ref', p.ref_code, 'invited', (select count(*) from public.profiles x where x.referred_by = p.user_id and x.referral_paid),
    'gifts', (select coalesce(jsonb_agg(jsonb_build_object('at', g.key::int, 'uz', coalesce(c.name_uz, g.value), 'ru', coalesce(c.name_ru, g.value)) order by g.key::int), '[]')
      from jsonb_each_text(coalesce(private.setting('referral_gifts'), '{"1":"gul_zor","3":"dam_besedka","10":"avto_sedan"}')) g left join public.decor_catalog c on c.id = g.value))
  from public.profiles p where p.telegram_id = p_telegram
$$;
/* Do'st uy olgani haqidagi xabarda shkala holati (taklif qilinganlar soni). */
create or replace function public.svc_outbox(p_limit int default 25) returns jsonb language sql security definer set search_path = '' as $$
  with picked as (select n.id from public.notifications n join public.profiles p on p.user_id = n.user_id where n.sent_at is null and p.telegram_id is not null and n.created_at > now() - interval '3 days' order by n.id limit p_limit for update of n skip locked),
  upd as (update public.notifications n set sent_at = now() from picked where n.id = picked.id returning n.*)
  select coalesce(jsonb_agg(jsonb_build_object('id', u.id, 'kind', u.kind, 'data', case when u.kind = 'referral'
      then u.data || jsonb_build_object('invited', (select count(*) from public.profiles x where x.referred_by = u.user_id and x.referral_paid)) else u.data end,
    'chat', p.telegram_id, 'lang', p.lang)), '[]') from upd u join public.profiles p on p.user_id = u.user_id
$$;
/* Akkaunti yo'q odamga navbat: oluvchi tili bilan (matn bitta tilda yuboriladi). */
create or replace function public.svc_tg_outbox(p_limit int default 100) returns jsonb language plpgsql security definer set search_path = '' as $$
declare ids bigint[]; res jsonb;
begin
  ids := array(select id from public.tg_outbox order by id limit greatest(1, least(p_limit, 500)) for update skip locked);
  select coalesce(jsonb_agg(jsonb_build_object('chat', o.chat, 'text', o.text, 'buttons', o.buttons,
      'lang', coalesce((select lang from public.profiles where telegram_id = o.chat), (select lang from public.tg_sessions where telegram_id = o.chat), 'uz')) order by o.id), '[]')
    into res from public.tg_outbox o where o.id = any (ids);
  delete from public.tg_outbox where id = any (ids);
  return res;
end $$;

-- ---------- 6. Egasining buyruqlari ----------
create function private.owner_tg_ok(p_telegram bigint) returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if not coalesce((select private.is_owner(p) from public.profiles p where p.telegram_id = p_telegram), false) then perform private.fail('forbidden'); end if;
end $$;
create function public.svc_bot_stat(p_telegram bigint) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare today timestamptz := (now() at time zone 'Asia/Tashkent')::date::timestamp at time zone 'Asia/Tashkent'; week timestamptz := today - interval '6 days';
begin
  perform private.owner_tg_ok(p_telegram);
  return jsonb_build_object(
    'users', jsonb_build_array((select count(*) from public.profiles where created_at >= today), (select count(*) from public.profiles where created_at >= week)),
    'houses', jsonb_build_array((select count(*) from public.plot_state where status <> 'reserved' and not is_test and claimed_at >= today), (select count(*) from public.plot_state where status <> 'reserved' and not is_test and claimed_at >= week)),
    'active', jsonb_build_array((select count(distinct user_id) from public.daily_active where day = (now() at time zone 'Asia/Tashkent')::date), (select count(distinct user_id) from public.daily_active where day >= (now() at time zone 'Asia/Tashkent')::date - 6)),
    'given', jsonb_build_array((select coalesce(sum(delta), 0) from public.coin_ledger where delta > 0 and at >= today), (select coalesce(sum(delta), 0) from public.coin_ledger where delta > 0 and at >= week)),
    'spent', jsonb_build_array((select coalesce(-sum(delta), 0) from public.coin_ledger where delta < 0 and at >= today), (select coalesce(-sum(delta), 0) from public.coin_ledger where delta < 0 and at >= week)),
    'tickets', (select count(*) from public.support_tickets where status <> 'closed'),
    'disputes', (select count(*) from public.nick_disputes where status in ('new','sent')),
    'revenue', case when private.flag('payments_enabled') then jsonb_build_array(
      (select coalesce(sum(amount), 0) from public.orders where status = 'paid' and not is_test and paid_at >= today), (select coalesce(sum(amount), 0) from public.orders where status = 'paid' and not is_test and paid_at >= week)) end);
end $$;

create function public.svc_bot_open(p_telegram bigint) returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.owner_tg_ok(p_telegram);
  return jsonb_build_object('tickets', (select count(*) from public.support_tickets where status <> 'closed'), 'disputes', (select count(*) from public.nick_disputes where status in ('new','sent')),
    'districts', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'uz', name_uz, 'ru', name_ru) order by id), '[]') from public.districts where is_open));
end $$;

/* /hammaga: qoralama (matn yoki rasm + izoh) → ko'rinishi → kimga → yuborish. */
alter table public.broadcasts add column photo text;
alter table public.broadcasts add column text_ru text;
create function public.svc_bot_draft(p_telegram bigint, p_text text, p_photo text default null) returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.owner_tg_ok(p_telegram);
  if coalesce(btrim(p_text), '') = '' and p_photo is null then perform private.fail('empty'); end if;
  insert into public.tg_sessions as s (telegram_id, step, draft) values (p_telegram, 'broadcast', jsonb_build_object('text', left(coalesce(p_text, ''), 1000), 'photo', left(p_photo, 300)))
    on conflict (telegram_id) do update set step = 'broadcast', draft = excluded.draft, updated_at = now();
end $$;
create function public.svc_bot_audience(p_telegram bigint, p_target text, p_district int default null) returns int language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.owner_tg_ok(p_telegram);
  return case p_target
    when 'waitlist' then (select count(*) from public.tg_waitlist)
    when 'district' then (select count(distinct pr.telegram_id) from public.profiles pr join public.plot_state s on s.owner = pr.user_id and s.status = 'owned' join public.plots p on p.id = s.plot_id
      where p.district_id = p_district and pr.telegram_id is not null and not pr.is_banned and pr.wants_news)
    else (select count(*) from public.profiles where telegram_id is not null and not is_banned and wants_news) end;
end $$;
create function public.svc_bot_broadcast(p_telegram bigint, p_target text, p_district int default null) returns int language plpgsql security definer set search_path = '' as $$
declare d jsonb; v_id int;
begin
  perform private.owner_tg_ok(p_telegram);
  if p_target not in ('all','district','waitlist') or (p_target = 'district' and not exists (select 1 from public.districts where id = p_district)) then perform private.fail('bad_format'); end if;
  select draft into d from public.tg_sessions where telegram_id = p_telegram and step = 'broadcast';
  if d is null then perform private.fail('not_found'); end if;
  perform private.queue_broadcast(coalesce(d ->> 'text', ''), p_target, case when p_target = 'district' then p_district end, null);
  v_id := (select max(id) from public.broadcasts);
  update public.broadcasts set photo = d ->> 'photo' where id = v_id;
  delete from public.tg_sessions where telegram_id = p_telegram;
  perform private.audit('bot_broadcast', jsonb_build_object('target', p_target, 'district', p_district));
  return (select total from public.broadcasts where id = v_id);
end $$;
create function public.svc_bot_cancel(p_telegram bigint) returns void language sql security definer set search_path = '' as $$
  delete from public.tg_sessions where telegram_id = p_telegram and step = 'broadcast'
$$;
/* Navbat: oluvchi tilidagi matn (tizim xabarlarida ruschasi alohida) va rasm. */
create or replace function public.svc_broadcast_next(p_limit int) returns jsonb language plpgsql security definer set search_path = '' as $$
declare ids bigint[]; res jsonb;
begin
  ids := array(select id from public.broadcast_queue order by id limit greatest(1, least(p_limit, 1000)) for update skip locked);
  select coalesce(jsonb_agg(jsonb_build_object('chat', q.chat, 'text', case when pr.lang = 'ru' and b.text_ru is not null then b.text_ru else b.text end, 'lang', coalesce(pr.lang, 'uz'),
      'photo', b.photo, 'poll', b.poll_id, 'options', p.options, 'plots', y.plots) order by q.id), '[]') into res
    from public.broadcast_queue q join public.broadcasts b on b.id = q.broadcast_id left join public.polls p on p.id = b.poll_id left join public.yard_polls y on y.poll_id = b.poll_id
    left join public.profiles pr on pr.telegram_id = q.chat and q.chat <> 0
    where q.id = any (ids);
  delete from public.broadcast_queue where id = any (ids);
  return res;
end $$;

-- ---------- 5. Kanalga avtomatik postlar ----------
insert into public.settings (key, value, is_public) values
  ('channel_posts', '{"daily": true, "yard": true, "project": true, "milestone": true}', false), ('channel_lang', '"uz"', false)
  on conflict (key) do nothing;
create table public.channel_posts (
  id bigint generated always as identity primary key, kind text not null check (kind in ('daily','yard','project','milestone')), data jsonb not null default '{}',
  created_at timestamptz not null default now(), sent_at timestamptz, tries int not null default 0
);
alter table public.channel_posts enable row level security;
create unique index channel_posts_once on public.channel_posts (kind, (data ->> 'key'));
create function private.channel_post(p_kind text, p_key text, p_data jsonb) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not coalesce((private.setting('channel_posts') ->> p_kind)::boolean, false) then return; end if;
  insert into public.channel_posts (kind, data) values (p_kind, p_data || jsonb_build_object('key', p_key)) on conflict do nothing;
end $$;
/* Server: yuborilmaganlar (5 martagacha urinadi). */
create function public.svc_channel_next(p_limit int default 10) returns jsonb language plpgsql security definer set search_path = '' as $$
declare ids bigint[]; res jsonb;
begin
  ids := array(select id from public.channel_posts where sent_at is null and tries < 5 order by id limit greatest(1, least(p_limit, 50)) for update skip locked);
  update public.channel_posts set tries = tries + 1 where id = any (ids);
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'kind', kind, 'data', data) order by id), '[]') into res from public.channel_posts where id = any (ids);
  return jsonb_build_object('lang', coalesce(private.setting('channel_lang') #>> '{}', 'uz'), 'posts', res);
end $$;
create function public.svc_channel_sent(p_id bigint) returns void language sql security definer set search_path = '' as $$
  update public.channel_posts set sent_at = now() where id = p_id
$$;
/* Kunlik (20:00 Toshkent): bugungi yangi uylar; 0 bo'lsa yuborilmaydi. */
create function private.channel_daily() returns void language plpgsql security definer set search_path = '' as $$
declare v_day date := (now() at time zone 'Asia/Tashkent')::date; since timestamptz := v_day::timestamp at time zone 'Asia/Tashkent'; n int;
begin
  if extract(hour from now() at time zone 'Asia/Tashkent') < 20 then return; end if;
  select count(*) into n from public.plot_state where status <> 'reserved' and not is_test and claimed_at >= since;
  if n = 0 then return; end if;
  perform private.channel_post('daily', v_day::text, jsonb_build_object('count', n, 'houses',
    (select coalesce(jsonb_agg(jsonb_build_object('nick', x.instagram, 'plot', x.plot_id)), '[]') from (select instagram, plot_id from public.plot_state
      where status <> 'reserved' and not is_test and claimed_at >= since and instagram is not null order by claimed_at desc limit 5) x)));
end $$;
/* Milestone: 100, 500, 1 000, 5 000, 10 000 … uy. */
create function private.on_house_milestone() returns trigger language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  if new.status = 'reserved' or new.is_test or (tg_op = 'UPDATE' and old.status <> 'reserved') then return null; end if;
  select count(*) into n from public.plot_state where status <> 'reserved' and not is_test;
  if n = any (array[100, 500, 1000, 5000, 10000, 25000, 50000, 100000]) then perform private.channel_post('milestone', n::text, jsonb_build_object('count', n)); end if;
  return null;
end $$;
create trigger plot_state_milestone after insert or update of status on public.plot_state for each row execute function private.on_house_milestone();

create or replace function public.svc_tick() returns jsonb language plpgsql security definer set search_path = '' as $$
declare d record;
begin
  perform private.close_yard_week();
  perform private.queue_reminders();
  perform private.channel_daily();
  for d in select id from public.nick_disputes where status = 'sent' and owner_proof is null and sent_at < now() - interval '7 days' loop perform private.dispute_grant(d.id, null); end loop;
  return private.svc_tick_base();
end $$;

/* Haftaning hovlisi: hammaga (har kim o'z tilida) va kanalga (post navbati, alohida yoqiladi). */
create or replace function private.close_yard_week() returns void language plpgsql security definer set search_path = '' as $$
declare wk date := private.this_week(); y public.yard_polls; w record; old uuid; v_owner uuid; v_nick text; v_id int;
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
    v_nick := coalesce((select instagram from public.yard_winners where week = y.week), '');
    update public.profiles set badges = array_remove(badges, 'hovli') where user_id = old and user_id is distinct from v_owner;
    perform private.give_badge(v_owner, 'hovli');
    perform private.coins(v_owner, private.num('coins.yardWinner', 2000)::int, 'yard_winner');
    perform private.notify(v_owner, 'yard_winner', jsonb_build_object('plot', w.plot_id, 'votes', w.votes));
    perform private.queue_broadcast('🏆 Haftaning hovlisi: @' || v_nick || ' (' || w.votes || ' ovoz). Tabriklaymiz!', 'all', null, null);
    v_id := (select max(id) from public.broadcasts);
    update public.broadcasts set text_ru = '🏆 Двор недели: @' || v_nick || ' (' || w.votes || ' голосов). Поздравляем!' where id = v_id;
    perform private.channel_post('yard', y.week::text, jsonb_build_object('nick', v_nick, 'plot', w.plot_id, 'votes', w.votes));
  end loop;
end $$;
create or replace function private.on_project_done() returns trigger language plpgsql security definer set search_path = '' as $$
declare v_top text; v_id int;
begin
  if new.status = 'done' and old.status is distinct from 'done' then
    v_top := coalesce((select string_agg('@' || (x ->> 'nick'), ', ') from jsonb_array_elements(private.project_top(new.id)) x), '—');
    perform private.queue_broadcast('🎉 Shahar loyihasi tayyor: ' || new.title_uz || '! Eng ko‘p qo‘shganlar: ' || v_top, 'all', null, null);
    v_id := (select max(id) from public.broadcasts);
    update public.broadcasts set text_ru = '🎉 Городской проект готов: ' || new.title_ru || '! Больше всех вложили: ' || v_top where id = v_id;
    perform private.channel_post('project', new.id::text, jsonb_build_object('uz', new.title_uz, 'ru', new.title_ru, 'top', private.project_top(new.id)));
  end if;
  return null;
end $$;

select private.apply_grants();
