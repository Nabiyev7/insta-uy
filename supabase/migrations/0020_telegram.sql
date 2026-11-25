/* 6-qadam, B va C: kirish faqat Telegram bot orqali (Instagram nik → bir martalik havola), nik o'zgarmaydi, eski parolli akkaunt Telegram ulamaguncha faqat ko'radi;
   birinchi 100 kishi aniq hisoblanadi; 3 oy kirmagan bepul uy bo'shatiladi. */
set check_function_bodies = off;

-- ---------- Bot bilan suhbat holati ----------
create table public.tg_sessions (
  telegram_id bigint primary key, step text not null check (step in ('nick')), ref text, name text, updated_at timestamptz not null default now()
);
/* Kutish ro'yxati (sayt ochilganda bot xabar beradi). */
create table public.tg_waitlist (telegram_id bigint primary key, created_at timestamptz not null default now());

alter table public.tg_tokens drop constraint tg_tokens_purpose_check;
alter table public.tg_tokens add constraint tg_tokens_purpose_check check (purpose in ('login','link','reset','magic'));

-- Bitta Instagram nik — bitta akkaunt (bo'lsa, eski takrorlar tozalanadi).
update public.profiles p set instagram = null where instagram is not null and exists (select 1 from public.profiles q where lower(q.instagram) = lower(p.instagram) and q.created_at < p.created_at);
create unique index profiles_instagram on public.profiles (lower(instagram)) where instagram is not null;

/* /start: ro'yxatdan o'tganmi? Yo'q bo'lsa — nik so'raladi (taklif kodi eslab qolinadi). */
create function public.svc_bot_start(p_telegram bigint, p_ref text default null, p_name text default null) returns jsonb language plpgsql security definer set search_path = '' as $$
declare p public.profiles;
begin
  select * into p from public.profiles where telegram_id = p_telegram;
  if p.user_id is not null then
    delete from public.tg_sessions where telegram_id = p_telegram;
    return jsonb_build_object('state', case when p.is_banned then 'banned' else 'ready' end, 'user', p.user_id, 'nick', p.instagram, 'lang', p.lang);
  end if;
  insert into public.tg_sessions as s (telegram_id, step, ref, name) values (p_telegram, 'nick', nullif(left(p_ref, 20), ''), left(p_name, 60))
    on conflict (telegram_id) do update set step = 'nick', ref = coalesce(excluded.ref, s.ref), name = coalesce(excluded.name, s.name), updated_at = now();
  return jsonb_build_object('state', 'need_nick');
end $$;
create function public.svc_bot_session(p_telegram bigint) returns jsonb language sql stable security definer set search_path = '' as $$
  select to_jsonb(s) from public.tg_sessions s where telegram_id = p_telegram
$$;
/* Nik bo'shmi (format, so'z filtri, band emas)? Toza nikni qaytaradi. */
create function private.nick_free(p_nick text) returns text language plpgsql stable set search_path = '' as $$
declare nick text := private.clean_instagram(p_nick);
begin
  if exists (select 1 from public.profiles where lower(instagram) = nick) or exists (select 1 from public.plot_state where lower(instagram) = nick and status <> 'reserved') then perform private.fail('nick_taken'); end if;
  return nick;
end $$;
create function public.svc_nick_check(p_nick text) returns text language sql stable security definer set search_path = '' as $$ select private.nick_free(p_nick) $$;

/* Akkaunt profili. Telegram va nik bilan yaratilsa — bot suhbati tugaydi, taklif kodi suhbatdan olinadi. */
drop function public.svc_profile_create(uuid, text, text, bigint);
create function public.svc_profile_create(p_user uuid, p_login text, p_ref text default null, p_telegram bigint default null, p_instagram text default null) returns void language plpgsql security definer set search_path = '' as $$
declare nick text; v_ref text := p_ref;
begin
  if p_instagram is not null then
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('nick:' || lower(btrim(p_instagram, ' @'))));
    nick := private.nick_free(p_instagram);
  end if;
  if p_telegram is not null then
    v_ref := coalesce(v_ref, (select ref from public.tg_sessions where telegram_id = p_telegram));
    delete from public.tg_sessions where telegram_id = p_telegram;
  end if;
  insert into public.profiles (user_id, login, ref_code, referred_by, telegram_id, instagram, avatar) values
    (p_user, p_login, substr(replace(gen_random_uuid()::text, '-', ''), 1, 8), (select user_id from public.profiles where ref_code = v_ref and telegram_id is distinct from p_telegram), p_telegram, nick, private.avatar_of(p_user, '{}'));
