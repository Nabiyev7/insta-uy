-- Asosiy jadvallar. Qoida: jadvallarga to'g'ridan-to'g'ri kirish yo'q, faqat RPC.
-- Nomlash = ruxsat: api_* (hamma), my_* (kirgan), admin_* (kirgan + rol tekshiruvi), svc_* (faqat server).
create schema if not exists private;
revoke all on schema private from public;

create table public.settings (
  key text primary key, value jsonb not null, is_public boolean not null default false
);

-- ---------- Bosh reja (qulflangan, PLAN §2) ----------
create table public.districts (
  id int primary key, zone text not null, name_uz text not null, name_ru text not null,
  is_open boolean not null default false, opened_at timestamptz
);
create table public.streets (
  id int primary key, district_id int not null, kind text not null, is_central boolean not null,
  name text check (char_length(name) <= 25), name_status text not null default 'none' check (name_status in ('none','temp','voted','paid')),
  pending_name text check (char_length(pending_name) <= 25), pending_kind text, pending_by uuid,
  named_at timestamptz
);
create unique index streets_name_key on public.streets (lower(name));
create table public.plots (
  id text primary key, district_id int not null references public.districts, street_id int not null references public.streets,
  number int not null, unit int not null, type text not null check (type in ('hovli','kvartira','villa','qasr')),
  x numeric not null, z numeric not null, w numeric not null, d numeric not null, rot int not null, building int not null, value int not null,
  unique (street_id, number, unit)
);
create index plots_district on public.plots (district_id);
create index plots_street on public.plots (street_id);
create table public.expansions (
  id text primary key, plot_id text not null unique references public.plots, x numeric not null, z numeric not null,
  w numeric not null, d numeric not null, rot int not null
);
create table public.commerce (
  id text primary key, type text not null check (type in ('dokon','ofis','bilbord')), x numeric not null, z numeric not null,
  w numeric not null, d numeric not null, rot int not null
);
create table public.roads (id int primary key, x numeric not null, z numeric not null, w numeric not null, d numeric not null);

create function private.locked_row() returns trigger language plpgsql as $$
begin
  raise exception 'locked_master_plan' using errcode = 'P0001';
end $$;
create trigger plots_locked before update or delete on public.plots for each row execute function private.locked_row();
create trigger expansions_locked before update or delete on public.expansions for each row execute function private.locked_row();
create trigger commerce_locked before update or delete on public.commerce for each row execute function private.locked_row();
create trigger roads_locked before update or delete on public.roads for each row execute function private.locked_row();
create trigger plots_no_truncate before truncate on public.plots execute function private.locked_row();
create trigger streets_locked before delete or update of id, district_id, kind, is_central on public.streets for each row execute function private.locked_row();
create trigger districts_locked before delete or update of id, zone on public.districts for each row execute function private.locked_row();

-- ---------- Odamlar ----------
create table public.profiles (
  user_id uuid primary key, login text not null unique, instagram text, role text not null default 'user' check (role in ('user','moderator','admin')),
  perms text[] not null default '{}', badges text[] not null default '{}', avatar jsonb not null default '{}',
  telegram_id bigint unique, coins int not null default 0 check (coins >= 0), ref_code text not null unique, referred_by uuid references public.profiles,
  free_used boolean not null default false, is_banned boolean not null default false, lang text not null default 'uz',
  streak int not null default 0, last_daily date, created_at timestamptz not null default now(), last_seen timestamptz not null default now()
);
create table public.plot_state (
  plot_id text primary key references public.plots, status text not null check (status in ('reserved','pending','owned')),
  owner uuid references public.profiles, instagram text, bio text not null default '', tier int not null default 1 check (tier between 1 and 5),
  wall int not null default 0, roof int not null default 0, decor text[] not null default '{}', has_expansion boolean not null default false,
  label text not null default 'plain' check (label in ('plain','silver','gold')), is_free boolean not null default false,
  reserved_until timestamptz, reserved_order uuid, claimed_at timestamptz not null default now()
);
create unique index plot_state_instagram on public.plot_state (lower(instagram)) where status <> 'reserved' and is_free;
create index plot_state_owner on public.plot_state (owner);
create table public.ownership_log (
  id bigint generated always as identity primary key, plot_id text not null, from_user uuid, to_user uuid, reason text not null, at timestamptz not null default now()
);
create table public.owned_decor (
  user_id uuid not null references public.profiles on delete cascade, decor_id text not null, qty int not null default 1 check (qty >= 0),
  primary key (user_id, decor_id)
);
create table public.decor_catalog (
  id text primary key, slot text not null, price_uzs int not null check (price_uzs >= 0), price_coins int not null check (price_coins >= 0),
  stock int, sold int not null default 0, is_active boolean not null default true, check (stock is null or sold <= stock)
);
create table public.transfers (
  id uuid primary key default gen_random_uuid(), plot_id text not null references public.plots, from_user uuid not null references public.profiles,
  to_user uuid not null references public.profiles, message text not null default '', status text not null default 'pending'
    check (status in ('pending','accepted','declined','cancelled')), created_at timestamptz not null default now()
);
create unique index transfers_pending on public.transfers (plot_id) where status = 'pending';
create table public.reports (
  id bigint generated always as identity primary key, reporter uuid references public.profiles, target_kind text not null, target_id text not null,
  reason text not null, status text not null default 'open' check (status in ('open','resolved','rejected')), note text, created_at timestamptz not null default now()
);
create table public.audit_log (
  id bigint generated always as identity primary key, actor uuid, action text not null, data jsonb not null default '{}', at timestamptz not null default now()
);
create table public.rate_limits (key text not null, bucket bigint not null, hits int not null default 1, primary key (key, bucket));
create table public.waitlist (instagram text primary key, contact text, created_at timestamptz not null default now());
create table public.daily_active (day date not null, user_id uuid not null, district_id int not null default 0, primary key (day, user_id, district_id));
create table public.notifications (
  id bigint generated always as identity primary key, user_id uuid not null references public.profiles on delete cascade, kind text not null,
  data jsonb not null default '{}', created_at timestamptz not null default now(), read_at timestamptz, sent_at timestamptz
);
create index notifications_user on public.notifications (user_id, id desc);

