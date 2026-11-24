-- Faqat server (service_role): ro'yxat, Telegram, zaxira, video navbati, xabarnomalar.
set check_function_bodies = off;
create table public.tg_tokens (
  token_hash text primary key, purpose text not null check (purpose in ('login','link','reset')), user_id uuid references public.profiles on delete cascade,
  telegram_id bigint, telegram_name text, code_hash text, attempts int not null default 0, created_at timestamptz not null default now(), expires_at timestamptz not null
);

create function public.svc_rate(p_key text, p_max int, p_seconds int) returns boolean language plpgsql security definer set search_path = '' as $$
begin
  perform private.rate(p_key, p_max, p_seconds);
  return true;
exception when sqlstate 'P0001' then
  -- Chegaradan oshgan urinish ham hisobda qoladi.
  return false;
end $$;
create function public.svc_login_free(p_login text) returns boolean language sql stable security definer set search_path = '' as $$ select not exists (select 1 from public.profiles where login = p_login) $$;
create function public.svc_profile_create(p_user uuid, p_login text, p_ref text default null, p_telegram bigint default null) returns void language sql security definer set search_path = '' as $$
  insert into public.profiles (user_id, login, ref_code, referred_by, telegram_id) values
    (p_user, p_login, substr(replace(gen_random_uuid()::text, '-', ''), 1, 8), (select user_id from public.profiles where ref_code = p_ref), p_telegram)
$$;
create function public.svc_user(p_login text default null, p_telegram bigint default null, p_id uuid default null) returns jsonb language sql stable security definer set search_path = '' as $$
  select to_jsonb(q) from (select user_id, login, telegram_id, role, is_banned, instagram, avatar, perms from public.profiles where (p_login is not null and login = p_login) or (p_telegram is not null and telegram_id = p_telegram) or (p_id is not null and user_id = p_id) limit 1) q
$$;

-- ---------- Telegram ----------
create function public.svc_tg_begin(p_hash text, p_purpose text, p_user uuid default null) returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from public.tg_tokens where expires_at < now() - interval '1 day';
  insert into public.tg_tokens (token_hash, purpose, user_id, expires_at) values (p_hash, p_purpose, p_user, now() + interval '10 minutes');
