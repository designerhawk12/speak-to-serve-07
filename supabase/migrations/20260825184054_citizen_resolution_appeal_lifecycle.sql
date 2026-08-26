-- Preserve citizen confirmation and disagreement as structured facts. These
-- fields do not replace the immutable case or appeal event history.
alter table public.feedback
  add column if not exists what_was_fixed text,
  add column if not exists what_remains_unresolved text,
  add column if not exists requested_correction text,
  add column if not exists evidence_document_id uuid references public.documents(id) on delete set null;

-- A citizen response transitions only the citizen-confirmation and outcome
-- lanes. It does not change the government's administrative state.
create or replace function public.citizen_confirm_resolution(
  p_grievance_id uuid,
  p_confirmation public.citizen_confirmation_state,
  p_what_was_fixed text,
  p_what_remains_unresolved text,
  p_requested_correction text,
  p_evidence_document_id uuid
)
returns void
language plpgsql
security invoker
set search_path = public, private
as $$
declare
  v_confirmation public.citizen_confirmation_state;
  v_existing_feedback uuid;
begin
  if private.current_role_of(auth.uid()) <> 'citizen' then
    raise exception 'Only the citizen may confirm this resolution' using errcode = '42501';
  end if;
  select citizen_confirmation_state into v_confirmation
  from public.grievances
  where id = p_grievance_id and citizen_id = auth.uid()
  for update;
  if not found then raise exception 'This case is not available to you' using errcode = '42501'; end if;
  if v_confirmation <> 'AWAITING_CONFIRMATION' then
    raise exception 'This resolution is no longer awaiting your confirmation' using errcode = '22023';
  end if;
  if p_confirmation not in ('CONFIRMED_RESOLVED', 'PARTIALLY_RESOLVED', 'NOT_RESOLVED') then
    raise exception 'Choose yes, partly, or no' using errcode = '22023';
  end if;
  if p_confirmation = 'PARTIALLY_RESOLVED' and (coalesce(length(trim(p_what_was_fixed)), 0) = 0 or coalesce(length(trim(p_what_remains_unresolved)), 0) = 0) then
    raise exception 'Tell us what was fixed and what remains unresolved' using errcode = '22023';
  end if;
  if p_confirmation = 'NOT_RESOLVED' and (coalesce(length(trim(p_what_remains_unresolved)), 0) = 0 or coalesce(length(trim(p_requested_correction)), 0) = 0) then
    raise exception 'Tell us what remains unresolved and what correction you are requesting' using errcode = '22023';
  end if;
  if p_evidence_document_id is not null and not exists (
    select 1 from public.documents where id = p_evidence_document_id and grievance_id = p_grievance_id
  ) then
    raise exception 'The selected evidence does not belong to this grievance' using errcode = '22023';
  end if;
  select id into v_existing_feedback from public.feedback where grievance_id = p_grievance_id and citizen_id = auth.uid() limit 1;
  if v_existing_feedback is not null then
    raise exception 'Your confirmation has already been recorded' using errcode = '22023';
  end if;
  insert into public.feedback (grievance_id, citizen_id, confirmation, comments, what_was_fixed, what_remains_unresolved, requested_correction, evidence_document_id)
  values (p_grievance_id, auth.uid(), p_confirmation, nullif(trim(p_what_remains_unresolved), ''), nullif(trim(p_what_was_fixed), ''), nullif(trim(p_what_remains_unresolved), ''), nullif(trim(p_requested_correction), ''), p_evidence_document_id);
  update public.grievances
  set citizen_confirmation_state = p_confirmation,
      outcome_state = case p_confirmation when 'CONFIRMED_RESOLVED' then 'RESOLVED' when 'PARTIALLY_RESOLVED' then 'PARTIALLY_RESOLVED' else 'UNRESOLVED' end
  where id = p_grievance_id;
  insert into public.case_events (grievance_id, event_type, actor_type, actor_id, title, description, metadata, citizen_visible)
  values (
    p_grievance_id,
    case p_confirmation when 'CONFIRMED_RESOLVED' then 'CITIZEN_CONFIRMED_RESOLVED' when 'PARTIALLY_RESOLVED' then 'CITIZEN_CONFIRMED_PARTLY_RESOLVED' else 'CITIZEN_CONFIRMED_NOT_RESOLVED' end,
    'citizen', auth.uid(),
    case p_confirmation when 'CONFIRMED_RESOLVED' then 'Citizen confirmed the problem was resolved' when 'PARTIALLY_RESOLVED' then 'Citizen reported the problem was partly resolved' else 'Citizen reported the problem remains unresolved' end,
    nullif(trim(p_what_remains_unresolved), ''),
    jsonb_build_object('evidence_document_id', p_evidence_document_id), true
  );
