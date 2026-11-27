/* 15-qadam (2–3): bezak qaysi leveldan ochiladi va hovlidagi joylar har levelda.
   - Mavjud tovarlar — egasi jadvali (TUZATISH-6.md, 6-band). Yangi tovar — narxdan avtomatik: ≤ 75 → 1, ≤ 150 → 2, ≤ 325 → 3, ≤ 725 → 4, undan qimmat va `lux_*` → 5; nik lavhasi — 1.
   - Tovarning nuqtasi pastroq levelda ochilmagan bo'lsa: level = max(narx bo'yicha, nuqta ochiladigan level).
   - Admin qo'lda qo'ygan level saqlanadi (`level_auto = false`), "Avtomatik" bilan qaytadi.
   - Nuqtalar: 1-lv — 6 ta ochiq (2 ta joy), 2-lv — 10 (4), 3-lv — 11 (6; orqa burchaklar 2–3-lv uyga tegadi — 4-lv dan), 4-lv — 16 (10), 5-lv — 16 (16). Nik lavhasi hisobga kirmaydi. */
set check_function_bodies = off;

-- ---------- 3-band: nuqtalar levellari va joylar soni ----------
update public.decor_anchors a set min_level = v.lv from (values
  ('fence',1), ('gate',1), ('path',1), ('sign',1), ('darvoza_yoni',1), ('burchak_1',1), ('old_hovli_ong',1),
  ('lamps',2), ('p1',2), ('old_hovli_chap',2), ('burchak_2',2),
  ('p2',3),
  ('luxe',4), ('roof',4), ('garaj_oldi',4), ('burchak_3',4), ('burchak_4',4)) as v(id, lv) where a.id = v.id;
update public.decor_anchors set paid_level = least(paid_level, min_level) where paid_level > min_level;
update public.settings set value = '[2,4,6,10,16]' where key = 'decor_slots';

-- ---------- 2-band: level qoidalari ----------
alter table public.decor_catalog add column level_auto boolean not null default true;

create function private.level_for_price(p_coins int, p_id text) returns int language sql immutable set search_path = '' as $$
  select case when p_id = 'sign_nick' then 1 when p_id like 'lux\_%' then 5
    when p_coins <= 75 then 1 when p_coins <= 150 then 2 when p_coins <= 325 then 3 when p_coins <= 725 then 4 else 5 end
$$;
/* Tovarning biror nuqtasi ochiladigan eng past level (nuqtasi yo'q bo'lsa — 5). */
create function private.spot_level(p_spots text[]) returns int language sql stable set search_path = '' as $$
  select coalesce(min(min_level), 5) from public.decor_anchors where kind = any (p_spots)
$$;
create function private.auto_level(p_coins int, p_id text, p_spots text[]) returns int language sql stable set search_path = '' as $$
  select greatest(private.level_for_price(p_coins, p_id), case when p_id = 'sign_nick' then 1 else private.spot_level(p_spots) end)
$$;
revoke all on function private.level_for_price(int, text) from public, anon, authenticated;
revoke all on function private.spot_level(text[]) from public, anon, authenticated;
revoke all on function private.auto_level(int, text, text[]) from public, anon, authenticated;

