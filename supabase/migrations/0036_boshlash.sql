/* 14-qadam (3): haqiqiy loyiha — sinov davridagi hamma narsa o'chadi (bir marta, egasi ruxsati va zaxiradan keyin).
   Faqat service_role (server kaliti); egasining akkaunti qoladi (tanga 0, uy yo'q), `p_delete` dagi akkauntlar o'chadi.
   Kutish ro'yxati (waitlist), katalog, xarita, sozlamalar, audit va zaxiralar — qoladi. */
set check_function_bodies = off;

create function public.svc_launch_reset(p_keep uuid, p_delete uuid[] default '{}') returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  keep public.profiles;
  gone bigint[];
  n jsonb := '{}';
  c bigint;
  t text;
  wipe constant text[] := array[
    'ballots','candidates','elections','street_ballots','street_proposals','street_votes',
    'poll_votes','yard_votes','yard_winners','yard_polls','polls','broadcast_queue','broadcasts',
    'hearts','salutes','transfers','ownership_log','project_contributions','treasure_claims','treasures','quest_claims','quest_telegram','channel_bonus',
    'provider_tx','payments','orders','coin_transfers','coin_ledger','decor_serials','owned_decor','plot_state','commerce_state',
    'support_messages','support_tickets','nick_disputes','reports','notifications','daily_active','channel_posts','tg_outbox','reminder_log','rate_limits','client_errors','gazette'];
begin
  select * into keep from public.profiles where user_id = p_keep;
  if keep.user_id is null or not private.is_owner_admin(keep) then perform private.fail('forbidden'); end if;
  if p_keep = any (coalesce(p_delete, '{}')) then perform private.fail('bad_format'); end if;
  select coalesce(array_agg(telegram_id), '{}') into gone from public.profiles where user_id = any (coalesce(p_delete, '{}')) and telegram_id is not null;

  foreach t in array wipe loop
    if to_regclass('public.' || t) is null then continue; end if;
    execute format('delete from public.%I', t);
    get diagnostics c = row_count;
    n := n || jsonb_build_object(t, c);
  end loop;

  -- Shahar boshlang'ich holatda: faqat 1-tuman ochiq, loyihalar 0 dan, ko'cha nomlari foydalanuvchilardan tozalanadi.
  update public.districts set is_open = (id = 1), opened_at = case when id = 1 then opened_at end;
  update public.projects set raised = 0, status = case when status = 'done' then 'open' else status end, done_at = null;
  update public.streets set pending_name = null, pending_kind = null, pending_by = null,
    name = case when name_status in ('temp','voted','paid') then null else name end, name_status = case when name_status in ('temp','voted','paid') then 'none' else name_status end;

  -- Akkauntlar: ro'yxatdagilar o'chadi (Telegram sessiyalari va tokenlari bilan); egasi — noldan.
  delete from public.tg_tokens where user_id = any (coalesce(p_delete, '{}'));
  delete from public.tg_sessions where telegram_id = any (gone);
  update public.nick_spots set owner = null, nick = null, until = null where owner is not null or nick is not null;
  update public.profiles set referred_by = null, referral_paid = false;
  delete from public.profiles where user_id = any (coalesce(p_delete, '{}'));
  get diagnostics c = row_count;
  n := n || jsonb_build_object('profiles', c);
  update public.profiles set coins = 0, badges = '{}', free_used = false, streak = 0, last_daily = null, channel_paid = false, test_mode = false where user_id = p_keep;

  perform private.audit('launch_reset', n);
  return n || jsonb_build_object('kept', (select count(*) from public.profiles));
end $$;

select private.apply_grants();
