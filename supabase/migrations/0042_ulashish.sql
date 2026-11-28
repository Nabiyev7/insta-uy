/* 19-qadam (2–3): rasmni saqlash va ulashish. Telegram Mini App'da `downloadFile` va `shareToStory` internetdagi (https) rasmni so'raydi —
   rasm vaqtincha ochiq "shots" omboriga yuklanadi (har kim faqat o'z papkasiga, 5 MB gacha, faqat rasm). Eski Telegram'da bot rasmni chatga yuboradi. */
set check_function_bodies = off;

do $$
begin
  if exists (select 1 from pg_catalog.pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('shots', 'shots', true, 5242880, array['image/jpeg','image/png']) on conflict do nothing;
    execute $p$ create policy "shots: o'z papkasiga yuklash" on storage.objects for insert to authenticated with check (bucket_id = 'shots' and (storage.foldername(name))[1] = auth.uid()::text) $p$;
  end if;
end $$;

/* Bot rasmni yuborishi uchun: Telegram ID, taklif kodi va til (faqat server). */
create function public.svc_photo_ctx(p_user uuid) returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('telegram', telegram_id, 'ref', ref_code, 'lang', lang) from public.profiles where user_id = p_user and not is_banned
$$;

select private.apply_grants();