-- ---------- So'z filtri ----------
create table private.banned (root text primary key, whole_word boolean not null);
create function private.squash(t text) returns text language sql immutable as $$ select regexp_replace(t, '(.)\1+', '\1', 'g') $$;
create function private.latin(t text) returns text language sql immutable as $$
  select translate(replace(replace(replace(replace(replace(replace(lower(t), 'ч','ch'),'ш','sh'),'щ','sh'),'ц','ts'),'ю','yu'),'я','ya'),
    'абвгдеёжзийклмнопрстуфхыэқғҳўъь’‘''`ʻʼ', 'abvgdeejziyklmnoprstufxieqgho')
$$;
create function private.deleet(t text) returns text language sql immutable as $$ select translate(t, '013457@$!', 'oieastasi') $$;
create function private.has_banned(t text) returns boolean language plpgsql stable set search_path = '' as $$
declare tokens text[]; tok text; form text; joined text;
begin
  tokens := array_remove(regexp_split_to_array(private.latin(coalesce(t, '')), '[\s._\-,;:/\\|+*#()\[\]"]+'), '');
  foreach tok in array tokens loop
    foreach form in array array[private.squash(regexp_replace(tok, '[^a-z0-9]', '', 'g')), private.squash(regexp_replace(private.deleet(tok), '[^a-z0-9]', '', 'g'))] loop
      if exists (select 1 from private.banned b where (b.whole_word and b.root = form) or (not b.whole_word and position(private.squash(b.root) in form) > 0)) then
        return true;
      end if;
    end loop;
  end loop;
  if cardinality(tokens) > 2 and not exists (select 1 from unnest(tokens) u where char_length(u) > 2) then
    joined := private.squash(regexp_replace(private.deleet(array_to_string(tokens, '')), '[^a-z0-9]', '', 'g'));
    return exists (select 1 from private.banned b where not b.whole_word and position(private.squash(b.root) in joined) > 0);
  end if;
  return false;
end $$;