-- Mavjud tovarlar — egasi jadvali; jadval avtomatik qoidaga to'g'ri kelsa — "avto", aks holda qo'lda qo'yilgan deb saqlanadi.
update public.decor_catalog c set min_level = v.lv, level_auto = (v.lv = private.auto_level(c.price_coins, c.id, c.spots)) from (values
  ('path_stone',1), ('tree_anor',1), ('sign_mailbox',1), ('fence_wood',1), ('gate_wood',1), ('tree_tut',1), ('tree_behi',1), ('tree_chinor',1),
  ('gul_zor',1), ('sign_nick',1), ('yard_bike',2), ('pet_hens',2), ('yard_sori',2), ('light_lamps',2), ('pet_cat',2), ('daraxt_olma',2),
  ('daraxt_orik',2), ('daraxt_gilos',2), ('daraxt_archa',2), ('yard_tok',2), ('pet_dog',2), ('yard_hammock',2), ('pet_sheep',2), ('fence_brick',2),
  ('yard_tandir',3), ('yard_tokzor',3), ('yard_basketball',3), ('daraxt_palma',3), ('gul_kamar',3), ('pet_house',3), ('pet_dovecote',3), ('dam_mangal',3),
  ('gate_carved',3), ('yard_batut',3), ('light_newyear',3), ('light_hayit',3), ('dam_stol',3), ('fence_ornate',3), ('special_sumalak',3), ('tree_newyear',3),
  ('dam_besedka',3), ('light_luxe',4), ('roof_solar',4), ('suv_hovuz',4), ('yard_playground',4), ('pet_horse',4), ('avto_sedan',4), ('gate_gold',5),
  ('special_yurt',5), ('dam_basseyn',5), ('avto_krossover',5), ('avto_sport',5), ('lux_daraxt',5), ('special_peacock',5), ('lux_gril',5), ('special_statue',5),
  ('lux_bog',5), ('lux_favvora',5), ('lux_pavilyon',5), ('lux_basseyn',5), ('lux_jip',5), ('lux_limuzin',5), ('lux_superkar',5)) as v(id, lv) where c.id = v.id;
-- Jadvalda yo'q (arxiv va boshqalar) — avtomatik.
update public.decor_catalog c set min_level = private.auto_level(c.price_coins, c.id, c.spots), level_auto = true
  where c.id not in ('path_stone', 'tree_anor', 'sign_mailbox', 'fence_wood', 'gate_wood', 'tree_tut', 'tree_behi', 'tree_chinor', 'gul_zor', 'sign_nick', 'yard_bike', 'pet_hens', 'yard_sori', 'light_lamps', 'pet_cat', 'daraxt_olma', 'daraxt_orik', 'daraxt_gilos', 'daraxt_archa', 'yard_tok', 'pet_dog', 'yard_hammock', 'pet_sheep', 'fence_brick', 'yard_tandir', 'yard_tokzor', 'yard_basketball', 'daraxt_palma', 'gul_kamar', 'pet_house', 'pet_dovecote', 'dam_mangal', 'gate_carved', 'yard_batut', 'light_newyear', 'light_hayit', 'dam_stol', 'fence_ornate', 'special_sumalak', 'tree_newyear', 'dam_besedka', 'light_luxe', 'roof_solar', 'suv_hovuz', 'yard_playground', 'pet_horse', 'avto_sedan', 'gate_gold', 'special_yurt', 'dam_basseyn', 'avto_krossover', 'avto_sport', 'lux_daraxt', 'special_peacock', 'lux_gril', 'special_statue', 'lux_bog', 'lux_favvora', 'lux_pavilyon', 'lux_basseyn', 'lux_jip', 'lux_limuzin', 'lux_superkar');

/* Saqlash: level berilsa — qo'lda ("avto" o'chadi); `level_auto: true` — narxdan qayta hisoblanadi; narx o'zgarsa va "avto" bo'lsa — level ham. */
create or replace function public.admin_decor_save(p jsonb) returns void language plpgsql security definer set search_path = '' as $$
declare c public.decor_catalog;
begin
  perform private.decor_save_base(p);
  if p ? 'is_premium' then update public.decor_catalog set is_premium = coalesce((p ->> 'is_premium')::boolean, false) where id = p ->> 'id'; end if;
  if p ? 'level_auto' then update public.decor_catalog set level_auto = coalesce((p ->> 'level_auto')::boolean, true) where id = p ->> 'id';
  elsif p ? 'min_level' then update public.decor_catalog set level_auto = false where id = p ->> 'id';
  end if;
  select * into c from public.decor_catalog where id = p ->> 'id';
  if c.level_auto then update public.decor_catalog set min_level = private.auto_level(c.price_coins, c.id, c.spots) where id = c.id; end if;
end $$;
/* Admin "Yangi tovar" shakli: narxdan level taklifi. */
create function public.admin_level_hint(p_coins int, p_id text default '', p_spots text[] default '{}') returns int language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require('settings');
  return private.auto_level(greatest(0, coalesce(p_coins, 0)), coalesce(p_id, ''), coalesce(p_spots, '{}'));
end $$;

select private.apply_grants();
