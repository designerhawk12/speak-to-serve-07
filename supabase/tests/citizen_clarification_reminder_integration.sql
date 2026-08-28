-- Authenticated CASE-01..05 integration checks. Every mutation rolls back.
begin;

do $fixtures$
declare
  v_citizen uuid;
  v_gro uuid;
  v_org uuid;
  v_case_a uuid;
  v_case_b uuid;
begin
  select id into strict v_citizen
  from public.profiles where email = 'citizen@demo.cpgrams.in';
  select id, organization_id into strict v_gro, v_org
  from public.profiles where email = 'gro@demo.cpgrams.in';

  insert into public.grievances (
    citizen_id, original_text, short_title, organization_id, assigned_officer_id,
    administrative_state, submitted_at, sla_due_at
  ) values
    (v_citizen, 'Rollback clarification case A', 'Rollback clarification case A',
      v_org, v_gro, 'ASSIGNED', now() - interval '5 days', now() + interval '16 days'),
    (v_citizen, 'Rollback independent case B', 'Rollback independent case B',
      v_org, v_gro, 'ASSIGNED', now() - interval '5 days', now() + interval '16 days');

  select id into strict v_case_a from public.grievances
  where short_title = 'Rollback clarification case A';
  select id into strict v_case_b from public.grievances
  where short_title = 'Rollback independent case B';

  update public.grievances set assigned_officer_id = v_gro, organization_id = v_org
  where id in (v_case_a, v_case_b);

  perform set_config('cpgrams.case01.case_a', v_case_a::text, true);
  perform set_config('cpgrams.case01.case_b', v_case_b::text, true);
  perform set_config('cpgrams.case01.citizen', v_citizen::text, true);
  perform set_config('cpgrams.case01.gro', v_gro::text, true);
end;
$fixtures$;

select set_config('request.jwt.claim.sub', current_setting('cpgrams.case01.gro'), true);
set local role authenticated;

select public.officer_request_clarification(
  current_setting('cpgrams.case01.case_a')::uuid,
  'Please provide the missing pension payment reference.'
);

do $officer_assertions$
declare
  v_case_a uuid := current_setting('cpgrams.case01.case_a')::uuid;
  v_case_b uuid := current_setting('cpgrams.case01.case_b')::uuid;
begin
  if (select administrative_state from public.grievances where id = v_case_a)
       <> 'CLARIFICATION_REQUIRED' then
    raise exception 'Case A did not enter CLARIFICATION_REQUIRED';
  end if;
  if (select administrative_state from public.grievances where id = v_case_b)
       <> 'ASSIGNED' then
    raise exception 'Case B was changed by Case A clarification';
  end if;
  if (select count(*) from public.clarification_requests
      where grievance_id = v_case_a and fulfilled_at is null) <> 1 then
    raise exception 'Case A does not have exactly one unresolved clarification';
  end if;
  if exists (select 1 from public.clarification_requests where grievance_id = v_case_b) then
    raise exception 'Case A clarification leaked into Case B';
  end if;
  if not exists (
    select 1 from public.case_events
    where grievance_id = v_case_a
      and event_type = 'CLARIFICATION_REQUESTED'
      and metadata->>'pause_reason' = 'WAITING_FOR_CITIZEN_CLARIFICATION'
  ) then
    raise exception 'Clarification event/pause reason missing';
  end if;
  if not exists (
    select 1 from public.grievance_priorities
    where grievance_id = v_case_a and waiting_on_citizen
  ) then
    raise exception 'Priority engine did not pause Case A';
  end if;

  begin
    perform public.officer_request_clarification(v_case_a, 'Rapid duplicate');
    raise exception 'Duplicate unresolved clarification was accepted';
  exception when sqlstate '55000' then null;
  end;
end;
$officer_assertions$;

reset role;
select set_config('request.jwt.claim.sub', current_setting('cpgrams.case01.citizen'), true);
set local role authenticated;

select public.citizen_respond_to_clarification(
  (
    select id from public.clarification_requests
    where grievance_id = current_setting('cpgrams.case01.case_a')::uuid
      and fulfilled_at is null
  ),
  'The pension payment reference is PPO-TEST-123.',
  null
);

