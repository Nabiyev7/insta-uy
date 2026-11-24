/* 9-qadam: bezaklar faqat 5-leveldan, yangi joy nuqtalari, 15 ta yangi bezak, bepul uy faqat hovlida (kvartira hozircha berilmaydi). */
set check_function_bodies = off;

-- ---------- Katalog ----------
/* Eski bezaklar yangi nuqta turlariga o'tadi (katta joy → old hovli chap, o'rta → o'ng, qolgani → burchak). */
update public.decor_catalog c set spots = (
  select array_agg(x.k order by x.n) from (
    select case u.s when 'big' then 'left' when 'medium' then 'right' when 'small' then 'corner' when 'wall' then 'corner' when 'back' then 'corner' else u.s end as k, min(u.ord) as n
    from unnest(c.spots) with ordinality u(s, ord) group by 1) x);
update public.decor_catalog set min_level = greatest(min_level, 5) where id <> 'sign_nick';
update public.decor_catalog set is_new = false where is_new;
/* Yangi uslubga mos kelmaganlari sotuvdan olinadi; olganlarda qoladi. */
update public.decor_catalog set is_active = false where id in ('tree_archa', 'yard_flowers', 'water_pool', 'water_fountain', 'car_van', 'car_sedan', 'car_sport', 'yard_umbrella', 'yard_besedka', 'yard_mangal', 'yard_garage', 'tree_orik', 'tree_olma');
insert into public.decor_catalog as c (id, slot, model_id, name_uz, name_ru, price_uzs, price_coins, stock, spots, min_level, sort, is_new) values
('dam_besedka','yard','dam_besedka','Besedka','Беседка',30000,600,null,array['left'],5,600,true),
('dam_mangal','yard','dam_mangal','Mangal','Мангал',20000,400,null,array['right'],5,610,true),
('dam_basseyn','water','dam_basseyn','Basseyn','Бассейн',75000,1500,null,array['left'],5,620,true),
('dam_stol','yard','dam_stol','Soyabonli stol','Стол с зонтом',25000,500,null,array['right'],5,630,true),
('avto_sedan','car','avto_sedan','Sedan','Седан',60000,1200,null,array['car'],5,640,true),
('avto_krossover','car','avto_krossover','Krossover','Кроссовер',90000,1800,null,array['car'],5,650,true),
('avto_sport','car','avto_sport','Sport mashina','Спорткар',125000,2500,null,array['car'],5,660,true),
('daraxt_olma','tree','daraxt_olma','Olma daraxti','Яблоня',10000,200,null,array['corner'],5,670,true),
('daraxt_orik','tree','daraxt_orik','O''rik daraxti','Абрикос',10000,200,null,array['corner'],5,680,true),
('daraxt_gilos','tree','daraxt_gilos','Gilos daraxti','Черешня',10000,200,null,array['corner'],5,690,true),
('daraxt_archa','tree','daraxt_archa','Archa','Ель',10000,200,null,array['corner'],5,700,true),
('daraxt_palma','tree','daraxt_palma','Palma','Пальма',15000,300,null,array['corner'],5,710,true),
('gul_zor','yard','gul_zor','Gulzor','Цветник',7500,150,null,array['gate_side'],5,720,true),
('gul_kamar','yard','gul_kamar','Gul kamari','Цветочная арка',15000,300,null,array['gate_side'],5,730,true),
('suv_hovuz','water','suv_hovuz','Hovuz va favvora','Пруд с фонтаном',40000,800,null,array['left'],5,740,true)
on conflict (id) do nothing;
update public.decor_catalog set set_id = null where set_id = 'dam_olish';
update public.decor_catalog set set_id = 'dam_olish' where id in ('dam_besedka', 'dam_mangal', 'yard_hammock', 'gul_zor');

-- ---------- Joy nuqtalari ----------
delete from public.decor_anchors;
insert into public.decor_anchors (id, kind, min_level, sort) values
('fence','fence',5,0),
('gate','gate',5,1),
('path','path',5,2),
('lamps','lamps',5,3),
('luxe','luxe',6,4),
('roof','roof',5,5),
('sign','sign',1,6),
('garaj_oldi','car',5,7),
('old_hovli_chap','left',5,8),
('old_hovli_ong','right',5,9),
('darvoza_yoni','gate_side',5,10),
('burchak_1','corner',5,11),
('burchak_2','corner',5,12),
('burchak_3','corner',5,13),
('burchak_4','corner',5,14),
('p1','pet',5,15),
('p2','pet',6,16);
update public.settings set value = '[1,1,1,1,8,10,12,14,16,17]' where key = 'decor_slots';
create or replace function private.decor_slots(p_tier int) returns int language sql stable set search_path = '' as $$
  select least(20, coalesce((select v::int from (select private.setting('decor_slots') ->> (greatest(1, least(10, p_tier)) - 1) as v) x where v ~ '^[0-9]{1,3}$'), 1))
