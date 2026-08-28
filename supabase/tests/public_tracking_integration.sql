-- Rollback-only anonymous public tracking verification.
begin;

do $$
declare
  v_citizen_id uuid;
  v_category_id uuid;
  v_organization_id uuid;
  v_grievance_id uuid := '92000000-0000-4000-8000-000000000001';
  v_appeal_id uuid := '92000000-0000-4000-8000-000000000002';
begin
  select id into v_citizen_id from public.profiles where role = 'citizen' order by created_at limit 1;
  select id into v_category_id from public.grievance_categories where is_active order by created_at limit 1;
  select id into v_organization_id from public.organizations where is_active order by created_at limit 1;
  if v_citizen_id is null or v_category_id is null or v_organization_id is null then
    raise exception 'Public tracking integration requires the existing demo citizen/category/organization';
  end if;

  insert into public.grievances (
    id, registration_number, citizen_id, original_text, short_title, requested_outcome,
    category_id, organization_id, administrative_state, submitted_at
  ) values (
    v_grievance_id, 'CPG-TEST-PUBLIC-0123456789', v_citizen_id,
    'PRIVATE ORIGINAL GRIEVANCE TEXT MUST NOT BE PUBLIC', 'Private test title',
    'PRIVATE REQUESTED OUTCOME MUST NOT BE PUBLIC', v_category_id, v_organization_id,
    'ASSIGNED', now()
  );
  insert into public.case_events (grievance_id, event_type, title, description, citizen_visible)
  values
    (v_grievance_id, 'GRIEVANCE_SUBMITTED', 'PRIVATE EVENT TITLE', 'PRIVATE EVENT DESCRIPTION', true),
    (v_grievance_id, 'INTERNAL_ONLY_EVENT', 'INTERNAL TITLE', 'INTERNAL DESCRIPTION', false);
  insert into public.documents (grievance_id, storage_path, file_name, doc_kind)
  values (v_grievance_id, 'private/test.pdf', 'private.pdf', 'citizen_evidence');
  insert into public.messages (grievance_id, body, citizen_visible)
  values (v_grievance_id, 'PRIVATE MESSAGE BODY', true);
  insert into public.appeals (
    id, reference_number, grievance_id, citizen_id, appellate_organization_id, grounds, requested_relief, state
  ) values (
    v_appeal_id, 'APL-TEST-PUBLIC-0123456789', v_grievance_id, v_citizen_id,
    v_organization_id, 'PRIVATE APPEAL GROUNDS', 'PRIVATE RELIEF', 'UNDER_REVIEW'
  );
  insert into public.appeal_events (appeal_id, event_type, title, description, citizen_visible)
  values
    (v_appeal_id, 'APPEAL_CREATED', 'PRIVATE APPEAL EVENT TITLE', 'PRIVATE APPEAL EVENT DESCRIPTION', true),
    (v_appeal_id, 'INTERNAL_APPEAL_EVENT', 'INTERNAL APPEAL TITLE', 'INTERNAL APPEAL DESCRIPTION', false);
end;
$$;

set local role anon;
select set_config('request.headers', '{"x-forwarded-for":"198.51.100.99","user-agent":"cpgrams-public-integration"}', true);

with result as (select public.public_track_grievance('CPG-TEST-PUBLIC-0123456789') as payload)
select
  (payload->>'found' = 'true') as valid_grievance_reference,
  not (payload ? 'citizen_id') as citizen_absent,
  not (payload ? 'original_text') as original_text_absent,
  not (payload ? 'requested_outcome') as requested_outcome_absent,
  not (payload ? 'documents') as documents_absent,
  not (payload ? 'messages') as messages_absent,
  not (payload::text like '%PRIVATE%') as private_event_content_absent
from result;

select (public.public_track_grievance('CPG-NOT-FOUND-0123456789')->>'found' = 'false') as invalid_grievance_reference;

with result as (select public.public_track_appeal('APL-TEST-PUBLIC-0123456789') as payload)
select
  (payload->>'found' = 'true') as valid_appeal_reference,
  not (payload ? 'grounds') as grounds_absent,
  not (payload ? 'requested_relief') as requested_relief_absent,
  not (payload ? 'decision_summary') as decision_absent,
  not (payload ? 'documents') as documents_absent,
  not (payload::text like '%PRIVATE%') as private_event_content_absent
from result;

select (public.public_track_appeal('APL-NOT-FOUND-0123456789')->>'found' = 'false') as invalid_appeal_reference;

select set_config('request.headers', '{"x-forwarded-for":"198.51.100.100","user-agent":"cpgrams-public-rate-test"}', true);
with calls as (
  select public.public_track_grievance('CPG-TEST-PUBLIC-0123456789') as payload
  from generate_series(1, 13)
)
select
  count(*) filter (where payload->>'found' = 'true') = 12 as first_twelve_allowed,
  count(*) filter (where payload->>'found' = 'false') = 1 as thirteenth_generically_denied
from calls;

rollback;
