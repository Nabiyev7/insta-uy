/* 13-qadam (D, E): kuzatuv — mijoz xatolari (admin "Xatolar"), /stat da baza hajmi; ochilish — kelish manbai botdan (start=from_bio), tuman ochilganda egasiga xabar. */
set check_function_bodies = off;

-- ---------- D4. Mijoz xatolari: Worker (/log) yozadi, kuniga chegarali; admin oxirgi 100 tasini ko'radi ----------
create table public.client_errors (
  id bigint generated always as identity primary key, at timestamptz not null default now(),
  message text not null, place text, ua text, user_id uuid
);
alter table public.client_errors enable row level security;
create index client_errors_at on public.client_errors (at desc);
insert into public.settings (key, value, is_public) values ('client_errors_per_day', '2000', false) on conflict (key) do nothing;
create function public.svc_log_error(p_message text, p_place text default null, p_ua text default null, p_user uuid default null) returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.client_errors where at > now() - interval '1 day') >= private.num('client_errors_per_day', 2000) then return false; end if;
  insert into public.client_errors (message, place, ua, user_id) values (left(p_message, 500), left(p_place, 200), left(p_ua, 160), p_user);
  -- Jadval o'smasin: 30 kundan eskisi o'chadi.
  delete from public.client_errors where at < now() - interval '30 days';
  return true;
end $$;
create function public.admin_errors() returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require('settings');
  return (select coalesce(jsonb_agg(to_jsonb(e) order by e.id desc), '[]') from (select id, at, message, place, ua from public.client_errors order by id desc limit 100) e);
end $$;

-- ---------- D5. /stat: baza hajmi (Supabase bepul tarifi 500 MB) ----------
alter function public.svc_bot_stat(bigint) set schema private;
alter function private.svc_bot_stat(bigint) rename to bot_stat_base;
revoke all on function private.bot_stat_base(bigint) from anon, authenticated;
create function public.svc_bot_stat(p_telegram bigint) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare mb numeric := round(pg_catalog.pg_database_size(pg_catalog.current_database()) / 1048576.0, 1);
begin
  return private.bot_stat_base(p_telegram) || jsonb_build_object('db_mb', mb, 'db_pct', round(mb / 500 * 100));
end $$;

-- ---------- E3. Kelish manbai botdan: t.me/<bot>?start=from_bio | from_reels ----------
alter table public.tg_sessions add column source text;
/* Akkaunt bo'lsa (1 kun ichida ochilgan, manbasi bo'sh) — profilga; bo'lmasa sessiyada saqlanadi va akkaunt ochilganda ko'chadi (p_source = null). */
create function public.svc_bot_source(p_telegram bigint, p_source text default null) returns void language plpgsql security definer set search_path = '' as $$
declare v text := lower(coalesce(p_source, (select source from public.tg_sessions where telegram_id = p_telegram)));
begin
  if v is null or v !~ '^[a-z0-9_]{1,20}$' then return; end if;
  update public.profiles set source = v where telegram_id = p_telegram and source is null and created_at > now() - interval '1 day';
  if p_source is not null and not exists (select 1 from public.profiles where telegram_id = p_telegram) then
    insert into public.tg_sessions as s (telegram_id, step, source) values (p_telegram, 'nick', v) on conflict (telegram_id) do update set source = coalesce(s.source, excluded.source);
  end if;
end $$;

/* Profil yaratilganda (bot nik tasdig'i) — sessiyadagi manba ko'chadi (sessiyani asosiy funksiya o'chiradi, shuning uchun oldin o'qiladi). */
alter function public.svc_profile_create(uuid, text, text, bigint, text) set schema private;
alter function private.svc_profile_create(uuid, text, text, bigint, text) rename to profile_create_base;
revoke all on function private.profile_create_base(uuid, text, text, bigint, text) from anon, authenticated;
create function public.svc_profile_create(p_user uuid, p_login text, p_ref text default null, p_telegram bigint default null, p_instagram text default null) returns void language plpgsql security definer set search_path = '' as $$
declare v_source text := (select source from public.tg_sessions where telegram_id = p_telegram);
begin
  perform private.profile_create_base(p_user, p_login, p_ref, p_telegram, p_instagram);
  if v_source is not null then update public.profiles set source = v_source where user_id = p_user and source is null; end if;
end $$;

-- ---------- E4. Tumanlar: ochiqlaridagi bepul joylar 80% to'lsa — keyingisi (markazdan tashqariga) o'zi ochiladi, egasiga botda xabar ----------
insert into public.settings (key, value, is_public) values ('district_auto_open', '{"enabled": true, "pct": 80}', false) on conflict (key) do nothing;
create function private.auto_open_district() returns int language plpgsql security definer set search_path = '' as $$
declare total int; taken int; v_next public.districts; v_owner bigint := private.owner_tg(); pct int := coalesce((private.setting('district_auto_open') ->> 'pct')::int, 80);
begin
  if not coalesce((private.setting('district_auto_open') ->> 'enabled')::boolean, false) then return null; end if;
  select count(*) into total from public.plots p join public.districts d on d.id = p.district_id where d.is_open and p.type = 'hovli';
  select count(*) into taken from public.plot_state s join public.plots p on p.id = s.plot_id join public.districts d on d.id = p.district_id
    where d.is_open and p.type = 'hovli' and s.status <> 'reserved' and not s.is_test;
  if total = 0 or taken * 100 < total * pct then return null; end if;
  select * into v_next from public.districts where not is_open order by id limit 1 for update;
  if v_next.id is null then return null; end if;
  update public.districts set is_open = true, opened_at = now() where id = v_next.id;
  perform private.audit('district_auto_open', jsonb_build_object('id', v_next.id, 'taken', taken, 'total', total));
  if v_owner is not null then
    insert into public.tg_outbox (chat, text) values (v_owner, '🏘 Yangi tuman o''zi ochildi: ' || v_next.name_uz || ' (ochiq tumanlardagi bepul joylarning ' || round(taken * 100.0 / total) || '% i band). / Открылся новый район: ' || v_next.name_ru || '.');
  end if;
  return v_next.id;
end $$;
create or replace function public.svc_tick() returns jsonb language plpgsql security definer set search_path = '' as $$
declare d record;
begin
  perform private.close_yard_week();
  perform private.queue_reminders();
  perform private.channel_daily();
  perform private.auto_open_district();
  for d in select id from public.nick_disputes where status = 'sent' and owner_proof is null and sent_at < now() - interval '7 days' loop perform private.dispute_grant(d.id, null); end loop;
  return private.svc_tick_base();
end $$;

select private.apply_grants();
