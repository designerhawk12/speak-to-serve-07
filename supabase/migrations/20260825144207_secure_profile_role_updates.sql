-- Profiles are the authorization source for the application. An authenticated
-- user may update only non-authorizing self-service fields; role and
-- organization assignment remain a privileged provisioning operation.
revoke update on table public.profiles from authenticated;
grant update (full_name, phone, preferred_language) on table public.profiles to authenticated;

drop policy if exists "users update own profile" on public.profiles;
create policy "users update own safe profile fields" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);
