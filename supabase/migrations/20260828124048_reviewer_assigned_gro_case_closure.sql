create or replace function public.officer_close_grievance(p_grievance_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_grievance public.grievances%rowtype;
  v_resolution_id uuid;
begin
  if v_user_id is null
     or private.current_role_of(v_user_id) is distinct from 'gro'::public.app_role then
    raise exception 'Only the assigned GRO may close this case' using errcode = '42501';
  end if;

  select g.*
  into v_grievance
  from public.grievances g
  where g.id = p_grievance_id
  for update;

  if not found or v_grievance.assigned_officer_id is distinct from v_user_id then
    raise exception 'Only the assigned GRO may close this case' using errcode = '42501';
  end if;

  if v_grievance.citizen_confirmation_state <> 'CONFIRMED_RESOLVED' then
    raise exception 'The citizen must confirm the issue is resolved before the case can be closed'
      using errcode = '22023';
  end if;

  -- A repeated request after a successful closure is a safe no-op. The row
  -- lock serializes concurrent clicks, so only the first request can append
  -- the immutable closure event.
  if v_grievance.administrative_state = 'CLOSED' then
    if exists (
      select 1
      from public.case_events ce
      where ce.grievance_id = p_grievance_id
        and ce.event_type = 'CASE_CLOSED'
    ) then
      return;
    end if;

    raise exception 'This case is closed without a recorded closure event'
      using errcode = '22023';
  end if;

  if v_grievance.administrative_state not in ('RESOLUTION_PROVIDED', 'DISPOSED') then
    raise exception 'This case is not in a state that can be closed' using errcode = '22023';
  end if;

  select r.id
  into v_resolution_id
  from public.resolutions r
  where r.grievance_id = p_grievance_id
    and not r.is_interim
  order by r.created_at desc, r.id desc
  limit 1;

  if v_resolution_id is null then
    raise exception 'A final government resolution is required before the case can be closed'
      using errcode = '22023';
  end if;

  update public.grievances
  set administrative_state = 'CLOSED',
      closed_at = statement_timestamp()
  where id = p_grievance_id;

  insert into public.case_events (
    grievance_id,
    event_type,
    actor_type,
    actor_id,
    organization_id,
    title,
    description,
    metadata,
    citizen_visible
  ) values (
    p_grievance_id,
    'CASE_CLOSED',
    'officer',
    v_user_id,
    v_grievance.organization_id,
    'Case closed after citizen confirmation',
    'The assigned GRO closed the case after the citizen confirmed the issue was resolved.',
    jsonb_build_object('resolution_id', v_resolution_id),
    true
  );
end;
$$;

revoke all on function public.officer_close_grievance(uuid) from public, anon;
grant execute on function public.officer_close_grievance(uuid) to authenticated;
