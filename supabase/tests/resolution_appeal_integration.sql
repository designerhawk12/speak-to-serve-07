-- Linked integration check. Every mutation is rolled back. It verifies the
-- deployed, security-invoker citizen lifecycle rather than a mocked RPC.
begin;

savepoint resolution_submission;
do $setup$
declare
  v_grievance_id uuid := '73788a69-4ab7-4eec-aa56-4d533c335e31';
  v_gro_id uuid;
  v_organization_id uuid;
begin
  select id, organization_id into strict v_gro_id, v_organization_id
  from public.profiles
  where email = 'gro@demo.cpgrams.in';

  delete from public.feedback where grievance_id = v_grievance_id;
  delete from public.resolutions where grievance_id = v_grievance_id and not is_interim;
  update public.grievances
  set organization_id = v_organization_id,
      assigned_officer_id = v_gro_id,
      administrative_state = 'ACTION_IN_PROGRESS',
      outcome_state = 'UNKNOWN',
      citizen_confirmation_state = 'NOT_REQUESTED',
      government_response_completed_at = null
  where id = v_grievance_id;

  insert into public.grievance_priorities (
    grievance_id, priority_score, priority_level, priority_reasons,
    escalation_level, waiting_on_citizen, evaluated_at
  ) values (
    v_grievance_id, 100, 'CRITICAL', array['Integration fixture was overdue'],
    2, false, statement_timestamp()
  ) on conflict (grievance_id) do update set
    priority_score = excluded.priority_score,
    priority_level = excluded.priority_level,
    priority_reasons = excluded.priority_reasons,
    escalation_level = excluded.escalation_level,
    waiting_on_citizen = excluded.waiting_on_citizen,
    evaluated_at = excluded.evaluated_at;

  insert into public.case_events (
    grievance_id, event_type, actor_type, title, description, metadata, citizen_visible
  ) values (
    v_grievance_id, 'PRIORITY_CHANGED', 'system', 'Historical priority fixture',
    'This row proves priority history is retained.',
    jsonb_build_object('integration_fixture', 'resolution_terminal_history'), false
  );
end;
$setup$;

select set_config(
  'request.jwt.claim.sub',
  (select id::text from public.profiles where email = 'gro@demo.cpgrams.in'),
  true
);
set local role authenticated;
select public.officer_submit_resolution(
  '73788a69-4ab7-4eec-aa56-4d533c335e31',
  'Repaired and tested the streetlights',
  'Streetlights are operational',
  'Review the evidence and confirm whether the lane is lit',
  'The responsible office replaced the failed units and tested the circuit.',
  '',
  'Work order RES-INTEGRATION'
);
reset role;

do $resolution_submission_assertions$
declare v_grievance_id uuid := '73788a69-4ab7-4eec-aa56-4d533c335e31';
begin
  if not exists (
    select 1 from public.grievances
    where id = v_grievance_id
      and administrative_state = 'RESOLUTION_PROVIDED'
      and citizen_confirmation_state = 'AWAITING_CONFIRMATION'
      and outcome_state = 'RESOLUTION_PROPOSED'
      and government_response_completed_at is not null
  ) then
    raise exception 'Officer resolution did not preserve the three lifecycle lanes or stop the SLA';
  end if;
  if not exists (
    select 1 from public.resolutions
    where grievance_id = v_grievance_id
      and not is_interim
      and outcome_achieved = 'Streetlights are operational'
  ) then
    raise exception 'Officer resolution did not persist the claimed achieved outcome';
  end if;
  if not exists (
    select 1 from public.case_events
    where grievance_id = v_grievance_id and event_type = 'RESOLUTION_SUBMITTED'
  ) then
    raise exception 'Officer resolution did not append RESOLUTION_SUBMITTED';
  end if;
  if not exists (
    select 1 from public.notifications
    where grievance_id = v_grievance_id
      and title = 'Review government''s resolution'
      and action_required
  ) then
    raise exception 'Citizen resolution-review notification was not created';
  end if;
  if not exists (
    select 1 from public.grievance_priorities
    where grievance_id = v_grievance_id
      and priority_level = 'NORMAL'
      and priority_score = 0
      and escalation_level = 0
      and next_escalation_at is null
  ) then
    raise exception 'Terminal original-case priority was not normalized';
  end if;
  if not exists (
    select 1 from public.case_events
    where grievance_id = v_grievance_id
      and metadata ->> 'integration_fixture' = 'resolution_terminal_history'
  ) then
    raise exception 'Historical priority event was not retained';
  end if;
