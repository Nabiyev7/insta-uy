/* 6-qadam, E: premium (pulga). Kod tayyor, lekin payments_enabled=false — saytda pul tugmalari "Tez kunda".
   Sotiladi: tanga paketlari, premium uy (darhol 1–5-level, bir nechta), bezaklar level cheklovisiz (1–4-level uyda pulli bezak nuqtalari),
   salyut (shahar ustida xabar 24 soat), noyob nik joylari (skelet). To'lov: Telegram Stars (bot) yoki karta (noyob summa). Qaytarish — admin. */
set check_function_bodies = off;

insert into public.settings (key, value, is_public) values ('premium', '{
  "starsRate": 200,
  "packs": [{"coins":1000,"bonus":0,"uzs":10000},{"coins":3000,"bonus":300,"uzs":25000},{"coins":7000,"bonus":1000,"uzs":50000},{"coins":16000,"bonus":3000,"uzs":100000}],
  "house": {"1":10000,"2":20000,"3":30000,"4":45000,"5":60000},
  "typeAdd": {"hovli":0,"villa":40000,"qasr":100000},
  "salute": {"uzs":10000,"coins":2000,"hours":24}
}', true) on conflict (key) do nothing;

-- ---------- Buyurtma turlari va holatlari ----------
alter table public.orders drop constraint orders_kind_check;
alter table public.orders add constraint orders_kind_check check (kind in ('plot','tier','decor','expansion','label','street_name','commerce','coins','salute'));
alter table public.orders drop constraint orders_status_check;
alter table public.orders add constraint orders_status_check check (status in ('pending','paid','expired','cancelled','failed','refunded'));
-- Stars buyurtmasida summa yulduzda; noyob summa faqat karta uchun kerak.
drop index public.orders_pay_amount;
create unique index orders_pay_amount on public.orders (pay_amount) where status = 'pending' and provider <> 'stars';

-- ---------- Narxlar (hammasi serverda) ----------
create function private.stars_of(p_uzs int) returns int language sql stable set search_path = '' as $$
  select greatest(1, ceil(p_uzs / greatest(1, private.num('premium.starsRate', 200))))::int
$$;
create function private.house_price(p_type text, p_tier int) returns int language sql stable set search_path = '' as $$
  select ((private.num('premium.house.' || p_tier, 60000) + private.num('premium.typeAdd.' || p_type, 0)) * (1 - private.num('discount_pct', 0) / 100))::int
$$;
create function private.pack(p_n int) returns jsonb language sql stable set search_path = '' as $$
  select private.setting('premium') -> 'packs' -> (p_n - 1)
$$;
create function private.clean_salute(t text) returns text language plpgsql stable set search_path = '' as $$
declare v text := private.clean_text(t, 80, false);
begin
  if v ~* '(https?://|www\.|t\.me/|@[a-z0-9_.]{3,})' then perform private.fail('no_links'); end if;
  return v;
end $$;

create or replace function private.quote(me public.profiles, p_kind text, p jsonb) returns int language plpgsql security definer set search_path = '' as $$
declare c public.decor_catalog; pl public.plots; v_tier int; pk jsonb;
begin
  if p_kind = 'commerce' and private.setting('commerce_closed') ? (p ->> 'id') then perform private.fail('not_for_sale'); end if;
  if p_kind = 'coins' then
    pk := private.pack(case when (p ->> 'pack') ~ '^[1-9]$' then (p ->> 'pack')::int end);
    if pk is null then perform private.fail('not_found'); end if;
    return (pk ->> 'uzs')::int;
  elsif p_kind = 'salute' then
    perform private.clean_salute(p ->> 'text');
    return private.num('premium.salute.uzs', 10000)::int;
  elsif p_kind = 'plot' then
    select * into pl from public.plots where id = p ->> 'plot';
    if pl.type = 'kvartira' then perform private.fail('apartments_closed'); end if;
    v_tier := coalesce((p ->> 'tier')::int, 1);
    if v_tier not between 1 and private.max_tier() then perform private.fail('bad_format'); end if;
    perform private.quote_base(me, p_kind, jsonb_build_object('plot', pl.id, 'instagram', coalesce(me.instagram, p ->> 'instagram'))); -- bo'shligi, tuman ochiqligi
    return private.house_price(pl.type, v_tier);
  elsif p_kind = 'decor' then
    -- Pulga olingan bezak uy levelidan qat'i nazar (faqat sotuvda va mavsumida).
    select * into c from public.decor_catalog where id = p ->> 'id';
    if c.id is null or not c.is_active then perform private.fail('not_found'); end if;
    if not private.in_season(c.season_from, c.season_to) then perform private.fail('out_of_season'); end if;
  elsif p_kind = 'tier' and coalesce((p ->> 'tier')::int, 0) > private.max_tier() then perform private.fail('bad_format');
  end if;
  return private.quote_base(me, p_kind, p);
