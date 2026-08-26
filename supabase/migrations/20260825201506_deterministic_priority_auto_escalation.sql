-- Deterministic Dynamic Priority & Auto-Escalation Engine.
-- Escalation changes attention only: this migration never changes organization,
-- assigned officer, administrative state, outcome state, or citizen confirmation.

create type public.priority_level as enum ('NORMAL', 'ELEVATED', 'HIGH', 'CRITICAL');

create table private.priority_engine_config (
  id smallint primary key default 1 check (id = 1),
  unopened_first_hours integer not null check (unopened_first_hours > 0),
  unopened_strong_hours integer not null check (unopened_strong_hours > unopened_first_hours),
  unopened_first_points smallint not null check (unopened_first_points >= 0),
  unopened_strong_points smallint not null check (unopened_strong_points >= unopened_first_points),
  stalled_first_hours integer not null check (stalled_first_hours > 0),
  stalled_strong_hours integer not null check (stalled_strong_hours > stalled_first_hours),
  stalled_first_points smallint not null check (stalled_first_points >= 0),
  stalled_strong_points smallint not null check (stalled_strong_points >= stalled_first_points),
  sla_first_percent numeric(5,2) not null check (sla_first_percent between 0 and 100),
  sla_elevated_percent numeric(5,2) not null check (sla_elevated_percent between sla_first_percent and 100),
  sla_high_percent numeric(5,2) not null check (sla_high_percent between sla_elevated_percent and 100),
  sla_breach_percent numeric(5,2) not null check (sla_breach_percent >= sla_high_percent),
  sla_first_points smallint not null check (sla_first_points >= 0),
  sla_elevated_points smallint not null check (sla_elevated_points >= sla_first_points),
  sla_high_points smallint not null check (sla_high_points >= sla_elevated_points),
  sla_breach_points smallint not null check (sla_breach_points >= sla_high_points),
  reminder_window_days integer not null check (reminder_window_days > 0),
  reminder_points smallint not null check (reminder_points >= 0),
  reminder_points_cap smallint not null check (reminder_points_cap >= reminder_points),
  related_case_points smallint not null check (related_case_points >= 0),
  active_appeal_points smallint not null check (active_appeal_points >= 0),
  elevated_min_score smallint not null check (elevated_min_score > 0),
  high_min_score smallint not null check (high_min_score > elevated_min_score),
  critical_min_score smallint not null check (critical_min_score > high_min_score),
  updated_at timestamptz not null default now()
);

revoke all on table private.priority_engine_config from public, anon, authenticated, service_role;

insert into private.priority_engine_config (
  id,
  unopened_first_hours, unopened_strong_hours, unopened_first_points, unopened_strong_points,
  stalled_first_hours, stalled_strong_hours, stalled_first_points, stalled_strong_points,
  sla_first_percent, sla_elevated_percent, sla_high_percent, sla_breach_percent,
  sla_first_points, sla_elevated_points, sla_high_points, sla_breach_points,
  reminder_window_days, reminder_points, reminder_points_cap,
  related_case_points, active_appeal_points,
  elevated_min_score, high_min_score, critical_min_score
)
values (
  1,
  24, 48, 20, 45,
  72, 168, 20, 45,
  50, 75, 90, 100,
  10, 25, 45, 70,
  14, 5, 15,
  10, 25,
  20, 45, 70
);

create table public.grievance_priorities (
  grievance_id uuid primary key references public.grievances(id) on delete cascade,
  priority_score smallint not null default 0 check (priority_score between 0 and 100),
  priority_level public.priority_level not null default 'NORMAL',
  priority_reasons text[] not null default '{}'::text[],
  assignment_started_at timestamptz,
  first_opened_at timestamptz,
  last_meaningful_government_action_at timestamptz,
  escalation_level smallint not null default 0 check (escalation_level between 0 and 2),
  next_escalation_at timestamptz,
  waiting_on_citizen boolean not null default false,
  evaluated_at timestamptz not null default now()
);

create index grievance_priorities_queue_idx
  on public.grievance_priorities (priority_level desc, priority_score desc, evaluated_at desc);
create index case_events_priority_facts_idx
  on public.case_events (grievance_id, event_type, created_at desc);
create index document_requests_grievance_open_idx
  on public.document_requests (grievance_id, created_at desc) where fulfilled_at is null;
