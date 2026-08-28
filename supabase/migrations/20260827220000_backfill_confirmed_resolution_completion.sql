-- Legacy/demo records may have a final citizen confirmation while retaining an
-- older administrative state from earlier manual testing. The citizen's final
-- outcome is still sufficient proof that the original government response had
-- already completed; backfill only the missing clock-stop timestamp.
update public.grievances g
set government_response_completed_at = coalesce(
  (
    select max(r.created_at)
    from public.resolutions r
    where r.grievance_id = g.id
      and not r.is_interim
  ),
  (
    select max(ce.created_at)
    from public.case_events ce
    where ce.grievance_id = g.id
      and ce.event_type = 'RESOLUTION_SUBMITTED'
  ),
  g.disposed_at,
  g.closed_at,
  g.updated_at
)
where g.government_response_completed_at is null
  and g.citizen_confirmation_state in (
    'CONFIRMED_RESOLVED', 'PARTIALLY_RESOLVED', 'NOT_RESOLVED'
  );