end $$;
revoke all on function private.quote(public.profiles, text, jsonb) from public;

-- ---------- Salyut ----------
create table public.salutes (
  id bigint generated always as identity primary key, user_id uuid references public.profiles on delete set null, nick text, text text not null,
  starts_at timestamptz not null, ends_at timestamptz not null, at timestamptz not null default now()
);
alter table public.salutes enable row level security;
/* Navbat bilan: oldingisi tugagach boshlanadi. */
create function private.add_salute(uid uuid, p_text text) returns timestamptz language plpgsql security definer set search_path = '' as $$
declare v_start timestamptz;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('salute'));
  v_start := greatest(now(), coalesce((select max(ends_at) from public.salutes), now()));
  insert into public.salutes (user_id, nick, text, starts_at, ends_at)
    values (uid, (select instagram from public.profiles where user_id = uid), private.clean_salute(p_text), v_start, v_start + make_interval(hours => private.num('premium.salute.hours', 24)::int));
  return v_start;
end $$;
create function public.my_salute_coins(p_text text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare me public.profiles := private.coins_on(); bal int; v_start timestamptz;
begin
  perform private.rate('salute:' || me.user_id, 5, 3600);
  perform private.clean_salute(p_text);
  bal := private.coins(me.user_id, -private.num('premium.salute.coins', 2000)::int, 'salute');
  v_start := private.add_salute(me.user_id, p_text);
  return jsonb_build_object('coins', bal, 'starts', v_start);
end $$;
create function public.api_salute() returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('nick', nick, 'text', text, 'until', ends_at) from public.salutes where starts_at <= now() and ends_at > now() order by starts_at limit 1
$$;

-- ---------- Noyob nik joylari (keyin; hozir faqat skelet) ----------
create table public.nick_spots (
  id text primary key, kind text not null check (kind in ('tower','stadium','billboard','other')), title_uz text not null, title_ru text not null,
  x numeric not null, z numeric not null, owner uuid references public.profiles on delete set null, nick text, until timestamptz, price_uzs int not null default 0, is_active boolean not null default false
);
alter table public.nick_spots enable row level security;
create function public.api_nick_spots() returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'kind', kind, 'uz', title_uz, 'ru', title_ru, 'x', x, 'z', z, 'nick', case when until > now() then nick end, 'uzs', price_uzs) order by id), '[]')
  from public.nick_spots where is_active
$$;

-- ---------- Bezaklar pulga: level cheklovisiz ----------
alter table public.owned_decor add column paid int not null default 0;
alter table public.decor_anchors add column paid_level int;
update public.decor_anchors set paid_level = case when id in ('garaj_oldi','old_hovli_chap','old_hovli_ong','darvoza_yoni','burchak_1','burchak_2','burchak_3','burchak_4') then 1 else min_level end;
alter table public.decor_anchors alter column paid_level set not null;

/* Nuqtadagi bezak uy leveliga ko'ra "pulli" joylashuvmi (tanga bilan bu levelda qo'yib bo'lmaydi). */
create function private.is_paid_place(p_tier int, p_anchor text, p_decor text) returns boolean language sql stable set search_path = '' as $$
  select coalesce((select a.min_level > p_tier or c.min_level > p_tier from public.decor_anchors a, public.decor_catalog c where a.id = p_anchor and c.id = p_decor), false)