create index document_request_items_outstanding_idx
  on public.document_request_items (request_id) where is_required and document_id is null;
create index messages_citizen_response_idx
  on public.messages (grievance_id, created_at desc) where sender_type = 'citizen';
create index issue_cluster_members_grievance_idx
  on public.issue_cluster_members (grievance_id, cluster_id);
create index appeals_priority_active_idx
  on public.appeals (grievance_id, state) where state in ('FILED', 'UNDER_REVIEW');

grant select on table public.grievance_priorities to authenticated;
grant all on table public.grievance_priorities to service_role;
alter table public.grievance_priorities enable row level security;

create policy "staff see priority for authorized grievances"
  on public.grievance_priorities
  for select
  to authenticated
  using (
    private.current_role_of((select auth.uid())) <> 'citizen'
    and private.can_view_grievance(grievance_id)
  );

create or replace function private.capture_grievance_assignment_for_priority()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_assignment_started_at timestamptz;
begin
  if new.assigned_officer_id is not null or new.administrative_state = 'ASSIGNED' then
    v_assignment_started_at := coalesce(new.updated_at, now());
  end if;

  if tg_op = 'INSERT' then
    insert into public.grievance_priorities (grievance_id, assignment_started_at)
    values (new.id, v_assignment_started_at)
    on conflict (grievance_id) do nothing;
  elsif new.organization_id is distinct from old.organization_id
     or new.assigned_officer_id is distinct from old.assigned_officer_id
     or (new.administrative_state = 'ASSIGNED' and old.administrative_state <> 'ASSIGNED') then
    insert into public.grievance_priorities (
      grievance_id, assignment_started_at, first_opened_at
    )
    values (new.id, v_assignment_started_at, null)
    on conflict (grievance_id) do update
      set assignment_started_at = excluded.assignment_started_at,
          first_opened_at = null;
  end if;

  return new;
end;
$$;

revoke all on function private.capture_grievance_assignment_for_priority() from public, anon, authenticated, service_role;

create trigger trg_grievance_priority_assignment
  after insert or update of organization_id, assigned_officer_id, administrative_state
  on public.grievances
  for each row execute function private.capture_grievance_assignment_for_priority();

create or replace function public.officer_mark_grievance_opened(p_grievance_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_opened_at timestamptz;
  v_organization_id uuid;
begin
  if v_user_id is null
     or private.current_role_of(v_user_id) not in ('gro', 'nodal')
     or not private.can_view_grievance(p_grievance_id) then
    raise exception 'You are not authorised to open this case' using errcode = '42501';
  end if;

  select organization_id into v_organization_id
  from public.grievances
  where id = p_grievance_id;

  insert into public.grievance_priorities (grievance_id, first_opened_at)
  values (p_grievance_id, now())
  on conflict (grievance_id) do update
    set first_opened_at = coalesce(public.grievance_priorities.first_opened_at, excluded.first_opened_at)
  returning first_opened_at into v_opened_at;

  if not exists (
    select 1 from public.case_events
    where grievance_id = p_grievance_id and event_type = 'CASE_OPENED'
  ) then
    insert into public.case_events (
      grievance_id, event_type, actor_type, actor_id, organization_id,
      title, description, metadata, citizen_visible
    )
    values (
      p_grievance_id, 'CASE_OPENED', 'officer', v_user_id, v_organization_id,
      'Case opened by an officer', 'The assigned case was opened for examination.',
      jsonb_build_object('opened_at', v_opened_at), false
    );
  end if;

  return v_opened_at;
end;
$$;

revoke all on function public.officer_mark_grievance_opened(uuid) from public, anon;
grant execute on function public.officer_mark_grievance_opened(uuid) to authenticated;

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
      from public.grievances g
      where g.id = p_grievance_id
        and g.administrative_state = 'CLARIFICATION_REQUIRED'
        and not exists (
          select 1
          from public.messages m
          where m.grievance_id = p_grievance_id
            and m.sender_type = 'citizen'
            and m.created_at > coalesce(
              (
                select max(ce.created_at)
                from public.case_events ce
                where ce.grievance_id = p_grievance_id
                  and ce.event_type = 'CLARIFICATION_REQUESTED'
              ),
              '-infinity'::timestamptz
            )
        )
    );
