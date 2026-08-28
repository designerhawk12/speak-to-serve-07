-- Privacy-safe public fallback tracking. The private case tables remain under
-- their existing RLS policies; anonymous callers can execute only these
-- narrowly-shaped lookup functions.

create table if not exists private.public_tracking_lookup_attempts (
  scope text not null check (scope in ('grievance', 'appeal')),
  client_key text not null,
  requested_at timestamptz not null default now()
);

alter table private.public_tracking_lookup_attempts enable row level security;
revoke all on table private.public_tracking_lookup_attempts from public, anon, authenticated;
create index if not exists public_tracking_lookup_attempts_rate_idx
  on private.public_tracking_lookup_attempts (scope, client_key, requested_at desc);

-- New references use 80 bits of randomness. Existing references remain valid;
-- lookup rate limiting and generic responses protect their transition period.
alter table public.grievances
  alter column registration_number set default (
    'CPG-' || to_char(now(), 'YYYY') || '-' ||
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 20))
  );

alter table public.appeals
  alter column reference_number set default (
    'APL-' || to_char(now(), 'YYYY') || '-' ||
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 20))
  );

create or replace function public.public_track_grievance(p_registration_number text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reference text := upper(trim(coalesce(p_registration_number, '')));
  v_headers jsonb := coalesce(current_setting('request.headers', true), '{}')::jsonb;
  v_client_key text;
  v_attempt_count integer;
  v_grievance public.grievances%rowtype;
  v_category_name text;
  v_organization_name text;
  v_milestones jsonb := '[]'::jsonb;
  v_last_public_update_at timestamptz;
  v_stage text;
  v_resolution_status text;
  v_appeal_status text;
begin
  -- Registration values must be sufficiently formed before any lookup. The
  -- same generic result is returned for malformed, absent, and rate-limited values.
  if v_reference !~ '^[A-Z0-9][A-Z0-9-]{7,79}$' then
    return jsonb_build_object('found', false);
  end if;

  v_client_key := md5(
    'cpgrams-public-tracking:' ||
    coalesce(split_part(v_headers ->> 'x-forwarded-for', ',', 1), '') || ':' ||
    coalesce(v_headers ->> 'user-agent', '')
  );

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('public-tracking:' || v_client_key));
  delete from private.public_tracking_lookup_attempts
  where requested_at < now() - interval '5 minutes';

  select count(*) into v_attempt_count
  from private.public_tracking_lookup_attempts
  where scope = 'grievance'
    and client_key = v_client_key
    and requested_at >= now() - interval '1 minute';

  if v_attempt_count >= 12 then
    return jsonb_build_object('found', false);
  end if;

  insert into private.public_tracking_lookup_attempts (scope, client_key)
  values ('grievance', v_client_key);

  select g.* into v_grievance
  from public.grievances g
  where g.registration_number = v_reference;

  if not found then
    return jsonb_build_object('found', false);
  end if;

  select c.name into v_category_name
  from public.grievance_categories c
  where c.id = v_grievance.category_id;

  select o.name into v_organization_name
  from public.organizations o
  where o.id = v_grievance.organization_id;

  select
    coalesce(
      jsonb_agg(
        jsonb_build_object('occurred_at', milestone.created_at, 'stage', milestone.stage)
        order by milestone.created_at
      ),
      '[]'::jsonb
    ),
    max(milestone.created_at)
  into v_milestones, v_last_public_update_at
  from (
    select ce.created_at,
      case ce.event_type
        when 'GRIEVANCE_SUBMITTED' then 'Grievance submitted'
        when 'CASE_ASSIGNED' then 'Assigned to an office'
        when 'GRIEVANCE_ASSIGNED' then 'Assigned to an office'
        when 'CASE_TRANSFERRED' then 'Transferred to another office'
        when 'DOCUMENT_REQUESTED' then 'Information requested'
        when 'CLARIFICATION_REQUESTED' then 'Information requested'
        when 'CITIZEN_RESPONDED' then 'Citizen response received'
        when 'INTERIM_UPDATE_ADDED' then 'Government update recorded'
        when 'RESOLUTION_SUBMITTED' then 'Government response provided'
        when 'CITIZEN_CONFIRMED_RESOLVED' then 'Citizen outcome recorded'
        when 'CITIZEN_CONFIRMED_PARTLY_RESOLVED' then 'Citizen outcome recorded'
        when 'CITIZEN_CONFIRMED_NOT_RESOLVED' then 'Citizen outcome recorded'
        when 'CITIZEN_REJECTED_RESOLUTION' then 'Citizen outcome recorded'
        when 'APPEAL_CREATED' then 'Appeal filed'
        when 'APPEAL_DECIDED' then 'Appeal decision recorded'
      end as stage
    from public.case_events ce
    where ce.grievance_id = v_grievance.id
      and ce.citizen_visible
      and ce.event_type in (
        'GRIEVANCE_SUBMITTED', 'CASE_ASSIGNED', 'GRIEVANCE_ASSIGNED',
        'CASE_TRANSFERRED', 'DOCUMENT_REQUESTED', 'CLARIFICATION_REQUESTED',
        'CITIZEN_RESPONDED', 'INTERIM_UPDATE_ADDED', 'RESOLUTION_SUBMITTED',
        'CITIZEN_CONFIRMED_RESOLVED', 'CITIZEN_CONFIRMED_PARTLY_RESOLVED',
        'CITIZEN_CONFIRMED_NOT_RESOLVED', 'CITIZEN_REJECTED_RESOLUTION',
        'APPEAL_CREATED', 'APPEAL_DECIDED'
      )
    order by ce.created_at desc
    limit 12
  ) milestone;

  v_stage := case v_grievance.administrative_state
    when 'DRAFT' then 'Draft'
    when 'SUBMITTED' then 'Submitted'
    when 'ROUTING' then 'Being routed'
    when 'ROUTED' then 'Routed to an office'
    when 'ASSIGNED' then 'With an office'
    when 'UNDER_EXAMINATION' then 'Under examination'
    when 'CLARIFICATION_REQUIRED' then 'Waiting for citizen information'
    when 'CITIZEN_RESPONSE_RECEIVED' then 'Citizen response received'
    when 'ACTION_IN_PROGRESS' then 'Government action in progress'
    when 'INTERIM_RESPONSE' then 'Government update recorded'
    when 'RESOLUTION_PROVIDED' then 'Government response provided'
    when 'DISPOSED' then 'Government processing complete'
    when 'APPEAL_FILED' then 'Appeal filed'
    when 'APPEAL_UNDER_REVIEW' then 'Appeal under review'
    when 'APPEAL_DECIDED' then 'Appeal decided'
    when 'CLOSED' then 'Closed'
    else 'Status recorded'
  end;

  v_resolution_status := case
    when v_grievance.citizen_confirmation_state = 'AWAITING_CONFIRMATION'
      then 'A government response is available for citizen review'
    when v_grievance.citizen_confirmation_state = 'CONFIRMED_RESOLVED'
      then 'Citizen-confirmed resolved'
    when v_grievance.citizen_confirmation_state = 'PARTIALLY_RESOLVED'
      then 'Citizen reported a partly resolved outcome'
    when v_grievance.citizen_confirmation_state = 'NOT_RESOLVED'
      then 'Citizen reported an unresolved outcome'
    else 'No citizen outcome review is currently recorded'
  end;

  v_appeal_status := case
    when v_grievance.administrative_state in ('APPEAL_FILED', 'APPEAL_UNDER_REVIEW', 'APPEAL_DECIDED')
      then 'An appeal is on record'
    when v_grievance.citizen_confirmation_state in ('PARTIALLY_RESOLVED', 'NOT_RESOLVED')
      then 'An appeal may be available'
    else 'No public appeal action is currently shown'
  end;

  return jsonb_build_object(
    'found', true,
    'registration_number', v_grievance.registration_number,
    'category', v_category_name,
    'administrative_stage', v_stage,
    'organization_name', v_organization_name,
    'submitted_at', v_grievance.submitted_at,
    'last_updated_at', coalesce(v_last_public_update_at, v_grievance.submitted_at, v_grievance.created_at),
    'milestones', v_milestones,
    'resolution_status', v_resolution_status,
    'appeal_status', v_appeal_status
  );
