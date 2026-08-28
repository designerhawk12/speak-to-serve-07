-- Keep government response, citizen confirmation, and final outcome as
-- independent lifecycle facts while stopping the original processing clock.

alter table public.grievances
  add column if not exists government_response_completed_at timestamptz;

alter table public.resolutions
  add column if not exists outcome_achieved text;

update public.grievances g
set government_response_completed_at = coalesce(
  (
    select max(r.created_at)
    from public.resolutions r
    where r.grievance_id = g.id
      and not r.is_interim
  ),
  g.disposed_at,
  g.closed_at,
  g.updated_at
)
where g.government_response_completed_at is null
  and g.administrative_state in (
    'RESOLUTION_PROVIDED', 'DISPOSED', 'APPEAL_FILED',
    'APPEAL_UNDER_REVIEW', 'APPEAL_DECIDED', 'CLOSED'
  );

-- Preserve the existing, tested active-case engine unchanged. A narrow wrapper
-- normalizes only cases whose original government-processing phase has ended.
alter function private.evaluate_grievance_priority(uuid, timestamptz)
  rename to evaluate_active_grievance_priority;

revoke all on function private.evaluate_active_grievance_priority(uuid, timestamptz)
  from public, anon, authenticated, service_role;

create function private.evaluate_grievance_priority(
  p_grievance_id uuid,
  p_now timestamptz default now()
)
returns public.priority_level
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_grievance public.grievances%rowtype;
  v_previous public.grievance_priorities%rowtype;
  v_had_previous boolean;
  v_last_action_at timestamptz;
begin
  select * into strict v_grievance
  from public.grievances
  where id = p_grievance_id;

  if v_grievance.administrative_state not in (
    'RESOLUTION_PROVIDED', 'DISPOSED', 'APPEAL_FILED',
    'APPEAL_UNDER_REVIEW', 'APPEAL_DECIDED', 'CLOSED'
  ) and v_grievance.citizen_confirmation_state <> 'CONFIRMED_RESOLVED' then
    return private.evaluate_active_grievance_priority(p_grievance_id, p_now);
  end if;

  select * into v_previous
  from public.grievance_priorities
  where grievance_id = p_grievance_id
  for update;
  v_had_previous := found;

  select greatest(
    v_previous.last_meaningful_government_action_at,
    max(ce.created_at) filter (
      where ce.actor_type = 'officer'
        and ce.event_type in ('RESOLUTION_SUBMITTED', 'APPEAL_UPDATE_ADDED', 'APPEAL_DECIDED')
    ),
    (select max(r.created_at) from public.resolutions r where r.grievance_id = p_grievance_id)
  ) into v_last_action_at
  from public.case_events ce
  where ce.grievance_id = p_grievance_id;

  insert into public.grievance_priorities (
    grievance_id,
    priority_score,
    priority_level,
    priority_reasons,
    assignment_started_at,
    first_opened_at,
    last_meaningful_government_action_at,
    escalation_level,
    next_escalation_at,
    waiting_on_citizen,
    evaluated_at
  ) values (
    p_grievance_id,
    0,
    'NORMAL',
    array['Original government-processing phase is complete; active inactivity escalation is stopped'],
    v_previous.assignment_started_at,
    v_previous.first_opened_at,
    v_last_action_at,
    0,
    null,
    false,
    p_now
  )
  on conflict (grievance_id) do update set
    priority_score = 0,
    priority_level = 'NORMAL',
    priority_reasons = excluded.priority_reasons,
    last_meaningful_government_action_at = excluded.last_meaningful_government_action_at,
    escalation_level = 0,
    next_escalation_at = null,
    waiting_on_citizen = false,
    evaluated_at = excluded.evaluated_at;

  if v_had_previous and (
    v_previous.priority_level <> 'NORMAL'
    or v_previous.priority_score <> 0
    or v_previous.escalation_level <> 0
  ) then
    insert into public.case_events (
      grievance_id,
      event_type,
      actor_type,
      organization_id,
      title,
      description,
      metadata,
      citizen_visible
    ) values (
      p_grievance_id,
      'PRIORITY_CHANGED',
      'system',
      v_grievance.organization_id,
      'Active case priority closed',
      'The original government-processing phase ended, so active inactivity escalation stopped.',
      jsonb_build_object(
        'previous_level', v_previous.priority_level,
        'new_level', 'NORMAL',
        'previous_score', v_previous.priority_score,
        'new_score', 0,
        'reason', 'government_processing_complete'
      ),
      false
    );
  end if;

  return 'NORMAL'::public.priority_level;
