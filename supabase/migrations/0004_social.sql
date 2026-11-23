-- Ko'cha nomlari, tanga iqtisodi, loyihalar, saylov, gazeta, xazina.
set check_function_bodies = off;
create table public.street_votes (
  id uuid primary key default gen_random_uuid(), street_id int not null references public.streets, status text not null default 'open' check (status in ('open','closed')),
  opened_at timestamptz not null default now(), closes_at timestamptz not null
);
create unique index street_votes_open on public.street_votes (street_id) where status = 'open';
create table public.street_proposals (
  id bigint generated always as identity primary key, vote_id uuid not null references public.street_votes on delete cascade, user_id uuid not null references public.profiles on delete cascade,
  name text not null check (char_length(name) <= 25), unique (vote_id, user_id)
);
create unique index street_proposals_name on public.street_proposals (vote_id, lower(name));
create table public.street_ballots (
  vote_id uuid not null references public.street_votes on delete cascade, user_id uuid not null references public.profiles on delete cascade,
  proposal_id bigint not null references public.street_proposals on delete cascade, primary key (vote_id, user_id)
);
create table public.projects (
  id int generated always as identity primary key, kind text not null check (kind in ('bog','stadion','koprik')), title_uz text not null, title_ru text not null,
  goal int not null check (goal > 0), raised int not null default 0, status text not null default 'open' check (status in ('draft','open','done')), done_at timestamptz
);
create table public.project_contributions (
  id bigint generated always as identity primary key, project_id int not null references public.projects, user_id uuid not null references public.profiles on delete cascade,
  amount int not null check (amount > 0), at timestamptz not null default now()
);
create table public.quest_claims (user_id uuid not null references public.profiles on delete cascade, quest text not null, day date not null default '1970-01-01', primary key (user_id, quest, day));
create table public.elections (
  id int generated always as identity primary key, kind text not null check (kind in ('hokim','rais')), district_id int references public.districts,
  ends_at timestamptz not null, status text not null default 'open' check (status in ('open','closed')), winner uuid references public.profiles on delete set null
);
create unique index elections_open on public.elections (kind, coalesce(district_id, 0)) where status = 'open';
create table public.candidates (election_id int not null references public.elections on delete cascade, user_id uuid not null references public.profiles on delete cascade, slogan text not null, primary key (election_id, user_id));
create table public.ballots (
  election_id int not null references public.elections on delete cascade, voter uuid not null references public.profiles on delete cascade, candidate uuid not null, primary key (election_id, voter),
  foreign key (election_id, candidate) references public.candidates (election_id, user_id) on delete cascade
);
create table public.gazette (week date primary key, content jsonb not null, created_at timestamptz not null default now());
create table public.treasures (day date primary key, x numeric not null, z numeric not null, district_id int not null, slots int not null);
create table public.treasure_claims (day date not null references public.treasures, user_id uuid not null references public.profiles on delete cascade, primary key (day, user_id));

-- ---------- Ko'cha nomi (PLAN §5) ----------
create function private.lives_on(uid uuid, p_street int) returns boolean language sql stable set search_path = '' as $$
  select exists (select 1 from public.plot_state s join public.plots p on p.id = s.plot_id where s.owner = uid and s.status = 'owned' and p.street_id = p_street)
$$;
create function private.street_owners(p_street int) returns int language sql stable set search_path = '' as $$
  select count(distinct s.owner)::int from public.plot_state s join public.plots p on p.id = s.plot_id where s.status = 'owned' and p.street_id = p_street
$$;
create function public.api_street(p_street int) returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', s.id, 'name', s.name, 'central', s.is_central, 'owners', private.street_owners(s.id), 'pending', s.pending_name is not null, 'named_at', s.named_at,
    'price', private.num('prices.streetName', 200000), 'lives', private.lives_on(auth.uid(), s.id),
    'vote', (select jsonb_build_object('id', v.id, 'closes', v.closes_at, 'mine', (select proposal_id from public.street_ballots b where b.vote_id = v.id and b.user_id = auth.uid()),
       'proposals', (select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name, 'votes', (select count(*) from public.street_ballots b where b.proposal_id = p.id)) order by p.id), '[]') from public.street_proposals p where p.vote_id = v.id))
       from public.street_votes v where v.street_id = s.id and v.status = 'open'))
  from public.streets s where s.id = p_street