$$;

create or replace function private.calculate_grievance_priority(
  p_submitted_at timestamptz,
  p_sla_due_at timestamptz,
  p_assignment_started_at timestamptz,
  p_opened_at timestamptz,
  p_last_government_action_at timestamptz,
  p_waiting_on_citizen boolean,
  p_recent_reminder_count integer,
  p_related_case_count integer,
  p_has_active_appeal boolean,
  p_now timestamptz default now()
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  c private.priority_engine_config%rowtype;
  v_score integer := 0;
  v_level public.priority_level := 'NORMAL';
  v_escalation_level smallint := 0;
  v_reasons text[] := '{}'::text[];
  v_assignment_hours integer;
  v_stalled_hours integer;
  v_sla_percent numeric;
  v_elapsed_days integer;
  v_target_days integer;
  v_reminder_points integer;
  v_next_escalation_at timestamptz;
  v_action_anchor timestamptz;
begin
  select * into strict c from private.priority_engine_config where id = 1;

  if p_assignment_started_at is not null and p_opened_at is null and not p_waiting_on_citizen then
    v_assignment_hours := floor(extract(epoch from (p_now - p_assignment_started_at)) / 3600);
    if v_assignment_hours >= c.unopened_strong_hours then
      v_score := v_score + c.unopened_strong_points;
      v_reasons := array_append(v_reasons, format('Assigned but not opened for %s hours', v_assignment_hours));
    elsif v_assignment_hours >= c.unopened_first_hours then
      v_score := v_score + c.unopened_first_points;
      v_reasons := array_append(v_reasons, format('Assigned but not opened for %s hours', v_assignment_hours));
    end if;
  end if;

  v_action_anchor := greatest(p_opened_at, p_last_government_action_at);
  if p_opened_at is not null and v_action_anchor is null then
    v_action_anchor := p_opened_at;
  end if;

  if v_action_anchor is not null and not p_waiting_on_citizen then
    v_stalled_hours := floor(extract(epoch from (p_now - v_action_anchor)) / 3600);
    if v_stalled_hours >= c.stalled_strong_hours then
      v_score := v_score + c.stalled_strong_points;
      v_reasons := array_append(v_reasons, format('No meaningful government action for %s days', floor(v_stalled_hours / 24.0)));
    elsif v_stalled_hours >= c.stalled_first_hours then
      v_score := v_score + c.stalled_first_points;
      v_reasons := array_append(v_reasons, format('No meaningful government action for %s days', floor(v_stalled_hours / 24.0)));
    end if;
  end if;

  if p_waiting_on_citizen then
    v_reasons := array_append(v_reasons, 'Government inactivity escalation paused while required citizen action is outstanding');
  end if;

  if p_submitted_at is not null and p_sla_due_at is not null and p_sla_due_at > p_submitted_at then
    v_sla_percent := 100 * extract(epoch from (p_now - p_submitted_at))
      / nullif(extract(epoch from (p_sla_due_at - p_submitted_at)), 0);
    v_elapsed_days := greatest(0, floor(extract(epoch from (p_now - p_submitted_at)) / 86400));
    v_target_days := greatest(1, ceil(extract(epoch from (p_sla_due_at - p_submitted_at)) / 86400));

    if v_sla_percent >= c.sla_breach_percent then
      v_score := v_score + c.sla_breach_points;
      v_reasons := array_append(v_reasons, format('SLA breached: %s of %s target days elapsed', v_elapsed_days, v_target_days));
    elsif v_sla_percent >= c.sla_high_percent then
      v_score := v_score + c.sla_high_points;
      v_reasons := array_append(v_reasons, format('%s of %s target days elapsed (at least %s%% of SLA)', v_elapsed_days, v_target_days, c.sla_high_percent));
    elsif v_sla_percent >= c.sla_elevated_percent then
      v_score := v_score + c.sla_elevated_points;
      v_reasons := array_append(v_reasons, format('%s of %s target days elapsed (at least %s%% of SLA)', v_elapsed_days, v_target_days, c.sla_elevated_percent));
    elsif v_sla_percent >= c.sla_first_percent then
      v_score := v_score + c.sla_first_points;
      v_reasons := array_append(v_reasons, format('%s of %s target days elapsed (at least %s%% of SLA)', v_elapsed_days, v_target_days, c.sla_first_percent));
    end if;
  end if;

  v_reminder_points := least(
    greatest(coalesce(p_recent_reminder_count, 0), 0) * c.reminder_points,
    c.reminder_points_cap
  );
  if v_reminder_points > 0 then
    v_score := v_score + v_reminder_points;
    v_reasons := array_append(
      v_reasons,
      format('%s recent citizen reminder%s (contribution capped at %s points)',
        p_recent_reminder_count,
        case when p_recent_reminder_count = 1 then '' else 's' end,
        c.reminder_points_cap)
    );
  end if;

  if coalesce(p_related_case_count, 0) > 0 then
    v_score := v_score + c.related_case_points;
    v_reasons := array_append(v_reasons, format('%s related grievance%s indicate a repeated issue',
      p_related_case_count,
      case when p_related_case_count = 1 then '' else 's' end));
  end if;

  if p_has_active_appeal then
    v_score := v_score + c.active_appeal_points;
    v_reasons := array_append(v_reasons, 'An active appeal requires senior review attention');
  end if;

  v_score := least(100, greatest(0, v_score));
  if v_score >= c.critical_min_score
     or (v_sla_percent is not null and v_sla_percent >= c.sla_breach_percent) then
    v_level := 'CRITICAL';
    v_escalation_level := 2;
  elsif v_score >= c.high_min_score then
    v_level := 'HIGH';
    v_escalation_level := 1;
  elsif v_score >= c.elevated_min_score then
    v_level := 'ELEVATED';
  end if;

  if not p_waiting_on_citizen and p_assignment_started_at is not null and p_opened_at is null then
    if p_assignment_started_at + make_interval(hours => c.unopened_first_hours) > p_now then
      v_next_escalation_at := p_assignment_started_at + make_interval(hours => c.unopened_first_hours);
    elsif p_assignment_started_at + make_interval(hours => c.unopened_strong_hours) > p_now then
      v_next_escalation_at := p_assignment_started_at + make_interval(hours => c.unopened_strong_hours);
    end if;
  end if;

  if not p_waiting_on_citizen and v_action_anchor is not null then
    if v_action_anchor + make_interval(hours => c.stalled_first_hours) > p_now then
      v_next_escalation_at := least(v_next_escalation_at, v_action_anchor + make_interval(hours => c.stalled_first_hours));
    elsif v_action_anchor + make_interval(hours => c.stalled_strong_hours) > p_now then
      v_next_escalation_at := least(v_next_escalation_at, v_action_anchor + make_interval(hours => c.stalled_strong_hours));
    end if;
  end if;

  if p_submitted_at is not null and p_sla_due_at is not null and p_sla_due_at > p_submitted_at then
    v_next_escalation_at := least(
      v_next_escalation_at,
      case when p_submitted_at + (p_sla_due_at - p_submitted_at) * (c.sla_first_percent / 100) > p_now
        then p_submitted_at + (p_sla_due_at - p_submitted_at) * (c.sla_first_percent / 100) end,
      case when p_submitted_at + (p_sla_due_at - p_submitted_at) * (c.sla_elevated_percent / 100) > p_now
        then p_submitted_at + (p_sla_due_at - p_submitted_at) * (c.sla_elevated_percent / 100) end,
      case when p_submitted_at + (p_sla_due_at - p_submitted_at) * (c.sla_high_percent / 100) > p_now
        then p_submitted_at + (p_sla_due_at - p_submitted_at) * (c.sla_high_percent / 100) end,
      case when p_sla_due_at > p_now then p_sla_due_at end
    );
  end if;

  return jsonb_build_object(
    'score', v_score,
    'level', v_level,
    'reasons', to_jsonb(v_reasons),
    'escalation_level', v_escalation_level,
    'next_escalation_at', v_next_escalation_at,
    'sla_percent', v_sla_percent
  );
end;
$$;

create or replace function private.evaluate_grievance_priority(
  p_grievance_id uuid,
  p_now timestamptz default now()
)
returns public.priority_level
language plpgsql
security definer
set search_path = ''
as $$
declare
  g public.grievances%rowtype;
  old_state public.grievance_priorities%rowtype;
  v_had_state boolean;
  v_assignment_started_at timestamptz;
  v_opened_at timestamptz;
  v_last_action_at timestamptz;
  v_waiting boolean;
  v_reminders integer;
  v_related integer;
  v_has_appeal boolean;
  v_calc jsonb;
  v_score smallint;
  v_level public.priority_level;
  v_reasons text[];
  v_escalation_level smallint;
  v_next_escalation_at timestamptz;
  v_recipient uuid;
begin
  select * into strict g from public.grievances where id = p_grievance_id;

  select * into old_state
  from public.grievance_priorities
  where grievance_id = p_grievance_id
  for update;
  v_had_state := found;

  v_assignment_started_at := old_state.assignment_started_at;
  v_opened_at := old_state.first_opened_at;
  if v_assignment_started_at is null
     and (g.assigned_officer_id is not null or g.administrative_state = 'ASSIGNED') then
    select coalesce(
      max(ce.created_at) filter (where ce.event_type in ('CASE_ASSIGNED', 'GRIEVANCE_ASSIGNED')),
      g.updated_at,
      g.submitted_at,
      g.created_at
    ) into v_assignment_started_at
    from public.case_events ce
    where ce.grievance_id = g.id;
  end if;

  select greatest(
    max(ce.created_at) filter (where ce.actor_type = 'officer' and ce.event_type in (
      'DOCUMENT_REQUESTED', 'CLARIFICATION_REQUESTED', 'INTERIM_UPDATE_ADDED',
      'CASE_TRANSFERRED', 'EVIDENCE_ATTACHED', 'RESOLUTION_SUBMITTED',
      'APPEAL_UPDATE_ADDED', 'APPEAL_DECIDED'
    )),
    (select max(r.created_at) from public.resolutions r where r.grievance_id = g.id)
  ) into v_last_action_at
  from public.case_events ce
  where ce.grievance_id = g.id;

  v_waiting := private.grievance_waiting_on_citizen(g.id);

  select count(*)::integer into v_reminders
  from public.case_events ce
  cross join private.priority_engine_config c
  where ce.grievance_id = g.id
    and ce.event_type = 'CITIZEN_REMINDER_SENT'
    and ce.actor_type = 'citizen'
    and ce.created_at >= p_now - make_interval(days => c.reminder_window_days);

  select count(distinct other.grievance_id)::integer into v_related
  from public.issue_cluster_members mine
  join public.issue_cluster_members other
    on other.cluster_id = mine.cluster_id and other.grievance_id <> mine.grievance_id
  where mine.grievance_id = g.id;

  select exists (
    select 1 from public.appeals a
    where a.grievance_id = g.id and a.state in ('FILED', 'UNDER_REVIEW')
  ) into v_has_appeal;

  if g.administrative_state in ('DISPOSED', 'CLOSED', 'APPEAL_DECIDED')
     or g.citizen_confirmation_state = 'CONFIRMED_RESOLVED' then
    v_score := 0;
    v_level := 'NORMAL';
    v_reasons := array['Case is no longer active for government inactivity escalation'];
    v_escalation_level := 0;
    v_next_escalation_at := null;
  else
    v_calc := private.calculate_grievance_priority(
      coalesce(g.submitted_at, g.created_at), g.sla_due_at,
      v_assignment_started_at, v_opened_at, v_last_action_at,
      v_waiting, v_reminders, v_related, v_has_appeal, p_now
    );
    v_score := (v_calc->>'score')::smallint;
    v_level := (v_calc->>'level')::public.priority_level;
    select coalesce(array_agg(value), '{}'::text[]) into v_reasons
    from jsonb_array_elements_text(v_calc->'reasons');
    v_escalation_level := (v_calc->>'escalation_level')::smallint;
    v_next_escalation_at := (v_calc->>'next_escalation_at')::timestamptz;
  end if;

  insert into public.grievance_priorities (
    grievance_id, priority_score, priority_level, priority_reasons,
    assignment_started_at, first_opened_at, last_meaningful_government_action_at,
    escalation_level, next_escalation_at, waiting_on_citizen, evaluated_at
  ) values (
    g.id, v_score, v_level, v_reasons,
    v_assignment_started_at, v_opened_at, v_last_action_at,
    v_escalation_level, v_next_escalation_at, v_waiting, p_now
  )
  on conflict (grievance_id) do update set
    priority_score = excluded.priority_score,
    priority_level = excluded.priority_level,
    priority_reasons = excluded.priority_reasons,
    assignment_started_at = excluded.assignment_started_at,
    first_opened_at = excluded.first_opened_at,
    last_meaningful_government_action_at = excluded.last_meaningful_government_action_at,
    escalation_level = excluded.escalation_level,
    next_escalation_at = excluded.next_escalation_at,
    waiting_on_citizen = excluded.waiting_on_citizen,
    evaluated_at = excluded.evaluated_at;

  if (v_had_state and old_state.priority_level is distinct from v_level)
     or (not v_had_state and v_level <> 'NORMAL') then
    insert into public.case_events (
      grievance_id, event_type, actor_type, organization_id, title,
      description, metadata, citizen_visible
    ) values (
      g.id, 'PRIORITY_CHANGED', 'system', g.organization_id, 'Case priority changed',
      format('Priority is now %s (score %s).', v_level, v_score),
      jsonb_build_object(
        'previous_level', case when v_had_state then old_state.priority_level else null end,
        'new_level', v_level,
        'previous_score', case when v_had_state then old_state.priority_score else null end,
        'new_score', v_score,
        'reasons', to_jsonb(v_reasons)
      ),
      false
    );
  end if;

  if v_escalation_level > (case when v_had_state then old_state.escalation_level else 0 end) then
    insert into public.case_events (
      grievance_id, event_type, actor_type, organization_id, title,
      description, metadata, citizen_visible
    ) values (
      g.id, 'ESCALATION_TRIGGERED', 'system', g.organization_id, 'Attention escalation triggered',
      case when v_escalation_level = 2
        then 'Critical or SLA-breach attention was sent to the responsible officer and authorised Nodal supervision.'
        else 'High-priority attention was sent to the responsible officer.' end,
      jsonb_build_object('priority_level', v_level, 'priority_score', v_score, 'reasons', to_jsonb(v_reasons)),
      false
    );

    for v_recipient in
      select distinct recipient_id
      from (
        select p.id as recipient_id
        from public.profiles p
        where p.role in ('gro', 'nodal')
          and (
            p.id = g.assigned_officer_id
            or (g.assigned_officer_id is null and p.role = 'gro' and p.organization_id = g.organization_id)
          )
        union all
        select p.id as recipient_id
        from public.profiles p
        where v_escalation_level = 2
          and p.role = 'nodal'
          and p.organization_id is not null
          and g.organization_id in (select private.org_subtree(p.organization_id))
      ) recipients
    loop
      insert into public.notifications (
        user_id, grievance_id, title, body, kind, action_required
      ) values (
        v_recipient,
        g.id,
        case when v_escalation_level = 2 then 'Critical grievance needs attention' else 'High-priority grievance needs attention' end,
        format('%s (%s) is %s. %s', g.short_title, g.registration_number, v_level, array_to_string(v_reasons, '; ')),
        'priority_escalation',
        true
      );
    end loop;
  end if;

  return v_level;
end;
$$;

create or replace function private.evaluate_all_grievance_priorities(p_now timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_grievance_id uuid;
  v_count integer := 0;
begin
  for v_grievance_id in
    select g.id from public.grievances g where g.submitted_at is not null order by g.id
  loop
    perform private.evaluate_grievance_priority(v_grievance_id, p_now);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

revoke all on function private.grievance_waiting_on_citizen(uuid) from public, anon, authenticated, service_role;
revoke all on function private.calculate_grievance_priority(timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, integer, integer, boolean, timestamptz) from public, anon, authenticated, service_role;
revoke all on function private.evaluate_grievance_priority(uuid, timestamptz) from public, anon, authenticated, service_role;
revoke all on function private.evaluate_all_grievance_priorities(timestamptz) from public, anon, authenticated, service_role;

-- Supabase Cron runs the database function locally with no service-role secret
-- and records each invocation in cron.job_run_details.
create extension if not exists pg_cron with schema pg_catalog;

select cron.schedule(
  'cpgrams-priority-evaluation',
  '*/15 * * * *',
  'select private.evaluate_all_grievance_priorities();'
);

-- Seed current cases immediately; subsequent evaluations are scheduled above.
select private.evaluate_all_grievance_priorities();
