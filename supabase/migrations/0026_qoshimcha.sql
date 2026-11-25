/* 6b-qadam (QOSHIMCHA-1): nik tasdiq qadami, nik nizosi, bot eslatmalari, yangi qo'shni xabari, shahar loyihalari, adminga yozish. */
set check_function_bodies = off;

-- ---------- Umumiy: bot suhbati qadamlari va Telegram'ga xabar navbati (akkaunti yo'q odamga ham) ----------
alter table public.tg_sessions drop constraint tg_sessions_step_check;
alter table public.tg_sessions add constraint tg_sessions_step_check check (step in ('nick','confirm','dispute','dispute_owner','renick','support'));
alter table public.tg_sessions add column nick text;
alter table public.tg_sessions add column ref_id bigint;
create table public.tg_outbox (id bigint generated always as identity primary key, chat bigint not null, text text not null, buttons jsonb, at timestamptz not null default now());
alter table public.tg_outbox enable row level security;
create function public.svc_tg_outbox(p_limit int default 100) returns jsonb language plpgsql security definer set search_path = '' as $$
declare ids bigint[]; res jsonb;
begin
  ids := array(select id from public.tg_outbox order by id limit greatest(1, least(p_limit, 500)) for update skip locked);
  select coalesce(jsonb_agg(jsonb_build_object('chat', chat, 'text', text, 'buttons', buttons) order by id), '[]') into res from public.tg_outbox where id = any (ids);
  delete from public.tg_outbox where id = any (ids);
  return res;
end $$;
create function public.svc_bot_step(p_telegram bigint, p_step text, p_nick text default null, p_ref_id bigint default null) returns void language sql security definer set search_path = '' as $$
  insert into public.tg_sessions as s (telegram_id, step, nick, ref_id) values (p_telegram, p_step, p_nick, p_ref_id)
    on conflict (telegram_id) do update set step = excluded.step, nick = excluded.nick, ref_id = excluded.ref_id, updated_at = now()
$$;
create function public.svc_setting(p_key text) returns jsonb language sql stable security definer set search_path = '' as $$ select private.setting(p_key) $$;

-- ---------- 1. Nik: oxiridagi nuqta/bo'shliq olinadi; katta-kichik harf farqsiz; bitta nik — bitta odam ----------
create or replace function private.clean_instagram(t text) returns text language plpgsql stable set search_path = '' as $$
declare v text := lower(btrim(regexp_replace(coalesce(t, ''), '^\s*(https?://)?(www\.)?instagram\.com/', '', 'i'), ' @/'));
begin
  v := rtrim(v, '. ');
  if v = '' then perform private.fail('empty'); end if;
  if char_length(v) > 30 or v !~ '^[a-z0-9_]([a-z0-9._]*[a-z0-9_])?$' or position('..' in v) > 0 then perform private.fail('bad_format'); end if;
  if private.has_banned(v) then perform private.fail('banned_word'); end if;
  return v;
end $$;

-- ---------- 2. Nik nizosi ----------
create table public.nick_disputes (
  id int generated always as identity primary key, nick text not null, claimant_tg bigint not null, owner uuid references public.profiles on delete set null,
  status text not null default 'new' check (status in ('new','sent','granted','rejected')), claim_proof text, owner_proof text, owner_gave boolean not null default false,
  created_at timestamptz not null default now(), sent_at timestamptz, decided_at timestamptz, decided_by uuid
);
create unique index nick_disputes_open on public.nick_disputes (lower(nick)) where status in ('new','sent');
alter table public.nick_disputes enable row level security;
/* Bot: "Bu nik meniki" (kuniga 3 ta, bitta nikka bitta ochiq ariza). */
create function public.svc_dispute_open(p_telegram bigint, p_nick text) returns int language plpgsql security definer set search_path = '' as $$
declare nick text := private.clean_instagram(p_nick); v_owner uuid; v_id int;
begin
  select user_id into v_owner from public.profiles where lower(instagram) = nick;
  if v_owner is null then perform private.fail('not_found'); end if;
  if exists (select 1 from public.profiles where user_id = v_owner and telegram_id = p_telegram) then perform private.fail('self_transfer'); end if;
  if (select count(*) from public.nick_disputes where claimant_tg = p_telegram and created_at > now() - interval '1 day') >= private.num('dispute_per_day', 3) then perform private.fail('rate_limited'); end if;
  insert into public.nick_disputes (nick, claimant_tg, owner) values (nick, p_telegram, v_owner) on conflict do nothing returning id into v_id;
  if v_id is null then perform private.fail('already_claimed'); end if;
  return v_id;
