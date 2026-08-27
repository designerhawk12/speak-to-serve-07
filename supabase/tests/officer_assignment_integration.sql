-- Linked integration check. Requires `npm run demo:auth` after the assignment
-- migration so the development-only GRO fixtures exist. Every mutation rolls back.
begin;

-- Make Nodal subtree assertions independent of mutable demo-profile setup.
-- The final ROLLBACK restores the profile's exact prior organization.
update public.profiles
set organization_id = (select id from public.organizations where code = 'MOHUA')
where email = 'nodal@demo.cpgrams.in';

do $assignment$
declare
  v_citizen uuid;
  v_pune_a uuid;
  v_pune_b uuid;
  v_bengaluru uuid;
  v_existing_gro uuid;
  v_nodal uuid;
  v_appellate uuid;
  v_triage_org uuid;
  v_urban_org uuid;
  v_appeal_org uuid;
  v_case uuid;
  v_other_case uuid;
  v_count_a integer;
  v_count_b integer;
begin
  select id into strict v_citizen from public.profiles where email = 'citizen@demo.cpgrams.in';
  select id into strict v_pune_a from public.profiles where email = 'gro.triage.pune.a@demo.cpgrams.in';
  select id into strict v_pune_b from public.profiles where email = 'gro.triage.pune.b@demo.cpgrams.in';
  select id into strict v_bengaluru from public.profiles where email = 'gro.triage.bengaluru@demo.cpgrams.in';
  select id into strict v_existing_gro from public.profiles where email = 'gro@demo.cpgrams.in';
  select id into strict v_nodal from public.profiles where email = 'nodal@demo.cpgrams.in';
  select id into strict v_appellate from public.profiles where email = 'appellate@demo.cpgrams.in';
  select id into strict v_triage_org from public.organizations where code = 'DEMO-URBAN-TRIAGE';
  select id into strict v_urban_org from public.organizations where code = 'ULB-PMC';
  select id into strict v_appeal_org from public.organizations where code = 'APPEAL-URBAN';

  insert into public.grievances (
    citizen_id, original_text, short_title, organization_id, location_text,
    administrative_state, submitted_at
  )
  select
    v_citizen, 'Rollback-only assignment test', 'Pune distribution ' || series,
    v_triage_org, 'Pune', 'SUBMITTED', now()
  from generate_series(1, 8) series;

  select count(*) into v_count_a
  from public.grievances
  where short_title like 'Pune distribution %' and assigned_officer_id = v_pune_a;
  select count(*) into v_count_b
  from public.grievances
  where short_title like 'Pune distribution %' and assigned_officer_id = v_pune_b;

  if v_count_a <> 4 or v_count_b <> 4 then
    raise exception 'Expected balanced 4/4 Pune distribution, got %/%', v_count_a, v_count_b;
  end if;
  if exists (
    select 1 from public.grievances
    where short_title like 'Pune distribution %' and assigned_officer_id = v_bengaluru
  ) then
    raise exception 'Pune case assigned to location-restricted Bengaluru GRO';
  end if;

  insert into public.grievances (
    citizen_id, original_text, short_title, organization_id, appellate_organization_id,
    location_text, administrative_state, submitted_at
  ) values (
    v_citizen, 'Rollback-only Bengaluru eligibility test', 'Bengaluru assignment',
    v_triage_org, v_appeal_org, 'Bengaluru', 'SUBMITTED', now()
  ) returning id, assigned_officer_id into v_case, v_other_case;

  if v_other_case <> v_bengaluru then
    raise exception 'Bengaluru case was not assigned to the Bengaluru-restricted GRO';
  end if;

  perform set_config('request.jwt.claim.sub', v_existing_gro::text, true);
  if private.can_view_grievance(v_case) then
    raise exception 'Unrelated organization GRO can see the triage grievance';
  end if;

  perform set_config('request.jwt.claim.sub', v_nodal::text, true);
  if not private.can_view_grievance(v_case) then
    raise exception 'Nodal officer cannot see grievance in authorized MOHUA subtree';
  end if;

  perform set_config('request.jwt.claim.sub', v_appellate::text, true);
  if private.can_view_grievance(v_case) then
    raise exception 'Appellate Authority can see ordinary grievance before appeal exists';
  end if;

  insert into public.appeals (
    grievance_id, citizen_id, appellate_organization_id, grounds
  ) values (v_case, v_citizen, v_appeal_org, 'Rollback-only appellate context test');

  if not private.can_view_grievance(v_case) then
    raise exception 'Appellate Authority cannot see grievance context after appeal exists';
  end if;

  insert into public.grievances (
    citizen_id, original_text, short_title, organization_id, appellate_organization_id,
    location_text, administrative_state, submitted_at
  ) values (
    v_citizen, 'Rollback-only ordinary appellate exclusion test',
    'Appellate ordinary exclusion', v_triage_org, v_appeal_org, 'Pune', 'SUBMITTED', now()
  );

  select id into strict v_other_case
  from public.grievances
  where short_title like 'Pune distribution %' and assigned_officer_id = v_pune_b
  limit 1;
  perform set_config('request.jwt.claim.sub', v_pune_a::text, true);
  if private.can_act_on_grievance(v_other_case) then
    raise exception 'GRO can act on a case assigned to another GRO';
  end if;