do $citizen_assertions$
declare
  v_case_a uuid := current_setting('cpgrams.case01.case_a')::uuid;
  v_case_b uuid := current_setting('cpgrams.case01.case_b')::uuid;
  v_first_status jsonb;
begin
  if exists (
    select 1 from public.clarification_requests
    where grievance_id = v_case_a and fulfilled_at is null
  ) then
    raise exception 'Clarification remained unresolved after citizen response';
  end if;
  if not exists (
    select 1 from public.clarification_requests
    where grievance_id = v_case_a
      and response_text = 'The pension payment reference is PPO-TEST-123.'
      and fulfilled_at is not null
  ) then
    raise exception 'Citizen clarification response was not persisted';
  end if;
  if (select administrative_state from public.grievances where id = v_case_a)
       <> 'CITIZEN_RESPONSE_RECEIVED' then
    raise exception 'Government processing did not resume to CITIZEN_RESPONSE_RECEIVED';
  end if;
  if (public.citizen_reminder_status(v_case_a)->>'waiting_on_citizen')::boolean then
    raise exception 'Waiting-on-citizen did not clear after response';
  end if;
  if not exists (
    select 1 from public.case_events
    where grievance_id = v_case_a
      and event_type = 'CITIZEN_RESPONDED'
      and metadata->>'government_processing_resumed' = 'true'
  ) then
    raise exception 'CITIZEN_RESPONDED event/resume marker missing';
  end if;
  if exists (
    select 1 from public.notifications
    where user_id = current_setting('cpgrams.case01.citizen')::uuid
      and grievance_id = v_case_a
      and kind = 'clarification_request'
      and action_required
  ) then
    raise exception 'Citizen clarification Action Required did not clear';
  end if;
  v_first_status := public.citizen_send_reminder(
    v_case_b,
    'Please share a progress update on this grievance.'
  );
  if (v_first_status->>'eligible')::boolean then
    raise exception 'Reminder cooldown was not applied after first send';
  end if;

  begin
    perform public.citizen_send_reminder(v_case_b, 'Rapid duplicate reminder');
    raise exception 'Rapid duplicate reminder was accepted';
  exception when sqlstate '55000' then null;
  end;

  if (select count(*) from public.case_events
      where grievance_id = v_case_b and event_type = 'CITIZEN_REMINDER_SENT') <> 1 then
    raise exception 'Rapid reminder created duplicate events';
  end if;
end;
$citizen_assertions$;

reset role;
select set_config('request.jwt.claim.sub', current_setting('cpgrams.case01.gro'), true);
set local role authenticated;

do $gro_response_visibility$
declare
  v_case_a uuid := current_setting('cpgrams.case01.case_a')::uuid;
  v_case_b uuid := current_setting('cpgrams.case01.case_b')::uuid;
begin
  if not exists (
    select 1 from public.clarification_requests
    where grievance_id = v_case_a
      and response_text = 'The pension payment reference is PPO-TEST-123.'
  ) then
    raise exception 'Assigned GRO cannot see the citizen clarification response';
  end if;
  if not exists (
    select 1 from public.grievance_priorities
    where grievance_id = v_case_a and not waiting_on_citizen
  ) then
    raise exception 'Priority engine did not resume after clarification';
  end if;
  if not exists (
    select 1 from public.notifications
    where user_id = current_setting('cpgrams.case01.gro')::uuid
      and grievance_id = v_case_a
      and kind = 'clarification_response'
  ) then
    raise exception 'Assigned GRO was not notified of clarification response';
  end if;
  if not exists (
    select 1 from public.notifications
    where user_id = current_setting('cpgrams.case01.gro')::uuid
      and grievance_id = v_case_b
      and kind = 'citizen_reminder'
  ) then
    raise exception 'Assigned GRO was not notified of citizen reminder';
  end if;
  if not exists (
    select 1 from public.grievance_priorities
    where grievance_id = v_case_b
      and priority_reasons::text like '%citizen reminder%'
      and priority_score > 0
  ) then
    raise exception 'Reminder did not update the capped priority contribution';
  end if;
end;
$gro_response_visibility$;

reset role;
rollback;

select 'CASE-01 through CASE-05 integration checks passed' as result;
