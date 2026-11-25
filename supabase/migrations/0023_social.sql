/* 6-qadam, F: yurak (har uyga bir marta) va "Eng mashhur uylar"; referal sovg'alari (1 — gulzor, 3 — besedka, 10 — sedan). */
set check_function_bodies = off;

-- ---------- Yurak ----------
create table public.hearts (plot_id text not null references public.plots, user_id uuid not null references public.profiles on delete cascade, at timestamptz not null default now(), primary key (plot_id, user_id));
create index hearts_plot on public.hearts (plot_id);
alter table public.plot_state add column hearts int not null default 0;

/* Boshqaning uyiga yurak (o'zinikiga emas, bir marta). Uy bo'shasa yuraklar ham o'chadi. */
create function public.my_heart(p_plot text) returns int language plpgsql security definer set search_path = '' as $$
declare me public.profiles := private.writable(); st public.plot_state;
begin
  perform private.rate('heart:' || me.user_id, 60, 3600);
  select * into st from public.plot_state where plot_id = p_plot and status = 'owned' for update;
  if st.plot_id is null then perform private.fail('not_found'); end if;
  if st.owner = me.user_id then perform private.fail('self_heart'); end if;
  insert into public.hearts (plot_id, user_id) values (p_plot, me.user_id) on conflict do nothing;
  if not found then perform private.fail('already_claimed'); end if;
  update public.plot_state set hearts = hearts + 1 where plot_id = p_plot returning hearts into st.hearts;
  return st.hearts;
end $$;
create function private.clear_hearts() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' or new.owner is distinct from old.owner then
    delete from public.hearts where plot_id = old.plot_id;
    if tg_op = 'UPDATE' then new.hearts := 0; end if;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;
create trigger plot_state_hearts before update of owner or delete on public.plot_state for each row execute function private.clear_hearts();

create or replace function public.api_plot(p_plot text) returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', p.id, 'district', p.district_id, 'type', p.type, 'value', p.value, 'address', private.address(p.id),
    'open', d.is_open, 'status', case when s.status = 'reserved' and s.reserved_until < now() then 'free' else coalesce(s.status, 'free') end,
    'instagram', s.instagram, 'bio', s.bio, 'tier', s.tier, 'decor', s.decor, 'label', s.label, 'badges', coalesce(pr.badges, '{}'), 'rare', private.rare_decor(p.id),
    'votes', (select count(*) from public.yard_votes v where v.plot_id = p.id and v.week = private.this_week()),
    'hearts', coalesce(s.hearts, 0), 'hearted', exists (select 1 from public.hearts h where h.plot_id = p.id and h.user_id = auth.uid()),
    'since', s.claimed_at, 'price', private.plot_price(p.id))
  from public.plots p join public.districts d on d.id = p.district_id
  left join public.plot_state s on s.plot_id = p.id left join public.profiles pr on pr.user_id = s.owner where p.id = p_plot
$$;
create or replace function public.api_rankings() returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'houses', (select coalesce(jsonb_agg(h), '[]') from (
      select s.plot_id as plot, s.instagram, s.tier, (s.tier * 50 + case s.label when 'gold' then 60 when 'silver' then 25 else 0 end
        + coalesce((select sum(c.price_uzs) from unnest(s.decor) x join public.decor_catalog c on c.id = x), 0) / 1000)::int as score
      from public.plot_state s where s.status = 'owned' order by score desc, s.claimed_at limit 20) h),
    'popular', (select coalesce(jsonb_agg(h), '[]') from (
      select s.plot_id as plot, s.instagram, s.hearts from public.plot_state s where s.status = 'owned' and s.hearts > 0 order by s.hearts desc, s.claimed_at limit 20) h),
    'districts', (select coalesce(jsonb_agg(q), '[]') from (
      select district_id as id, count(*)::int as active from public.daily_active where day > current_date - 7 and district_id > 0 group by 1 order by 2 desc limit 12) q),
    'inviters', (select coalesce(jsonb_agg(q), '[]') from (
      select private.public_nick(r) as nick, count(*)::int as n from public.profiles p join public.profiles r on r.user_id = p.referred_by where p.referral_paid group by r.user_id, 1 order by 2 desc limit 10) q))
$$;

-- ---------- Referal sovg'alari (tangadan tashqari) ----------
insert into public.settings (key, value, is_public) values ('referral_gifts', '{"1":"gul_zor","3":"dam_besedka","10":"avto_sedan"}', true) on conflict (key) do nothing;
/* Sovg'a pulga olingandek hisoblanadi — har qanday leveldagi uyga (pulli nuqtaga) qo'yiladi. */
create or replace function private.pay_referral(p_guest uuid) returns void language plpgsql security definer set search_path = '' as $$
declare v_ref uuid; v_nick text; v_gain int := private.num('coins.referral', 500)::int; v_count int; v_gift text;
begin
  update public.profiles set referral_paid = true where user_id = p_guest and referred_by is not null and referred_by <> p_guest and telegram_id is not null and not referral_paid
    returning referred_by, instagram into v_ref, v_nick;
  if v_ref is null then return; end if;
  perform private.coins(v_ref, v_gain, 'referral');
  perform private.notify(v_ref, 'referral', jsonb_build_object('nick', v_nick));
  v_count := (select count(*) from public.profiles where referred_by = v_ref and referral_paid);
  v_gift := private.setting('referral_gifts') ->> v_count::text;
  if v_gift is not null and exists (select 1 from public.decor_catalog where id = v_gift) then
    insert into public.owned_decor as o (user_id, decor_id, qty, paid) values (v_ref, v_gift, 1, 1)
      on conflict (user_id, decor_id) do update set qty = o.qty + 1, paid = o.paid + 1;
    perform private.notify(v_ref, 'decor_gift', jsonb_build_object('id', v_gift, 'friends', v_count));
  end if;
end $$;

-- Yuraklar uy ustidagi yorliqda ham (ixcham qatorning 13-ustuni).
create or replace function public.api_city(p_districts int[] default null) returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_array(s.plot_id, s.instagram, s.tier, s.wall, s.roof, (select coalesce(jsonb_agg(key || ':' || value), '[]') from jsonb_each_text(s.places)), s.label,
      (select b from unnest(array['hokim','rais','hovli','investor','homiy','asoschi']) b where b = any (pr.badges) limit 1), s.status, s.has_expansion, s.wall_material, s.frame, s.door, s.hearts)), '[]')
  from public.plot_state s join public.plots p on p.id = s.plot_id left join public.profiles pr on pr.user_id = s.owner
  where s.status <> 'reserved' and (p_districts is null or p.district_id = any (p_districts))
$$;

select private.apply_grants();