end $$;
create function public.svc_dispute_proof(p_id int, p_telegram bigint, p_file text) returns text language plpgsql security definer set search_path = '' as $$
declare d public.nick_disputes;
begin
  select * into d from public.nick_disputes where id = p_id and status in ('new','sent') for update;
  if d.id is null then perform private.fail('not_found'); end if;
  if d.claimant_tg = p_telegram then update public.nick_disputes set claim_proof = left(p_file, 300) where id = p_id; return 'claimant'; end if;
  if exists (select 1 from public.profiles where user_id = d.owner and telegram_id = p_telegram) then update public.nick_disputes set owner_proof = left(p_file, 300) where id = p_id; return 'owner'; end if;
  perform private.fail('forbidden');
end $$;
/* Nik da'vogarga o'tadi: eski egasining uyi, tangasi, nishonlari qoladi, faqat nik o'chadi (keyin yangisini yozadi). Bitta tranzaksiya. */
create function private.dispute_grant(p_id int, p_by uuid) returns void language plpgsql security definer set search_path = '' as $$
declare d public.nick_disputes; v_tg bigint;
begin
  select * into d from public.nick_disputes where id = p_id and status in ('new','sent') for update;
  if d.id is null then perform private.fail('not_found'); end if;
  update public.profiles set instagram = null where user_id = d.owner returning telegram_id into v_tg;
  update public.plot_state set instagram = null where owner = d.owner and lower(instagram) = lower(d.nick);
  update public.nick_disputes set status = 'granted', decided_at = now(), decided_by = p_by where id = p_id;
  if v_tg is not null then
    insert into public.tg_sessions as s (telegram_id, step) values (v_tg, 'renick') on conflict (telegram_id) do update set step = 'renick', nick = null, updated_at = now();
    insert into public.tg_outbox (chat, text) values (v_tg, '@' || d.nick || ' niki uning haqiqiy egasiga o‘tdi. Uyingiz, tangalaringiz va nishonlaringiz o‘zingizda. Yangi Instagram nikingizni yozing. / Ник @' || d.nick || ' передан владельцу. Ваш дом и монеты остаются у вас. Напишите новый ник.');
  end if;
  insert into public.tg_outbox (chat, text) values (d.claimant_tg, '✅ @' || d.nick || ' niki sizga o‘tdi. /start yozing — akkaunt ochiladi. / Ник ваш. Напишите /start.');
end $$;
create function public.admin_disputes() returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if (private.require('users')).role <> 'admin' then perform private.fail('forbidden'); end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('id', d.id, 'nick', d.nick, 'claimant', d.claimant_tg, 'owner', p.login, 'owner_tg', p.telegram_id, 'status', d.status,
    'claim_proof', d.claim_proof is not null, 'owner_proof', d.owner_proof is not null, 'owner_gave', d.owner_gave, 'created_at', d.created_at, 'sent_at', d.sent_at) order by d.id desc), '[]')
    from public.nick_disputes d left join public.profiles p on p.user_id = d.owner);