end $$;

/* Bot yuboradigan bir martalik kirish havolasi (15 daqiqa). */
create function public.svc_login_issue(p_hash text, p_user uuid) returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from public.tg_tokens where expires_at < now() - interval '1 day';
  insert into public.tg_tokens (token_hash, purpose, user_id, expires_at) values (p_hash, 'magic', p_user, now() + interval '15 minutes');
end $$;
create function public.svc_login_redeem(p_hash text) returns uuid language sql security definer set search_path = '' as $$
  delete from public.tg_tokens t where t.token_hash = p_hash and t.purpose = 'magic' and t.expires_at > now()
    and not exists (select 1 from public.profiles p where p.user_id = t.user_id and p.is_banned) returning t.user_id
$$;

create function public.svc_tg_waitlist(p_telegram bigint) returns int language plpgsql security definer set search_path = '' as $$
begin
  insert into public.tg_waitlist (telegram_id) values (p_telegram) on conflict do nothing;
  return (select count(*) from public.tg_waitlist);
end $$;

-- ---------- Faqat ko'rish: Telegram ulanmagan oddiy akkaunt yozolmaydi ----------
create or replace function private.writable() returns public.profiles language plpgsql stable security definer set search_path = '' as $$
declare p public.profiles := private.me();
begin
  if private.flag('maintenance') and p.role = 'user' then perform private.fail('maintenance'); end if;
  if p.telegram_id is null and p.role = 'user' then perform private.fail('telegram_required'); end if;
  return p;
end $$;
create or replace function public.svc_player(p_id uuid) returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('login', p.login, 'instagram', p.instagram, 'is_banned', p.is_banned, 'avatar', p.avatar, 'is_moderator', private.can_moderate(p),
    'can_write', p.telegram_id is not null or p.role <> 'user',
    'homes', (select coalesce(jsonb_agg(distinct pl.district_id), '[]') from public.plot_state s join public.plots pl on pl.id = s.plot_id where s.owner = p.user_id and s.status = 'owned'))
  from public.profiles p where p.user_id = p_id
$$;

-- ---------- Instagram nik o'zgarmaydi (faqat admin) ----------
drop function public.my_set_nick(text, text);
create or replace function public.admin_user(p_id uuid, p_action text, p_data jsonb default '{}') returns void language plpgsql security definer set search_path = '' as $$
declare me public.profiles := private.require('users'); target public.profiles; nick text;
begin
  select * into target from public.profiles where user_id = p_id;
  if target.user_id is null then perform private.fail('not_found'); end if;
  -- Moderator faqat oddiy foydalanuvchini bloklay oladi; rol, nik va tangani faqat admin o'zgartiradi.
  if me.role <> 'admin' and (p_action not in ('ban','unban') or target.role <> 'user') then perform private.fail('forbidden'); end if;
  case p_action
  when 'ban' then if target.user_id = me.user_id then perform private.fail('forbidden'); end if; update public.profiles set is_banned = true where user_id = p_id;
  when 'unban' then update public.profiles set is_banned = false where user_id = p_id;
  when 'role' then
    if target.user_id = me.user_id then perform private.fail('forbidden'); end if;
    update public.profiles set role = p_data ->> 'role', perms = coalesce((select array_agg(x) from jsonb_array_elements_text(p_data -> 'perms') x where x in ('plots','reports','streets','ads','orders','users','map','video','settings')), '{}') where user_id = p_id;
  when 'badge' then perform private.give_badge(p_id, p_data ->> 'badge');
  when 'unbadge' then update public.profiles set badges = array_remove(badges, p_data ->> 'badge') where user_id = p_id;
  when 'coins' then perform private.coins(p_id, (p_data ->> 'delta')::int, 'admin');
  when 'nick' then
    nick := private.clean_instagram(p_data ->> 'instagram');
    if exists (select 1 from public.profiles where lower(instagram) = nick and user_id <> p_id) or private.nick_taken(p_id, nick) then perform private.fail('nick_taken'); end if;
    update public.profiles set instagram = nick where user_id = p_id;
    update public.plot_state set instagram = nick where owner = p_id and status <> 'reserved';
  else perform private.fail('bad_format');
  end case;
  perform private.audit('user:' || p_action, p_data || jsonb_build_object('user', p_id));
