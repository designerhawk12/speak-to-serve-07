-- Case-scoped clarification lifecycle and rate-limited citizen reminders.
-- Existing grievance lifecycle columns remain separate; immutable case events
-- continue to be the audit trail for every meaningful transition.

create table public.clarification_requests (
  id uuid primary key default gen_random_uuid(),
  grievance_id uuid not null references public.grievances(id) on delete cascade,
  requested_by uuid references public.profiles(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,
  question text not null check (length(trim(question)) > 0),
  request_message_id uuid references public.messages(id) on delete set null,
  resume_administrative_state public.administrative_state not null default 'UNDER_EXAMINATION',
  requested_at timestamptz not null default now(),
  responded_by uuid references public.profiles(id) on delete set null,
  response_text text,
  response_message_id uuid references public.messages(id) on delete set null,
  response_document_id uuid references public.documents(id) on delete set null,
  fulfilled_at timestamptz,
  constraint clarification_response_complete check (
    (fulfilled_at is null and responded_by is null and response_text is null and response_message_id is null)
    or
    (fulfilled_at is not null and responded_by is not null and length(trim(response_text)) > 0 and response_message_id is not null)
  )
);

create unique index clarification_requests_one_open_per_grievance_idx
  on public.clarification_requests (grievance_id)
  where fulfilled_at is null;
create index clarification_requests_case_history_idx
  on public.clarification_requests (grievance_id, requested_at desc);

grant select on table public.clarification_requests to authenticated;
grant all on table public.clarification_requests to service_role;
alter table public.clarification_requests enable row level security;

create policy "view clarifications on authorized cases"
  on public.clarification_requests
  for select
  to authenticated
  using (private.can_view_grievance(grievance_id));

-- Preserve live clarification work already represented by the legacy event/message
-- combination. Cases in CLARIFICATION_REQUIRED solely because of document requests
-- are intentionally not converted into clarification requests.
insert into public.clarification_requests (
  grievance_id,
  requested_by,
  organization_id,
  question,
  request_message_id,
  resume_administrative_state,
  requested_at
)
select
  g.id,
  latest_event.actor_id,
  latest_event.organization_id,
  coalesce(nullif(trim(latest_event.description), ''), 'The government office requested clarification.'),
  latest_message.id,
  'UNDER_EXAMINATION'::public.administrative_state,
  latest_event.created_at
from public.grievances g
join lateral (
  select ce.actor_id, ce.organization_id, ce.description, ce.created_at
  from public.case_events ce
  where ce.grievance_id = g.id
    and ce.event_type = 'CLARIFICATION_REQUESTED'
  order by ce.created_at desc, ce.id desc
  limit 1
) latest_event on true
left join lateral (
  select m.id
  from public.messages m
  where m.grievance_id = g.id
    and m.sender_type = 'officer'
    and m.created_at <= latest_event.created_at + interval '5 seconds'
  order by m.created_at desc, m.id desc
  limit 1
) latest_message on true
where g.administrative_state = 'CLARIFICATION_REQUIRED'
  and not exists (
    select 1
    from public.messages citizen_message
    where citizen_message.grievance_id = g.id
      and citizen_message.sender_type = 'citizen'
      and citizen_message.created_at > latest_event.created_at
  );

alter table private.priority_engine_config
  add column reminder_cooldown_hours integer not null default 72
    check (reminder_cooldown_hours > 0);

-- Waiting is derived only from unresolved records for this grievance.
create or replace function private.grievance_waiting_on_citizen(p_grievance_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select
    exists (
      select 1
      from public.document_requests dr
      join public.document_request_items dri on dri.request_id = dr.id
      where dr.grievance_id = p_grievance_id
        and dr.fulfilled_at is null
        and dri.is_required
        and dri.document_id is null
    )
    or exists (
      select 1
      from public.grievances g
      where g.id = p_grievance_id
        and g.citizen_confirmation_state = 'AWAITING_CONFIRMATION'
    )
    or exists (
      select 1
      from public.clarification_requests cr
      where cr.grievance_id = p_grievance_id
        and cr.fulfilled_at is null
    );
$$;

create or replace function public.officer_request_clarification(
  p_grievance_id uuid,
  p_instructions text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_grievance public.grievances%rowtype;
  v_request_id uuid;
  v_message_id uuid;
  v_resume_state public.administrative_state;
begin
  if v_user_id is null
     or private.current_role_of(v_user_id) not in ('gro', 'nodal')
     or not private.can_act_on_grievance(p_grievance_id) then
    raise exception 'You are not authorised to request clarification for this case'
      using errcode = '42501';
  end if;

  if coalesce(length(trim(p_instructions)), 0) = 0 then
    raise exception 'Clarification instructions are required' using errcode = '22023';
  end if;

  select * into v_grievance
  from public.grievances
  where id = p_grievance_id
  for update;

  if not found then
    raise exception 'Grievance not found' using errcode = 'P0002';
  end if;

  if v_grievance.administrative_state in (
    'DRAFT', 'RESOLUTION_PROVIDED', 'DISPOSED', 'APPEAL_FILED',
    'APPEAL_UNDER_REVIEW', 'APPEAL_DECIDED', 'CLOSED'
  ) then
    raise exception 'Clarification cannot be requested in the current case state'
      using errcode = '55000';
  end if;

  if exists (
    select 1 from public.clarification_requests cr
    where cr.grievance_id = p_grievance_id and cr.fulfilled_at is null
  ) then
    raise exception 'An unresolved clarification request already exists for this grievance'
      using errcode = '55000';
  end if;

  v_resume_state := case
    when v_grievance.administrative_state = 'CLARIFICATION_REQUIRED'
      then 'UNDER_EXAMINATION'::public.administrative_state
    else v_grievance.administrative_state
  end;

  insert into public.messages (
    grievance_id, sender_id, sender_type, body, citizen_visible
  ) values (
    p_grievance_id, v_user_id, 'officer', trim(p_instructions), true
  ) returning id into v_message_id;

  insert into public.clarification_requests (
    grievance_id, requested_by, organization_id, question,
    request_message_id, resume_administrative_state
  ) values (
    p_grievance_id, v_user_id, v_grievance.organization_id, trim(p_instructions),
    v_message_id, v_resume_state
  ) returning id into v_request_id;

  update public.grievances
  set administrative_state = 'CLARIFICATION_REQUIRED'
  where id = p_grievance_id;

  insert into public.case_events (
    grievance_id, event_type, actor_type, actor_id, organization_id,
    title, description, metadata, citizen_visible
  ) values (
    p_grievance_id, 'CLARIFICATION_REQUESTED', 'officer', v_user_id,
    v_grievance.organization_id, 'Clarification requested', trim(p_instructions),
    jsonb_build_object(
      'clarification_request_id', v_request_id,
      'pause_reason', 'WAITING_FOR_CITIZEN_CLARIFICATION'
    ),
    true
  );

  insert into public.notifications (
    user_id, grievance_id, title, body, kind, action_required
  ) values (
    v_grievance.citizen_id, p_grievance_id,
    'Clarification requested for your grievance', trim(p_instructions),
    'clarification_request', true
  );

  perform private.evaluate_grievance_priority(p_grievance_id, statement_timestamp());
end;
$$;

create or replace function public.citizen_respond_to_clarification(
  p_clarification_request_id uuid,
  p_response text,
  p_document_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_request public.clarification_requests%rowtype;
  v_grievance public.grievances%rowtype;
  v_message_id uuid;
  v_has_other_required_action boolean;
begin
  if v_user_id is null or private.current_role_of(v_user_id) <> 'citizen' then
    raise exception 'Only the citizen who owns the grievance can answer clarification'
      using errcode = '42501';
  end if;

  if coalesce(length(trim(p_response)), 0) = 0 then
    raise exception 'A clarification response is required' using errcode = '22023';
  end if;

  select * into v_request
  from public.clarification_requests
  where id = p_clarification_request_id
  for update;

  if not found then
    raise exception 'Clarification request not found' using errcode = 'P0002';
  end if;

  select * into strict v_grievance
  from public.grievances
  where id = v_request.grievance_id
  for update;

  if v_grievance.citizen_id <> v_user_id then
    raise exception 'This clarification request is outside your grievances'
      using errcode = '42501';
  end if;

  if v_request.fulfilled_at is not null then
    raise exception 'This clarification request has already been answered'
      using errcode = '55000';
  end if;

  if p_document_id is not null and not exists (
    select 1
    from public.documents d
    where d.id = p_document_id
      and d.grievance_id = v_grievance.id
      and d.uploaded_by = v_user_id
      and d.citizen_visible
  ) then
    raise exception 'The response attachment is unavailable for this grievance'
      using errcode = '42501';
  end if;

  insert into public.messages (
    grievance_id, sender_id, sender_type, body, citizen_visible
  ) values (
    v_grievance.id, v_user_id, 'citizen', trim(p_response), true
  ) returning id into v_message_id;

  update public.clarification_requests
  set responded_by = v_user_id,
      response_text = trim(p_response),
      response_message_id = v_message_id,
      response_document_id = p_document_id,
      fulfilled_at = statement_timestamp()
  where id = v_request.id;

  select
    exists (
      select 1 from public.clarification_requests cr
      where cr.grievance_id = v_grievance.id
        and cr.fulfilled_at is null
    )
    or exists (
      select 1
      from public.document_requests dr
      join public.document_request_items dri on dri.request_id = dr.id
      where dr.grievance_id = v_grievance.id
        and dr.fulfilled_at is null
        and dri.is_required
        and dri.document_id is null
    )
  into v_has_other_required_action;

  update public.grievances
  set administrative_state = case
    when v_has_other_required_action then 'CLARIFICATION_REQUIRED'::public.administrative_state
    else 'CITIZEN_RESPONSE_RECEIVED'::public.administrative_state
  end
  where id = v_grievance.id;

  insert into public.case_events (
    grievance_id, event_type, actor_type, actor_id, organization_id,
    title, description, metadata, citizen_visible
  ) values (
    v_grievance.id, 'CITIZEN_RESPONDED', 'citizen', v_user_id,
    v_grievance.organization_id, 'Citizen provided clarification',
    'The requested clarification was provided.',
    jsonb_build_object(
      'clarification_request_id', v_request.id,
      'response_message_id', v_message_id,
      'response_document_id', p_document_id,
      'government_processing_resumed', not v_has_other_required_action
    ),
    true
  );

  update public.notifications
  set action_required = false
  where user_id = v_user_id
    and grievance_id = v_grievance.id
    and kind = 'clarification_request'
    and action_required;

  if v_grievance.assigned_officer_id is not null then
    insert into public.notifications (
      user_id, grievance_id, title, body, kind, action_required
    ) values (
      v_grievance.assigned_officer_id, v_grievance.id,
      'Citizen answered a clarification request',
      format('%s (%s) has new clarification information.',
        v_grievance.short_title, v_grievance.registration_number),
      'clarification_response', true
    );
  end if;

  perform private.evaluate_grievance_priority(v_grievance.id, statement_timestamp());
end;
$$;

create or replace function private.citizen_reminder_status_for(
  p_grievance_id uuid,
  p_user_id uuid,
  p_now timestamptz default now()
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_grievance public.grievances%rowtype;
  v_config private.priority_engine_config%rowtype;
  v_last_reminder_at timestamptz;
  v_next_reminder_at timestamptz;
  v_waiting boolean;
  v_active boolean;
  v_recent_reminders integer;
  v_contribution integer;
begin
  select * into v_grievance from public.grievances where id = p_grievance_id;
  if not found or v_grievance.citizen_id <> p_user_id then
    raise exception 'This grievance is unavailable' using errcode = '42501';
  end if;

  select * into strict v_config from private.priority_engine_config where id = 1;
  select max(ce.created_at) into v_last_reminder_at
  from public.case_events ce
  where ce.grievance_id = p_grievance_id
    and ce.event_type = 'CITIZEN_REMINDER_SENT'
    and ce.actor_type = 'citizen';

  select count(*)::integer into v_recent_reminders
  from public.case_events ce
  where ce.grievance_id = p_grievance_id
    and ce.event_type = 'CITIZEN_REMINDER_SENT'
    and ce.actor_type = 'citizen'
    and ce.created_at >= p_now - make_interval(days => v_config.reminder_window_days);

  v_next_reminder_at := case
    when v_last_reminder_at is null then null
    else v_last_reminder_at + make_interval(hours => v_config.reminder_cooldown_hours)
  end;
  v_waiting := private.grievance_waiting_on_citizen(p_grievance_id);
  v_active := v_grievance.submitted_at is not null
    and v_grievance.administrative_state not in (
      'DRAFT', 'RESOLUTION_PROVIDED', 'DISPOSED', 'APPEAL_FILED',
      'APPEAL_UNDER_REVIEW', 'APPEAL_DECIDED', 'CLOSED'
    )
    and v_grievance.citizen_confirmation_state <> 'CONFIRMED_RESOLVED';
  v_contribution := least(v_recent_reminders * v_config.reminder_points, v_config.reminder_points_cap);

  return jsonb_build_object(
    'eligible', v_active and not v_waiting and (v_next_reminder_at is null or p_now >= v_next_reminder_at),
    'waiting_on_citizen', v_waiting,
    'last_reminder_at', v_last_reminder_at,
    'next_reminder_at', v_next_reminder_at,
    'recent_reminder_count', v_recent_reminders,
    'priority_contribution', v_contribution,
    'priority_contribution_cap', v_config.reminder_points_cap,
    'reason', case
      when not v_active then 'Reminders are available only while government action is pending on an open grievance.'
      when v_waiting then 'Complete the action requested from you before sending a reminder.'
      when v_next_reminder_at is not null and p_now < v_next_reminder_at
        then 'A reminder was recently sent.'
      else null
    end
  );
end;
$$;

create or replace function public.citizen_reminder_status(p_grievance_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null or private.current_role_of(v_user_id) <> 'citizen' then
    raise exception 'Only citizens can view reminder availability' using errcode = '42501';
  end if;
  return private.citizen_reminder_status_for(p_grievance_id, v_user_id, statement_timestamp());
end;
$$;

create or replace function public.citizen_send_reminder(
  p_grievance_id uuid,
  p_message text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_grievance public.grievances%rowtype;
  v_status jsonb;
  v_message_id uuid;
  v_next_reminder_at timestamptz;
begin
  if v_user_id is null or private.current_role_of(v_user_id) <> 'citizen' then
    raise exception 'Only citizens can send reminders' using errcode = '42501';
  end if;

  if coalesce(length(trim(p_message)), 0) = 0 or length(trim(p_message)) > 500 then
    raise exception 'Reminder text must be between 1 and 500 characters' using errcode = '22023';
  end if;

  select * into v_grievance
  from public.grievances
  where id = p_grievance_id
  for update;

  if not found or v_grievance.citizen_id <> v_user_id then
    raise exception 'This grievance is unavailable' using errcode = '42501';
  end if;

  v_status := private.citizen_reminder_status_for(
    p_grievance_id, v_user_id, statement_timestamp()
  );
  if not coalesce((v_status->>'eligible')::boolean, false) then
    raise exception '%', coalesce(v_status->>'reason', 'A reminder cannot be sent right now')
      using errcode = '55000';
  end if;

  insert into public.messages (
    grievance_id, sender_id, sender_type, body, citizen_visible
  ) values (
    p_grievance_id, v_user_id, 'citizen', trim(p_message), true
  ) returning id into v_message_id;

  select statement_timestamp() + make_interval(hours => c.reminder_cooldown_hours)
  into v_next_reminder_at
  from private.priority_engine_config c where c.id = 1;

  insert into public.case_events (
    grievance_id, event_type, actor_type, actor_id, organization_id,
    title, description, metadata, citizen_visible
  ) values (
    p_grievance_id, 'CITIZEN_REMINDER_SENT', 'citizen', v_user_id,
    v_grievance.organization_id, 'Citizen sent a reminder',
    'The citizen asked the assigned office for an update.',
    jsonb_build_object(
      'message_id', v_message_id,
      'next_reminder_at', v_next_reminder_at
    ),
    true
  );

  if v_grievance.assigned_officer_id is not null then
    insert into public.notifications (
      user_id, grievance_id, title, body, kind, action_required
    ) values (
      v_grievance.assigned_officer_id, p_grievance_id,
      'Citizen reminder received', trim(p_message), 'citizen_reminder', true
    );
  end if;

  perform private.evaluate_grievance_priority(p_grievance_id, statement_timestamp());
  return private.citizen_reminder_status_for(
    p_grievance_id, v_user_id, statement_timestamp()
  );
end;
$$;

revoke all on function public.officer_request_clarification(uuid, text) from public, anon;
revoke all on function public.citizen_respond_to_clarification(uuid, text, uuid) from public, anon;
revoke all on function public.citizen_reminder_status(uuid) from public, anon;
revoke all on function public.citizen_send_reminder(uuid, text) from public, anon;
revoke all on function private.citizen_reminder_status_for(uuid, uuid, timestamptz)
  from public, anon, authenticated, service_role;

grant execute on function public.officer_request_clarification(uuid, text) to authenticated;
grant execute on function public.citizen_respond_to_clarification(uuid, text, uuid) to authenticated;
grant execute on function public.citizen_reminder_status(uuid) to authenticated;
grant execute on function public.citizen_send_reminder(uuid, text) to authenticated;

