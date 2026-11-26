/* Tuzatish 2 (6d): premium tovarlar faqat pulga; admin — faqat egasi (ADMIN_TELEGRAM_ID); tashrif manbasi; bo'sh shahar hisoblagichi. */
set check_function_bodies = off;

-- ---------- 6. Premium tovar: tangaga sotilmaydi, level cheklovi yo'q ----------
alter table public.decor_catalog add column is_premium boolean not null default false;

create or replace function public.api_catalog() returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'slot', slot, 'model', model_id, 'uz', name_uz, 'ru', name_ru, 'uzs', price_uzs, 'coins', price_coins, 'left', case when stock is null then null else stock - sold end,
    'spots', spots, 'min', min_level, 'from', season_from, 'to', season_to, 'set', set_id, 'isNew', is_new, 'tint', tint, 'active', is_active, 'premium', is_premium,
    'onSale', is_active and private.in_season(season_from, season_to)) order by sort, id), '[]')
  from public.decor_catalog
$$;

create or replace function private.check_decor_sale(uid uuid, c public.decor_catalog) returns void language plpgsql stable set search_path = '' as $$
begin
  if c.id is null or not c.is_active then perform private.fail('not_found'); end if;
  if not private.in_season(c.season_from, c.season_to) then perform private.fail('out_of_season'); end if;
  if c.min_level > 1 and not c.is_premium and private.best_tier(uid) < c.min_level and not private.is_tester_uid(uid) then perform private.fail('level_low'); end if;
end $$;

alter function public.my_buy_decor_coins(text) set schema private;
alter function private.my_buy_decor_coins(text) rename to buy_decor_coins_base;
create function public.my_buy_decor_coins(p_id text) returns int language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.decor_catalog where id = p_id and is_premium) then perform private.fail('not_for_sale'); end if;
  return private.buy_decor_coins_base(p_id);
end $$;

alter function public.my_buy_set_coins(text) set schema private;
alter function private.my_buy_set_coins(text) rename to buy_set_coins_base;
create function public.my_buy_set_coins(p_set text) returns int language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.decor_catalog where set_id = p_set and is_premium) then perform private.fail('not_for_sale'); end if;
  return private.buy_set_coins_base(p_set);
end $$;

alter function public.admin_decor_save(jsonb) set schema private;
alter function private.admin_decor_save(jsonb) rename to decor_save_base;
create function public.admin_decor_save(p jsonb) returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.decor_save_base(p);
  if p ? 'is_premium' then update public.decor_catalog set is_premium = coalesce((p ->> 'is_premium')::boolean, false) where id = p ->> 'id'; end if;
end $$;

-- ---------- 5. Admin — faqat egasi ----------
/* Egasi Telegram ID si: server (svc_set_owner) yozadi. Yozilmagan bo'lsa (lokal sinov) — admin roli yetadi. */
create table private.owner (id boolean primary key default true check (id), telegram_id bigint not null);
create function private.owner_tg() returns bigint language sql stable security definer set search_path = '' as $$ select telegram_id from private.owner $$;
create function private.is_owner(p public.profiles) returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(p.role = 'admin' and not p.is_banned and (private.owner_tg() is null or p.telegram_id = private.owner_tg()), false)
$$;
/* Moderator roli hozircha ishlatilmaydi (kod qoladi, `moderators_enabled` sozlamasi bilan yoqiladi). */
create or replace function private.require(perm text) returns public.profiles language plpgsql stable security definer set search_path = '' as $$
declare p public.profiles := private.me();
begin
  if private.is_owner(p) then return p; end if;
  if p.role = 'moderator' and perm = any (p.perms) and private.flag('moderators_enabled') then return p; end if;
  perform private.fail('forbidden');