end $$;

/* Sovg'a qilingan uyda yangi egasining niki turadi. */
create or replace function public.my_transfer(p_plot text, p_to text, p_message text default '') returns uuid language plpgsql security definer set search_path = '' as $$
declare st public.plot_state := private.own_plot(p_plot); v_to uuid; v_id uuid; v_q text := lower(btrim(coalesce(p_to, ''), ' @'));
begin
  perform private.rate('transfer:' || st.owner, 5, 86400);
  if st.status <> 'owned' then perform private.fail('not_approved'); end if;
  select user_id into v_to from public.profiles where (lower(instagram) = v_q or login = v_q) and not is_banned order by (lower(instagram) = v_q) desc nulls last limit 1;
  if v_to is null or v_to = st.owner then perform private.fail('user_not_found'); end if;
  update public.transfers set status = 'cancelled' where plot_id = p_plot and status = 'pending';
  insert into public.transfers (plot_id, from_user, to_user, message) values (p_plot, st.owner, v_to, private.clean_text(p_message, 100, true)) returning id into v_id;
  perform private.notify(v_to, 'transfer', jsonb_build_object('plot', p_plot));
  return v_id;
end $$;
create or replace function public.my_transfer_answer(p_id uuid, p_accept boolean, p_instagram text default null) returns void language plpgsql security definer set search_path = '' as $$
declare me public.profiles := private.writable(); t public.transfers; nick text;
begin
  select * into t from public.transfers where id = p_id and to_user = me.user_id and status = 'pending' for update;
  if t.id is null then perform private.fail('not_found'); end if;
  if not p_accept then update public.transfers set status = 'declined' where id = p_id; return; end if;
  nick := coalesce(me.instagram, private.clean_instagram(p_instagram));
  if private.nick_taken(me.user_id, nick) then perform private.fail('nick_taken'); end if;
  update public.plot_state set owner = me.user_id, instagram = nick, status = 'owned', bio = '', decor = '{}', is_free = false, claimed_at = now() where plot_id = t.plot_id and owner = t.from_user and status = 'owned';
  if not found then perform private.fail('not_owner'); end if;
  update public.profiles set instagram = coalesce(instagram, nick) where user_id = me.user_id;
  update public.transfers set status = 'accepted' where id = p_id;
  insert into public.ownership_log (plot_id, from_user, to_user, reason) values (t.plot_id, t.from_user, me.user_id, 'gift');
  perform private.notify(t.from_user, 'transfer_done', jsonb_build_object('plot', t.plot_id));
end $$;

-- ---------- C: bepul uy (nik — profildagi), birinchi 100 kishi aniq ----------
create or replace function public.my_claim(p_plot text, p_instagram text default null, p_bio text default '') returns jsonb language plpgsql security definer set search_path = '' as $$
declare me public.profiles := private.writable(); pl public.plots; nick text; st public.plot_state;
begin
  perform private.rate('claim:' || me.user_id, 10, 3600);
  if not private.flag('free_claim_enabled') then perform private.fail('free_closed'); end if;
  select * into me from public.profiles where user_id = me.user_id for update;
  if me.free_used then perform private.fail('free_used'); end if;
  nick := coalesce(me.instagram, private.clean_instagram(p_instagram));
  select * into pl from public.plots where id = p_plot;
  if pl.id is null then perform private.fail('not_found'); end if;
  if pl.type = 'kvartira' then perform private.fail('apartments_closed'); end if;
  if pl.type <> 'hovli' then perform private.fail('paid_only'); end if;
  if not (select is_open from public.districts where id = pl.district_id) then perform private.fail('district_closed'); end if;
  if coalesce(p_bio, '') ~* '(https?://|www\.|t\.me/)' then perform private.fail('bad_format'); end if;
  if private.nick_taken(me.user_id, nick) or (me.instagram is null and exists (select 1 from public.profiles where lower(instagram) = nick)) then perform private.fail('nick_taken'); end if;
  select * into st from public.plot_state where plot_id = p_plot for update;
  if st.plot_id is not null and (st.status <> 'reserved' or st.reserved_until > now()) then perform private.fail('not_free'); end if;
  delete from public.plot_state where plot_id = p_plot and status = 'reserved' and reserved_until <= now();
  insert into public.plot_state (plot_id, status, owner, instagram, bio, is_free) values (p_plot, 'owned', me.user_id, nick, private.clean_text(p_bio, 120, true), true)
    on conflict (plot_id) do nothing;
  if not found then perform private.fail('not_free'); end if;
  update public.profiles set free_used = true, instagram = coalesce(instagram, nick) where user_id = me.user_id;
  perform private.found_city(me.user_id);
  insert into public.ownership_log (plot_id, to_user, reason) values (p_plot, me.user_id, 'free');
  perform private.pay_referral(me.user_id);
  return jsonb_build_object('status', 'owned', 'address', private.address(p_plot));