$$;
create or replace function public.my_place_decor(p_plot text, p_places jsonb) returns void language plpgsql security definer set search_path = '' as $$
declare st public.plot_state := private.own_plot(p_plot); n int; old_n int;
begin
  perform private.rate('decor:' || st.owner, 120, 3600);
  if (select type from public.plots where id = p_plot) = 'kvartira' then perform private.fail('no_yard'); end if;
  if jsonb_typeof(p_places) is distinct from 'object' or exists (select 1 from jsonb_each(p_places) where jsonb_typeof(value) <> 'string') then perform private.fail('bad_format'); end if;
  if exists (select 1 from jsonb_each_text(p_places) e left join public.decor_anchors a on a.id = e.key left join public.decor_catalog c on c.id = e.value
      where a.id is null or c.id is null) then perform private.fail('bad_format'); end if;
  -- Yangi qo'yilgan bezak: level yetmasa — faqat pulli bezak nuqtasiga (paid_level) va faqat pulga olingan nusxa.
  if exists (select 1 from jsonb_each_text(p_places) e join public.decor_anchors a on a.id = e.key
      where st.places ->> e.key is distinct from e.value and private.is_paid_place(st.tier, e.key, e.value) and a.paid_level > st.tier) then perform private.fail('level_low'); end if;
  if exists (select 1 from jsonb_each_text(p_places) e join public.decor_anchors a on a.id = e.key join public.decor_catalog c on c.id = e.value
      where st.places ->> e.key is distinct from e.value and not a.kind = any (c.spots)) then perform private.fail('wrong_spot'); end if;
  -- Tanga bilan qo'yiladiganlar level joylari soniga kiradi; pullilari — yo'q.
  n := (select count(*) from jsonb_each_text(p_places) e where e.key not in (select id from public.decor_anchors where kind = 'sign') and not private.is_paid_place(st.tier, e.key, e.value));
  old_n := (select count(*) from jsonb_each_text(st.places) e where e.key not in (select id from public.decor_anchors where kind = 'sign') and not private.is_paid_place(st.tier, e.key, e.value));
  if n > greatest(private.decor_slots(st.tier), old_n) then perform private.fail('no_slots'); end if;
  if exists (select 1 from (select value as d, count(*) as k from jsonb_each_text(p_places) group by value) x
      where x.k + (select count(*) from public.plot_state o, jsonb_each_text(o.places) e where o.owner = st.owner and o.plot_id <> p_plot and o.status <> 'reserved' and e.value = x.d)
        > coalesce((select qty from public.owned_decor where user_id = st.owner and decor_id = x.d), 0)) then perform private.fail('not_owned'); end if;
  -- Pulli joylashuvlar soni (hamma uylarda) pulga olingan nusxalardan oshmaydi.
  if exists (select 1 from (select value as d, count(*) as k from jsonb_each_text(p_places) e where private.is_paid_place(st.tier, e.key, e.value) group by value) x
      where x.d in (select e.value from jsonb_each_text(p_places) e where st.places ->> e.key is distinct from e.value and private.is_paid_place(st.tier, e.key, e.value))
        and x.k + (select count(*) from public.plot_state o, jsonb_each_text(o.places) e where o.owner = st.owner and o.plot_id <> p_plot and o.status <> 'reserved' and e.value = x.d and private.is_paid_place(o.tier, e.key, e.value))
        > coalesce((select paid from public.owned_decor where user_id = st.owner and decor_id = x.d), 0)) then perform private.fail('level_low'); end if;
  update public.plot_state set places = p_places where plot_id = p_plot;
end $$;

-- ---------- Buyurtmani bajarish ----------
alter function private.fulfil(public.orders) rename to fulfil_base;
create function private.fulfil(o public.orders) returns void language plpgsql security definer set search_path = '' as $$
declare pk jsonb;
begin
  case o.kind
  when 'coins' then
    pk := private.pack((o.payload ->> 'pack')::int);
    if pk is null then perform private.fail('not_found'); end if;
    perform private.coins(o.user_id, (pk ->> 'coins')::int + coalesce((pk ->> 'bonus')::int, 0), 'pack:' || (o.payload ->> 'pack'));
  when 'salute' then perform private.add_salute(o.user_id, o.payload ->> 'text');
  when 'decor' then
    perform private.fulfil_base(o);
    update public.owned_decor set paid = paid + 1 where user_id = o.user_id and decor_id = o.payload ->> 'id';
    return;
  else perform private.fulfil_base(o); return;
  end case;
  if (select sum(amount) from public.orders where user_id = o.user_id and status = 'paid') >= private.num('sponsor_threshold', 500000) then perform private.give_badge(o.user_id, 'homiy'); end if;
end $$;
revoke all on function private.fulfil(public.orders), private.fulfil_base(public.orders) from public;

-- ---------- Telegram Stars (bot orqali) ----------
create function private.order_title(p_kind text, p jsonb) returns text language sql stable set search_path = '' as $$
  select case p_kind
    when 'coins' then (select ((pk ->> 'coins')::int + coalesce((pk ->> 'bonus')::int, 0)) || ' tanga' from (select private.pack((p ->> 'pack')::int) pk) x)
    when 'plot' then 'Premium uy, ' || coalesce(p ->> 'tier', '1') || '-level'
    when 'decor' then coalesce((select name_uz from public.decor_catalog where id = p ->> 'id'), 'Bezak')
    when 'salute' then 'Salyut (24 soat)'
    when 'tier' then (p ->> 'tier') || '-level'
    else p_kind end
