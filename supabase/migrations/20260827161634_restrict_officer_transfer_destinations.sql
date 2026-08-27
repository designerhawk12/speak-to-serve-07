-- R2 security correction: the privileged transfer implementation lives in the
-- unexposed private schema and authorizes both the locked source case and the
-- destination organization before changing ownership.
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
  v_source_root_id uuid;
  v_destination_root_id uuid;
  v_destination_authorized boolean := false;
  v_event_description text;
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

  select p.role, p.organization_id
  into v_actor_role, v_actor_organization_id
  from public.profiles p
  where p.id = v_actor_id;

  select o.name, o.is_appellate_office
  into v_destination_organization_name, v_destination_is_appellate
  from public.organizations o
  where o.id = p_organization_id;

  if not found then
    raise exception 'The destination organization is unavailable' using errcode = '22023';
  end if;

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
      'to_organization_id', p_organization_id,
      'to_organization_name', v_destination_organization_name
    ),
    true
  );

  update public.grievances
  set organization_id = p_organization_id,
      administrative_state = 'ROUTED',
      assigned_officer_id = null
  where id = p_grievance_id;

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
end;
$$;

revoke all on function private.execute_officer_transfer(uuid, uuid, text)
  from public, anon, authenticated, service_role;
grant execute on function private.execute_officer_transfer(uuid, uuid, text)
  to authenticated, service_role;

create or replace function public.officer_transfer_grievance(
  p_grievance_id uuid,
  p_organization_id uuid,
  p_reason text
)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.execute_officer_transfer(
    p_grievance_id,
    p_organization_id,
    p_reason
  )
$$;

revoke all on function public.officer_transfer_grievance(uuid, uuid, text)
  from public, anon, authenticated, service_role;
grant execute on function public.officer_transfer_grievance(uuid, uuid, text)
  to authenticated, service_role;