end;
$resolution_submission_assertions$;
rollback to savepoint resolution_submission;

-- Normalize the mutable demo grievance inside this outer rollback so prior
-- manual confirmation attempts cannot make the lifecycle checks vacuous.
delete from public.feedback
where grievance_id = '73788a69-4ab7-4eec-aa56-4d533c335e31';
update public.grievances
set administrative_state = 'RESOLUTION_PROVIDED',
    outcome_state = 'RESOLUTION_PROPOSED',
    citizen_confirmation_state = 'AWAITING_CONFIRMATION',
    government_response_completed_at = coalesce(government_response_completed_at, updated_at)
where id = '73788a69-4ab7-4eec-aa56-4d533c335e31';
update public.notifications
set action_required = true, read_at = null
where grievance_id = '73788a69-4ab7-4eec-aa56-4d533c335e31'
  and kind = 'resolution';

select set_config(
  'request.jwt.claim.sub',
  (select id::text from public.profiles where email = 'citizen@demo.cpgrams.in'),
  true
);
set local role authenticated;

savepoint confirmation_yes;
do $yes$
declare
  v_grievance_id uuid := '73788a69-4ab7-4eec-aa56-4d533c335e31';
  v_event_count integer;
begin
  perform set_config('request.jwt.claim.sub', '6fbe0c21-3f41-4a08-b8d7-0b1c76e4cacf', true);
  select count(*) into v_event_count
  from public.case_events
  where grievance_id = v_grievance_id and event_type = 'CITIZEN_CONFIRMED_RESOLVED';
  perform public.citizen_confirm_resolution(v_grievance_id, 'CONFIRMED_RESOLVED', '', '', '', null);
  perform public.citizen_confirm_resolution(v_grievance_id, 'CONFIRMED_RESOLVED', '', '', '', null);
  if not exists (select 1 from public.grievances where id = v_grievance_id and citizen_confirmation_state = 'CONFIRMED_RESOLVED' and outcome_state = 'RESOLVED') then
    raise exception 'YES confirmation did not persist the expected grievance states';
  end if;
  if not exists (select 1 from public.case_events where grievance_id = v_grievance_id and event_type = 'CITIZEN_CONFIRMED_RESOLVED' and actor_id = auth.uid()) then
    raise exception 'YES confirmation did not append its immutable case event';
  end if;
  if (select count(*) from public.case_events where grievance_id = v_grievance_id and event_type = 'CITIZEN_CONFIRMED_RESOLVED') <> v_event_count + 1 then
    raise exception 'Repeated YES confirmation created a duplicate immutable event';
  end if;
  if exists (select 1 from public.notifications where grievance_id = v_grievance_id and user_id = auth.uid() and kind = 'resolution' and action_required) then
    raise exception 'YES confirmation did not close the resolution-review action';
  end if;
end;
$yes$;
rollback to savepoint confirmation_yes;

savepoint confirmation_partly;
do $partly$
declare v_grievance_id uuid := '73788a69-4ab7-4eec-aa56-4d533c335e31';
begin
  perform set_config('request.jwt.claim.sub', '6fbe0c21-3f41-4a08-b8d7-0b1c76e4cacf', true);
  perform public.citizen_confirm_resolution(v_grievance_id, 'PARTIALLY_RESOLVED', 'One light was repaired', 'The lane remains dark', '', null);
  if not exists (select 1 from public.feedback where grievance_id = v_grievance_id and confirmation = 'PARTIALLY_RESOLVED' and what_was_fixed = 'One light was repaired' and what_remains_unresolved = 'The lane remains dark') then
    raise exception 'PARTLY confirmation did not persist structured disagreement';
  end if;
  if not exists (select 1 from public.grievances where id = v_grievance_id and citizen_confirmation_state = 'PARTIALLY_RESOLVED' and outcome_state = 'PARTIALLY_RESOLVED') then
    raise exception 'PARTLY confirmation did not persist its lifecycle states';
  end if;
  if not exists (select 1 from public.case_events where grievance_id = v_grievance_id and event_type = 'CITIZEN_CONFIRMED_PARTLY_RESOLVED') then
    raise exception 'PARTLY confirmation did not append its immutable event';
  end if;
