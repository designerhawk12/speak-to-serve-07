-- Complete the R2 transfer domain operation without weakening grievance RLS.
-- Wrong-routing is auditable metadata, not a new administrative-state enum.

alter table public.organizations
  add column is_active boolean not null default true;

alter table public.grievances
  add column wrong_route_detected_at timestamptz,
  add column transfer_due_at timestamptz,
  add column wrong_route_resolved_at timestamptz,
  add constraint grievances_wrong_route_deadline_consistent check (
    (wrong_route_detected_at is null and transfer_due_at is null)
    or (
      wrong_route_detected_at is not null
      and transfer_due_at = wrong_route_detected_at + interval '48 hours'
    )
  ),
  add constraint grievances_wrong_route_resolution_consistent check (
    wrong_route_resolved_at is null or wrong_route_detected_at is not null
  );

create index idx_grievances_pending_wrong_route
  on public.grievances (transfer_due_at)
  where wrong_route_detected_at is not null and wrong_route_resolved_at is null;

create or replace function private.execute_officer_flag_wrong_route(
  p_grievance_id uuid,
  p_reason text
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_case public.grievances%rowtype;
  v_detected_at timestamptz := statement_timestamp();
  v_due_at timestamptz;
begin
  if v_actor_id is null or coalesce(length(trim(p_reason)), 0) = 0 then
    raise exception 'A routing reason is required' using errcode = '22023';
  end if;

  select * into v_case
  from public.grievances
  where id = p_grievance_id
  for update;

  if not found or not private.can_act_on_grievance(p_grievance_id) then
    raise exception 'You are not authorised to flag this case for transfer'
      using errcode = '42501';
  end if;

  if v_case.administrative_state not in (
    'SUBMITTED', 'ROUTING', 'ROUTED', 'ASSIGNED', 'UNDER_EXAMINATION',
    'CLARIFICATION_REQUIRED', 'CITIZEN_RESPONSE_RECEIVED',
    'ACTION_IN_PROGRESS', 'INTERIM_RESPONSE'
  ) then
    raise exception 'This grievance cannot be transferred in its current state'
      using errcode = '55000';
  end if;

  if v_case.wrong_route_detected_at is not null
     and v_case.wrong_route_resolved_at is null then
    return v_case.transfer_due_at;
  end if;

  v_due_at := v_detected_at + interval '48 hours';

  update public.grievances
  set wrong_route_detected_at = v_detected_at,
      transfer_due_at = v_due_at,
      wrong_route_resolved_at = null
  where id = p_grievance_id;

  insert into public.case_events (
    grievance_id, event_type, actor_type, actor_id, organization_id,
    title, description, metadata, citizen_visible
  ) values (
    p_grievance_id,
    'WRONG_ROUTE_FLAGGED',
    'officer',
    v_actor_id,
    v_case.organization_id,
    'Transfer required',
    'The responsible office identified that this grievance needs to be transferred. ' ||
      'The transfer must be completed within 48 hours.',
    jsonb_build_object(
      'reason', trim(p_reason),
      'wrong_route_detected_at', v_detected_at,
      'transfer_due_at', v_due_at
    ),
    true
  );

  if v_case.assigned_officer_id is not null then
    insert into public.notifications (
      user_id, grievance_id, title, body, kind, action_required
    ) values (
      v_case.assigned_officer_id,
      p_grievance_id,
      'Transfer required within 48 hours',
      trim(p_reason),
      'transfer_required',
      true
    );
  end if;

  return v_due_at;
end;
$$;

revoke all on function private.execute_officer_flag_wrong_route(uuid, text)
  from public, anon, authenticated, service_role;
grant execute on function private.execute_officer_flag_wrong_route(uuid, text)
  to authenticated, service_role;

create or replace function public.officer_flag_wrong_route(
  p_grievance_id uuid,
  p_reason text
)
returns timestamptz
language sql
security invoker
set search_path = ''
as $$
  select private.execute_officer_flag_wrong_route(p_grievance_id, p_reason)
$$;

revoke all on function public.officer_flag_wrong_route(uuid, text)
  from public, anon, authenticated, service_role;
grant execute on function public.officer_flag_wrong_route(uuid, text)
  to authenticated, service_role;

create or replace function private.execute_officer_transfer(
  p_grievance_id uuid,
  p_organization_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_actor_role public.app_role;
  v_actor_organization_id uuid;
  v_case public.grievances%rowtype;
  v_source_organization_name text;
  v_destination_organization_name text;
  v_destination_is_appellate boolean;
  v_destination_is_active boolean;
  v_source_root_id uuid;
  v_destination_root_id uuid;
  v_destination_authorized boolean := false;
  v_event_description text;
  v_transfer_at timestamptz := statement_timestamp();
  v_new_assigned_officer_id uuid;
begin
  if v_actor_id is null
     or coalesce(length(trim(p_reason)), 0) = 0
     or p_organization_id is null then
    raise exception 'Destination and reason are required' using errcode = '22023';
  end if;

  select * into v_case
  from public.grievances
  where id = p_grievance_id
  for update;

  if not found or not private.can_act_on_grievance(p_grievance_id) then
    raise exception 'You are not authorised to transfer this case' using errcode = '42501';
  end if;

  if v_case.administrative_state not in (
    'SUBMITTED', 'ROUTING', 'ROUTED', 'ASSIGNED', 'UNDER_EXAMINATION',
    'CLARIFICATION_REQUIRED', 'CITIZEN_RESPONSE_RECEIVED',
    'ACTION_IN_PROGRESS', 'INTERIM_RESPONSE'
  ) then
    raise exception 'This grievance cannot be transferred in its current state'
      using errcode = '55000';
  end if;

  if p_organization_id = v_case.organization_id then
    raise exception 'Choose a different destination organization' using errcode = '22023';
  end if;

  select o.name, o.is_appellate_office, o.is_active
  into v_destination_organization_name, v_destination_is_appellate, v_destination_is_active
  from public.organizations o
  where o.id = p_organization_id
  for key share;

  if not found or not v_destination_is_active then
    raise exception 'The destination organization is unavailable' using errcode = '22023';
  end if;

  select p.role, p.organization_id
  into v_actor_role, v_actor_organization_id
  from public.profiles p
  where p.id = v_actor_id;

  select o.name
  into v_source_organization_name
  from public.organizations o
  where o.id = v_case.organization_id;

  if v_actor_role = 'nodal' and v_actor_organization_id is not null then
    v_destination_authorized := p_organization_id in (
      select private.org_subtree(v_actor_organization_id)
    );
  elsif v_actor_role = 'gro' and v_case.organization_id is not null then
    with recursive source_ancestors as (
      select o.id, o.parent_id
      from public.organizations o
      where o.id = v_case.organization_id
      union all
      select parent.id, parent.parent_id
      from public.organizations parent
      join source_ancestors child on parent.id = child.parent_id
    )
    select id into v_source_root_id
    from source_ancestors
    where parent_id is null
    limit 1;

    with recursive destination_ancestors as (
      select o.id, o.parent_id
      from public.organizations o
      where o.id = p_organization_id
      union all
      select parent.id, parent.parent_id
      from public.organizations parent
      join destination_ancestors child on parent.id = child.parent_id
    )
    select id into v_destination_root_id
    from destination_ancestors
    where parent_id is null
    limit 1;

    v_destination_authorized := v_source_root_id is not null
      and v_source_root_id = v_destination_root_id;
  end if;

  if v_destination_is_appellate or not v_destination_authorized then
    raise exception 'You are not authorised to transfer this case to that organization'
      using errcode = '42501';
  end if;

  v_event_description := format(
    'Responsibility moved from %s to %s. Reason: %s',
    coalesce(v_source_organization_name, 'the previous organization'),
    v_destination_organization_name,
    trim(p_reason)
  );

  insert into public.case_events (
    grievance_id, event_type, actor_type, actor_id, organization_id,
    title, description, metadata, citizen_visible
  ) values (
    p_grievance_id,
    'CASE_TRANSFERRED',
    'officer',
    v_actor_id,
    v_case.organization_id,
    'Case transferred to ' || v_destination_organization_name,
    v_event_description,
    jsonb_build_object(
      'from_organization_id', v_case.organization_id,
      'from_organization_name', v_source_organization_name,
      'from_officer_id', v_case.assigned_officer_id,
      'to_organization_id', p_organization_id,
      'to_organization_name', v_destination_organization_name,
      'reason', trim(p_reason),
      'transferred_at', v_transfer_at,
      'wrong_route_detected_at', v_case.wrong_route_detected_at,
      'transfer_due_at', v_case.transfer_due_at,
      'wrong_route_requirement_satisfied',
        v_case.wrong_route_detected_at is not null and v_case.wrong_route_resolved_at is null
    ),
    true
  );

  update public.grievances
  set organization_id = p_organization_id,
      administrative_state = 'ROUTED',
      assigned_officer_id = null,
      wrong_route_resolved_at = case
        when wrong_route_detected_at is not null and wrong_route_resolved_at is null
          then v_transfer_at
        else wrong_route_resolved_at
      end
  where id = p_grievance_id
  returning assigned_officer_id into v_new_assigned_officer_id;

  insert into public.grievance_priorities (
    grievance_id, last_meaningful_government_action_at
  ) values (
    p_grievance_id, v_transfer_at
  )
  on conflict (grievance_id) do update
    set last_meaningful_government_action_at = excluded.last_meaningful_government_action_at;

  insert into public.notifications (
    user_id, grievance_id, title, body, kind, action_required
  ) values (
    v_case.citizen_id,
    p_grievance_id,
    'Your grievance was transferred',
    v_event_description,
    'transfer',
    false
  );

  if v_new_assigned_officer_id is not null then
    insert into public.notifications (
      user_id, grievance_id, title, body, kind, action_required
    ) values (
      v_new_assigned_officer_id,
      p_grievance_id,
      'Transferred grievance assigned to you',
      'A transferred grievance is now assigned to you for action.',
      'assignment',
      true
    );
  end if;
end;
$$;

revoke all on function private.execute_officer_transfer(uuid, uuid, text)
  from public, anon, authenticated, service_role;
grant execute on function private.execute_officer_transfer(uuid, uuid, text)
  to authenticated, service_role;
