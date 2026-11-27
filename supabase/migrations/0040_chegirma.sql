/* 15-qadam (4): chegirmalar — admin qo'yadi (5–90%, boshlanish va tugash vaqti, Toshkent vaqtida kiritiladi). Bir vaqtda bir tovarga bitta.
   Narx faqat serverda hisoblanadi; muddat tugashi bilan avtomatik eski narx. To'plam narxi chegirmasiz (asosiy narxdan). */
set check_function_bodies = off;

create table public.decor_discounts (
  id bigint generated always as identity primary key,
  decor_id text not null references public.decor_catalog on delete cascade,
  pct int not null check (pct between 5 and 90),
  starts_at timestamptz not null, ends_at timestamptz not null check (ends_at > starts_at),
  created_by uuid, created_at timestamptz not null default now()
);
create index decor_discounts_item on public.decor_discounts (decor_id, ends_at);
alter table public.decor_discounts enable row level security;

/* Hozir amaldagi chegirma (yo'q bo'lsa — null). */
create function private.discount_now(p_id text) returns public.decor_discounts language sql stable security definer set search_path = '' as $$
  select * from public.decor_discounts where decor_id = p_id and starts_at <= now() and ends_at > now() order by pct desc limit 1
$$;
create function private.decor_price(c public.decor_catalog) returns int language sql stable security definer set search_path = '' as $$
  select coalesce((select private.round_price(c.price_coins * (100 - d.pct) / 100.0) from private.discount_now(c.id) d where d.id is not null), c.price_coins)
$$;
revoke all on function private.discount_now(text) from public, anon, authenticated;
revoke all on function private.decor_price(public.decor_catalog) from public, anon, authenticated;

/* Tanga bilan xarid — chegirmali narx serverda (mijoz narx yubormaydi). */
create or replace function private.buy_decor_coins_base(p_id text) returns int language plpgsql security definer set search_path = '' as $$
declare me public.profiles := private.writable(); c public.decor_catalog; bal int;
begin
  if not private.flag('coins_enabled') then perform private.fail('coins_off'); end if;
  select * into c from public.decor_catalog where id = p_id for update;
  perform private.check_decor_sale(me.user_id, c);
  bal := private.coins(me.user_id, -private.decor_price(c), 'decor:' || p_id);
  perform private.grant_decor(me.user_id, p_id);
  return bal;
end $$;
revoke all on function private.buy_decor_coins_base(text) from public, anon, authenticated;

/* Katalog: `coins` — hozirgi (chegirmali) narx, `oldCoins` va `sale` (foiz), `saleEnds` — chegirma bo'lsa. */
create or replace function public.api_catalog() returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'slot', c.slot, 'model', c.model_id, 'uz', c.name_uz, 'ru', c.name_ru, 'uzs', c.price_uzs, 'coins', private.decor_price(c),
    'left', case when c.stock is null then null else c.stock - c.sold end, 'spots', c.spots, 'min', c.min_level, 'from', c.season_from, 'to', c.season_to, 'set', c.set_id, 'isNew', c.is_new, 'tint', c.tint,
    'active', c.is_active, 'premium', c.is_premium, 'onSale', c.is_active and private.in_season(c.season_from, c.season_to))
    || coalesce((select jsonb_build_object('sale', d.pct, 'saleEnds', d.ends_at, 'oldCoins', c.price_coins) from private.discount_now(c.id) d where d.id is not null), '{}')
    order by c.sort, c.id), '[]')
  from public.decor_catalog c
$$;

-- ---------- Admin ----------
/* Bir nechta tovarga birdaniga; muddati kesishgan chegirma bor bo'lsa — rad. */
create function public.admin_discount_set(p_ids text[], p_pct int, p_starts timestamptz, p_ends timestamptz) returns int language plpgsql security definer set search_path = '' as $$
declare me public.profiles := private.require('settings'); n int;
begin
  if not private.is_owner_admin(me) then perform private.fail('forbidden'); end if;
  if p_pct is null or p_pct not between 5 and 90 or p_starts is null or p_ends is null or p_ends <= p_starts or p_ends <= now()
     or coalesce(cardinality(p_ids), 0) = 0 or cardinality(p_ids) > 200 then perform private.fail('bad_format'); end if;
  if exists (select 1 from unnest(p_ids) i where not exists (select 1 from public.decor_catalog c where c.id = i and not c.is_premium)) then perform private.fail('not_found'); end if;
  if exists (select 1 from public.decor_discounts d where d.decor_id = any (p_ids) and d.starts_at < p_ends and d.ends_at > p_starts) then perform private.fail('discount_overlap'); end if;
  insert into public.decor_discounts (decor_id, pct, starts_at, ends_at, created_by) select distinct i, p_pct, p_starts, p_ends, me.user_id from unnest(p_ids) i;
  get diagnostics n = row_count;
  perform private.audit('discount:set', jsonb_build_object('ids', p_ids, 'pct', p_pct, 'starts', p_starts, 'ends', p_ends));
  return n;
end $$;
create function public.admin_discount_delete(p_id bigint) returns void language plpgsql security definer set search_path = '' as $$
declare me public.profiles := private.require('settings');
begin
  if not private.is_owner_admin(me) then perform private.fail('forbidden'); end if;
  delete from public.decor_discounts where id = p_id;
  perform private.audit('discount:delete', jsonb_build_object('id', p_id));
end $$;
/* Amaldagi va kelgusi chegirmalar (tugaganlari — oxirgi 30 kun). */
create function public.admin_discounts() returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require('settings');
  return (select coalesce(jsonb_agg(jsonb_build_object('id', d.id, 'decor', d.decor_id, 'pct', d.pct, 'starts', d.starts_at, 'ends', d.ends_at,
    'state', case when d.ends_at <= now() then 'ended' when d.starts_at > now() then 'soon' else 'live' end) order by d.starts_at desc), '[]')
    from public.decor_discounts d where d.ends_at > now() - interval '30 days');
end $$;

select private.apply_grants();