end $$;
create function public.svc_tg_confirm(p_hash text, p_telegram bigint, p_name text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare t public.tg_tokens;
begin
  select * into t from public.tg_tokens where token_hash = p_hash and expires_at > now() and telegram_id is null for update;
  if t.token_hash is null then return jsonb_build_object('ok', false, 'error', 'expired'); end if;
  if t.purpose = 'link' then
    if exists (select 1 from public.profiles where telegram_id = p_telegram and user_id <> t.user_id) then return jsonb_build_object('ok', false, 'error', 'telegram_used'); end if;
    update public.profiles set telegram_id = p_telegram where user_id = t.user_id;
  end if;
  update public.tg_tokens set telegram_id = p_telegram, telegram_name = left(p_name, 60) where token_hash = p_hash;
  return jsonb_build_object('ok', true, 'purpose', t.purpose);
end $$;
/* Login tokeni bir martalik. */
create function public.svc_tg_consume(p_hash text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare t public.tg_tokens;
begin
  select * into t from public.tg_tokens where token_hash = p_hash and purpose = 'login' and expires_at > now() for update;
  if t.token_hash is null then return jsonb_build_object('state', 'expired'); end if;
  if t.telegram_id is null then return jsonb_build_object('state', 'waiting'); end if;
  delete from public.tg_tokens where token_hash = p_hash;
  return jsonb_build_object('state', 'ok', 'telegram', t.telegram_id, 'name', t.telegram_name, 'user', (select user_id from public.profiles where telegram_id = t.telegram_id));
end $$;
create function public.svc_reset_begin(p_user uuid, p_code_hash text) returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from public.tg_tokens where purpose = 'reset' and user_id = p_user;
  insert into public.tg_tokens (token_hash, purpose, user_id, code_hash, expires_at) values ('reset:' || p_user, 'reset', p_user, p_code_hash, now() + interval '10 minutes');
end $$;
/* 5 ta urinish, keyin kod o'chadi. */
create function public.svc_reset_check(p_user uuid, p_code_hash text) returns boolean language plpgsql security definer set search_path = '' as $$
declare t public.tg_tokens;
begin
  select * into t from public.tg_tokens where purpose = 'reset' and user_id = p_user and expires_at > now() for update;
  if t.token_hash is null then return false; end if;
  if t.code_hash = p_code_hash then delete from public.tg_tokens where token_hash = t.token_hash; return true; end if;
  if t.attempts >= 4 then delete from public.tg_tokens where token_hash = t.token_hash;
  else update public.tg_tokens set attempts = attempts + 1 where token_hash = t.token_hash; end if;
  return false;
end $$;
create function public.svc_outbox(p_limit int default 25) returns jsonb language sql security definer set search_path = '' as $$
  with picked as (select n.id from public.notifications n join public.profiles p on p.user_id = n.user_id where n.sent_at is null and p.telegram_id is not null and n.created_at > now() - interval '3 days' order by n.id limit p_limit for update of n skip locked),
  upd as (update public.notifications n set sent_at = now() from picked where n.id = picked.id returning n.*)
  select coalesce(jsonb_agg(jsonb_build_object('id', u.id, 'kind', u.kind, 'data', u.data, 'chat', p.telegram_id, 'lang', p.lang)), '[]') from upd u join public.profiles p on p.user_id = u.user_id
$$;

create function public.svc_waitlist(p_instagram text, p_contact text default null) returns int language plpgsql security definer set search_path = '' as $$
begin
  insert into public.waitlist (instagram, contact) values (private.clean_instagram(p_instagram), left(btrim(p_contact), 80)) on conflict do nothing;
  return (select count(*) from public.waitlist);
end $$;

/* Akkauntni o'chirish: uy bo'shaydi, shaxsiy ma'lumot o'chadi, moliyaviy yozuv anonim qoladi. */
create function public.svc_delete_account(p_user uuid) returns void language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  for r in select plot_id from public.plot_state where owner = p_user loop perform private.release_plot(r.plot_id, 'deleted'); end loop;
  delete from public.notifications where user_id = p_user;
  delete from public.owned_decor where user_id = p_user;
  delete from public.daily_active where user_id = p_user;
  delete from public.tg_tokens where user_id = p_user;
  delete from public.commerce_state where owner = p_user;
  delete from public.candidates where user_id = p_user;
  update public.transfers set status = 'cancelled', message = '' where (from_user = p_user or to_user = p_user) and status = 'pending';
  update public.reports set reporter = null where reporter = p_user;
  update public.profiles set login = 'deleted_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12), instagram = null, telegram_id = null, avatar = '{}', badges = '{}', role = 'user', perms = '{}', is_banned = true, coins = 0 where user_id = p_user;
end $$;

-- ---------- Video ----------
create function public.svc_video_next() returns jsonb language sql security definer set search_path = '' as $$
  update public.video_jobs set status = 'rendering', updated_at = now() where id = (select id from public.video_jobs where status = 'queued' or (status = 'rendering' and updated_at < now() - interval '1 hour') order by created_at limit 1 for update skip locked) returning to_jsonb(video_jobs)
$$;
create function public.svc_video_done(p_id uuid, p_file text, p_error text default null) returns void language sql security definer set search_path = '' as $$
  update public.video_jobs set status = case when p_error is null then 'ready' else 'failed' end, file = p_file, error = left(p_error, 500), updated_at = now() where id = p_id
$$;
create function public.svc_video_sendable() returns jsonb language sql security definer set search_path = '' as $$
  with s as (update public.video_jobs set style = style || '{"delivered":true}' where status = 'sent' and not style ? 'delivered' returning id, file, style)
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'file', file, 'style', style)), '[]') from s
$$;

