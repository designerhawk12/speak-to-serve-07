-- Linked integration check. Every mutation is rolled back. It verifies the
-- deployed, security-invoker citizen lifecycle rather than a mocked RPC.
begin;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  (select id::text from public.profiles where email = 'citizen@demo.cpgrams.in'),
  true
);

savepoint confirmation_yes;
do $yes$
declare v_grievance_id uuid := '73788a69-4ab7-4eec-aa56-4d533c335e31';
begin
  perform set_config('request.jwt.claim.sub', '6fbe0c21-3f41-4a08-b8d7-0b1c76e4cacf', true);
  perform public.citizen_confirm_resolution(v_grievance_id, 'CONFIRMED_RESOLVED', '', '', '', null);
  if not exists (select 1 from public.grievances where id = v_grievance_id and citizen_confirmation_state = 'CONFIRMED_RESOLVED' and outcome_state = 'RESOLVED') then
    raise exception 'YES confirmation did not persist the expected grievance states';
  end if;
  if not exists (select 1 from public.case_events where grievance_id = v_grievance_id and event_type = 'CITIZEN_CONFIRMED_RESOLVED' and actor_id = auth.uid()) then
    raise exception 'YES confirmation did not append its immutable case event';
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

rollback;
select 'resolution and appeal integration checks passed' as result;
