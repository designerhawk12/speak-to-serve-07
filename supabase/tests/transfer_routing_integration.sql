-- Authenticated linked integration test for ROUTE-04/05/06. All mutations roll back.
begin;

update public.profiles
set organization_id = (select id from public.organizations where code = 'MOHUA')
where email = 'nodal@demo.cpgrams.in';

insert into public.organizations (code, name, level, parent_id, is_active)
values
  (
    'ROLLBACK-TRANSFER-C',
    '[TEST] Transfer Organization C',
    'central_department',
    (select id from public.organizations where code = 'MOHUA'),
    true
  ),
  (
    'ROLLBACK-TRANSFER-INACTIVE',
    '[TEST] Inactive Transfer Organization',
    'central_department',
    (select id from public.organizations where code = 'MOHUA'),
    false
  );

update public.profiles
set organization_id = (select id from public.organizations where code = 'ROLLBACK-TRANSFER-C')
where email = 'gro.triage.pune.b@demo.cpgrams.in';

update public.officer_assignment_profiles
set is_active = true,
    jurisdiction_state_names = '{}',
    jurisdiction_district_names = '{}',
    jurisdiction_location_terms = array['Pune']::text[]
where officer_id = (
  select id from public.profiles where email = 'gro.triage.pune.b@demo.cpgrams.in'
);

do $fixtures$
declare
  v_citizen uuid;
  v_source_org uuid;
  v_source_gro uuid;
  v_case_ab uuid;
  v_case_ac uuid;
  v_case_nodal uuid;
  v_case_denied uuid;
  v_case_closed uuid;
begin
  select id into strict v_citizen
  from public.profiles where email = 'citizen@demo.cpgrams.in';
  select id into strict v_source_org
  from public.organizations where code = 'DEMO-URBAN-TRIAGE';
  select id into strict v_source_gro
  from public.profiles where email = 'gro.triage.pune.a@demo.cpgrams.in';

  insert into public.grievances (
    citizen_id, original_text, short_title, organization_id, assigned_officer_id,
    location_text, administrative_state, submitted_at
  ) values
    (v_citizen, 'Rollback transfer A to B', 'Rollback transfer A to B', v_source_org,
      v_source_gro, 'Pune', 'ASSIGNED', now()),
    (v_citizen, 'Rollback transfer A to C', 'Rollback transfer A to C', v_source_org,
      v_source_gro, 'Pune', 'ASSIGNED', now()),
    (v_citizen, 'Rollback Nodal transfer', 'Rollback Nodal transfer', v_source_org,
      v_source_gro, 'Pune', 'ASSIGNED', now()),
    (v_citizen, 'Rollback denied transfer', 'Rollback denied transfer', v_source_org,
      v_source_gro, 'Pune', 'ASSIGNED', now()),
    (v_citizen, 'Rollback non-transferable case', 'Rollback non-transferable case', v_source_org,
      v_source_gro, 'Pune', 'RESOLUTION_PROVIDED', now());

  select id into strict v_case_ab from public.grievances where short_title = 'Rollback transfer A to B';
  select id into strict v_case_ac from public.grievances where short_title = 'Rollback transfer A to C';
  select id into strict v_case_nodal from public.grievances where short_title = 'Rollback Nodal transfer';
  select id into strict v_case_denied from public.grievances where short_title = 'Rollback denied transfer';
  select id into strict v_case_closed from public.grievances where short_title = 'Rollback non-transferable case';

  perform set_config('cpgrams.route04.case_ab', v_case_ab::text, true);
  perform set_config('cpgrams.route04.case_ac', v_case_ac::text, true);
  perform set_config('cpgrams.route04.case_nodal', v_case_nodal::text, true);
  perform set_config('cpgrams.route04.case_denied', v_case_denied::text, true);
  perform set_config('cpgrams.route04.case_closed', v_case_closed::text, true);
  perform set_config('cpgrams.route04.citizen', v_citizen::text, true);
  perform set_config('cpgrams.route04.source_org', v_source_org::text, true);
  perform set_config('cpgrams.route04.source_gro', v_source_gro::text, true);
end;
$fixtures$;

select set_config(
  'request.jwt.claim.sub',
  (select id::text from public.profiles where email = 'gro.triage.pune.a@demo.cpgrams.in'),
  true
);
set local role authenticated;
do $assigned_gro$
declare
  v_due_at timestamptz;
  v_repeat_due_at timestamptz;
  v_detected_at timestamptz;