end $$;
create or replace function private.is_tester(p public.profiles) returns boolean language sql stable security definer set search_path = '' as $$ select private.is_owner(p) and coalesce(p.test_mode, false) $$;
create or replace function private.is_tester_uid(uid uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select private.is_owner(p) and p.test_mode from public.profiles p where p.user_id = uid), false)
$$;
create or replace function public.svc_is_admin(p_user uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select private.is_owner(p) from public.profiles p where p.user_id = p_user), false)
$$;
/* Egasi yozilgach, boshqa hech kim admin bo'la olmaydi. */
create function private.guard_role() returns trigger language plpgsql set search_path = '' as $$
declare o bigint := private.owner_tg();
begin
  if new.role = 'admin' and o is not null and new.telegram_id is distinct from o then perform private.fail('forbidden'); end if;
  return new;
end $$;
create trigger profiles_guard_role before insert or update of role, telegram_id on public.profiles for each row execute function private.guard_role();

create function public.svc_set_owner(p_telegram bigint) returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_telegram is null or p_telegram <= 0 then perform private.fail('bad_format'); end if;
  if private.owner_tg() is not distinct from p_telegram and not exists (select 1 from public.profiles where role in ('admin','moderator') and telegram_id is distinct from p_telegram) then
    update public.profiles set role = 'admin' where telegram_id = p_telegram and role <> 'admin';
    return;
  end if;
  update public.profiles set role = 'user' where role in ('admin','moderator') and telegram_id is distinct from p_telegram;
  insert into private.owner (id, telegram_id) values (true, p_telegram) on conflict (id) do update set telegram_id = excluded.telegram_id;
  update public.profiles set role = 'admin' where telegram_id = p_telegram and role <> 'admin';
end $$;
-- svc_make_admin o'zgarmaydi (lokal /dev/admin uchun); egasi yozilgan bo'lsa, trigger boshqani admin qilmaydi.
/* Bot /admin: faqat egasi (Telegram ID bo'yicha). */
create function public.svc_is_owner_tg(p_telegram bigint) returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select private.is_owner(p) from public.profiles p where p.telegram_id = p_telegram), false)
$$;

/* Profilda: admin narsalari faqat egasiga (sayt `owner` ga qaraydi). */
alter function public.my_profile() set schema private;
alter function private.my_profile() rename to profile_base;
create function public.my_profile() returns jsonb language plpgsql security definer set search_path = '' as $$
declare j jsonb := private.profile_base(); p public.profiles := private.me();
begin
  return j || jsonb_build_object('owner', private.is_owner(p), 'role', case when private.is_owner(p) then 'admin' else 'user' end, 'perms', '[]'::jsonb);
end $$;

-- ---------- 8. Qayerdan keldi (?from=bio) ----------
alter table public.profiles add column source text;
create function public.my_source(p_source text) returns void language sql security definer set search_path = '' as $$
  update public.profiles set source = lower(p_source)
  where user_id = auth.uid() and source is null and lower(p_source) ~ '^[a-z0-9_]{1,20}$' and created_at > now() - interval '1 day'
$$;
create function public.admin_sources() returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  perform private.require('stats');
  return (select coalesce(jsonb_agg(jsonb_build_object('source', s, 'users', n) order by n desc), '[]')
    from (select coalesce(source, '') s, count(*) n from public.profiles where created_at > now() - interval '7 days' group by 1) x);
end $$;

-- ---------- 9. Bo'sh shahar: hisoblagich ----------
insert into public.settings (key, value, is_public) values ('lively_start', 'true', true) on conflict (key) do nothing;
alter function public.api_boot() set schema private;
alter function private.api_boot() rename to boot_base;
create function public.api_boot() returns jsonb language sql stable security definer set search_path = '' as $$
  select private.boot_base() || jsonb_build_object('houses', jsonb_build_object(
    'today', (select count(*) from public.plot_state where status <> 'reserved' and not is_test and claimed_at >= (now() at time zone 'Asia/Tashkent')::date::timestamp at time zone 'Asia/Tashkent'),
    'total', (select count(*) from public.plot_state where status <> 'reserved' and not is_test)))
$$;

select private.apply_grants();
