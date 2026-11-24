/* Chat: umumiy va mahalla kanallari. Sekin rejim faqat favqulodda holat uchun (sukut bo'yicha o'chiq). */
set check_function_bodies = off;

insert into public.settings (key, value, is_public) values ('chat_slow_seconds', '0', false);

create function private.can_moderate(p public.profiles) returns boolean language sql immutable set search_path = '' as $$
  select p.role = 'admin' or (p.role = 'moderator' and 'reports' = any (p.perms))
$$;
create function public.svc_player(p_id uuid) returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('login', p.login, 'instagram', p.instagram, 'is_banned', p.is_banned, 'avatar', p.avatar, 'is_moderator', private.can_moderate(p), 'can_write', true,
    'homes', (select coalesce(jsonb_agg(distinct pl.district_id), '[]') from public.plot_state s join public.plots pl on pl.id = s.plot_id where s.owner = p.user_id and s.status = 'owned'))
  from public.profiles p where p.user_id = p_id
$$;
create function public.svc_chat_config() returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('slow', private.num('chat_slow_seconds', 0)::int)
$$;
/* Chatdan bloklash: rol bazada qayta tekshiriladi, xodim bloklanmaydi. */
create function public.svc_chat_ban(p_moderator uuid, p_user uuid) returns void language plpgsql security definer set search_path = '' as $$
declare m public.profiles; t public.profiles;
begin
  select * into m from public.profiles where user_id = p_moderator and not is_banned;
  select * into t from public.profiles where user_id = p_user;
  if m.user_id is null or not private.can_moderate(m) or t.user_id is null or t.role <> 'user' then perform private.fail('forbidden'); end if;
  update public.profiles set is_banned = true where user_id = p_user;
  insert into public.audit_log (actor, action, data) values (p_moderator, 'chat:ban', jsonb_build_object('user', p_user));
end $$;

/* Chat shikoyati: muallifni server aniqlaydi (nik takrorlanishi mumkin), adminga login ko'rinadi. */
create function public.svc_chat_report(p_reporter uuid, p_user uuid, p_text text) returns void language plpgsql security definer set search_path = '' as $$
declare t public.profiles;
begin
  perform private.rate('report:' || p_reporter, 10, 86400);
  select * into t from public.profiles where user_id = p_user;
  if t.user_id is null then perform private.fail('not_found'); end if;
  insert into public.reports (reporter, target_kind, target_id, reason) values (p_reporter, 'chat', t.login, left(p_text, 500));
end $$;

select private.apply_grants();
