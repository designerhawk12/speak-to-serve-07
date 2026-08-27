-- An assignment-aware UPDATE policy intentionally rejects a row after it moves
-- to a different organization/officer. Keep transfer as the one audited,
-- transactional exception: authorize against the locked source row, then let
-- the assignment trigger choose an eligible GRO in the destination.
create or replace function public.officer_transfer_grievance(
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
  v_case public.grievances%rowtype;
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
  if not exists (select 1 from public.organizations where id = p_organization_id) then
    raise exception 'The destination organization is unavailable' using errcode = '22023';
  end if;

  insert into public.case_events (
    grievance_id, event_type, actor_type, actor_id, organization_id,
    title, description, metadata, citizen_visible
  ) values (
    p_grievance_id, 'CASE_TRANSFERRED', 'officer', v_actor_id, v_case.organization_id,
    'Case transferred', trim(p_reason),
    jsonb_build_object(
      'from_organization_id', v_case.organization_id,
      'to_organization_id', p_organization_id
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
    v_case.citizen_id, p_grievance_id, 'Your grievance was transferred',
    trim(p_reason), 'transfer', false
  );
end;
$$;

revoke all on function public.officer_transfer_grievance(uuid, uuid, text)
  from public, anon;
grant execute on function public.officer_transfer_grievance(uuid, uuid, text)
  to authenticated, service_role;