begin
  select public.officer_flag_wrong_route(
    current_setting('cpgrams.route04.case_ab')::uuid,
    'The grievance belongs with Pune Municipal Corporation'
  ) into v_due_at;

  select wrong_route_detected_at into v_detected_at
  from public.grievances
  where id = current_setting('cpgrams.route04.case_ab')::uuid;

  if v_due_at <> v_detected_at + interval '48 hours' then
    raise exception 'Wrong-routing deadline is not exactly 48 hours';
  end if;

  select public.officer_flag_wrong_route(
    current_setting('cpgrams.route04.case_ab')::uuid,
    'A repeated click must not create another routing requirement'
  ) into v_repeat_due_at;

  if v_repeat_due_at <> v_due_at then
    raise exception 'Repeated wrong-routing flag changed the active deadline';
  end if;

  if (
    select count(*) from public.case_events
    where grievance_id = current_setting('cpgrams.route04.case_ab')::uuid
      and event_type = 'WRONG_ROUTE_FLAGGED'
      and citizen_visible
  ) <> 1 then
    raise exception 'Wrong-routing flag did not append one citizen-visible immutable event';
  end if;

  perform public.officer_transfer_grievance(
    current_setting('cpgrams.route04.case_ab')::uuid,
    (select id from public.organizations where code = 'ULB-PMC'),
    'Authorized transfer from Organization A to Organization B'
  );

  perform public.officer_transfer_grievance(
    current_setting('cpgrams.route04.case_ac')::uuid,
    (select id from public.organizations where code = 'ROLLBACK-TRANSFER-C'),
    'Authorized transfer from Organization A to Organization C'
  );

  begin
    perform public.officer_transfer_grievance(
      current_setting('cpgrams.route04.case_denied')::uuid,
      (select id from public.organizations where code = 'ROLLBACK-TRANSFER-INACTIVE'),
      'Must fail because destination is inactive'
    );
    raise exception 'Transfer to inactive destination succeeded';
  exception when sqlstate '22023' then null;
  end;

  begin
    perform public.officer_transfer_grievance(
      current_setting('cpgrams.route04.case_denied')::uuid,
      'ffffffff-ffff-4fff-8fff-ffffffffffff'::uuid,
      'Must fail because destination does not exist'
    );
    raise exception 'Transfer to nonexistent destination succeeded';
  exception when sqlstate '22023' then null;
  end;

  begin
    perform public.officer_transfer_grievance(
      current_setting('cpgrams.route04.case_closed')::uuid,
      (select id from public.organizations where code = 'ULB-PMC'),
      'Must fail because lifecycle state is not transferable'
    );
    raise exception 'Transfer from non-transferable lifecycle state succeeded';
  exception when sqlstate '55000' then null;
  end;
end;
$assigned_gro$;
reset role;

select set_config(
  'request.jwt.claim.sub',
  (select id::text from public.profiles where email = 'gro.triage.pune.b@demo.cpgrams.in'),
  true
);
set local role authenticated;
do $unrelated_gro$
begin
  begin
    perform public.officer_transfer_grievance(
      current_setting('cpgrams.route04.case_denied')::uuid,
      (select id from public.organizations where code = 'ULB-PMC'),
      'Must fail because this GRO does not own the source case'
    );
    raise exception 'Unrelated GRO transferred the source case';
  exception when sqlstate '42501' then null;
  end;
end;
$unrelated_gro$;
reset role;

select set_config(
  'request.jwt.claim.sub',
  (select id::text from public.profiles where email = 'nodal@demo.cpgrams.in'),
  true
);
set local role authenticated;
select public.officer_transfer_grievance(
  current_setting('cpgrams.route04.case_nodal')::uuid,
  (select id from public.organizations where code = 'ULB-PMC'),
  'Authorized Nodal transfer inside the configured subtree'
);
reset role;

do $results$
declare
  v_case_ab uuid := current_setting('cpgrams.route04.case_ab')::uuid;
  v_case_ac uuid := current_setting('cpgrams.route04.case_ac')::uuid;
  v_case_nodal uuid := current_setting('cpgrams.route04.case_nodal')::uuid;
