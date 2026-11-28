/* 19-qadam (5): do'st taklifi — bezak sovg'asi o'rniga tanga. Bezak sovg'alari (`referral_gifts`) o'chiriladi (kod qoladi, `referral_gifts_enabled=false`;
   allaqachon olinganlar odamlarda qoladi). Har do'st (Telegram + uy) — +500 tanga (o'zgarmaydi). Bosqich bonuslari (bir marta):
   3 do'st — +2 000, 10 — +6 000, 25 — +15 000, 50 — +40 000 (`coins.referralSteps`, admin "Iqtisod"da). */
set check_function_bodies = off;

insert into public.settings (key, value, is_public) values ('referral_gifts_enabled', 'false', true) on conflict (key) do update set value = 'false';
update public.settings set value = value || jsonb_build_object('referralSteps', jsonb_build_object('3', 2000, '10', 6000, '25', 15000, '50', 40000))
  where key = 'coins' and not (value ? 'referralSteps');

/* Bosqich bonuslari: yetib kelgan va hali olinmagan har bir bosqich uchun bir marta (tanga jurnalida `ref_step:<N>`). */
create function private.pay_referral_steps(p_user uuid, p_count int) returns void language plpgsql security definer set search_path = '' as $$
declare st record; v_bonus int;
begin
  for st in select k::int as at, v from jsonb_each_text(coalesce(private.setting('coins') -> 'referralSteps', '{}')) as e(k, v) where k ~ '^[0-9]{1,4}$' and v ~ '^[0-9]{1,7}$' order by k::int loop
    if st.at > p_count then exit; end if;
    v_bonus := st.v::int;
    if v_bonus > 0 and not exists (select 1 from public.coin_ledger where user_id = p_user and reason = 'ref_step:' || st.at) then
      perform private.coins(p_user, v_bonus, 'ref_step:' || st.at);
      perform private.notify(p_user, 'ref_step', jsonb_build_object('friends', st.at, 'coins', v_bonus));
    end if;
  end loop;
end $$;
revoke all on function private.pay_referral_steps(uuid, int) from public, anon, authenticated;

create or replace function private.pay_referral(p_guest uuid) returns void language plpgsql security definer set search_path = '' as $$
declare v_ref uuid; v_nick text; v_gain int := private.num('coins.referral', 500)::int; v_count int; v_gift text;
begin
  update public.profiles set referral_paid = true where user_id = p_guest and referred_by is not null and referred_by <> p_guest and telegram_id is not null and not referral_paid
    returning referred_by, instagram into v_ref, v_nick;
  if v_ref is null then return; end if;
  perform private.coins(v_ref, v_gain, 'referral');
  v_count := (select count(*) from public.profiles where referred_by = v_ref and referral_paid);
  perform private.notify(v_ref, 'referral', jsonb_build_object('nick', v_nick, 'invited', v_count));
  -- Bezak sovg'alari faqat bayroqcha yoqilganda (19-qadamdan o'chiq).
  if private.flag('referral_gifts_enabled') then
    v_gift := private.setting('referral_gifts') ->> v_count::text;
    if v_gift is not null and exists (select 1 from public.decor_catalog where id = v_gift) then
      insert into public.owned_decor as o (user_id, decor_id, qty, paid) values (v_ref, v_gift, 1, 1)
        on conflict (user_id, decor_id) do update set qty = o.qty + 1, paid = o.paid + 1;
      perform private.notify(v_ref, 'decor_gift', jsonb_build_object('id', v_gift, 'friends', v_count));
    end if;
  end if;
  perform private.pay_referral_steps(v_ref, v_count);
  if v_count >= 10 then perform private.give_badge(v_ref, 'elchi10'); end if;
  if v_count >= 50 then perform private.give_badge(v_ref, 'elchi50'); end if;
  if v_count >= 100 then perform private.give_badge(v_ref, 'elchi100'); end if;
end $$;

/* Bot "Do'st taklif": taklif kodi, nechta taklif qilgani, bosqichlar (tanga), har do'st uchun tanga. */
create or replace function public.svc_bot_invite(p_telegram bigint) returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('ref', p.ref_code, 'invited', (select count(*) from public.profiles x where x.referred_by = p.user_id and x.referral_paid),
    'perFriend', private.num('coins.referral', 500)::int,
    'steps', (select coalesce(jsonb_agg(jsonb_build_object('at', k::int, 'coins', v::int) order by k::int), '[]')
      from jsonb_each_text(coalesce(private.setting('coins') -> 'referralSteps', '{}')) as e(k, v) where k ~ '^[0-9]{1,4}$' and v ~ '^[0-9]{1,7}$'),
    'gifts', '[]'::jsonb)
  from public.profiles p where p.telegram_id = p_telegram
$$;

select private.apply_grants();
