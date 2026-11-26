/* 13-qadam (tekshiruvdan): sog'liq ogohlantirishi soatiga 1 ta — workers.dev'da Cache API ishlamaydi, shuning uchun bazada. */
set check_function_bodies = off;

create table public.health_alerts (name text primary key, at timestamptz not null default now());
alter table public.health_alerts enable row level security;
/* true — yuborish mumkin (oxirgisidan 1 soat o'tgan), vaqt yoziladi. */
create function public.svc_health_alert(p_name text) returns boolean language plpgsql security definer set search_path = '' as $$
begin
  insert into public.health_alerts as h (name, at) values (left(p_name, 60), now())
    on conflict (name) do update set at = now() where h.at < now() - interval '1 hour';
  return found;
end $$;

select private.apply_grants();