end;
$partly$;
rollback to savepoint confirmation_partly;

savepoint confirmation_no_and_appeal;
do $no$
declare v_grievance_id uuid := '73788a69-4ab7-4eec-aa56-4d533c335e31'; v_appeal_id uuid;
begin
  perform set_config('request.jwt.claim.sub', '6fbe0c21-3f41-4a08-b8d7-0b1c76e4cacf', true);
  perform public.citizen_confirm_resolution(v_grievance_id, 'NOT_RESOLVED', '', 'No repair was completed', 'Repair the streetlights', null);
  select public.citizen_create_appeal(v_grievance_id, 'The streetlights remain dark.', 'Repair all streetlights.') into strict v_appeal_id;
  if not exists (select 1 from public.grievances where id = v_grievance_id and administrative_state = 'APPEAL_FILED' and citizen_confirmation_state = 'NOT_RESOLVED' and outcome_state = 'UNRESOLVED') then
    raise exception 'NO confirmation plus appeal did not preserve lifecycle lanes';
  end if;
  if not exists (select 1 from public.case_events where grievance_id = v_grievance_id and event_type = 'CITIZEN_REJECTED_RESOLUTION') then
    raise exception 'NO confirmation did not append CITIZEN_REJECTED_RESOLUTION';
  end if;
  if not exists (select 1 from public.appeal_events where appeal_id = v_appeal_id and event_type = 'APPEAL_CREATED') then
    raise exception 'Appeal creation did not append its immutable appeal event';
  end if;
  perform set_config('request.jwt.claim.sub', '9fea16f1-c4a8-491d-9299-1df34d688a48', true);
  if not exists (select 1 from public.appeals where id = v_appeal_id) then
    raise exception 'Assigned Appellate Authority cannot see its authorized appeal';
  end if;
end;
$no$;
rollback to savepoint confirmation_no_and_appeal;

-- Regression: a citizen may receive a later government resolution after an
-- earlier PARTLY/NO response. Historical feedback for the earlier resolution
-- must not make the later resolution's YES/PARTLY/NO controls fail.
savepoint follow_up_resolution_confirmation;
select set_config(
  'request.jwt.claim.sub',
  '6fbe0c21-3f41-4a08-b8d7-0b1c76e4cacf',
  true
);
set local role authenticated;
select public.citizen_confirm_resolution(
  '90000000-0000-4000-8000-000000000011',
  'CONFIRMED_RESOLVED',
  '', '', '', null
);
reset role;

do $follow_up_resolution_assertions$
declare
  v_grievance_id uuid := '90000000-0000-4000-8000-000000000011';
  v_latest_resolution_id uuid;
begin
  select id into strict v_latest_resolution_id
  from public.resolutions
  where grievance_id = v_grievance_id
    and not is_interim
  order by created_at desc, id desc
  limit 1;

  if not exists (
    select 1 from public.grievances
    where id = v_grievance_id
      and citizen_confirmation_state = 'CONFIRMED_RESOLVED'
      and outcome_state = 'RESOLVED'
  ) then
    raise exception 'A later resolution could not be confirmed after historical feedback';
  end if;

  if not exists (
    select 1 from public.feedback
    where grievance_id = v_grievance_id
      and resolution_id = v_latest_resolution_id
      and confirmation = 'CONFIRMED_RESOLVED'
  ) then
    raise exception 'The later confirmation was not linked to its final resolution';
  end if;
end;
$follow_up_resolution_assertions$;
rollback to savepoint follow_up_resolution_confirmation;

rollback;
select 'resolution and appeal integration checks passed' as result;
