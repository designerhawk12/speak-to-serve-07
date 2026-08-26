-- A stable client-generated key makes retried citizen submissions idempotent.
-- Existing grievances predate this workflow and may retain a null key.
alter table public.grievances
  add column if not exists submission_key uuid;

alter table public.grievances
  add constraint grievances_citizen_submission_key_key unique (citizen_id, submission_key);

-- A database trigger guarantees exactly one immutable submission event for each
-- persisted grievance, including browser retries that encounter the unique key.
create or replace function private.append_grievance_submitted_event()
returns trigger
language plpgsql
set search_path = public, private
as $$
begin
  insert into public.case_events (
    grievance_id,
    event_type,
    actor_type,
    actor_id,
    title,
    description,
    metadata,
    citizen_visible
  ) values (
    new.id,
    'GRIEVANCE_SUBMITTED',
    'citizen',
    new.citizen_id,
    'Grievance submitted',
    'Your grievance was submitted in the words you provided.',
    jsonb_build_object('submission_key', new.submission_key),
    true
  );
  return new;
end;
$$;

drop trigger if exists trg_grievances_submitted_event on public.grievances;
create trigger trg_grievances_submitted_event
  after insert on public.grievances
  for each row execute function private.append_grievance_submitted_event();
