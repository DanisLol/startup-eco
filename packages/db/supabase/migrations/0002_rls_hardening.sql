-- Applied to the hosted project as `rls_hardening`.
-- Keep in sync with the grants at the end of 0001_core.sql.

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.owns_child(uuid) from public, anon;
revoke all on function public.owns_topic(uuid) from public, anon;

grant execute on function public.owns_child(uuid) to authenticated;
grant execute on function public.owns_topic(uuid) to authenticated;