$$;
create function public.my_street_temp(p_street int, p_name text) returns void language plpgsql security definer set search_path = '' as $$
declare me public.profiles := private.writable(); s public.streets;
begin
  select * into s from public.streets where id = p_street for update;
  if s.id is null or s.is_central then perform private.fail('paid_only'); end if;
  if s.name is not null or s.pending_name is not null then perform private.fail('name_taken'); end if;
  if me.user_id is distinct from (select st.owner from public.plot_state st join public.plots p on p.id = st.plot_id where p.street_id = p_street and st.status = 'owned' order by st.claimed_at, st.plot_id limit 1)
    then perform private.fail('not_first_owner'); end if;
  update public.streets set pending_name = private.clean_street(p_name), pending_kind = 'temp', pending_by = me.user_id where id = p_street;
end $$;
create function private.street_voter(p_street int) returns public.profiles language plpgsql stable security definer set search_path = '' as $$
declare me public.profiles := private.writable();
begin
  if not private.lives_on(me.user_id, p_street) then perform private.fail('not_resident'); end if;
  return me;
end $$;
create function public.my_street_open_vote(p_street int) returns uuid language plpgsql security definer set search_path = '' as $$
declare s public.streets; v uuid;
begin
  perform private.street_voter(p_street);
  select * into s from public.streets where id = p_street for update;
  if s.is_central or s.name_status = 'paid' then perform private.fail('paid_only'); end if;
  if private.street_owners(p_street) < private.num('street_vote_min', 5) then perform private.fail('not_enough_owners'); end if;
  if s.pending_name is not null or exists (select 1 from public.street_votes where street_id = p_street and (status = 'open' or opened_at > now() - interval '1 year')) then perform private.fail('vote_once_a_year'); end if;
  insert into public.street_votes (street_id, closes_at) values (p_street, now() + interval '3 days') returning id into v;
  return v;
end $$;
create function public.my_street_propose(p_vote uuid, p_name text) returns void language plpgsql security definer set search_path = '' as $$
declare v public.street_votes; me public.profiles;
begin
  select * into v from public.street_votes where id = p_vote and status = 'open' and closes_at > now();
  if v.id is null then perform private.fail('not_found'); end if;
  me := private.street_voter(v.street_id);
  begin
    insert into public.street_proposals (vote_id, user_id, name) values (p_vote, me.user_id, private.clean_street(p_name));
  exception when unique_violation then perform private.fail('already_proposed');
  end;
end $$;
create function public.my_street_vote(p_proposal bigint) returns void language plpgsql security definer set search_path = '' as $$
declare v public.street_votes; me public.profiles;
begin
  select sv.* into v from public.street_votes sv join public.street_proposals p on p.vote_id = sv.id where p.id = p_proposal and sv.status = 'open' and sv.closes_at > now();
  if v.id is null then perform private.fail('not_found'); end if;
  me := private.street_voter(v.street_id);
  insert into public.street_ballots (vote_id, user_id, proposal_id) values (v.id, me.user_id, p_proposal) on conflict (vote_id, user_id) do update set proposal_id = excluded.proposal_id;
end $$;

-- ---------- Tangalar (PLAN §9) ----------
create function private.coins_on() returns public.profiles language plpgsql stable security definer set search_path = '' as $$
declare me public.profiles := private.writable();
begin
  if not private.flag('coins_enabled') then perform private.fail('coins_off'); end if;
  return me;
end $$;
create function public.my_daily() returns jsonb language plpgsql security definer set search_path = '' as $$
declare me public.profiles := private.coins_on(); v_streak int; gain int;
begin
  select * into me from public.profiles where user_id = me.user_id for update;
  if me.last_daily = current_date then perform private.fail('already_claimed'); end if;
  v_streak := case when me.last_daily = current_date - 1 then least(me.streak + 1, 7) else 1 end;
  gain := (private.num('coins.daily', 10) + (v_streak - 1) * private.num('coins.streakStep', 5))::int;
  update public.profiles set last_daily = current_date, streak = v_streak where user_id = me.user_id;
  return jsonb_build_object('gain', gain, 'streak', v_streak, 'coins', private.coins(me.user_id, gain, 'daily'));
end $$;

/* Faqat serverda tekshirib bo'ladigan topshiriqlar. */
create function private.quest_ok(uid uuid, q text) returns boolean language sql stable set search_path = '' as $$
  select case q
    when 'telegram' then exists (select 1 from public.profiles where user_id = uid and telegram_id is not null)
    when 'house' then exists (select 1 from public.plot_state where owner = uid and status = 'owned')
    when 'bio' then exists (select 1 from public.plot_state where owner = uid and status = 'owned' and bio <> '')
    when 'decor' then exists (select 1 from public.plot_state where owner = uid and cardinality(decor) >= 3)
    when 'invite3' then (select count(*) from public.profiles where referred_by = uid and free_used) >= 3
    when 'walk' then (select count(distinct district_id) from public.daily_active where user_id = uid and day = current_date and district_id > 0) >= 3
    when 'contribute' then exists (select 1 from public.project_contributions where user_id = uid and at >= current_date)
    else false end
