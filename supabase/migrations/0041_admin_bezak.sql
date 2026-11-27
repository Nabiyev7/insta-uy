/* 15-qadam (5): admin — Bezaklar bo'limi soddaroq. Arxiv (eski, o'rniga yangisi kelgan tovarlar; egalarida qoladi), ro'yxat (chegirma, "avto" level bilan),
   ommaviy amallar (narx %, levelni avtomatik qayta hisoblash, yashirish/ko'rsatish, arxiv), yangi tovarda joy nuqtalari kategoriyadan. Hammasi jurnalga (audit). */
set check_function_bodies = off;

alter table public.decor_catalog add column is_archived boolean not null default false;
update public.decor_catalog set is_archived = true, is_active = false
  where id in ('car_sedan','car_sport','car_van','water_pool','water_fountain','yard_besedka','yard_mangal','yard_umbrella','yard_garage','tree_archa','tree_orik','tree_olma','yard_flowers');

/* Kategoriya → joy nuqtalari (packages/shared/src/catalog.ts SLOT_SPOTS bilan bir xil — test). */
create function private.slot_spots(p_slot text) returns text[] language sql immutable set search_path = '' as $$
  select case p_slot when 'fence' then '{fence}' when 'gate' then '{gate}' when 'path' then '{path}' when 'tree' then '{corner,right,left}' when 'yard' then '{right,left}'
    when 'water' then '{right,left}' when 'car' then '{car,left}' when 'light' then '{lamps}' when 'pet' then '{pet,corner,right}' when 'special' then '{right,left}'
    when 'sign' then '{sign}' when 'roof' then '{roof}' end::text[]
$$;

/* Ro'yxat: hammasi (arxiv ham — `is_archived`), chegirma (amaldagi yoki eng yaqin kelgusi). */
create function public.admin_decor_list() returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require('settings');
  return (select coalesce(jsonb_agg(to_jsonb(c) || jsonb_build_object('discount',
      (select jsonb_build_object('id', d.id, 'pct', d.pct, 'starts', d.starts_at, 'ends', d.ends_at, 'live', d.starts_at <= now()) from public.decor_discounts d
        where d.decor_id = c.id and d.ends_at > now() order by d.starts_at limit 1)) order by c.sort, c.id), '[]')
    from public.decor_catalog c);
end $$;

/* Saqlash: avvalgi qoidalar + arxiv va kategoriya (kategoriya o'zgarsa — joy nuqtalari ham). */
create or replace function public.admin_decor_save(p jsonb) returns void language plpgsql security definer set search_path = '' as $$
declare c public.decor_catalog;
begin
  if p ? 'slot' and private.slot_spots(p ->> 'slot') is null then perform private.fail('bad_format'); end if;
  perform private.decor_save_base(p);
  if p ? 'is_premium' then update public.decor_catalog set is_premium = coalesce((p ->> 'is_premium')::boolean, false) where id = p ->> 'id'; end if;
  if p ? 'slot' then update public.decor_catalog set slot = p ->> 'slot', spots = private.slot_spots(p ->> 'slot') where id = p ->> 'id'; end if;
  if p ? 'is_archived' then
    update public.decor_catalog set is_archived = coalesce((p ->> 'is_archived')::boolean, false),
      is_active = case when coalesce((p ->> 'is_archived')::boolean, false) then false else is_active end where id = p ->> 'id';
  end if;
  if p ? 'level_auto' then update public.decor_catalog set level_auto = coalesce((p ->> 'level_auto')::boolean, true) where id = p ->> 'id';
  elsif p ? 'min_level' then update public.decor_catalog set level_auto = false where id = p ->> 'id';
  end if;
  select * into c from public.decor_catalog where id = p ->> 'id';
  if c.level_auto then update public.decor_catalog set min_level = private.auto_level(c.price_coins, c.id, c.spots) where id = c.id; end if;
end $$;

/* Ommaviy amal: `price_pct` (−90…+300%, yaxlitlanadi; "avto" leveli ham qayta), `level_auto`, `hide`, `show`, `archive`. */
create function public.admin_decor_bulk(p_ids text[], p_action text, p_value int default 0) returns int language plpgsql security definer set search_path = '' as $$
declare me public.profiles := private.require('settings'); n int;
begin
  if not private.is_owner_admin(me) then perform private.fail('forbidden'); end if;
  if coalesce(cardinality(p_ids), 0) = 0 or cardinality(p_ids) > 500 then perform private.fail('bad_format'); end if;
  case p_action
  when 'price_pct' then
    if p_value is null or p_value not between -90 and 300 or p_value = 0 then perform private.fail('bad_format'); end if;
    update public.decor_catalog set price_coins = greatest(10, private.round_price(price_coins * (100 + p_value) / 100.0)) where id = any (p_ids) and not is_premium;
  when 'level_auto' then update public.decor_catalog set level_auto = true where id = any (p_ids);
  when 'hide' then update public.decor_catalog set is_active = false where id = any (p_ids);
  when 'show' then update public.decor_catalog set is_active = true, is_archived = false where id = any (p_ids);
  when 'archive' then update public.decor_catalog set is_archived = true, is_active = false where id = any (p_ids);
  else perform private.fail('bad_format');
  end case;
  get diagnostics n = row_count;
  update public.decor_catalog c set min_level = private.auto_level(c.price_coins, c.id, c.spots) where c.id = any (p_ids) and c.level_auto;
  perform private.audit('decor:bulk', jsonb_build_object('ids', p_ids, 'action', p_action, 'value', p_value, 'rows', n));
  return n;
end $$;

select private.apply_grants();