end $$;
/* Admin: tekshirishga yuborish (egasiga bot xabari), da'vogar haq, rad etish. */
create function public.admin_dispute(p_id int, p_action text) returns void language plpgsql security definer set search_path = '' as $$
declare me public.profiles := private.require('users'); d public.nick_disputes; v_tg bigint;
begin
  if me.role <> 'admin' then perform private.fail('forbidden'); end if;
  select * into d from public.nick_disputes where id = p_id for update;
  if d.id is null then perform private.fail('not_found'); end if;
  if p_action = 'send' then
    if d.status <> 'new' then perform private.fail('bad_format'); end if;
    update public.nick_disputes set status = 'sent', sent_at = now() where id = p_id;
    select telegram_id into v_tg from public.profiles where user_id = d.owner;
    if v_tg is not null then
      insert into public.tg_sessions as s (telegram_id, step, ref_id) values (v_tg, 'dispute_owner', p_id) on conflict (telegram_id) do update set step = 'dispute_owner', ref_id = p_id, updated_at = now();
      insert into public.tg_outbox (chat, text, buttons) values (v_tg, '⚠️ @' || d.nick || ' uchun boshqa odam ariza berdi. Bu nik sizniki bo‘lsa — 7 kun ichida o‘sha Instagram profilingiz skrinshotini shu yerga yuboring ("Profilni tahrirlash" tugmasi ko‘rinib tursin). / Другой человек подал заявку на @' || d.nick || '. Если ник ваш — пришлите скриншот профиля за 7 дней.',
        jsonb_build_array(jsonb_build_object('text', 'Nik meniki emas, beraman / Ник не мой, отдаю', 'data', 'dgive:' || p_id)));
    end if;
  elsif p_action = 'grant' then perform private.dispute_grant(p_id, me.user_id);
  elsif p_action = 'reject' then
    update public.nick_disputes set status = 'rejected', decided_at = now(), decided_by = me.user_id where id = p_id and status in ('new','sent');
    if not found then perform private.fail('not_found'); end if;
    insert into public.tg_outbox (chat, text) values (d.claimant_tg, '@' || d.nick || ' bo‘yicha arizangiz rad etildi: hozirgi egasi haq deb topildi. / Заявка отклонена.');
  else perform private.fail('bad_format');
  end if;
  perform private.audit('dispute:' || p_action, jsonb_build_object('id', p_id));
end $$;
/* Hozirgi egasi "beraman" dedi. */
create function public.svc_dispute_give(p_id int, p_telegram bigint) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.nick_disputes d join public.profiles p on p.user_id = d.owner where d.id = p_id and d.status = 'sent' and p.telegram_id = p_telegram) then perform private.fail('not_found'); end if;
  update public.nick_disputes set owner_gave = true where id = p_id;
  perform private.dispute_grant(p_id, null);
end $$;
create function public.svc_dispute_file(p_user uuid, p_id int, p_side text) returns text language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.profiles where user_id = p_user and role = 'admin') then perform private.fail('forbidden'); end if;
  return (select case p_side when 'owner' then owner_proof else claim_proof end from public.nick_disputes where id = p_id);
end $$;
/* Eski egasi yangi nik yozadi (1-band qoidalari). */
create function public.svc_renick(p_telegram bigint, p_nick text) returns text language plpgsql security definer set search_path = '' as $$
declare nick text; v_user uuid;
begin
  select user_id into v_user from public.profiles where telegram_id = p_telegram and instagram is null;
  if v_user is null then perform private.fail('not_found'); end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('nick:' || lower(btrim(p_nick, ' @'))));
  nick := private.nick_free(p_nick);
  update public.profiles set instagram = nick where user_id = v_user;
  update public.plot_state set instagram = nick where owner = v_user and instagram is null and status = 'owned';
  delete from public.tg_sessions where telegram_id = p_telegram;
  return nick;
end $$;

-- ---------- 3. Kechki eslatma (19:00 Toshkent): kunlik bonus olinmagan bo'lsa, kuniga 1 ta ----------
create table public.reminder_log (telegram_id bigint not null, day date not null, primary key (telegram_id, day));
alter table public.reminder_log enable row level security;
insert into public.settings (key, value, is_public) values ('reminder_hour', '19', true), ('neighbour_per_day', '3', true), ('dispute_per_day', '3', true), ('support_per_day', '5', true) on conflict (key) do nothing;
create function private.queue_reminders() returns int language plpgsql security definer set search_path = '' as $$
declare v_day date := (now() at time zone 'Asia/Tashkent')::date; n int;
begin
  if extract(hour from now() at time zone 'Asia/Tashkent') < private.num('reminder_hour', 19) then return 0; end if;
  with due as (
    insert into public.reminder_log (telegram_id, day)
      select p.telegram_id, v_day from public.profiles p
      where p.telegram_id is not null and p.wants_news and not p.is_banned and p.last_daily is distinct from current_date
        and exists (select 1 from public.plot_state s where s.owner = p.user_id and s.status = 'owned')
      on conflict do nothing returning telegram_id)
  insert into public.tg_outbox (chat, text, buttons)
    select p.telegram_id,
      case when p.last_daily = current_date - 1 and p.streak > 0
        then '🔥 Seriya ' || p.streak || ' kun — bugun kirmasangiz noldan boshlanadi. Bugungi +' || private.num('coins.daily', 100)::int || ' tanga sizni kutyapti! / Серия ' || p.streak || ' дн. — зайдите сегодня!'
        else '🎁 Bugungi +' || private.num('coins.daily', 100)::int || ' tanga sizni kutyapti! / Сегодняшние +' || private.num('coins.daily', 100)::int || ' монет ждут вас!' end,
      jsonb_build_array(jsonb_build_object('text', '🏙 Shaharni ochish / Открыть город', 'data', 'open'))
    from due join public.profiles p on p.telegram_id = due.telegram_id;
  get diagnostics n = row_count;
  return n;