$$;
/* Bot "buy_..." tugmasi: buyurtma (provider = stars, summa yulduzda). */
create function public.svc_stars_order(p_telegram bigint, p_kind text, p_payload jsonb) returns jsonb language plpgsql security definer set search_path = '' as $$
declare me public.profiles; v_amount int; o public.orders; mins int := private.num('reserve_minutes', 30)::int;
begin
  if not private.flag('payments_enabled') then perform private.fail('payments_off'); end if;
  select * into me from public.profiles where telegram_id = p_telegram;
  if me.user_id is null then perform private.fail('user_not_found'); end if;
  if me.is_banned then perform private.fail('banned'); end if;
  if p_kind not in ('coins','plot','decor','salute','tier') then perform private.fail('bad_format'); end if;
  perform private.rate('order:' || me.user_id, 15, 3600);
  if (select count(*) from public.orders where user_id = me.user_id and status = 'pending' and expires_at > now()) >= 3 then perform private.fail('too_many_orders'); end if;
  if p_kind = 'plot' and exists (select 1 from public.orders where user_id = me.user_id and kind = 'plot' and status = 'pending' and expires_at > now()) then perform private.fail('too_many_orders'); end if;
  perform pg_catalog.pg_advisory_xact_lock(421001); -- band qilish ketma-ket (my_order bilan bir xil)
  v_amount := private.quote(me, p_kind, p_payload);
  insert into public.orders (user_id, kind, payload, amount, pay_amount, provider, expires_at)
    values (me.user_id, p_kind, p_payload, v_amount, private.stars_of(v_amount), 'stars', now() + make_interval(mins => mins)) returning * into o;
  if p_kind = 'plot' then
    delete from public.plot_state where plot_id = p_payload ->> 'plot' and status = 'reserved';
    insert into public.plot_state (plot_id, status, owner, reserved_until, reserved_order) values (p_payload ->> 'plot', 'reserved', me.user_id, o.expires_at, o.id);
  end if;
  return jsonb_build_object('id', o.id, 'stars', o.pay_amount, 'title', private.order_title(p_kind, p_payload));
end $$;
/* pre_checkout_query: buyurtma hali kutilmoqdami va summa to'g'rimi. */
create function public.svc_stars_check(p_order uuid, p_telegram bigint, p_stars int) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.orders o join public.profiles p using (user_id)
    where o.id = p_order and o.provider = 'stars' and o.status = 'pending' and o.expires_at > now() and o.pay_amount = p_stars and p.telegram_id = p_telegram)
$$;

-- ---------- Qaytarish ----------
/* Server Stars uchun Telegram'da qaytaradi; avval kim so'rayotgani va to'lov tekshiriladi. */
create function public.svc_refund_target(p_user uuid, p_payment bigint) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare r record;
begin
  if not exists (select 1 from public.profiles where user_id = p_user and role = 'admin' and not is_banned) then perform private.fail('forbidden'); end if;
  select y.provider, y.external_id, y.status, pr.telegram_id into r from public.payments y left join public.orders o on o.id = y.order_id left join public.profiles pr on pr.user_id = o.user_id where y.id = p_payment;
  if r.provider is null then perform private.fail('not_found'); end if;
  if r.status = 'refunded' then perform private.fail('already_claimed'); end if;
  return jsonb_build_object('provider', r.provider, 'external', r.external_id, 'telegram', r.telegram_id);
end $$;
/* To'lovni "qaytarildi" deb belgilaydi; tanga paketi bo'lsa tangalar (qolgani) olib qo'yiladi. */
create function private.refund_payment(p_id bigint) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_order uuid; o public.orders;
begin
  update public.payments set status = 'refunded' where id = p_id and status <> 'refunded' returning order_id into v_order;
  if not found then perform private.fail('already_claimed'); end if;
  select * into o from public.orders where id = v_order for update;
  if o.status = 'paid' then
    update public.orders set status = 'refunded', note = 'qaytarildi' where id = o.id;
    if o.kind = 'coins' then
      perform private.coins(o.user_id, -least((select coins from public.profiles where user_id = o.user_id),
        (select (pk ->> 'coins')::int + coalesce((pk ->> 'bonus')::int, 0) from (select private.pack((o.payload ->> 'pack')::int) pk) x)), 'refund');
    end if;
  end if;
  return v_order;
