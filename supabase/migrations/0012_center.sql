/* Tijorat joylari (do'kon, ofis, minora, bilbord) hozircha faqat ko'rinish: sotilmaydi (joylari bazada qoladi). */
set check_function_bodies = off;

insert into public.settings (key, value, is_public) values
  ('commerce_closed', '["B001","B002","B003","B004","B005","B006","B007","B008","B009","B010","B011","B012","B013","B014","B015","B016","B017","B018","B019","B020","B021","B022","B023","B024","B025","B026","B027","B028","B029","B030","B031","B032","B033","B034","B035","B036","B037","B038","B039","B040","B041","B042","B043","B044","B045","B046","B047","B048","B049","B050","B051","B052","B053","B054","B055","B056","B057","B058","B059","B060","B061","B062","B063","B064","B065","B066","B067","B068","B069","B070","B071","B072","B073","B074","B075","B076","B077","B078","B079","B080","B081","B082","B083","B084","B085","B086","B087","B088","B089","B090","B091","B092","B093","B094","B095","B096","B097","B098","B099","B100","B101","B102","B103","B104","B105","B106","B107","B108","B109","B110","B111","B112","B113","B114","B115","B116","B117","B118","B119","B120","B121","B122","B123","B124","B125","B126","B127","B128","B129","B130","B131","B132","B133","B134","B135","B136","B137","B138","B139","B140","B141","B142","B143","B144","B145","B146","B147","B148","B149","B150","B151","B152","B153","B154","B155","B156","B157","B158","B159","B160","B161","B162","B163","B164","B165","B166","B167","B168","B169","B170"]', true);

/* Narx so'rashdan oldingi umumiy to'siq; qolgan qoidalar o'zgarmagan. */
alter function private.quote(public.profiles, text, jsonb) rename to quote_base;
create function private.quote(me public.profiles, p_kind text, p jsonb) returns int language plpgsql security definer set search_path = '' as $$
begin
  if p_kind = 'commerce' and private.setting('commerce_closed') ? (p ->> 'id') then perform private.fail('not_for_sale'); end if;
  return private.quote_base(me, p_kind, p);
end $$;
revoke all on function private.quote(public.profiles, text, jsonb), private.quote_base(public.profiles, text, jsonb) from public;

create or replace function public.api_commerce(p_id text) returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', c.id, 'type', c.type, 'price', (private.num('prices.commerce.' || c.type, 100000) * (1 - private.num('discount_pct', 0) / 100))::int,
    'free', (s.commerce_id is null or s.until < now()) and not coalesce(private.setting('commerce_closed') ? c.id, false),
    'title', case when s.status = 'live' then s.title end, 'link', case when s.status = 'live' then s.link end)
  from public.commerce c left join public.commerce_state s on s.commerce_id = c.id where c.id = p_id
$$;

select private.apply_grants();