end;
$$;

revoke all on function private.evaluate_grievance_priority(uuid, timestamptz)
  from public, anon, authenticated, service_role;

create or replace function private.evaluate_terminal_priority_after_grievance_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.administrative_state in (
    'RESOLUTION_PROVIDED', 'DISPOSED', 'APPEAL_FILED',
    'APPEAL_UNDER_REVIEW', 'APPEAL_DECIDED', 'CLOSED'
  ) or new.citizen_confirmation_state = 'CONFIRMED_RESOLVED' then
    perform private.evaluate_grievance_priority(new.id, statement_timestamp());
  end if;
  return null;
end;
$$;

revoke all on function private.evaluate_terminal_priority_after_grievance_update()
  from public, anon, authenticated, service_role;

drop trigger if exists evaluate_terminal_priority_after_grievance_update on public.grievances;
create trigger evaluate_terminal_priority_after_grievance_update
after update of administrative_state, citizen_confirmation_state on public.grievances
for each row
when (
  old.administrative_state is distinct from new.administrative_state
  or old.citizen_confirmation_state is distinct from new.citizen_confirmation_state
)
execute function private.evaluate_terminal_priority_after_grievance_update();

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
set search_path = ''
as $$
declare
  v_resolution_id uuid;
  v_grievance public.grievances%rowtype;
begin
  if private.current_role_of(auth.uid()) not in ('gro', 'nodal')
     or not private.can_act_on_grievance(p_grievance_id) then
    raise exception 'You are not authorised to resolve this case' using errcode = '42501';
  end if;

  if coalesce(length(trim(p_action_taken)), 0) = 0
     or coalesce(length(trim(p_outcome_achieved)), 0) = 0
     or coalesce(length(trim(p_citizen_next_step)), 0) = 0
     or coalesce(length(trim(p_resolution_narrative)), 0) = 0 then
    raise exception 'Action taken, outcome, citizen next step, and resolution narrative are required'
      using errcode = '22023';
  end if;

  select * into v_grievance
  from public.grievances
  where id = p_grievance_id
  for update;

  if not found then
    raise exception 'This grievance is not available to you' using errcode = '42501';
  end if;

  if v_grievance.administrative_state in (
    'RESOLUTION_PROVIDED', 'DISPOSED', 'APPEAL_FILED',
    'APPEAL_UNDER_REVIEW', 'APPEAL_DECIDED', 'CLOSED'
  ) then
    raise exception 'This grievance already has a completed government response'
      using errcode = '22023';
  end if;

  insert into public.resolutions (
    grievance_id,
    authored_by,
    organization_id,
    action_taken,
    outcome_achieved,
    outcome_claimed,
    is_interim,
    citizen_next_step,
    resolution_narrative,
    partial_or_unresolved_reason,
    evidence_reference
  ) values (
    p_grievance_id,
    auth.uid(),
    v_grievance.organization_id,
    trim(p_action_taken),
    trim(p_outcome_achieved),
    'RESOLUTION_PROPOSED',
    false,
    trim(p_citizen_next_step),
    trim(p_resolution_narrative),
    nullif(trim(p_partial_or_unresolved_reason), ''),
    nullif(trim(p_evidence_reference), '')
  ) returning id into v_resolution_id;

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
    'RESOLUTION_SUBMITTED',
    'officer',
    auth.uid(),
    v_grievance.organization_id,
    'Government resolution provided',
    trim(p_resolution_narrative),
    jsonb_build_object('resolution_id', v_resolution_id),
    true
  );

  update public.grievances
  set administrative_state = 'RESOLUTION_PROVIDED',
      outcome_state = 'RESOLUTION_PROPOSED',
      citizen_confirmation_state = 'AWAITING_CONFIRMATION',
      government_response_completed_at = statement_timestamp()
  where id = p_grievance_id;

  insert into public.notifications (
    user_id,
    grievance_id,
    title,
    body,
    kind,
    action_required
  ) values (
    v_grievance.citizen_id,
    p_grievance_id,
    'Review government''s resolution',
    trim(p_citizen_next_step),
    'resolution',
    true
  );

  return v_resolution_id;
end;
$$;

revoke all on function public.officer_submit_resolution(uuid, text, text, text, text, text, text)
  from public, anon;