$$;
/* Yo'qolgan nuqtadagi va 5-leveldan past uydagi bezaklar egasining qo'liga qaytadi (owned_decor o'zgarmaydi). Nik lavhasi qoladi. */
update public.plot_state s set places = coalesce((select jsonb_object_agg(e.key, e.value) from jsonb_each(s.places) e join public.decor_anchors a on a.id = e.key
  join public.decor_catalog c on c.id = e.value #>> '{}' where a.kind = any (c.spots) and a.min_level <= s.tier and c.min_level <= s.tier), '{}') where s.places <> '{}';

-- ---------- Bepul uy ----------
/* Bepul uy: 1 kishiga 1 ta, 1 nikka 1 ta, faqat ochiq tumandagi hovli. Tom rangi 0 — levelning o'z rangi. */
create or replace function public.my_claim(p_plot text, p_instagram text, p_bio text default '') returns jsonb language plpgsql security definer set search_path = '' as $$
declare me public.profiles := private.writable(); pl public.plots; nick text := private.clean_instagram(p_instagram); st public.plot_state; v_status text;
begin
  perform private.rate('claim:' || me.user_id, 10, 3600);
  if not private.flag('free_claim_enabled') then perform private.fail('free_closed'); end if;
  select * into me from public.profiles where user_id = me.user_id for update;
  if me.free_used then perform private.fail('free_used'); end if;
  select * into pl from public.plots where id = p_plot;
  if pl.id is null then perform private.fail('not_found'); end if;
  if pl.type = 'kvartira' then perform private.fail('apartments_closed'); end if;
  if pl.type <> 'hovli' then perform private.fail('paid_only'); end if;
  if not (select is_open from public.districts where id = pl.district_id) then perform private.fail('district_closed'); end if;
  if coalesce(p_bio, '') ~* '(https?://|www\.|t\.me/)' then perform private.fail('bad_format'); end if;
  -- Bir nikka bitta bepul uy: parallel so'rovlar navbatga turadi.
  if private.nick_taken(me.user_id, nick) or exists (select 1 from public.plot_state where lower(instagram) = nick and is_free and status <> 'reserved') then perform private.fail('nick_taken'); end if;
  select * into st from public.plot_state where plot_id = p_plot for update;
  if st.plot_id is not null and (st.status <> 'reserved' or st.reserved_until > now()) then perform private.fail('not_free'); end if;
  v_status := case when private.flag('require_approval') then 'pending' else 'owned' end;
  delete from public.plot_state where plot_id = p_plot and status = 'reserved' and reserved_until <= now();
  insert into public.plot_state (plot_id, status, owner, instagram, bio, is_free, wall, roof)
    values (p_plot, v_status, me.user_id, nick, private.clean_text(p_bio, 120, true), true, abs(pg_catalog.hashtext(p_plot)) % 8, 0)
    on conflict (plot_id) do nothing;
  if not found then perform private.fail('not_free'); end if;
  update public.profiles set free_used = true, instagram = coalesce(instagram, nick) where user_id = me.user_id;
  if (select count(*) from public.profiles where 'asoschi' = any (badges)) < private.num('founder_limit', 100) then perform private.give_badge(me.user_id, 'asoschi'); end if;
  insert into public.ownership_log (plot_id, to_user, reason) values (p_plot, me.user_id, 'free');
  if v_status = 'owned' then perform private.pay_referral(me.user_id); end if;
  return jsonb_build_object('status', v_status, 'address', private.address(p_plot));
end $$;

/* Kvartira pulga ham sotilmaydi. */
create or replace function private.quote(me public.profiles, p_kind text, p jsonb) returns int language plpgsql security definer set search_path = '' as $$
declare c public.decor_catalog;
begin
  if p_kind = 'commerce' and private.setting('commerce_closed') ? (p ->> 'id') then perform private.fail('not_for_sale'); end if;
  if p_kind = 'plot' and (select type from public.plots where id = p ->> 'plot') = 'kvartira' then perform private.fail('apartments_closed'); end if;
  if p_kind = 'decor' then
    select * into c from public.decor_catalog where id = p ->> 'id';
    perform private.check_decor_sale(me.user_id, c);
  end if;
  return private.quote_base(me, p_kind, p);
end $$;

select private.apply_grants();
