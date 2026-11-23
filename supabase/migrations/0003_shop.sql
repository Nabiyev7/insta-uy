-- Buyurtma, to'lov, tanga do'koni, bilbord/do'kon/ofis.
set check_function_bodies = off;
create table public.orders (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles, kind text not null
    check (kind in ('plot','tier','decor','expansion','label','street_name','commerce')),
  payload jsonb not null, amount int not null check (amount > 0), pay_amount int not null, status text not null default 'pending'
    check (status in ('pending','paid','expired','cancelled','failed')), provider text not null, note text,
  created_at timestamptz not null default now(), expires_at timestamptz not null, paid_at timestamptz
);
create unique index orders_pay_amount on public.orders (pay_amount) where status = 'pending';
create index orders_user on public.orders (user_id, created_at desc);
create table public.payments (
  id bigint generated always as identity primary key, provider text not null, external_id text not null, amount int not null,
  order_id uuid references public.orders, status text not null check (status in ('matched','unmatched','needs_review','refunded')), raw text, at timestamptz not null default now(),
  unique (provider, external_id)
);
create table public.commerce_state (
  commerce_id text primary key references public.commerce, owner uuid references public.profiles, title text not null default '', image text, link text,
  status text not null check (status in ('draft','review','live','rejected')), note text, until timestamptz, updated_at timestamptz not null default now()
);

create function private.label_price(p text) returns int language sql stable set search_path = '' as $$ select private.num('prices.label.' || p, case p when 'gold' then 40000 else 15000 end)::int $$;

/* Narx HAR DOIM serverda hisoblanadi. */
create function private.quote(me public.profiles, p_kind text, p jsonb) returns int language plpgsql security definer set search_path = '' as $$
declare st public.plot_state; pl public.plots; c public.decor_catalog; v int; s public.streets; off numeric := 1 - private.num('discount_pct', 0) / 100;
begin
  if p_kind = 'plot' then
    select * into pl from public.plots where id = p ->> 'plot';
    if pl.id is null then perform private.fail('not_found'); end if;
    if not (select is_open from public.districts where id = pl.district_id) then perform private.fail('district_closed'); end if;
    if exists (select 1 from public.plot_state where plot_id = pl.id and (status <> 'reserved' or reserved_until > now())) then perform private.fail('not_free'); end if;
    if private.nick_taken(me.user_id, private.clean_instagram(p ->> 'instagram')) then perform private.fail('nick_taken'); end if;
    return private.plot_price(pl.id);
  elsif p_kind = 'commerce' then
    if not exists (select 1 from public.commerce where id = p ->> 'id') then perform private.fail('not_found'); end if;
    if exists (select 1 from public.commerce_state where commerce_id = p ->> 'id' and (until is null or until > now())) then perform private.fail('not_free'); end if;
    return (private.num('prices.commerce.' || (select type from public.commerce where id = p ->> 'id'), 100000) * off)::int;
  elsif p_kind = 'decor' then
    select * into c from public.decor_catalog where id = p ->> 'id' and is_active;
    if c.id is null then perform private.fail('not_found'); end if;
    if c.stock is not null and c.sold + (select count(*) from public.orders where kind = 'decor' and status = 'pending' and expires_at > now() and payload ->> 'id' = c.id) >= c.stock then perform private.fail('sold_out'); end if;
    return greatest(1, (c.price_uzs * off)::int);
  elsif p_kind = 'street_name' then
    select * into s from public.streets where id = (p ->> 'street')::int;
    if s.id is null or not s.is_central then perform private.fail('not_found'); end if;
    if s.name_status = 'paid' or s.pending_name is not null then perform private.fail('not_free'); end if;
    perform private.clean_street(p ->> 'name');
    return (private.num('prices.streetName', 200000) * off)::int;
  end if;
  select * into st from public.plot_state where plot_id = p ->> 'plot' and owner = me.user_id and status = 'owned';
  if st.plot_id is null then perform private.fail('not_owner'); end if;
  if p_kind = 'tier' then
    v := (p ->> 'tier')::int;
    if (select type from public.plots where id = st.plot_id) = 'kvartira' then perform private.fail('no_yard'); end if;
    if v is null or v <= st.tier or v > 5 then perform private.fail('bad_format'); end if;
    return (select sum(private.num('prices.tierUp.' || g, 50000) * off)::int from generate_series(st.tier + 1, v) g);
  elsif p_kind = 'expansion' then
    if st.has_expansion or not exists (select 1 from public.expansions where plot_id = st.plot_id) then perform private.fail('not_free'); end if;
    return (private.num('prices.expansion', 80000) * off)::int;
  elsif p_kind = 'label' then
    if coalesce(p ->> 'label', '') not in ('silver','gold') or st.label = 'gold' or st.label = p ->> 'label' then perform private.fail('bad_format'); end if;
    return (private.label_price(p ->> 'label') * off)::int;
  end if;
  perform private.fail('bad_format');
