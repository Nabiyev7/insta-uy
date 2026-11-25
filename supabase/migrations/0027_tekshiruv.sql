/* 6a/6b tekshiruvidan: nizodan keyin eski egasi doim yangi nik yoza oladi; sinov rejimida shahar loyihasi va salyut bepul emas;
   admin javobidan keyin foydalanuvchi xabari o'sha murojaatga qo'shiladi; akkaunti bor odam boshqa nikka da'vo qilmaydi. */
set check_function_bodies = off;

/* Profil bor, lekin nik yo'q (nizoda niki o'tgan) — /start yoki "Shaharni ochish" ham yangi nik so'raydi. */
create or replace function public.svc_bot_start(p_telegram bigint, p_ref text default null, p_name text default null) returns jsonb language plpgsql security definer set search_path = '' as $$
declare p public.profiles;
begin
  select * into p from public.profiles where telegram_id = p_telegram;
  if p.user_id is not null then
    if p.is_banned then
      delete from public.tg_sessions where telegram_id = p_telegram;
      return jsonb_build_object('state', 'banned', 'user', p.user_id);
    end if;
    if p.instagram is null and exists (select 1 from public.nick_disputes d where d.owner = p.user_id and d.status = 'granted') then
      insert into public.tg_sessions as s (telegram_id, step) values (p_telegram, 'renick') on conflict (telegram_id) do update set step = 'renick', nick = null, updated_at = now();
      return jsonb_build_object('state', 'renick', 'user', p.user_id);
    end if;
    delete from public.tg_sessions where telegram_id = p_telegram;
    return jsonb_build_object('state', 'ready', 'user', p.user_id, 'nick', p.instagram, 'lang', p.lang);
  end if;
  insert into public.tg_sessions as s (telegram_id, step, ref, name) values (p_telegram, 'nick', nullif(left(p_ref, 20), ''), left(p_name, 60))
    on conflict (telegram_id) do update set step = 'nick', ref = coalesce(excluded.ref, s.ref), name = coalesce(excluded.name, s.name), updated_at = now();
  return jsonb_build_object('state', 'need_nick');
end $$;

/* Sinov rejimi faqat o'z xaridlariga: hammaga ta'sir qiladigan loyiha hissasi va salyut — oddiy qoidada. */
create or replace function private.coins(uid uuid, delta int, why text) returns int language plpgsql security definer set search_path = '' as $$
declare bal int;
begin
  if delta < 0 and uid = auth.uid() and why not in ('send','admin','refund','salute') and why not like 'project:%' and private.is_tester_uid(uid) then
    insert into public.coin_ledger (user_id, delta, reason) values (uid, 0, 'test:' || why);
    return (select coins from public.profiles where user_id = uid);
  end if;
  update public.profiles set coins = coins + delta where user_id = uid and coins + delta >= 0 returning coins into bal;
  if bal is null then perform private.fail('not_enough_coins'); end if;
  insert into public.coin_ledger (user_id, delta, reason) values (uid, delta, why);
  return bal;
end $$;

/* Admin javobidan keyin foydalanuvchi 2 daqiqa ichida yozsa — o'sha murojaatga qo'shiladi (limitni yemaydi). */
create or replace function public.svc_support_reply(p_admin_msg bigint, p_ticket int, p_text text, p_photo text default null) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_ticket int := p_ticket; t public.support_tickets;
begin
  if v_ticket is null then select ticket_id into v_ticket from public.support_messages where admin_msg_id = p_admin_msg; end if;
  select * into t from public.support_tickets where id = v_ticket for update;
  if t.id is null then return null; end if;
  insert into public.support_messages (ticket_id, is_admin, text, photo) values (t.id, true, left(p_text, 3000), left(p_photo, 300));
  update public.support_tickets set status = 'answered', updated_at = now() where id = t.id;
  return jsonb_build_object('chat', t.telegram_id, 'ticket', t.id);
end $$;

/* Akkaunti bor odam (boshqa nik bilan) da'vo qilmaydi: nik o'zgarmaydi qoidasi. */
create or replace function public.svc_dispute_open(p_telegram bigint, p_nick text) returns int language plpgsql security definer set search_path = '' as $$
declare nick text := private.clean_instagram(p_nick); v_owner uuid; v_id int;
begin
  if exists (select 1 from public.profiles where telegram_id = p_telegram and instagram is not null) then perform private.fail('has_account'); end if;
  select user_id into v_owner from public.profiles where lower(instagram) = nick;
  if v_owner is null then perform private.fail('not_found'); end if;
  if (select count(*) from public.nick_disputes where claimant_tg = p_telegram and created_at > now() - interval '1 day') >= private.num('dispute_per_day', 3) then perform private.fail('rate_limited'); end if;
  insert into public.nick_disputes (nick, claimant_tg, owner) values (nick, p_telegram, v_owner) on conflict do nothing returning id into v_id;
  if v_id is null then perform private.fail('already_claimed'); end if;
  return v_id;
end $$;

select private.apply_grants();
