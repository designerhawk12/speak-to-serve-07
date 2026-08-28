-- Keep the per-resolution feedback behavior last in migration order. The
-- connected project recorded the original repair with a server timestamp that
-- predates the existing lifecycle migration.
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
set search_path = ''
as $$
declare
  v_confirmation public.citizen_confirmation_state;
  v_resolution_id uuid;
begin
  if private.current_role_of(auth.uid()) <> 'citizen' then
    raise exception 'Only the citizen may confirm this resolution' using errcode = '42501';
  end if;
  if p_confirmation not in ('CONFIRMED_RESOLVED', 'PARTIALLY_RESOLVED', 'NOT_RESOLVED') then
    raise exception 'Choose yes, partly, or no' using errcode = '22023';
  end if;

  select citizen_confirmation_state into v_confirmation
  from public.grievances
  where id = p_grievance_id and citizen_id = auth.uid()
  for update;
  if not found then
    raise exception 'This case is not available to you' using errcode = '42501';
  end if;
  if v_confirmation <> 'AWAITING_CONFIRMATION' then
    raise exception 'This resolution is no longer awaiting your confirmation' using errcode = '22023';
  end if;

  select r.id into v_resolution_id
  from public.resolutions r
  where r.grievance_id = p_grievance_id and coalesce(r.is_interim, false) = false
  order by r.created_at desc, r.id desc
  limit 1;
  if v_resolution_id is null then
    raise exception 'There is no government resolution available to confirm' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.feedback f
    where f.resolution_id = v_resolution_id
      and f.citizen_id = auth.uid()
      and f.confirmation = p_confirmation
  ) then
    return;
  end if;
  if exists (
    select 1 from public.feedback f
    where f.resolution_id = v_resolution_id and f.citizen_id = auth.uid()
  ) then
    raise exception 'Your confirmation has already been recorded' using errcode = '22023';
  end if;

  if p_confirmation = 'PARTIALLY_RESOLVED' and (
    coalesce(length(trim(p_what_was_fixed)), 0) = 0
    or coalesce(length(trim(p_what_remains_unresolved)), 0) = 0
  ) then
    raise exception 'Tell us what was fixed and what remains unresolved' using errcode = '22023';
  end if;
  if p_confirmation = 'NOT_RESOLVED' and (
    coalesce(length(trim(p_what_remains_unresolved)), 0) = 0
    or coalesce(length(trim(p_requested_correction)), 0) = 0
  ) then
    raise exception 'Tell us what remains unresolved and what correction you are requesting' using errcode = '22023';
  end if;
  if p_evidence_document_id is not null and not exists (
    select 1 from public.documents d
    where d.id = p_evidence_document_id
      and d.grievance_id = p_grievance_id
      and d.uploaded_by = auth.uid()
  ) then
    raise exception 'The selected evidence does not belong to this grievance' using errcode = '22023';
  end if;

  insert into public.feedback (
    grievance_id, citizen_id, resolution_id, confirmation, comments,
    what_was_fixed, what_remains_unresolved, requested_correction,
    evidence_document_id
  ) values (
    p_grievance_id, auth.uid(), v_resolution_id, p_confirmation,
    nullif(trim(p_what_remains_unresolved), ''), nullif(trim(p_what_was_fixed), ''),
    nullif(trim(p_what_remains_unresolved), ''), nullif(trim(p_requested_correction), ''),
    p_evidence_document_id
  );

  update public.grievances
  set citizen_confirmation_state = p_confirmation,
      outcome_state = case p_confirmation
        when 'CONFIRMED_RESOLVED' then 'RESOLVED'::public.outcome_state
        when 'PARTIALLY_RESOLVED' then 'PARTIALLY_RESOLVED'::public.outcome_state
        else 'UNRESOLVED'::public.outcome_state
      end
  where id = p_grievance_id;

  insert into public.case_events (
    grievance_id, event_type, actor_type, actor_id, title, description,
    metadata, citizen_visible
  ) values (
    p_grievance_id,
    case p_confirmation
      when 'CONFIRMED_RESOLVED' then 'CITIZEN_CONFIRMED_RESOLVED'
      when 'PARTIALLY_RESOLVED' then 'CITIZEN_CONFIRMED_PARTLY_RESOLVED'
      else 'CITIZEN_REJECTED_RESOLUTION'
    end,
    'citizen', auth.uid(),
    case p_confirmation
      when 'CONFIRMED_RESOLVED' then 'Citizen confirmed the issue is resolved'
      when 'PARTIALLY_RESOLVED' then 'Citizen reported the issue is partly resolved'
      else 'Citizen rejected the government resolution'
    end,
    nullif(trim(p_what_remains_unresolved), ''),
    jsonb_build_object('evidence_document_id', p_evidence_document_id, 'resolution_id', v_resolution_id),
    true
  );

  update public.notifications
  set action_required = false, read_at = coalesce(read_at, statement_timestamp())
  where user_id = auth.uid() and grievance_id = p_grievance_id
    and kind = 'resolution' and action_required;
end;
$$;

revoke all on function public.citizen_confirm_resolution(
  uuid, public.citizen_confirmation_state, text, text, text, uuid
) from public, anon;
grant execute on function public.citizen_confirm_resolution(
  uuid, public.citizen_confirmation_state, text, text, text, uuid
) to authenticated;