end $$;

create function public.my_quote(p_kind text, p_payload jsonb) returns int language sql security definer set search_path = '' as $$ select private.quote(private.me(), p_kind, p_payload) $$;

create function public.my_order(p_kind text, p_payload jsonb) returns jsonb language plpgsql security definer set search_path = '' as $$
declare me public.profiles := private.writable(); v_amount int; v_pay int; o public.orders; mins int := private.num('reserve_minutes', 30)::int; v_provider text := coalesce(private.setting('payment_provider') #>> '{}', 'card');
begin
  if not private.flag('payments_enabled') then perform private.fail('payments_off'); end if;
  perform private.rate('order:' || me.user_id, 15, 3600);
  if (select count(*) from public.orders where user_id = me.user_id and status = 'pending' and expires_at > now()) >= 3 then perform private.fail('too_many_orders'); end if;
  -- Uchastkani band qilib turish cheklovi: bir vaqtda bittadan.
  if p_kind = 'plot' and exists (select 1 from public.orders where user_id = me.user_id and kind = 'plot' and status = 'pending' and expires_at > now()) then perform private.fail('too_many_orders'); end if;
  perform pg_catalog.pg_advisory_xact_lock(421001); -- noyob summa va band qilish ketma-ket
  v_amount := private.quote(me, p_kind, p_payload);
  -- Noyob summa: oxirgi 24 soatda ishlatilgan summalar takrorlanmaydi (kech kelgan to'lov adashmasin).
  select v_amount + g into v_pay from generate_series(1, 999) g
    where not exists (select 1 from public.orders where pay_amount = v_amount + g and created_at > now() - interval '24 hours') order by random() limit 1;
  if v_pay is null then perform private.fail('try_later'); end if;
  insert into public.orders (user_id, kind, payload, amount, pay_amount, provider, expires_at)
    values (me.user_id, p_kind, p_payload, v_amount, v_pay, v_provider, now() + make_interval(mins => mins)) returning * into o;
  if p_kind = 'plot' then
    delete from public.plot_state where plot_id = p_payload ->> 'plot' and status = 'reserved';
    insert into public.plot_state (plot_id, status, owner, reserved_until, reserved_order) values (p_payload ->> 'plot', 'reserved', me.user_id, o.expires_at, o.id);
  end if;
  return jsonb_build_object('id', o.id, 'amount', o.pay_amount, 'expires', o.expires_at, 'provider', o.provider, 'card', private.setting('pay_card'));
end $$;

create function public.my_orders() returns jsonb language sql security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'kind', kind, 'payload', payload, 'amount', pay_amount, 'status', status, 'expires', expires_at, 'provider', provider, 'at', created_at,
    'card', case when status = 'pending' and provider = 'card' then nullif(private.setting('pay_card') #>> '{}', '') end) order by created_at desc), '[]')
  from (select * from public.orders where user_id = auth.uid() order by created_at desc limit 30) o
$$;
create function public.my_order_cancel(p_id uuid) returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.orders set status = 'cancelled' where id = p_id and user_id = auth.uid() and status = 'pending';
  if found then delete from public.plot_state where reserved_order = p_id and status = 'reserved'; end if;
end $$;

create function private.grant_decor(uid uuid, d text) returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.decor_catalog set sold = sold + 1 where id = d and (stock is null or sold < stock);
  if not found then perform private.fail('sold_out'); end if;
  insert into public.owned_decor as o (user_id, decor_id) values (uid, d) on conflict (user_id, decor_id) do update set qty = o.qty + 1;
end $$;

/* Buyurtma natijasini qo'llaydi. Iloji bo'lmasa xato ko'taradi. */
create function private.fulfil(o public.orders) returns void language plpgsql security definer set search_path = '' as $$
declare pl public.plots; st public.plot_state; v int; nick text;
begin
  case o.kind
  when 'plot' then
    select * into pl from public.plots where id = o.payload ->> 'plot';
    select * into st from public.plot_state where plot_id = pl.id for update;
    if st.plot_id is not null and not (st.status = 'reserved' and (st.reserved_order = o.id or st.reserved_until < now())) then perform private.fail('not_free'); end if;
    delete from public.plot_state where plot_id = pl.id;
    -- To'lov kelguncha nik band bo'lib qolsa, uy baribir beriladi — niksiz (egasi keyin yozadi).
    nick := private.clean_instagram(o.payload ->> 'instagram');
    if private.nick_taken(o.user_id, nick) then nick := null; end if;
    insert into public.plot_state (plot_id, status, owner, instagram, tier) values
      (pl.id, case when nick is null then 'owned' else private.nick_status(o.user_id, nick) end, o.user_id, nick, case pl.type when 'qasr' then 5 when 'villa' then 4 else 1 end);
    insert into public.ownership_log (plot_id, to_user, reason) values (pl.id, o.user_id, 'paid');
    perform private.give_badge(o.user_id, 'investor');
  when 'tier' then
    v := (o.payload ->> 'tier')::int;
    update public.plot_state set tier = v where plot_id = o.payload ->> 'plot' and owner = o.user_id and tier < v;
    if not found then perform private.fail('not_owner'); end if;
  when 'decor' then perform private.grant_decor(o.user_id, o.payload ->> 'id');
  when 'expansion' then
    update public.plot_state set has_expansion = true where plot_id = o.payload ->> 'plot' and owner = o.user_id and not has_expansion;
    if not found then perform private.fail('not_owner'); end if;
  when 'label' then
    update public.plot_state set label = o.payload ->> 'label' where plot_id = o.payload ->> 'plot' and owner = o.user_id;
    if not found then perform private.fail('not_owner'); end if;
  when 'street_name' then
    update public.streets set pending_name = private.clean_street(o.payload ->> 'name'), pending_kind = 'paid', pending_by = o.user_id
      where id = (o.payload ->> 'street')::int and pending_name is null;
    if not found then perform private.fail('not_free'); end if;
  when 'commerce' then
    if exists (select 1 from public.commerce_state where commerce_id = o.payload ->> 'id' and (until is null or until > now())) then perform private.fail('not_free'); end if;
    delete from public.commerce_state where commerce_id = o.payload ->> 'id';
    insert into public.commerce_state (commerce_id, owner, status, until) values (o.payload ->> 'id', o.user_id, 'draft', now() + make_interval(days => private.num('commerce_days', 30)::int));
  end case;
  if (select sum(amount) from public.orders where user_id = o.user_id and status = 'paid') >= private.num('sponsor_threshold', 500000) then perform private.give_badge(o.user_id, 'homiy'); end if;
end $$;

create function private.settle(p_order uuid, p_payment bigint) returns text language plpgsql security definer set search_path = '' as $$
declare o public.orders;
begin
  select * into o from public.orders where id = p_order for update;
  if o.status = 'paid' then update public.payments set status = 'needs_review' where id = p_payment; return 'already_paid'; end if;
  update public.orders set status = 'paid', paid_at = now() where id = o.id;
  begin
    perform private.fulfil(o);
  exception when others then
    -- Pul keldi, lekin buyurtmani bajarib bo'lmadi (masalan uchastka band): adminga.
    update public.orders set status = 'failed', note = sqlerrm, paid_at = now() where id = o.id;
    update public.payments set status = 'needs_review' where id = p_payment;
    perform private.notify(o.user_id, 'order_problem', jsonb_build_object('order', o.id));
    return 'needs_review';
  end;
  update public.payments set status = 'matched' where id = p_payment;
  perform private.notify(o.user_id, 'order_paid', jsonb_build_object('order', o.id, 'kind', o.kind));
  return 'paid';
end $$;

/* Idempotent: bir xil (provider, external_id) ikkinchi marta hech narsa qilmaydi. */
create function public.svc_payment(p_provider text, p_external text, p_amount int, p_order uuid default null, p_raw text default null) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_pay bigint; v_order uuid; v_res text;
begin
  insert into public.payments (provider, external_id, amount, status, raw) values (p_provider, p_external, p_amount, 'unmatched', left(p_raw, 500)) on conflict (provider, external_id) do nothing returning id into v_pay;
  if v_pay is null then return jsonb_build_object('result', 'duplicate'); end if;
  if p_order is not null then select id into v_order from public.orders where id = p_order and pay_amount = p_amount;
  else select id into v_order from public.orders where pay_amount = p_amount and provider = p_provider and status in ('pending','expired') and created_at > now() - interval '24 hours' order by created_at desc limit 1;
  end if;
  if v_order is null then return jsonb_build_object('result', 'unmatched', 'payment', v_pay); end if;
  update public.payments set order_id = v_order where id = v_pay;
  v_res := private.settle(v_order, v_pay);
  return jsonb_build_object('result', v_res, 'order', v_order);
end $$;
create function public.svc_order(p_id uuid) returns jsonb language sql stable security definer set search_path = '' as $$
  select to_jsonb(o) from public.orders o where id = p_id
$$;

-- ---------- Tanga do'koni ----------
create function public.my_buy_decor_coins(p_id text) returns int language plpgsql security definer set search_path = '' as $$
declare me public.profiles := private.writable(); c public.decor_catalog; bal int;
begin
  if not private.flag('coins_enabled') then perform private.fail('coins_off'); end if;
  select * into c from public.decor_catalog where id = p_id and is_active for update;
  if c.id is null then perform private.fail('not_found'); end if;
  bal := private.coins(me.user_id, -c.price_coins, 'decor:' || p_id);
  perform private.grant_decor(me.user_id, p_id);
  return bal;
end $$;
create function public.my_tier_coins(p_plot text) returns int language plpgsql security definer set search_path = '' as $$
declare st public.plot_state := private.own_plot(p_plot); bal int;
begin
  if not private.flag('coins_enabled') then perform private.fail('coins_off'); end if;
  if (select type from public.plots where id = p_plot) = 'kvartira' then perform private.fail('no_yard'); end if;
  if st.tier >= private.num('coins.maxTier', 3) then perform private.fail('max_tier'); end if;
  bal := private.coins(st.owner, -(private.num('coins.tierBase', 500) * st.tier)::int, 'tier:' || p_plot);
  update public.plot_state set tier = tier + 1 where plot_id = p_plot;
  return bal;
end $$;
create function public.api_catalog() returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_agg(jsonb_build_object('id', id, 'uzs', price_uzs, 'coins', price_coins, 'left', case when stock is null then null else stock - sold end) order by id) from public.decor_catalog where is_active
$$;

-- ---------- Biznes joylari ----------
create function public.my_commerce_edit(p_id text, p_title text, p_link text, p_image text) returns void language plpgsql security definer set search_path = '' as $$
declare me public.profiles := private.writable(); v_link text := nullif(btrim(coalesce(p_link, '')), ''); v_img text := nullif(btrim(coalesce(p_image, '')), '');
begin
  perform private.rate('ad:' || me.user_id, 20, 86400);
  if v_link is not null and (v_link !~ '^https://[a-z0-9.-]+\.[a-z]{2,}(/[^\s<>"'']*)?$' or char_length(v_link) > 200) then perform private.fail('bad_format'); end if;
  -- Rasm faqat o'z papkasidan: "ads/<uid>/<fayl>".
  if v_img is not null and v_img !~ ('^ads/' || me.user_id || '/[a-z0-9-]{8,60}\.(webp|png|jpg)$') then perform private.fail('bad_format'); end if;
  update public.commerce_state set title = private.clean_text(p_title, 40, false), link = v_link, image = v_img, status = 'review', updated_at = now()
    where commerce_id = p_id and owner = me.user_id and (until is null or until > now());
  if not found then perform private.fail('not_owner'); end if;
end $$;
create function public.my_commerce() returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(to_jsonb(c) - 'owner'), '[]') from public.commerce_state c where owner = auth.uid()
$$;
create function public.api_commerce(p_id text) returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', c.id, 'type', c.type, 'price', (private.num('prices.commerce.' || c.type, 100000) * (1 - private.num('discount_pct', 0) / 100))::int,
    'free', s.commerce_id is null or s.until < now(), 'title', case when s.status = 'live' then s.title end, 'link', case when s.status = 'live' then s.link end)
  from public.commerce c left join public.commerce_state s on s.commerce_id = c.id where c.id = p_id
$$;
