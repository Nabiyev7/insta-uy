/* 15-qadam (1): tanga bilan sotiladigan hamma narx × 0,5 (yaxlitlash: 1 000 gacha — 10 ga, 1 000–9 999 — 50 ga, 10 000 dan — 500 ga; o'rtada — juftga).
   To'plamlar — tarkib yig'indisidan 20% (avtomatik); uy leveli, salyut, tanga paketlari (Stars) yangilanadi. Tanga topish va premium (so'm/Stars) narxlari o'zgarmaydi.
   Mijozdagi standart: packages/shared/src/pricing.ts (test bir xilligini tekshiradi). */
set check_function_bodies = off;

create function private.round_price(n numeric) returns int language sql immutable set search_path = '' as $$
  select (case when abs(q - floor(q) - 0.5) < 0.000000001 then (case when (floor(q)::bigint % 2) = 0 then floor(q) else floor(q) + 1 end) else round(q) end * s)::int
  from (select n / s as q, s from (select case when n < 1000 then 10 when n < 10000 then 50 else 500 end::numeric as s) a) b
$$;

-- ---------- Bezaklar va mashinalar (mavsumiy, yashirin va arxivdagilar ham) ----------
update public.decor_catalog set price_coins = private.round_price(price_coins * 0.5) where price_coins > 0;

-- ---------- To'plamlar: 20% chegirma, avtomatik; arxivdagi (sotuvdan olingan) tovarlar to'plamdan chiqadi ----------
update public.decor_sets set discount_pct = 20 where discount_pct <> 20;
update public.decor_catalog set set_id = null where set_id is not null and not is_active;
create or replace function private.set_price(p_set text) returns int language sql stable set search_path = '' as $$
  select private.round_price(sum(c.price_coins) * (1 - s.discount_pct / 100.0)) from public.decor_sets s join public.decor_catalog c on c.set_id = s.id
  where s.id = p_set and s.is_active and c.is_active group by s.discount_pct
$$;

-- ---------- Uy leveli va salyut (tanga) ----------
update public.settings set value = jsonb_set(value, '{tier}', '{"2":150,"3":500,"4":1000,"5":1750}') where key = 'coins';
update public.settings set value = jsonb_set(value, '{salute,coins}', '1000') where key = 'premium' and value ? 'salute';

-- ---------- Tanga paketlari (Stars): arzonroq va ko'proq tanga; jami son ko'rsatiladi (bonus alohida emas) ----------
update public.settings set value = jsonb_set(value, '{packs}', '[{"coins":5000,"bonus":0,"uzs":10000,"stars":50},{"coins":12000,"bonus":0,"uzs":20000,"stars":100,"tag":"popular"},{"coins":28000,"bonus":0,"uzs":40000,"stars":200,"tag":"best"}]')
  where key = 'premium';

select private.apply_grants();
