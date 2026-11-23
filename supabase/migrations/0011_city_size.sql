/* Bosh reja v2: shahar 3×3 km — xarita muharriri chegarasi kengayadi. */
set check_function_bodies = off;
create or replace function public.admin_map_save(p_version int, p_objects jsonb) returns void language plpgsql security definer set search_path = '' as $$
declare bad record;
begin
  perform private.require('map');
  if not exists (select 1 from public.map_versions where id = p_version and status = 'draft') then perform private.fail('not_draft'); end if;
  if jsonb_array_length(p_objects) > 2000 then perform private.fail('too_long'); end if;
  select * into bad from jsonb_to_recordset(p_objects) as o(m text, x numeric, z numeric, r numeric, s numeric)
    where m !~ '^[a-z0-9_]{2,40}$' or x is null or z is null or abs(x) > 1700 or abs(z) > 1700 or not private.map_spot_free(x, z, 0.6 * coalesce(s, 1)) limit 1;
  if bad.m is not null then perform private.fail('spot_not_free'); end if;
  delete from public.map_objects where version_id = p_version;
  insert into public.map_objects (version_id, model, x, z, rot, scale) select p_version, m, x, z, coalesce(r, 0), coalesce(s, 1) from jsonb_to_recordset(p_objects) as o(m text, x numeric, z numeric, r numeric, s numeric);
  perform private.audit('map:save', jsonb_build_object('version', p_version));
end $$;

select private.apply_grants();