$$;
create function public.my_quests() returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_agg(jsonb_build_object('id', q, 'daily', daily, 'reward', private.num('coins.quest.' || q, dflt), 'ready', private.quest_ok(auth.uid(), q),
    'done', exists (select 1 from public.quest_claims c where c.user_id = auth.uid() and c.quest = q and c.day = case when daily then current_date else date '1970-01-01' end)))
  from (values ('telegram', false, 50), ('house', false, 30), ('bio', false, 10), ('decor', false, 40), ('invite3', false, 150), ('walk', true, 15), ('contribute', true, 10)) v(q, daily, dflt)
$$;
create function public.my_quest_claim(p_quest text) returns int language plpgsql security definer set search_path = '' as $$
declare me public.profiles := private.coins_on(); v_daily boolean := p_quest in ('walk','contribute'); dflt int;
begin
  dflt := case p_quest when 'telegram' then 50 when 'house' then 30 when 'bio' then 10 when 'decor' then 40 when 'invite3' then 150 when 'walk' then 15 when 'contribute' then 10 end;
  if dflt is null then perform private.fail('not_found'); end if;
  if not private.quest_ok(me.user_id, p_quest) then perform private.fail('quest_not_ready'); end if;
  insert into public.quest_claims (user_id, quest, day) values (me.user_id, p_quest, case when v_daily then current_date else date '1970-01-01' end) on conflict do nothing;
  if not found then perform private.fail('already_claimed'); end if;
  return private.coins(me.user_id, private.num('coins.quest.' || p_quest, dflt)::int, 'quest:' || p_quest);
end $$;
create function public.my_ping(p_district int) returns void language plpgsql security definer set search_path = '' as $$
declare me public.profiles := private.me();
begin
  perform private.rate('ping:' || me.user_id, 20, 60);
  insert into public.daily_active (day, user_id, district_id) select current_date, me.user_id, d from unnest(array[0, case when p_district between 1 and 12 then p_district else 0 end]) d on conflict do nothing;
end $$;
create function public.my_contribute(p_project int, p_amount int) returns jsonb language plpgsql security definer set search_path = '' as $$
declare me public.profiles := private.coins_on(); pr public.projects; v_amount int; bal int;
begin
  if p_amount is null or p_amount not between 1 and 100000 then perform private.fail('bad_format'); end if;
  select * into pr from public.projects where id = p_project and status = 'open' for update;
  if pr.id is null then perform private.fail('not_found'); end if;
  v_amount := least(p_amount, pr.goal - pr.raised);
  bal := private.coins(me.user_id, -v_amount, 'project:' || p_project);
  insert into public.project_contributions (project_id, user_id, amount) values (p_project, me.user_id, v_amount);
  update public.projects set raised = raised + v_amount, status = case when raised + v_amount >= goal then 'done' else status end,
    done_at = case when raised + v_amount >= goal then now() end where id = p_project;
  return jsonb_build_object('coins', bal, 'raised', pr.raised + v_amount);
end $$;

-- ---------- Xazina ovi ----------
create function private.treasure_today() returns public.treasures language plpgsql security definer set search_path = '' as $$
declare t public.treasures;
begin
  select * into t from public.treasures where day = current_date;
  if t.day is null then
    insert into public.treasures (day, x, z, district_id, slots)
      select current_date, r.x + (random() - 0.5) * greatest(r.w - 8, 0), r.z + (random() - 0.5) * greatest(r.d - 8, 0), 0, private.num('coins.treasureSlots', 10)::int
      from public.roads r where abs(r.x) < 480 and abs(r.z) < 480 order by random() limit 1 on conflict do nothing;
    update public.treasures set district_id = coalesce((select p.district_id from public.plots p order by (p.x - treasures.x) ^ 2 + (p.z - treasures.z) ^ 2 limit 1), 1) where day = current_date and district_id = 0;
    select * into t from public.treasures where day = current_date;
  end if;
  return t;