end;
$$;

create or replace function public.public_track_appeal(p_reference_number text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reference text := upper(trim(coalesce(p_reference_number, '')));
  v_headers jsonb := coalesce(current_setting('request.headers', true), '{}')::jsonb;
  v_client_key text;
  v_attempt_count integer;
  v_appeal public.appeals%rowtype;
  v_organization_name text;
  v_milestones jsonb := '[]'::jsonb;
  v_last_public_update_at timestamptz;
  v_stage text;
begin
  if v_reference !~ '^[A-Z0-9][A-Z0-9-]{7,79}$' then
    return jsonb_build_object('found', false);
  end if;

  v_client_key := md5(
    'cpgrams-public-tracking:' ||
    coalesce(split_part(v_headers ->> 'x-forwarded-for', ',', 1), '') || ':' ||
    coalesce(v_headers ->> 'user-agent', '')
  );

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('public-tracking:' || v_client_key));
  delete from private.public_tracking_lookup_attempts
  where requested_at < now() - interval '5 minutes';

  select count(*) into v_attempt_count
  from private.public_tracking_lookup_attempts
  where scope = 'appeal'
    and client_key = v_client_key
    and requested_at >= now() - interval '1 minute';

  if v_attempt_count >= 12 then
    return jsonb_build_object('found', false);
  end if;

  insert into private.public_tracking_lookup_attempts (scope, client_key)
  values ('appeal', v_client_key);

  select a.* into v_appeal
  from public.appeals a
  where a.reference_number = v_reference;

  if not found then
    return jsonb_build_object('found', false);
  end if;

  select o.name into v_organization_name
  from public.organizations o
  where o.id = v_appeal.appellate_organization_id;

  select
    coalesce(
      jsonb_agg(
        jsonb_build_object('occurred_at', milestone.created_at, 'stage', milestone.stage)
        order by milestone.created_at
      ),
      '[]'::jsonb
    ),
    max(milestone.created_at)
  into v_milestones, v_last_public_update_at
  from (
    select ae.created_at,
      case ae.event_type
        when 'APPEAL_CREATED' then 'Appeal filed'
        when 'APPEAL_DECIDED' then 'Appeal decision recorded'
      end as stage
    from public.appeal_events ae
    where ae.appeal_id = v_appeal.id
      and ae.citizen_visible
      and ae.event_type in ('APPEAL_CREATED', 'APPEAL_DECIDED')
    order by ae.created_at desc
    limit 12
  ) milestone;

  v_stage := case v_appeal.state
    when 'FILED' then 'Appeal filed'
    when 'UNDER_REVIEW' then 'Appeal under review'
    when 'DECIDED' then 'Appeal decided'
    when 'REJECTED' then 'Appeal not accepted'
    when 'WITHDRAWN' then 'Appeal withdrawn'
    else 'Status recorded'
  end;

  return jsonb_build_object(
    'found', true,
    'reference_number', v_appeal.reference_number,
    'appeal_stage', v_stage,
    'appellate_organization_name', v_organization_name,
    'filed_at', v_appeal.filed_at,
    'last_updated_at', coalesce(v_last_public_update_at, v_appeal.filed_at, v_appeal.created_at),
    'milestones', v_milestones
  );
end;
$$;

revoke all on function public.public_track_grievance(text) from public, anon, authenticated, service_role;
revoke all on function public.public_track_appeal(text) from public, anon, authenticated, service_role;
grant execute on function public.public_track_grievance(text) to anon, authenticated;
grant execute on function public.public_track_appeal(text) to anon, authenticated;
