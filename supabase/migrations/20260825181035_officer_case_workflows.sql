-- Officer workflows need a durable, structured record without combining the
-- government's proposed outcome with the citizen's confirmation lifecycle.
alter table public.resolutions
  add column if not exists citizen_next_step text,
  add column if not exists resolution_narrative text,
  add column if not exists partial_or_unresolved_reason text,
  add column if not exists evidence_reference text,
  add column if not exists current_blocker text,
  add column if not exists expected_next_step text,
  add column if not exists expected_date date;

-- These invoker functions run with the caller's RLS rights. They make each
-- material officer action transactional: related row(s), immutable event, and
-- citizen notification either all persist or none do.
create or replace function public.officer_request_documents(
  p_grievance_id uuid,
  p_instructions text,
  p_due_at timestamptz,
  p_items jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public, private
as $$
declare
  v_request_id uuid;
  v_citizen_id uuid;
  v_organization_id uuid;
  v_item jsonb;
begin
  if private.current_role_of(auth.uid()) not in ('gro', 'nodal') or not private.can_view_grievance(p_grievance_id) then
    raise exception 'You are not authorised to request documents for this case' using errcode = '42501';
  end if;
  if coalesce(length(trim(p_instructions)), 0) = 0 or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Instructions and at least one checklist item are required' using errcode = '22023';
  end if;

  select citizen_id, organization_id into v_citizen_id, v_organization_id
  from public.grievances where id = p_grievance_id;

  insert into public.document_requests (grievance_id, requested_by, organization_id, reason, due_at)
  values (p_grievance_id, auth.uid(), v_organization_id, trim(p_instructions), p_due_at)
  returning id into v_request_id;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    if coalesce(length(trim(v_item->>'label')), 0) = 0 then
      raise exception 'Every checklist item needs a label' using errcode = '22023';
    end if;
    insert into public.document_request_items (request_id, label, description, is_required)
    values (v_request_id, trim(v_item->>'label'), nullif(trim(v_item->>'description'), ''), coalesce((v_item->>'is_required')::boolean, true));
  end loop;

  update public.grievances set administrative_state = 'CLARIFICATION_REQUIRED' where id = p_grievance_id;
  insert into public.case_events (grievance_id, event_type, actor_type, actor_id, organization_id, title, description, metadata, citizen_visible)
  values (p_grievance_id, 'DOCUMENT_REQUESTED', 'officer', auth.uid(), v_organization_id, 'Documents requested', trim(p_instructions), jsonb_build_object('request_id', v_request_id), true);
  insert into public.notifications (user_id, grievance_id, title, body, kind, action_required)
  values (v_citizen_id, p_grievance_id, 'Documents requested for your grievance', trim(p_instructions), 'document_request', true);
  return v_request_id;
end;
$$;

create or replace function public.officer_request_clarification(p_grievance_id uuid, p_instructions text)
returns void
language plpgsql
security invoker
set search_path = public, private
as $$
declare v_citizen_id uuid; v_organization_id uuid;
begin
  if private.current_role_of(auth.uid()) not in ('gro', 'nodal') or not private.can_view_grievance(p_grievance_id) then
    raise exception 'You are not authorised to request clarification for this case' using errcode = '42501';
  end if;
  if coalesce(length(trim(p_instructions)), 0) = 0 then raise exception 'Clarification instructions are required' using errcode = '22023'; end if;
  select citizen_id, organization_id into v_citizen_id, v_organization_id from public.grievances where id = p_grievance_id;
  insert into public.messages (grievance_id, sender_id, sender_type, body, citizen_visible)
  values (p_grievance_id, auth.uid(), 'officer', trim(p_instructions), true);
  update public.grievances set administrative_state = 'CLARIFICATION_REQUIRED' where id = p_grievance_id;
  insert into public.case_events (grievance_id, event_type, actor_type, actor_id, organization_id, title, description, citizen_visible)
  values (p_grievance_id, 'CLARIFICATION_REQUESTED', 'officer', auth.uid(), v_organization_id, 'Clarification requested', trim(p_instructions), true);
  insert into public.notifications (user_id, grievance_id, title, body, kind, action_required)
  values (v_citizen_id, p_grievance_id, 'Clarification requested for your grievance', trim(p_instructions), 'clarification_request', true);
end;
$$;

create or replace function public.officer_add_interim_update(
  p_grievance_id uuid,
  p_action_completed text,
  p_current_blocker text,
  p_expected_next_step text,
  p_expected_date date
)
returns uuid
language plpgsql
security invoker
set search_path = public, private
as $$
declare v_resolution_id uuid; v_citizen_id uuid; v_organization_id uuid;
begin
  if private.current_role_of(auth.uid()) not in ('gro', 'nodal') or not private.can_view_grievance(p_grievance_id) then
    raise exception 'You are not authorised to update this case' using errcode = '42501';
  end if;
  if coalesce(length(trim(p_action_completed)), 0) = 0 or coalesce(length(trim(p_expected_next_step)), 0) = 0 then
    raise exception 'Action completed and expected next step are required' using errcode = '22023';
  end if;
  select citizen_id, organization_id into v_citizen_id, v_organization_id from public.grievances where id = p_grievance_id;
  insert into public.resolutions (grievance_id, authored_by, organization_id, action_taken, outcome_claimed, is_interim, current_blocker, expected_next_step, expected_date)
  values (p_grievance_id, auth.uid(), v_organization_id, trim(p_action_completed), 'UNRESOLVED', true, nullif(trim(p_current_blocker), ''), trim(p_expected_next_step), p_expected_date)
  returning id into v_resolution_id;
  update public.grievances set administrative_state = 'INTERIM_RESPONSE' where id = p_grievance_id;
  insert into public.case_events (grievance_id, event_type, actor_type, actor_id, organization_id, title, description, metadata, citizen_visible)
  values (p_grievance_id, 'INTERIM_UPDATE_ADDED', 'officer', auth.uid(), v_organization_id, 'Interim update provided', trim(p_action_completed), jsonb_build_object('blocker', nullif(trim(p_current_blocker), ''), 'expected_next_step', trim(p_expected_next_step), 'expected_date', p_expected_date), true);
  insert into public.notifications (user_id, grievance_id, title, body, kind, action_required)
  values (v_citizen_id, p_grievance_id, 'An interim update was added', trim(p_action_completed), 'interim_update', false);
  return v_resolution_id;
end;
$$;

create or replace function public.officer_transfer_grievance(p_grievance_id uuid, p_organization_id uuid, p_reason text)
returns void
language plpgsql
security invoker
set search_path = public, private
as $$
declare v_citizen_id uuid; v_from_organization_id uuid;
begin
  if private.current_role_of(auth.uid()) not in ('gro', 'nodal') or not private.can_view_grievance(p_grievance_id) then
    raise exception 'You are not authorised to transfer this case' using errcode = '42501';
  end if;
  if p_organization_id is null or coalesce(length(trim(p_reason)), 0) = 0 then raise exception 'Destination and reason are required' using errcode = '22023'; end if;
  select citizen_id, organization_id into v_citizen_id, v_from_organization_id from public.grievances where id = p_grievance_id;
  insert into public.case_events (grievance_id, event_type, actor_type, actor_id, organization_id, title, description, metadata, citizen_visible)
  values (p_grievance_id, 'CASE_TRANSFERRED', 'officer', auth.uid(), v_from_organization_id, 'Case transferred', trim(p_reason), jsonb_build_object('from_organization_id', v_from_organization_id, 'to_organization_id', p_organization_id), true);
  update public.grievances set organization_id = p_organization_id, administrative_state = 'ROUTED', assigned_officer_id = null where id = p_grievance_id;
  insert into public.notifications (user_id, grievance_id, title, body, kind, action_required)
  values (v_citizen_id, p_grievance_id, 'Your grievance was transferred', trim(p_reason), 'transfer', false);
end;
$$;

create or replace function public.officer_submit_resolution(
  p_grievance_id uuid,
  p_action_taken text,
  p_outcome_achieved text,
  p_citizen_next_step text,
  p_resolution_narrative text,
  p_partial_or_unresolved_reason text,
  p_evidence_reference text
)
returns uuid
language plpgsql
security invoker
set search_path = public, private
as $$
declare v_resolution_id uuid; v_citizen_id uuid; v_organization_id uuid;
begin
  if private.current_role_of(auth.uid()) not in ('gro', 'nodal') or not private.can_view_grievance(p_grievance_id) then
    raise exception 'You are not authorised to resolve this case' using errcode = '42501';
  end if;
  if coalesce(length(trim(p_action_taken)), 0) = 0 or coalesce(length(trim(p_outcome_achieved)), 0) = 0 or coalesce(length(trim(p_citizen_next_step)), 0) = 0 or coalesce(length(trim(p_resolution_narrative)), 0) = 0 then
    raise exception 'Action taken, outcome, citizen next step, and resolution narrative are required' using errcode = '22023';
  end if;
  select citizen_id, organization_id into v_citizen_id, v_organization_id from public.grievances where id = p_grievance_id;
  insert into public.resolutions (grievance_id, authored_by, organization_id, action_taken, outcome_claimed, is_interim, citizen_next_step, resolution_narrative, partial_or_unresolved_reason, evidence_reference)
  values (p_grievance_id, auth.uid(), v_organization_id, trim(p_action_taken), 'RESOLUTION_PROPOSED', false, trim(p_citizen_next_step), trim(p_resolution_narrative), nullif(trim(p_partial_or_unresolved_reason), ''), nullif(trim(p_evidence_reference), ''))
  returning id into v_resolution_id;
  update public.grievances
  set administrative_state = 'RESOLUTION_PROVIDED', outcome_state = 'RESOLUTION_PROPOSED', citizen_confirmation_state = 'AWAITING_CONFIRMATION'
  where id = p_grievance_id;
  insert into public.case_events (grievance_id, event_type, actor_type, actor_id, organization_id, title, description, metadata, citizen_visible)
  values (p_grievance_id, 'RESOLUTION_SUBMITTED', 'officer', auth.uid(), v_organization_id, 'Government resolution provided', trim(p_resolution_narrative), jsonb_build_object('resolution_id', v_resolution_id), true);
  insert into public.notifications (user_id, grievance_id, title, body, kind, action_required)
  values (v_citizen_id, p_grievance_id, 'A government resolution is ready for your review', trim(p_citizen_next_step), 'resolution', true);
  return v_resolution_id;
end;
$$;

revoke all on function public.officer_request_documents(uuid, text, timestamptz, jsonb) from public, anon;
revoke all on function public.officer_request_clarification(uuid, text) from public, anon;
revoke all on function public.officer_add_interim_update(uuid, text, text, text, date) from public, anon;
revoke all on function public.officer_transfer_grievance(uuid, uuid, text) from public, anon;
revoke all on function public.officer_submit_resolution(uuid, text, text, text, text, text, text) from public, anon;
grant execute on function public.officer_request_documents(uuid, text, timestamptz, jsonb) to authenticated;
grant execute on function public.officer_request_clarification(uuid, text) to authenticated;
grant execute on function public.officer_add_interim_update(uuid, text, text, text, date) to authenticated;
grant execute on function public.officer_transfer_grievance(uuid, uuid, text) to authenticated;
grant execute on function public.officer_submit_resolution(uuid, text, text, text, text, text, text) to authenticated;