end $$;
/* Shahar asoschisi: bir vaqtda kelganlar navbatga turadi — aniq N kishi (sozlama founder_limit). */
create function private.found_city(uid uuid) returns boolean language plpgsql security definer set search_path = '' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('founders'));
  if (select count(*) from public.profiles where 'asoschi' = any (badges)) >= private.num('founder_limit', 100) then return false; end if;
  perform private.give_badge(uid, 'asoschi');
  return true;
end $$;

-- ---------- C: 3 oy kirmagan bepul uy bo'shatiladi (2 hafta oldin bot ogohlantiradi); pulga olingani bo'shatilmaydi ----------
update public.settings set value = 'true' where key = 'release_inactive';
update public.settings set value = '90' where key = 'inactive_days';
create or replace function private.svc_tick_base() returns jsonb language plpgsql security definer set search_path = '' as $$
declare v public.street_votes; e public.elections; r record; released int := 0; wk date := date_trunc('week', now())::date; me_end timestamptz := date_trunc('month', now()) + interval '1 month';
begin
  update public.orders set status = 'expired' where status = 'pending' and expires_at < now();
  delete from public.plot_state where status = 'reserved' and reserved_until < now();
  delete from public.tg_sessions where updated_at < now() - interval '7 days';
  for v in select * from public.street_votes where status = 'open' and closes_at < now() loop perform private.close_street_vote(v); end loop;
  for e in select * from public.elections where status = 'open' and ends_at < now() loop perform private.close_election(e); end loop;
  if private.flag('elections_enabled') then
    insert into public.elections (kind, ends_at) values ('hokim', me_end) on conflict do nothing;
    insert into public.elections (kind, district_id, ends_at) select 'rais', id, me_end from public.districts where is_open on conflict do nothing;
  end if;
  if private.flag('release_inactive') then
    for r in select s.plot_id, s.owner from public.plot_state s join public.profiles p on p.user_id = s.owner where s.is_free and s.status = 'owned'
        and p.last_seen < now() - make_interval(days => private.num('inactive_days', 90)::int)
        and exists (select 1 from public.notifications n where n.user_id = s.owner and n.kind = 'inactive_warning' and n.created_at < now() - interval '14 days' and n.created_at > p.last_seen) loop
      perform private.release_plot(r.plot_id, 'inactive');
      released := released + 1;
    end loop;
    insert into public.notifications (user_id, kind, data) select s.owner, 'inactive_warning', jsonb_build_object('plot', s.plot_id) from public.plot_state s join public.profiles p on p.user_id = s.owner
      where s.is_free and s.status = 'owned' and p.last_seen < now() - make_interval(days => (private.num('inactive_days', 90) - 14)::int)
        and not exists (select 1 from public.notifications n where n.user_id = s.owner and n.kind = 'inactive_warning' and n.created_at > p.last_seen);
  end if;
  perform private.build_gazette(wk);
  delete from public.rate_limits where bucket < floor(extract(epoch from now()) / 60) - 2880 and key like '%/60';
  delete from public.rate_limits where key not like '%/60' and bucket < floor(extract(epoch from now()) / 86400) - 2 and key like '%/86400';
  delete from public.rate_limits where key like '%/3600' and bucket < floor(extract(epoch from now()) / 3600) - 48;
  return jsonb_build_object('released', released);
end $$;

-- Parol, ro'yxat va kod bilan tiklash endi yo'q (kirish faqat bot havolasi bilan).
drop function if exists public.svc_reset_begin(uuid, text);
drop function if exists public.svc_reset_check(uuid, text);
drop function if exists public.svc_login_free(text);
drop function if exists public.svc_tg_consume(text);

select private.apply_grants();