end $$;

-- ---------- 6. "Yangi qo'shningiz": 60 m atrofidagi egalarga, kuniga ko'pi bilan 3 ta ----------
create function private.notify_neighbours(p_plot text) returns void language plpgsql security definer set search_path = '' as $$
declare pl public.plots; v_nick text;
begin
  select * into pl from public.plots where id = p_plot;
  select instagram into v_nick from public.plot_state where plot_id = p_plot;
  insert into public.notifications (user_id, kind, data)
    select distinct s.owner, 'new_neighbour', jsonb_build_object('nick', v_nick, 'plot', p_plot)
    from public.plot_state s join public.plots q on q.id = s.plot_id
    where s.status = 'owned' and s.plot_id <> p_plot and s.owner <> (select owner from public.plot_state where plot_id = p_plot)
      and (q.x - pl.x) ^ 2 + (q.z - pl.z) ^ 2 <= 3600
      and (select count(*) from public.notifications n where n.user_id = s.owner and n.kind = 'new_neighbour' and n.created_at > now() - interval '1 day') < private.num('neighbour_per_day', 3);
end $$;
create function private.on_new_house() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'owned' and (tg_op = 'INSERT' or old.status is distinct from 'owned' or old.owner is distinct from new.owner) and not new.is_test then perform private.notify_neighbours(new.plot_id); end if;
  return null;
end $$;
create trigger plot_state_neighbours after insert or update of status, owner on public.plot_state for each row execute function private.on_new_house();

-- ---------- 8. Shahar loyihalari: to'lganda — hammaga va kanalga xabar; eng ko'p qo'shgan 3 kishi lavhada ----------
create function private.project_top(p_project int) returns jsonb language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('nick', private.public_nick(p), 'total', t.total) order by t.total desc), '[]')
  from (select user_id, sum(amount) total from public.project_contributions where project_id = p_project group by user_id order by 2 desc limit 3) t join public.profiles p using (user_id)
$$;
create function private.on_project_done() returns trigger language plpgsql security definer set search_path = '' as $$
declare v_text text; v_bid int;
begin
  if new.status = 'done' and old.status is distinct from 'done' then
    v_text := '🎉 Shahar loyihasi tayyor: ' || new.title_uz || ' / ' || new.title_ru || '! Eng ko‘p qo‘shganlar: ' || coalesce((select string_agg(x ->> 'nick', ', ') from jsonb_array_elements(private.project_top(new.id)) x), '—');
    perform private.queue_broadcast(v_text, 'all', null, null);
    insert into public.broadcasts (text, target, total) values (v_text, 'channel', 1) returning id into v_bid;
    insert into public.broadcast_queue (broadcast_id, chat) values (v_bid, 0);
  end if;
  return null;
end $$;
create trigger projects_done after update of status on public.projects for each row execute function private.on_project_done();
create function public.api_projects() returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'kind', kind, 'uz', title_uz, 'ru', title_ru, 'goal', goal, 'raised', raised, 'status', status, 'top', private.project_top(id)) order by id), '[]')
  from public.projects where status <> 'draft'
$$;