end;
$assignment$;

-- Keep opaque test identifiers across authenticated role switches without
-- relying on RLS-visible discovery for negative authorization cases.
select set_config(
  'cpgrams.transfer_failure_case_id',
  (
    select id::text from public.grievances
    where short_title like 'Pune distribution %'
      and assigned_officer_id = (select id from public.profiles where email = 'gro.triage.pune.a@demo.cpgrams.in')
    order by id limit 1
  ),
  true
);
select set_config(
  'cpgrams.transfer_gro_success_case_id',
  (
    select id::text from public.grievances
    where short_title like 'Pune distribution %'
      and assigned_officer_id = (select id from public.profiles where email = 'gro.triage.pune.a@demo.cpgrams.in')
    order by id limit 1 offset 1
  ),
  true
);
select set_config(
  'cpgrams.transfer_nodal_success_case_id',
  (
    select id::text from public.grievances
    where short_title like 'Pune distribution %'
      and assigned_officer_id = (select id from public.profiles where email = 'gro.triage.pune.a@demo.cpgrams.in')
    order by id limit 1 offset 2
  ),
  true
);

-- Exercise the actual RLS-backed queue view under the authenticated role.
select set_config(
  'request.jwt.claim.sub',
  (select id::text from public.profiles where email = 'gro.triage.pune.a@demo.cpgrams.in'),
  true
);
set local role authenticated;
do $gro_rls$
declare v_changed integer;
begin
  if (select count(*) from public.officer_case_queue where short_title like 'Pune distribution %') <> 8 then
    raise exception 'Same-organization GRO queue did not expose the eight authorized Pune cases';
  end if;
  update public.grievances
  set updated_at = updated_at
  where short_title like 'Pune distribution %'
    and assigned_officer_id <> (select auth.uid());
  get diagnostics v_changed = row_count;
  if v_changed <> 0 then
    raise exception 'GRO updated a grievance assigned to another GRO';
  end if;
  if (select count(*) from (select id from public.officer_case_queue where short_title like 'Pune distribution %' order by id limit 3 offset 3) page) <> 3 then
    raise exception 'Bounded queue page did not return the expected row count';
  end if;
end;
$gro_rls$;
reset role;

select set_config(
  'request.jwt.claim.sub',
  (select id::text from public.profiles where email = 'nodal@demo.cpgrams.in'),
  true
);
set local role authenticated;
do $nodal_rls$
begin
  if (select count(*) from public.officer_case_queue where short_title in ('Bengaluru assignment', 'Appellate ordinary exclusion') or short_title like 'Pune distribution %') <> 10 then
    raise exception 'Nodal queue did not expose the authorized organization subtree';
  end if;
end;
$nodal_rls$;
reset role;

select set_config(
  'request.jwt.claim.sub',
  (select id::text from public.profiles where email = 'appellate@demo.cpgrams.in'),
  true
);
set local role authenticated;
do $appellate_rls$
begin
  if exists (select 1 from public.officer_case_queue where short_title = 'Appellate ordinary exclusion') then
    raise exception 'Appellate queue exposed an ordinary grievance before appeal';
  end if;
  if not exists (select 1 from public.officer_case_queue where short_title = 'Bengaluru assignment') then
    raise exception 'Appellate Authority cannot read required grievance context after appeal';
  end if;