-- ---------- Yordamchilar ----------
create function private.fail(code text) returns void language plpgsql as $$ begin raise exception '%', code using errcode = 'P0001'; end $$;
create function private.setting(k text) returns jsonb language sql stable set search_path = '' as $$ select value from public.settings where key = k $$;
create function private.flag(k text) returns boolean language sql stable set search_path = '' as $$ select coalesce((select value = 'true'::jsonb from public.settings where key = k), false) $$;
create function private.num(k text, dflt numeric) returns numeric language sql stable set search_path = '' as $$
  select coalesce((select (value #>> '{}')::numeric from public.settings where key = split_part(k, '.', 1) and position('.' in k) = 0),
                  (select (value #>> string_to_array(substr(k, position('.' in k) + 1), '.'))::numeric from public.settings where key = split_part(k, '.', 1) and position('.' in k) > 0), dflt)
$$;
create function private.me() returns public.profiles language plpgsql stable security definer set search_path = '' as $$
declare p public.profiles;
begin
  select * into p from public.profiles where user_id = auth.uid();
  if p.user_id is null then perform private.fail('not_signed_in'); end if;
  if p.is_banned then perform private.fail('banned'); end if;
  return p;
end $$;
create function private.require(perm text) returns public.profiles language plpgsql stable security definer set search_path = '' as $$
declare p public.profiles := private.me();
begin
  if p.role = 'admin' or (p.role = 'moderator' and perm = any (p.perms)) then return p; end if;
  perform private.fail('forbidden');
end $$;
-- Texnik ishlar vaqtida faqat xodimlar yozadi.
create function private.writable() returns public.profiles language plpgsql stable security definer set search_path = '' as $$
declare p public.profiles := private.me();
begin
  if private.flag('maintenance') and p.role = 'user' then perform private.fail('maintenance'); end if;
  return p;
end $$;
create function private.rate(k text, max_hits int, seconds int) returns void language plpgsql security definer set search_path = '' as $$
declare b bigint := floor(extract(epoch from now()) / seconds); n int;
begin
  insert into public.rate_limits as r (key, bucket) values (k || '/' || seconds, b) on conflict (key, bucket) do update set hits = r.hits + 1 returning hits into n;
  if n > max_hits then perform private.fail('rate_limited'); end if;
end $$;
create function private.audit(act text, d jsonb default '{}') returns void language sql security definer set search_path = '' as $$
  insert into public.audit_log (actor, action, data) values (auth.uid(), act, d)
$$;
create function private.notify(uid uuid, k text, d jsonb default '{}') returns void language sql security definer set search_path = '' as $$
  insert into public.notifications (user_id, kind, data) select uid, k, d where uid is not null
$$;
create function private.clean_text(t text, max_len int, allow_empty boolean) returns text language plpgsql stable set search_path = '' as $$
declare v text := btrim(regexp_replace(coalesce(t, ''), '\s+', ' ', 'g'));
begin
  if v = '' and not allow_empty then perform private.fail('empty'); end if;
  if char_length(v) > max_len then perform private.fail('too_long'); end if;
  if v ~ '[\x01-\x08\x0b-\x1f\x7f​-‏‪-‮]' then perform private.fail('bad_format'); end if;
  if private.has_banned(v) then perform private.fail('banned_word'); end if;
  return v;
end $$;
create function private.clean_instagram(t text) returns text language plpgsql stable set search_path = '' as $$
declare v text := lower(btrim(coalesce(t, ''), ' @'));
begin
  if v = '' then perform private.fail('empty'); end if;
  if char_length(v) > 30 or v !~ '^[a-z0-9_]([a-z0-9._]*[a-z0-9_])?$' or position('..' in v) > 0 then perform private.fail('bad_format'); end if;
  if private.has_banned(v) then perform private.fail('banned_word'); end if;
  return v;
end $$;
create function private.clean_street(t text) returns text language plpgsql stable set search_path = '' as $$
declare v text := private.clean_text(t, 25, false);
begin
  if v !~ '^[[:alnum:] ''’ʻ\-]+$' then perform private.fail('bad_format'); end if;
  if exists (select 1 from public.streets where lower(name) = lower(v) or lower(pending_name) = lower(v)) then perform private.fail('name_taken'); end if;
  return v;
end $$;
create function private.coins(uid uuid, delta int, why text) returns int language plpgsql security definer set search_path = '' as $$
declare bal int;
begin
  update public.profiles set coins = coins + delta where user_id = uid and coins + delta >= 0 returning coins into bal;
  if bal is null then perform private.fail('not_enough_coins'); end if;
  insert into public.coin_ledger (user_id, delta, reason) values (uid, delta, why);
  return bal;
end $$;
create table public.coin_ledger (
  id bigint generated always as identity primary key, user_id uuid not null references public.profiles on delete cascade, delta int not null,
  reason text not null, at timestamptz not null default now()
);
create index coin_ledger_user on public.coin_ledger (user_id, id desc);

/* Har migratsiya oxirida chaqiriladi: nom bo'yicha ruxsat va RLS. */
create function private.apply_grants() returns void language plpgsql set search_path = '' as $$
declare f record; t record;
begin
  for t in select c.relname from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' loop
    execute format('alter table public.%I enable row level security', t.relname);
    execute format('revoke all on public.%I from public, anon, authenticated', t.relname);
  end loop;
  for f in select p.oid::regprocedure as sig, p.proname from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.prokind = 'f' and p.proname ~ '^(api|my|admin|svc)_' loop
    execute format('revoke all on function %s from public, anon, authenticated, service_role', f.sig);
    if f.proname like 'api\_%' then execute format('grant execute on function %s to anon, authenticated, service_role', f.sig);
    elsif f.proname like 'svc\_%' then execute format('grant execute on function %s to service_role', f.sig);
    else execute format('grant execute on function %s to authenticated', f.sig);
    end if;
  end loop;
end $$;
revoke all on all functions in schema private from public;