end $$;
create function public.my_treasure(p_x numeric, p_z numeric) returns jsonb language plpgsql security definer set search_path = '' as $$
declare me public.profiles := private.coins_on(); t public.treasures; dist numeric; bal int;
begin
  perform private.rate('treasure:' || me.user_id, 8, 60);
  perform private.rate('treasure:' || me.user_id, 200, 86400);
  t := private.treasure_today();
  select * into t from public.treasures where day = t.day for update;
  if exists (select 1 from public.treasure_claims where day = t.day and user_id = me.user_id) then return jsonb_build_object('state', 'done'); end if;
  if (select count(*) from public.treasure_claims where day = t.day) >= t.slots then return jsonb_build_object('state', 'empty'); end if;
  dist := sqrt((t.x - p_x) ^ 2 + (t.z - p_z) ^ 2);
  if dist > 6 then return jsonb_build_object('state', 'hunt', 'district', t.district_id, 'heat', case when dist < 25 then 'hot' when dist < 80 then 'warm' else 'cold' end); end if;
  insert into public.treasure_claims (day, user_id) values (t.day, me.user_id);
  bal := private.coins(me.user_id, private.num('coins.treasure', 100)::int, 'treasure');
  return jsonb_build_object('state', 'found', 'coins', bal);
end $$;

-- ---------- Saylov ----------
create function private.may_vote(uid uuid, e public.elections) returns boolean language sql stable set search_path = '' as $$
  select exists (select 1 from public.plot_state s join public.plots p on p.id = s.plot_id where s.owner = uid and s.status = 'owned' and (e.district_id is null or p.district_id = e.district_id))
$$;
create function public.api_elections() returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', e.id, 'kind', e.kind, 'district', e.district_id, 'ends', e.ends_at, 'mine', (select candidate from public.ballots b where b.election_id = e.id and b.voter = auth.uid()),
    'candidates', (select coalesce(jsonb_agg(jsonb_build_object('id', c.user_id, 'nick', coalesce(p.instagram, p.login), 'slogan', c.slogan, 'votes', (select count(*) from public.ballots b where b.election_id = e.id and b.candidate = c.user_id)) order by c.user_id), '[]')
      from public.candidates c join public.profiles p on p.user_id = c.user_id where c.election_id = e.id)) order by e.kind, e.district_id), '[]')
  from public.elections e where e.status = 'open'
$$;
create function private.open_election(p_id int) returns public.elections language plpgsql stable security definer set search_path = '' as $$
declare me public.profiles := private.writable(); e public.elections;
begin
  select * into e from public.elections where id = p_id and status = 'open' and ends_at > now();
  if e.id is null then perform private.fail('not_found'); end if;
  if not private.may_vote(me.user_id, e) then perform private.fail('not_resident'); end if;
  return e;
end $$;
create function public.my_run(p_election int, p_slogan text) returns void language plpgsql security definer set search_path = '' as $$
declare e public.elections := private.open_election(p_election);
begin
  insert into public.candidates (election_id, user_id, slogan) values (e.id, auth.uid(), private.clean_text(p_slogan, 60, false)) on conflict (election_id, user_id) do update set slogan = excluded.slogan;
end $$;
create function public.my_vote(p_election int, p_candidate uuid) returns void language plpgsql security definer set search_path = '' as $$
declare e public.elections := private.open_election(p_election);
begin
  if not exists (select 1 from public.candidates where election_id = e.id and user_id = p_candidate) then perform private.fail('not_found'); end if;
  insert into public.ballots (election_id, voter, candidate) values (e.id, auth.uid(), p_candidate) on conflict (election_id, voter) do update set candidate = excluded.candidate;
end $$;

create function public.api_gazette() returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('week', week, 'content', content) order by week desc), '[]') from (select * from public.gazette order by week desc limit 8) g
$$;

-- ---------- Rejali ishlar (cron) ----------
create function private.build_gazette(p_week date) returns void language sql security definer set search_path = '' as $$
  insert into public.gazette (week, content) select p_week, jsonb_build_object(
    'new_count', (select count(*) from public.plot_state where status = 'owned' and claimed_at >= p_week - 7 and claimed_at < p_week),
    'new', (select coalesce(jsonb_agg(instagram), '[]') from (select instagram from public.plot_state where status = 'owned' and claimed_at >= p_week - 7 and claimed_at < p_week order by claimed_at desc limit 12) n),
    'top', public.api_rankings() -> 'houses' -> 0,
    'streets', (select coalesce(jsonb_agg(name), '[]') from public.streets where named_at >= p_week - 7 and named_at < p_week),
    'projects', (select coalesce(jsonb_agg(jsonb_build_object('uz', title_uz, 'ru', title_ru, 'pct', raised * 100 / goal)), '[]') from public.projects where status <> 'draft'),
    'total', (select count(*) from public.plot_state where status = 'owned')) on conflict (week) do nothing