grant execute on function public.officer_submit_resolution(uuid, text, text, text, text, text, text)
  to authenticated;

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
begin
  if private.current_role_of(auth.uid()) <> 'citizen' then
    raise exception 'Only the citizen may confirm this resolution' using errcode = '42501';
  end if;

  if p_confirmation not in ('CONFIRMED_RESOLVED', 'PARTIALLY_RESOLVED', 'NOT_RESOLVED') then
    raise exception 'Choose yes, partly, or no' using errcode = '22023';
  end if;

  select citizen_confirmation_state into v_confirmation
  from public.grievances
  where id = p_grievance_id
    and citizen_id = auth.uid()
  for update;

  if not found then
    raise exception 'This case is not available to you' using errcode = '42501';
  end if;

  -- A retried request with the already-recorded choice is a successful no-op.
  -- The grievance row lock serializes rapid double clicks, so feedback/events
  -- can only be created once.
  if v_confirmation = p_confirmation and exists (
    select 1
    from public.feedback f
    where f.grievance_id = p_grievance_id
      and f.citizen_id = auth.uid()
      and f.confirmation = p_confirmation
  ) then
    return;
  end if;

  if v_confirmation <> 'AWAITING_CONFIRMATION' then
    raise exception 'This resolution is no longer awaiting your confirmation'
      using errcode = '22023';
  end if;

  if p_confirmation = 'PARTIALLY_RESOLVED'
     and (
       coalesce(length(trim(p_what_was_fixed)), 0) = 0
       or coalesce(length(trim(p_what_remains_unresolved)), 0) = 0
     ) then
    raise exception 'Tell us what was fixed and what remains unresolved' using errcode = '22023';
  end if;

  if p_confirmation = 'NOT_RESOLVED'
     and (
       coalesce(length(trim(p_what_remains_unresolved)), 0) = 0
       or coalesce(length(trim(p_requested_correction)), 0) = 0
     ) then
    raise exception 'Tell us what remains unresolved and what correction you are requesting'
      using errcode = '22023';
  end if;

  if p_evidence_document_id is not null and not exists (
    select 1
    from public.documents d
    where d.id = p_evidence_document_id
      and d.grievance_id = p_grievance_id
      and d.uploaded_by = auth.uid()
  ) then
    raise exception 'The selected evidence does not belong to this grievance'
      using errcode = '22023';
  end if;

  if exists (
    select 1 from public.feedback f
    where f.grievance_id = p_grievance_id and f.citizen_id = auth.uid()
  ) then
    raise exception 'Your confirmation has already been recorded' using errcode = '22023';
  end if;

  insert into public.feedback (
    grievance_id,
    citizen_id,
    confirmation,
    comments,
    what_was_fixed,
    what_remains_unresolved,
    requested_correction,
    evidence_document_id
  ) values (
    p_grievance_id,
    auth.uid(),
    p_confirmation,
    nullif(trim(p_what_remains_unresolved), ''),
    nullif(trim(p_what_was_fixed), ''),
    nullif(trim(p_what_remains_unresolved), ''),
    nullif(trim(p_requested_correction), ''),
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
    grievance_id,
    event_type,
    actor_type,
    actor_id,
    title,
    description,
    metadata,
    citizen_visible
  ) values (
    p_grievance_id,
    case p_confirmation
      when 'CONFIRMED_RESOLVED' then 'CITIZEN_CONFIRMED_RESOLVED'
      when 'PARTIALLY_RESOLVED' then 'CITIZEN_CONFIRMED_PARTLY_RESOLVED'
      else 'CITIZEN_REJECTED_RESOLUTION'
    end,
    'citizen',
    auth.uid(),
    case p_confirmation
      when 'CONFIRMED_RESOLVED' then 'Citizen confirmed the issue is resolved'
      when 'PARTIALLY_RESOLVED' then 'Citizen reported the issue is partly resolved'
      else 'Citizen rejected the government resolution'
    end,
    nullif(trim(p_what_remains_unresolved), ''),
    jsonb_build_object('evidence_document_id', p_evidence_document_id),
    true
  );

  update public.notifications
  set action_required = false,
      read_at = coalesce(read_at, statement_timestamp())
  where user_id = auth.uid()
    and grievance_id = p_grievance_id
    and kind = 'resolution'
    and action_required;
end;
$$;

revoke all on function public.citizen_confirm_resolution(
  uuid, public.citizen_confirmation_state, text, text, text, uuid
) from public, anon;
grant execute on function public.citizen_confirm_resolution(
  uuid, public.citizen_confirmation_state, text, text, text, uuid
) to authenticated;