end;
$appellate_rls$;
reset role;

select set_config(
  'request.jwt.claim.sub',
  (select id::text from public.profiles where email = 'gro@demo.cpgrams.in'),
  true
);
set local role authenticated;
do $unrelated_gro_rls$
begin
  if exists (select 1 from public.officer_case_queue where short_title in ('Bengaluru assignment', 'Appellate ordinary exclusion') or short_title like 'Pune distribution %') then
    raise exception 'Unrelated GRO queue exposed triage grievances';
  end if;
end;
$unrelated_gro_rls$;
reset role;

select set_config(
  'request.jwt.claim.sub',
  (select id::text from public.profiles where email = 'gro.triage.pune.b@demo.cpgrams.in'),
  true
);
set local role authenticated;
do $assigned_other_gro_denied$
begin
  begin
    perform public.officer_transfer_grievance(
      current_setting('cpgrams.transfer_failure_case_id')::uuid,
      (select id from public.organizations where code = 'ULB-PMC'),
      'Must fail: case belongs to another GRO'
    );
    raise exception 'GRO transferred a case assigned to another GRO';
  exception when sqlstate '42501' then null;
  end;
end;
$assigned_other_gro_denied$;
reset role;

select set_config(
  'request.jwt.claim.sub',
  (select id::text from public.profiles where email = 'gro@demo.cpgrams.in'),
  true
);
set local role authenticated;
do $unrelated_gro_transfer_denied$
begin
  begin
    perform public.officer_transfer_grievance(
      current_setting('cpgrams.transfer_failure_case_id')::uuid,
      (select id from public.organizations where code = 'ULB-PMC'),
      'Must fail: unrelated GRO'
    );
    raise exception 'Unrelated GRO transferred the case';
  exception when sqlstate '42501' then null;
  end;
end;
$unrelated_gro_transfer_denied$;
reset role;

select set_config(
  'request.jwt.claim.sub',
  (select id::text from public.profiles where email = 'citizen@demo.cpgrams.in'),
  true
);
set local role authenticated;
do $citizen_transfer_denied$
begin
  begin
    perform public.officer_transfer_grievance(
      current_setting('cpgrams.transfer_failure_case_id')::uuid,
      (select id from public.organizations where code = 'ULB-PMC'),
      'Must fail: citizen caller'
    );
    raise exception 'Citizen transferred a grievance';
  exception when sqlstate '42501' then null;
  end;
end;
$citizen_transfer_denied$;
reset role;

select set_config(
  'request.jwt.claim.sub',
  (select id::text from public.profiles where email = 'gro.triage.pune.a@demo.cpgrams.in'),
  true
);
set local role authenticated;
do $gro_destination_checks$
begin
  begin
    perform public.officer_transfer_grievance(
      current_setting('cpgrams.transfer_failure_case_id')::uuid,
      (select id from public.organizations where code = 'CPAO'),
      'Must fail: cross-government destination'
    );
    raise exception 'GRO transferred to an unrelated government hierarchy';
  exception when sqlstate '42501' then null;
  end;

  begin
    perform public.officer_transfer_grievance(
      current_setting('cpgrams.transfer_failure_case_id')::uuid,
      'ffffffff-ffff-4fff-8fff-ffffffffffff'::uuid,
      'Must fail: nonexistent destination'
    );
    raise exception 'GRO transferred to a nonexistent destination';
  exception when sqlstate '22023' then null;
  end;

  begin
    perform public.officer_transfer_grievance(
      current_setting('cpgrams.transfer_failure_case_id')::uuid,
      (select id from public.organizations where code = 'APPEAL-URBAN'),
      'Must fail: appellate cell is not ordinary case ownership'
    );
    raise exception 'GRO transferred ordinary ownership to an appellate cell';
  exception when sqlstate '42501' then null;
  end;

  perform public.officer_transfer_grievance(
    current_setting('cpgrams.transfer_gro_success_case_id')::uuid,
    (select id from public.organizations where code = 'ULB-PMC'),
    'Correct routing within the Urban Affairs hierarchy'
  );