-- Parol/sessiya auth sxemasida — bu yerda yo'q. Zaxira faqat service_role orqali.
create function public.svc_backup() returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('at', now(), 'version', 1,
    'settings', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.settings t), 'districts', (select jsonb_agg(to_jsonb(t)) from public.districts t),
    'streets', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.streets t where name is not null or pending_name is not null),
    'profiles', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.profiles t), 'plot_state', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.plot_state t),
    'owned_decor', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.owned_decor t), 'decor_catalog', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.decor_catalog t),
    'orders', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.orders t), 'payments', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.payments t),
    'commerce_state', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.commerce_state t), 'map_versions', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.map_versions t),
    'map_objects', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.map_objects t), 'projects', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.projects t),
    'project_contributions', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.project_contributions t), 'gazette', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.gazette t),
    'ownership_log', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.ownership_log t), 'waitlist', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.waitlist t))
$$;
create function public.svc_gazette_candidates(p_nicks text[]) returns int language plpgsql security definer set search_path = '' as $$
-- Instagram kommentlaridan (rasmiy Meta API) yig'ilgan niklar kutish ro'yxatiga tushadi.
declare n text; added int := 0;
begin
  foreach n in array p_nicks loop
    begin
      insert into public.waitlist (instagram, contact) values (private.clean_instagram(n), 'instagram-comment') on conflict do nothing;
      if found then added := added + 1; end if;
    exception when sqlstate 'P0001' then continue;
    end;
  end loop;
  return added;
end $$;

insert into public.settings (key, value, is_public) values
  ('city_name', '"CityLand UZ"', true), ('maintenance', 'false', true), ('require_approval', 'true', false), ('free_claim_enabled', 'true', true),
  ('payments_enabled', 'false', true), ('payment_provider', '"card"', true), ('pay_card', '""', false), ('reserve_minutes', '30', true), ('discount_pct', '0', true),
  ('coins_enabled', 'true', true), ('elections_enabled', 'false', true), ('multiplayer_enabled', 'true', true), ('release_inactive', 'false', false), ('inactive_days', '180', false),
  ('founder_limit', '100', true), ('sponsor_threshold', '500000', false), ('street_vote_min', '5', true), ('commerce_days', '30', true), ('day_minutes', '24', true),
  ('telegram_bot', '""', true), ('telegram_channel', '"citylanduz"', true), ('support_url', '""', true),
  ('prices', '{"base":{"hovli":30000,"kvartira":20000,"villa":150000,"qasr":400000},"tierUp":{"2":25000,"3":50000,"4":120000,"5":300000},"expansion":80000,"streetName":200000,"label":{"silver":15000,"gold":40000},"commerce":{"dokon":100000,"ofis":250000,"bilbord":150000}}', true),
  ('coins', '{"daily":10,"streakStep":5,"referral":50,"treasure":100,"treasureSlots":10,"tierBase":500,"maxTier":3,"quest":{"telegram":50,"house":30,"bio":10,"decor":40,"invite3":150,"walk":15,"contribute":10}}', true);
insert into public.projects (kind, title_uz, title_ru, goal) values
  ('bog', 'Markaziy bog''', 'Центральный парк', 5000), ('stadion', 'Shahar stadioni', 'Городской стадион', 20000), ('koprik', 'Ko''l ko''prigi', 'Мост через озеро', 12000);

-- Reklama rasmlari va videolar (haqiqiy Supabase'da).
do $$
begin
  if exists (select 1 from pg_catalog.pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
      ('ads', 'ads', true, 1048576, array['image/webp','image/png','image/jpeg']), ('videos', 'videos', true, 52428800, array['video/mp4']), ('backups', 'backups', false, null, array['application/json']) on conflict do nothing;
    execute $p$ create policy "ads: o'z papkasiga yuklash" on storage.objects for insert to authenticated with check (bucket_id = 'ads' and (storage.foldername(name))[1] = auth.uid()::text) $p$;
  end if;
end $$;

select private.apply_grants();
