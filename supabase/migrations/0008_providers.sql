-- Rasmiy to'lov provayderlari (Payme/Click) tranzaksiyalari.
set check_function_bodies = off;
create table public.provider_tx (
  provider text not null, ext_id text not null, order_id uuid not null references public.orders, amount int not null,
  state int not null default 1 check (state in (1, 2, -1, -2)), create_time bigint not null, perform_time bigint not null default 0, cancel_time bigint not null default 0, reason int,
  primary key (provider, ext_id)
);
create unique index provider_tx_active on public.provider_tx (order_id) where state in (1, 2);

create function public.svc_tx(p_provider text, p_ext text) returns jsonb language sql stable security definer set search_path = '' as $$
  select to_jsonb(t) from public.provider_tx t where provider = p_provider and ext_id = p_ext
$$;
create function public.svc_tx_create(p_provider text, p_ext text, p_order uuid, p_amount int, p_time bigint) returns jsonb language plpgsql security definer set search_path = '' as $$
declare o public.orders; t public.provider_tx;
begin
  select * into t from public.provider_tx where provider = p_provider and ext_id = p_ext;
  if t.ext_id is not null then return to_jsonb(t); end if;
  select * into o from public.orders where id = p_order for update;
  if o.id is null or o.status <> 'pending' or o.expires_at < now() or o.provider <> p_provider then return jsonb_build_object('error', 'order'); end if;
  if o.pay_amount <> p_amount then return jsonb_build_object('error', 'amount'); end if;
  if exists (select 1 from public.provider_tx where order_id = p_order and state in (1, 2)) then return jsonb_build_object('error', 'busy'); end if;
  insert into public.provider_tx (provider, ext_id, order_id, amount, create_time) values (p_provider, p_ext, p_order, p_amount, p_time) returning * into t;
  return to_jsonb(t);
end $$;
create function public.svc_tx_perform(p_provider text, p_ext text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare t public.provider_tx;
begin
  select * into t from public.provider_tx where provider = p_provider and ext_id = p_ext for update;
  if t.ext_id is null or t.state < 0 then return jsonb_build_object('error', 'state'); end if;
  if t.state = 1 then
    update public.provider_tx set state = 2, perform_time = (extract(epoch from now()) * 1000)::bigint where provider = p_provider and ext_id = p_ext returning * into t;
    perform public.svc_payment(p_provider, p_ext, t.amount, t.order_id, null);
  end if;
  return to_jsonb(t);
end $$;
create function public.svc_tx_cancel(p_provider text, p_ext text, p_reason int) returns jsonb language plpgsql security definer set search_path = '' as $$
declare t public.provider_tx;
begin
  select * into t from public.provider_tx where provider = p_provider and ext_id = p_ext for update;
  if t.ext_id is null then return jsonb_build_object('error', 'state'); end if;
  -- Bajarilgan to'lovni avtomatik qaytarib bo'lmaydi: mahsulot berilgan (-31007).
  if t.state = 2 then return jsonb_build_object('error', 'done'); end if;
  if t.state = 1 then
    update public.provider_tx set state = -1, reason = p_reason, cancel_time = (extract(epoch from now()) * 1000)::bigint where provider = p_provider and ext_id = p_ext returning * into t;
    update public.orders set status = 'cancelled' where id = t.order_id and status = 'pending';
    delete from public.plot_state where reserved_order = t.order_id and status = 'reserved';
  end if;
  return to_jsonb(t);
end $$;
create function public.svc_tx_list(p_provider text, p_from bigint, p_to bigint) returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(to_jsonb(t) order by create_time), '[]') from public.provider_tx t where provider = p_provider and create_time between p_from and p_to
$$;
select private.apply_grants();