end;
$gro_destination_checks$;
reset role;

select set_config(
  'request.jwt.claim.sub',
  (select id::text from public.profiles where email = 'nodal@demo.cpgrams.in'),
  true
);
set local role authenticated;
do $nodal_destination_checks$
begin
  begin
    perform public.officer_transfer_grievance(
      current_setting('cpgrams.transfer_failure_case_id')::uuid,
      (select id from public.organizations where code = 'CPAO'),
      'Must fail: outside Nodal subtree'
    );
    raise exception 'Nodal officer transferred outside the authorized subtree';
  exception when sqlstate '42501' then null;
  end;

  perform public.officer_transfer_grievance(
    current_setting('cpgrams.transfer_nodal_success_case_id')::uuid,
    (select id from public.organizations where code = 'ULB-PMC'),
    'Nodal-authorized routing within the Urban Affairs subtree'
  );
end;
$nodal_destination_checks$;
reset role;

do $transfer_result$
declare
  v_successful_transfers integer;
begin
  if exists (
    select 1 from public.case_events
    where grievance_id = current_setting('cpgrams.transfer_failure_case_id')::uuid
      and event_type = 'CASE_TRANSFERRED'
  ) then
    raise exception 'A rejected transfer left a transfer event behind';
  end if;
  if not exists (
    select 1 from public.grievances g
    join public.organizations o on o.id = g.organization_id and o.code = 'DEMO-URBAN-TRIAGE'
    where g.id = current_setting('cpgrams.transfer_failure_case_id')::uuid
  ) then
    raise exception 'A rejected transfer changed current organization ownership';
  end if;

  select count(*) into v_successful_transfers
  from public.grievances g
  join public.organizations o on o.id = g.organization_id and o.code = 'ULB-PMC'
  join public.profiles p on p.id = g.assigned_officer_id and p.email = 'gro@demo.cpgrams.in'
  where g.id in (
    current_setting('cpgrams.transfer_gro_success_case_id')::uuid,
    current_setting('cpgrams.transfer_nodal_success_case_id')::uuid
  )
    and g.administrative_state = 'ASSIGNED';
  if v_successful_transfers <> 2 then
    raise exception 'Authorized transfers did not preserve destination auto-assignment';
  end if;

  if (
    select count(*)
    from public.case_events e
    where e.grievance_id in (
      current_setting('cpgrams.transfer_gro_success_case_id')::uuid,
      current_setting('cpgrams.transfer_nodal_success_case_id')::uuid
    )
      and e.event_type = 'CASE_TRANSFERRED'
  ) <> 2 then
    raise exception 'Authorized transfers did not append exactly one transfer event each';
  end if;

  if exists (
    select 1
    from public.case_events e
    where e.grievance_id in (
      current_setting('cpgrams.transfer_gro_success_case_id')::uuid,
      current_setting('cpgrams.transfer_nodal_success_case_id')::uuid
    )
      and e.event_type = 'CASE_TRANSFERRED'
      and (
        not e.citizen_visible
        or e.title not like '%Pune Municipal Corporation%'
        or e.description not like '%[DEMO] Urban Services Triage%'
        or e.description not like '%Pune Municipal Corporation%'
        or coalesce(e.metadata ->> 'from_organization_name', '') = ''
        or coalesce(e.metadata ->> 'to_organization_name', '') = ''
      )
  ) then
    raise exception 'Citizen-visible transfer history lacks human-readable ownership names';
  end if;
end;
$transfer_result$;

select set_config(
  'request.jwt.claim.sub',
  (select id::text from public.profiles where email = 'nodal@demo.cpgrams.in'),
  true
);
set local role authenticated;
do $transfer_event_immutable$
declare v_changed integer;
begin
  update public.case_events
  set description = 'Must not be mutable'
  where grievance_id = current_setting('cpgrams.transfer_gro_success_case_id')::uuid
    and event_type = 'CASE_TRANSFERRED';
  get diagnostics v_changed = row_count;
  if v_changed <> 0 then
    raise exception 'Authenticated user updated immutable transfer history';
  end if;
end;
$transfer_event_immutable$;
reset role;

rollback;
select 'officer assignment and visibility integration checks passed' as result;