-- ---------- 9. Adminga yozish (murojaatlar) ----------
create table public.support_tickets (
  id int generated always as identity primary key, telegram_id bigint not null, user_id uuid references public.profiles on delete set null,
  status text not null default 'new' check (status in ('new','answered','closed')), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.support_messages (
  id bigint generated always as identity primary key, ticket_id int not null references public.support_tickets on delete cascade, is_admin boolean not null default false,
  text text, photo text, admin_msg_id bigint, at timestamptz not null default now()
);
create index support_messages_admin on public.support_messages (admin_msg_id);
alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;
/* Foydalanuvchi xabari: 2 daqiqa ichidagilar bitta murojaatga; kuniga 5 ta murojaat; bloklangan yozolmaydi. */
create function public.svc_support_message(p_telegram bigint, p_text text, p_photo text default null) returns jsonb language plpgsql security definer set search_path = '' as $$
declare t public.support_tickets; p public.profiles; v_msg bigint; is_new boolean := false;
begin
  select * into p from public.profiles where telegram_id = p_telegram;
  if p.is_banned then perform private.fail('banned'); end if;
  select * into t from public.support_tickets where telegram_id = p_telegram and status <> 'closed' and updated_at > now() - interval '2 minutes' order by id desc limit 1 for update;
  if t.id is null then
    if (select count(*) from public.support_tickets where telegram_id = p_telegram and created_at > now() - interval '1 day') >= private.num('support_per_day', 5) then perform private.fail('rate_limited'); end if;
    insert into public.support_tickets (telegram_id, user_id) values (p_telegram, p.user_id) returning * into t;
    is_new := true;
  end if;
  update public.support_tickets set updated_at = now(), status = 'new' where id = t.id;
  insert into public.support_messages (ticket_id, text, photo) values (t.id, left(p_text, 3000), left(p_photo, 300)) returning id into v_msg;
  return jsonb_build_object('ticket', t.id, 'message', v_msg, 'is_new', is_new, 'nick', p.instagram, 'login', p.login,
    'address', (select private.address(s.plot_id) from public.plot_state s where s.owner = p.user_id and s.status = 'owned' order by s.claimed_at limit 1));
end $$;
create function public.svc_support_admin_msg(p_message bigint, p_admin_msg bigint) returns void language sql security definer set search_path = '' as $$
  update public.support_messages set admin_msg_id = p_admin_msg where id = p_message
$$;
/* Admin javobi (Telegram reply yoki panel): kimga yuborish kerakligi qaytadi. */
create function public.svc_support_reply(p_admin_msg bigint, p_ticket int, p_text text, p_photo text default null) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_ticket int := p_ticket; t public.support_tickets;
begin
  if v_ticket is null then select ticket_id into v_ticket from public.support_messages where admin_msg_id = p_admin_msg; end if;
  select * into t from public.support_tickets where id = v_ticket for update;
  if t.id is null then return null; end if;
  insert into public.support_messages (ticket_id, is_admin, text, photo) values (t.id, true, left(p_text, 3000), left(p_photo, 300));
  update public.support_tickets set status = 'answered', updated_at = now() - interval '3 minutes' where id = t.id;
  return jsonb_build_object('chat', t.telegram_id, 'ticket', t.id);
end $$;
create function public.admin_tickets() returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if (private.require('users')).role <> 'admin' then perform private.fail('forbidden'); end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('id', t.id, 'status', t.status, 'telegram', t.telegram_id, 'nick', p.instagram, 'login', p.login, 'created_at', t.created_at, 'updated_at', t.updated_at,
    'messages', (select coalesce(jsonb_agg(jsonb_build_object('admin', m.is_admin, 'text', m.text, 'photo', m.photo is not null, 'at', m.at) order by m.id), '[]') from public.support_messages m where m.ticket_id = t.id))
    order by (t.status = 'new') desc, t.updated_at desc), '[]')
    from (select * from public.support_tickets order by updated_at desc limit 100) t left join public.profiles p on p.user_id = t.user_id);
end $$;
create function public.admin_ticket_close(p_id int) returns void language plpgsql security definer set search_path = '' as $$
begin
  if (private.require('users')).role <> 'admin' then perform private.fail('forbidden'); end if;
  update public.support_tickets set status = 'closed' where id = p_id;
end $$;
create function public.svc_is_admin(p_user uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where user_id = p_user and role = 'admin' and not is_banned)
$$;

-- ---------- Cron: eslatmalar va 7 kun javobsiz nizolar ----------
create or replace function public.svc_tick() returns jsonb language plpgsql security definer set search_path = '' as $$
declare d record;
begin
  perform private.close_yard_week();
  perform private.queue_reminders();
  -- Hozirgi egasi 7 kunda javob bermasa (dalil yubormasa) — nik da'vogarga o'tadi.
  for d in select id from public.nick_disputes where status = 'sent' and owner_proof is null and sent_at < now() - interval '7 days' loop perform private.dispute_grant(d.id, null); end loop;
  return private.svc_tick_base();
end $$;

select private.apply_grants();