end;
$$;

-- Appeal creation is also transactional and idempotent per grievance. It uses
-- the appellate destination already assigned to the grievance; citizens cannot
-- choose an authority by editing client-side data.
create or replace function public.citizen_create_appeal(
  p_grievance_id uuid,
  p_grounds text,
  p_requested_relief text
)
returns uuid
language plpgsql
security invoker
set search_path = public, private
as $$
declare
  v_appeal_id uuid;
  v_appellate_organization_id uuid;
  v_confirmation public.citizen_confirmation_state;
begin
  if private.current_role_of(auth.uid()) <> 'citizen' then
    raise exception 'Only the citizen may file this appeal' using errcode = '42501';
  end if;
  select appellate_organization_id, citizen_confirmation_state into v_appellate_organization_id, v_confirmation
  from public.grievances where id = p_grievance_id and citizen_id = auth.uid() for update;
  if not found then raise exception 'This case is not available to you' using errcode = '42501'; end if;
  if v_confirmation not in ('PARTIALLY_RESOLVED', 'NOT_RESOLVED') then
    raise exception 'An appeal is available after you report a partial or unresolved outcome' using errcode = '22023';
  end if;
  if coalesce(length(trim(p_grounds)), 0) = 0 then raise exception 'Explain why you are appealing' using errcode = '22023'; end if;
  if v_appellate_organization_id is null then raise exception 'No Appellate Authority is assigned to this grievance yet' using errcode = '22023'; end if;
  select id into v_appeal_id from public.appeals where grievance_id = p_grievance_id and citizen_id = auth.uid() limit 1;
  if v_appeal_id is not null then return v_appeal_id; end if;
  insert into public.appeals (grievance_id, citizen_id, appellate_organization_id, grounds, requested_relief)
  values (p_grievance_id, auth.uid(), v_appellate_organization_id, trim(p_grounds), nullif(trim(p_requested_relief), ''))
  returning id into v_appeal_id;
  update public.grievances set administrative_state = 'APPEAL_FILED' where id = p_grievance_id;
  insert into public.case_events (grievance_id, event_type, actor_type, actor_id, organization_id, title, description, metadata, citizen_visible)
  values (p_grievance_id, 'APPEAL_CREATED', 'citizen', auth.uid(), v_appellate_organization_id, 'Citizen filed an appeal', trim(p_grounds), jsonb_build_object('appeal_id', v_appeal_id), true);
  insert into public.appeal_events (appeal_id, event_type, actor_type, actor_id, organization_id, title, description, citizen_visible)
  values (v_appeal_id, 'APPEAL_CREATED', 'citizen', auth.uid(), v_appellate_organization_id, 'Appeal filed', trim(p_grounds), true);
  return v_appeal_id;
end;
$$;

revoke all on function public.citizen_confirm_resolution(uuid, public.citizen_confirmation_state, text, text, text, uuid) from public, anon;
revoke all on function public.citizen_create_appeal(uuid, text, text) from public, anon;
grant execute on function public.citizen_confirm_resolution(uuid, public.citizen_confirmation_state, text, text, text, uuid) to authenticated;
grant execute on function public.citizen_create_appeal(uuid, text, text) to authenticated;
