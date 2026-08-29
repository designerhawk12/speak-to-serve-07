-- Every new grievance must receive an appellate_organization_id.
-- The demo/production appellate organization is d3000000-0000-4000-8000-000000000005.
-- A BEFORE INSERT trigger guarantees the value regardless of the creation path,
-- even when a caller explicitly passes NULL.
--
-- This migration does NOT modify existing grievances.
-- It does NOT change RLS, foreign keys, or unrelated columns.

-- Verify the target organization exists before creating the trigger.
-- If this DO block fails, the migration aborts and no trigger is created.
do $$
begin
  if not exists (
    select 1 from public.organizations
    where id = 'd3000000-0000-4000-8000-000000000005'
  ) then
    raise exception
      'Appellate organization d3000000-0000-4000-8000-000000000005 does not exist in the organizations table. '
      'Ensure the demo data seed (or equivalent production seed) has been run before applying this migration.'
      using errcode = '22023';
  end if;
end;
$$;

-- Trigger function: fill missing/null appellate_organization_id on every new grievance.
create or replace function private.assign_default_appellate_organization()
returns trigger
language plpgsql
set search_path = public, private
as $$
begin
  if new.appellate_organization_id is null then
    new.appellate_organization_id := 'd3000000-0000-4000-8000-000000000005';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_grievances_default_appellate_org on public.grievances;
create trigger trg_grievances_default_appellate_org
  before insert on public.grievances
  for each row execute function private.assign_default_appellate_organization();