begin
  if not exists (
    select 1
    from public.grievances g
    join public.organizations o on o.id = g.organization_id and o.code = 'ULB-PMC'
    join public.profiles p on p.id = g.assigned_officer_id and p.email = 'gro@demo.cpgrams.in'
    where g.id in (v_case_ab, v_case_nodal)
      and g.administrative_state = 'ASSIGNED'
  ) or (
    select count(*)
    from public.grievances g
    join public.organizations o on o.id = g.organization_id and o.code = 'ULB-PMC'
    join public.profiles p on p.id = g.assigned_officer_id and p.email = 'gro@demo.cpgrams.in'
    where g.id in (v_case_ab, v_case_nodal)
  ) <> 2 then
    raise exception 'Organization B transfer did not run destination GRO assignment';
  end if;

  if not exists (
    select 1
    from public.grievances g
    join public.organizations o on o.id = g.organization_id and o.code = 'ROLLBACK-TRANSFER-C'
    join public.profiles p on p.id = g.assigned_officer_id
      and p.email = 'gro.triage.pune.b@demo.cpgrams.in'
    where g.id = v_case_ac and g.administrative_state = 'ASSIGNED'
  ) then
    raise exception 'Organization C transfer did not run destination GRO assignment';
  end if;

  if exists (
    select 1 from public.grievances
    where id in (v_case_ab, v_case_ac, v_case_nodal)
      and citizen_id <> current_setting('cpgrams.route04.citizen')::uuid
  ) then
    raise exception 'Transfer changed citizen ownership';
  end if;

  if not exists (
    select 1 from public.grievances
    where id = v_case_ab
      and wrong_route_detected_at is not null
      and transfer_due_at = wrong_route_detected_at + interval '48 hours'
      and wrong_route_resolved_at is not null
  ) then
    raise exception 'Successful transfer did not satisfy the wrong-routing requirement';
  end if;

  if (
    select count(*) from public.grievance_priorities
    where grievance_id in (v_case_ab, v_case_ac, v_case_nodal)
      and last_meaningful_government_action_at is not null
  ) <> 3 then
    raise exception 'Transfer did not update meaningful government activity';
  end if;

  if (
    select count(*) from public.case_events
    where grievance_id in (v_case_ab, v_case_ac, v_case_nodal)
      and event_type = 'CASE_TRANSFERRED'
      and citizen_visible
      and description like 'Responsibility moved from % to %. Reason: %'
  ) <> 3 then
    raise exception 'Transfers did not append understandable citizen-visible history';
  end if;

  if not exists (
    select 1 from public.notifications
    where grievance_id = v_case_ab
      and user_id = current_setting('cpgrams.route04.citizen')::uuid
      and kind = 'transfer'
  ) then
    raise exception 'Citizen did not receive the transfer notification';
  end if;

  if not exists (
    select 1 from public.notifications
    where grievance_id = v_case_ab
      and user_id = (select id from public.profiles where email = 'gro@demo.cpgrams.in')
      and kind = 'assignment'
      and action_required
  ) then
    raise exception 'New destination GRO did not receive assignment notification';
  end if;
end;
$results$;

select set_config(
  'request.jwt.claim.sub',
  (select id::text from public.profiles where email = 'gro.triage.pune.a@demo.cpgrams.in'),
  true
);
set local role authenticated;
do $old_gro_loses_action$
begin
  if exists (
    select 1 from public.grievances
    where id in (
      current_setting('cpgrams.route04.case_ab')::uuid,
      current_setting('cpgrams.route04.case_ac')::uuid
    )
  ) then
    raise exception 'Old GRO retained normal visibility after organization transfer';
  end if;
  if private.can_act_on_grievance(current_setting('cpgrams.route04.case_ab')::uuid) then
    raise exception 'Old GRO retained actionable ownership after transfer';
  end if;
end;
$old_gro_loses_action$;
reset role;

select set_config('request.jwt.claim.sub', current_setting('cpgrams.route04.citizen'), true);
set local role authenticated;
do $citizen_visibility$
begin
  if not exists (
    select 1 from public.grievances
    where id = current_setting('cpgrams.route04.case_ab')::uuid
      and citizen_id = (select auth.uid())
      and organization_id = (select id from public.organizations where code = 'ULB-PMC')
  ) then
    raise exception 'Citizen cannot see preserved ownership and updated organization';
  end if;
  if not exists (
    select 1 from public.case_events
    where grievance_id = current_setting('cpgrams.route04.case_ab')::uuid
      and event_type = 'CASE_TRANSFERRED'
      and title like '%Pune Municipal Corporation%'
  ) then
    raise exception 'Citizen cannot see understandable transfer history';
  end if;
end;
$citizen_visibility$;
reset role;

rollback;
select 'atomic transfer and 48-hour wrong-routing checks passed' as result;
