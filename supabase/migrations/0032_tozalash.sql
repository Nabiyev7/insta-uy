/* 13-qadam (B): sinov ma'lumotlarini tozalash — keyin admin sinov rejimi ham o'chadi (egasi oddiy foydalanuvchi sifatida uy oladi). */
set check_function_bodies = off;

alter function public.admin_test_cleanup() set schema private;
alter function private.admin_test_cleanup() rename to test_cleanup_base;
revoke all on function private.test_cleanup_base() from anon, authenticated;
create function public.admin_test_cleanup() returns jsonb language plpgsql security definer set search_path = '' as $$
declare r jsonb := private.test_cleanup_base();
begin
  update public.profiles set test_mode = false where test_mode;
  perform private.audit('test_cleanup', r);
  return r || jsonb_build_object('test_mode', false);
end $$;

select private.apply_grants();