$$;
create function private.close_street_vote(v public.street_votes) returns void language plpgsql security definer set search_path = '' as $$
declare win record;
begin
  update public.street_votes set status = 'closed' where id = v.id;
  select p.name, p.user_id, count(b.user_id) n into win from public.street_proposals p left join public.street_ballots b on b.proposal_id = p.id where p.vote_id = v.id group by p.id order by n desc, p.id limit 1;
  if win.name is not null and not exists (select 1 from public.streets where lower(name) = lower(win.name)) then
    update public.streets set pending_name = win.name, pending_kind = 'voted', pending_by = win.user_id where id = v.street_id and pending_name is null;
  end if;
end $$;
create function private.close_election(e public.elections) returns void language plpgsql security definer set search_path = '' as $$
declare w uuid; old uuid;
begin
  select candidate into w from public.ballots where election_id = e.id group by candidate order by count(*) desc, candidate limit 1;
  select winner into old from public.elections where kind = e.kind and district_id is not distinct from e.district_id and status = 'closed' order by ends_at desc limit 1;
  update public.elections set status = 'closed', winner = w where id = e.id;
  if w is null then return; end if;
  update public.profiles set badges = array_remove(badges, e.kind) where user_id = old and user_id <> w;
  perform private.give_badge(w, e.kind);
  perform private.notify(w, 'elected', jsonb_build_object('kind', e.kind, 'district', e.district_id));
end $$;
create function private.release_plot(p_plot text, why text) returns void language plpgsql security definer set search_path = '' as $$
declare st public.plot_state;
begin
  delete from public.plot_state where plot_id = p_plot returning * into st;
  if st.plot_id is null then return; end if;
  update public.transfers set status = 'cancelled' where plot_id = p_plot and status = 'pending';
  if st.is_free then update public.profiles set free_used = false where user_id = st.owner; end if;
  insert into public.ownership_log (plot_id, from_user, reason) values (p_plot, st.owner, why);
  perform private.notify(st.owner, 'released', jsonb_build_object('plot', p_plot, 'reason', why));
end $$;

create function public.svc_tick() returns jsonb language plpgsql security definer set search_path = '' as $$
declare v public.street_votes; e public.elections; r record; released int := 0; wk date := date_trunc('week', now())::date; me_end timestamptz := date_trunc('month', now()) + interval '1 month';
begin
  update public.orders set status = 'expired' where status = 'pending' and expires_at < now();
  delete from public.plot_state where status = 'reserved' and reserved_until < now();
  for v in select * from public.street_votes where status = 'open' and closes_at < now() loop perform private.close_street_vote(v); end loop;
  for e in select * from public.elections where status = 'open' and ends_at < now() loop perform private.close_election(e); end loop;
  if private.flag('elections_enabled') then
    insert into public.elections (kind, ends_at) values ('hokim', me_end) on conflict do nothing;
    insert into public.elections (kind, district_id, ends_at) select 'rais', id, me_end from public.districts where is_open on conflict do nothing;
  end if;
  -- Faqat bepul va hech narsa sotib olinmagan uylar bo'shatiladi; 14 kun oldin ogohlantiriladi.
  if private.flag('release_inactive') then
    for r in select s.plot_id, s.owner from public.plot_state s join public.profiles p on p.user_id = s.owner where s.is_free and s.tier = 1 and s.label = 'plain' and not s.has_expansion
        and p.last_seen < now() - make_interval(days => private.num('inactive_days', 180)::int)
        and exists (select 1 from public.notifications n where n.user_id = s.owner and n.kind = 'inactive_warning' and n.created_at < now() - interval '14 days' and n.created_at > p.last_seen) loop
      perform private.release_plot(r.plot_id, 'inactive');
      released := released + 1;
    end loop;
    insert into public.notifications (user_id, kind, data) select s.owner, 'inactive_warning', jsonb_build_object('plot', s.plot_id) from public.plot_state s join public.profiles p on p.user_id = s.owner
      where s.is_free and s.tier = 1 and s.label = 'plain' and not s.has_expansion and p.last_seen < now() - make_interval(days => (private.num('inactive_days', 180) - 14)::int)
        and not exists (select 1 from public.notifications n where n.user_id = s.owner and n.kind = 'inactive_warning' and n.created_at > p.last_seen);
  end if;
  perform private.build_gazette(wk);
  delete from public.rate_limits where bucket < floor(extract(epoch from now()) / 60) - 2880 and key like '%/60';
  delete from public.rate_limits where key not like '%/60' and bucket < floor(extract(epoch from now()) / 86400) - 2 and key like '%/86400';
  delete from public.rate_limits where key like '%/3600' and bucket < floor(extract(epoch from now()) / 3600) - 48;
  return jsonb_build_object('released', released);
end $$;
