-- Linked integration check. All test mutations are rolled back.
begin;

update public.grievances
set submitted_at = now() - interval '22 days',
    sla_due_at = now() - interval '1 day'
where registration_number = 'CPG-2026-STREETLT';

update public.grievance_priorities p
set escalation_level = 0,
    priority_level = 'NORMAL',
    priority_score = 0
from public.grievances g
where p.grievance_id = g.id
  and g.registration_number = 'CPG-2026-STREETLT';

select private.evaluate_grievance_priority(
  (select id from public.grievances where registration_number = 'CPG-2026-STREETLT'),
  now()
);

do $priority_test$
declare
  v_grievance_id uuid;
  v_level public.priority_level;
  v_event_count integer;
  v_responsible_count integer;
  v_nodal_count integer;
begin
  select id into strict v_grievance_id
  from public.grievances
  where registration_number = 'CPG-2026-STREETLT';

  select priority_level into strict v_level
  from public.grievance_priorities
  where grievance_id = v_grievance_id;

  if v_level <> 'CRITICAL' then
    raise exception 'Expected CRITICAL, got %', v_level;
  end if;

  select count(*) into v_event_count
  from public.case_events
  where grievance_id = v_grievance_id
    and event_type = 'ESCALATION_TRIGGERED'
    and created_at >= transaction_timestamp();

  if v_event_count <> 1 then
    raise exception 'Expected one ESCALATION_TRIGGERED event, got %', v_event_count;
  end if;

  select
    count(*) filter (where p.id = g.assigned_officer_id),
    count(*) filter (where p.role = 'nodal')
  into v_responsible_count, v_nodal_count
  from public.notifications n
  join public.profiles p on p.id = n.user_id
  join public.grievances g on g.id = n.grievance_id
  where n.grievance_id = v_grievance_id
    and n.kind = 'priority_escalation'
    and n.created_at >= transaction_timestamp();

  if v_responsible_count < 1 then
    raise exception 'Expected the responsible officer notification';
  end if;
  if v_nodal_count < 1 then
    raise exception 'Expected an authorised Nodal notification';
  end if;
end;
$priority_test$;

rollback;

select 'priority engine integration checks passed' as result;