end $$;
create or replace function public.admin_payment(p_id bigint, p_action text, p_order uuid default null) returns text language plpgsql security definer set search_path = '' as $$
declare res text := 'ok';
begin
  if (private.require('orders')).role <> 'admin' then perform private.fail('forbidden'); end if;
  if p_action = 'link' then
    if not exists (select 1 from public.payments where id = p_id and status = 'unmatched') then perform private.fail('not_found'); end if;
    update public.payments set order_id = p_order where id = p_id;
    res := private.settle(p_order, p_id);
  elsif p_action = 'refunded' then
    -- Stars to'lovi Telegram orqali qaytariladi (server: /pay/refund).
    if (select provider from public.payments where id = p_id) = 'stars' then perform private.fail('use_bot_refund'); end if;
    p_order := private.refund_payment(p_id);
  else perform private.fail('bad_format');
  end if;
  perform private.audit('payment:' || p_action, jsonb_build_object('payment', p_id, 'order', p_order));
  return res;
end $$;
create function public.svc_payment_refunded(p_user uuid, p_payment bigint) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.profiles where user_id = p_user and role = 'admin' and not is_banned) then perform private.fail('forbidden'); end if;
  insert into public.audit_log (actor, action, data) values (p_user, 'payment:refunded', jsonb_build_object('payment', p_payment, 'order', private.refund_payment(p_payment)));
end $$;
create or replace function public.admin_orders() returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require('orders');
  return jsonb_build_object(
    'orders', (select coalesce(jsonb_agg(q), '[]') from (select o.id, o.kind, o.payload, o.pay_amount as amount, o.status, o.note, o.created_at, o.provider, p.login from public.orders o join public.profiles p using (user_id) order by o.created_at desc limit 100) q),
    'payments', (select coalesce(jsonb_agg(to_jsonb(y) - 'raw'), '[]') from (select * from public.payments order by (status in ('unmatched','needs_review')) desc, id desc limit 100) y));
end $$;

-- ---------- Profil: pulga olingan bezaklar ----------
create function public.my_paid_decor() returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_object_agg(decor_id, paid), '{}') from public.owned_decor where user_id = auth.uid() and paid > 0
$$;
create function public.api_anchors() returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_object_agg(id, paid_level), '{}') from public.decor_anchors
$$;

-- ---------- Bezak narxi so'mda: oddiy 5 000–20 000, lyuks 15 000–60 000 (promt E.3) ----------
update public.decor_catalog c set price_uzs = v.p from (values ('fence_wood', 5000), ('fence_brick', 6000), ('fence_ornate', 15000), ('gate_wood', 5000), ('gate_carved', 11000), ('gate_gold', 20000), ('path_stone', 5000), ('tree_anor', 5000), ('tree_chinor', 5000), ('tree_archa', 5000), ('yard_sori', 5000), ('yard_tok', 6000), ('yard_flowers', 5000), ('water_pool', 20000), ('water_fountain', 20000), ('car_van', 9000), ('car_sedan', 15000), ('car_sport', 20000), ('light_lamps', 5000), ('light_luxe', 18000), ('pet_dog', 6000), ('pet_cat', 5000), ('special_peacock', 20000), ('special_statue', 20000), ('special_yurt', 20000), ('sign_nick', 5000), ('yard_tandir', 8000), ('yard_tokzor', 8000), ('yard_umbrella', 6000), ('yard_bike', 5000), ('sign_mailbox', 5000), ('yard_besedka', 15000), ('yard_mangal', 10000), ('yard_batut', 12000), ('yard_basketball', 8000), ('roof_solar', 20000), ('yard_garage', 20000), ('yard_hammock', 6000), ('yard_playground', 20000), ('pet_house', 10000), ('tree_orik', 5000), ('tree_olma', 5000), ('tree_tut', 5000), ('tree_behi', 5000), ('pet_sheep', 6000), ('pet_hens', 5000), ('pet_horse', 20000), ('pet_dovecote', 10000), ('special_sumalak', 15000), ('light_newyear', 12000), ('tree_newyear', 15000), ('light_hayit', 12000), ('dam_besedka', 15000), ('dam_mangal', 10000), ('dam_basseyn', 20000), ('dam_stol', 12000), ('avto_sedan', 20000), ('avto_krossover', 20000), ('avto_sport', 20000), ('daraxt_olma', 5000), ('daraxt_orik', 5000), ('daraxt_gilos', 5000), ('daraxt_archa', 5000), ('daraxt_palma', 8000), ('gul_zor', 5000), ('gul_kamar', 8000), ('suv_hovuz', 20000), ('lux_pavilyon', 40000), ('lux_gril', 20000), ('lux_basseyn', 50000), ('lux_favvora', 30000), ('lux_bog', 25000), ('lux_limuzin', 60000), ('lux_superkar', 60000), ('lux_jip', 50000), ('lux_daraxt', 15000)) v(id, p) where c.id = v.id;

select private.apply_grants();
