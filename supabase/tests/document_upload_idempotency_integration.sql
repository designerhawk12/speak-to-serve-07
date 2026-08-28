-- DOC-01/DOC-02 authenticated integration checks. Every mutation rolls back.
-- The three private Storage rows model an object that has already reached Storage;
-- calling the finalizer later also covers retrying after a network interruption.
begin;

do $fixtures$
declare
  v_citizen uuid;
  v_gro uuid;
  v_org uuid;
  v_case uuid;
  v_request uuid;
  v_item_ppo uuid;
  v_item_bank uuid;
  v_item_order uuid;
begin
  select id into strict v_citizen
  from public.profiles where email = 'citizen@demo.cpgrams.in';
  select id, organization_id into strict v_gro, v_org
  from public.profiles where email = 'gro@demo.cpgrams.in';

  insert into public.grievances (
    citizen_id, original_text, short_title, organization_id, assigned_officer_id,
    administrative_state, submitted_at, sla_due_at
  ) values (
    v_citizen, 'Rollback document idempotency case', 'Rollback document idempotency case',
    v_org, v_gro, 'ASSIGNED', now() - interval '1 day', now() + interval '20 days'
  ) returning id into v_case;

  insert into public.document_requests (grievance_id, requested_by, organization_id, reason)
  values (v_case, v_gro, v_org, 'Provide pension verification documents')
  returning id into v_request;

  insert into public.document_request_items (request_id, label, is_required)
  values
    (v_request, 'PPO', true),
    (v_request, 'Bank statement', true),
    (v_request, 'Pension order', true);

  select id into strict v_item_ppo
  from public.document_request_items
  where request_id = v_request and label = 'PPO';
  select id into strict v_item_bank
  from public.document_request_items
  where request_id = v_request and label = 'Bank statement';
  select id into strict v_item_order
  from public.document_request_items
  where request_id = v_request and label = 'Pension order';

  insert into storage.objects (bucket_id, name, owner_id)
  values
    ('grievance-documents', v_citizen::text || '/' || v_case::text || '/' || v_item_ppo::text || '-ppo.pdf', v_citizen::text),
    ('grievance-documents', v_citizen::text || '/' || v_case::text || '/' || v_item_bank::text || '-bank.pdf', v_citizen::text),
    ('grievance-documents', v_citizen::text || '/' || v_case::text || '/' || v_item_order::text || '-order.pdf', v_citizen::text);

  perform set_config('cpgrams.doc.case', v_case::text, true);
  perform set_config('cpgrams.doc.request', v_request::text, true);
  perform set_config('cpgrams.doc.ppo', v_item_ppo::text, true);
  perform set_config('cpgrams.doc.bank', v_item_bank::text, true);
  perform set_config('cpgrams.doc.order', v_item_order::text, true);
  perform set_config('cpgrams.doc.citizen', v_citizen::text, true);
  perform set_config('cpgrams.doc.gro', v_gro::text, true);
end;
$fixtures$;

select set_config('request.jwt.claim.sub', current_setting('cpgrams.doc.citizen'), true);
set local role authenticated;

-- First requested item: two calls model a rapid double-click. Both converge on
-- the same document ID because the request-item ID is the stable upload key.
do $first_upload$
declare
  v_case uuid := current_setting('cpgrams.doc.case')::uuid;
  v_item uuid := current_setting('cpgrams.doc.ppo')::uuid;
  v_citizen uuid := current_setting('cpgrams.doc.citizen')::uuid;
  v_first uuid;
  v_second uuid;
begin
  v_first := public.citizen_finalize_document_upload(
    v_case, v_citizen::text || '/' || v_case::text || '/' || v_item::text || '-ppo.pdf',
    'ppo.pdf', 'application/pdf', 42, v_item, v_item, 'requested_evidence'
  );
  v_second := public.citizen_finalize_document_upload(
    v_case, v_citizen::text || '/' || v_case::text || '/' || v_item::text || '-ppo.pdf',
    'ppo.pdf', 'application/pdf', 42, v_item, v_item, 'requested_evidence'
  );
  if v_first <> v_second then
    raise exception 'Repeated requested-item finalization did not return the original document';
  end if;
  if (select count(*) from public.documents where grievance_id = v_case) <> 1 then
    raise exception 'Rapid double-click created duplicate document rows';
  end if;
  if (select count(*) from public.case_events
      where grievance_id = v_case and event_type = 'DOCUMENT_UPLOADED') <> 1 then
    raise exception 'Rapid double-click created duplicate document events';
  end if;
  if (select count(*) from public.document_request_items
      where request_id = current_setting('cpgrams.doc.request')::uuid and document_id is not null) <> 1 then
    raise exception 'The first requested document was not linked exactly once';
  end if;
  if (select fulfilled_at from public.document_requests
      where id = current_setting('cpgrams.doc.request')::uuid) is not null then
    raise exception 'Document request completed after only one of three required items';
  end if;
end;
$first_upload$;

-- The Storage object for the bank statement already exists but no document row
-- does: this is the retry-after-network-failure path.
select public.citizen_finalize_document_upload(
  current_setting('cpgrams.doc.case')::uuid,
  current_setting('cpgrams.doc.citizen') || '/' || current_setting('cpgrams.doc.case')
    || '/' || current_setting('cpgrams.doc.bank') || '-bank.pdf',
  'bank.pdf', 'application/pdf', 43,
  current_setting('cpgrams.doc.bank')::uuid,
  current_setting('cpgrams.doc.bank')::uuid,
  'requested_evidence'
);

do $partial_assertions$
begin
  if (select count(*) from public.document_request_items
      where request_id = current_setting('cpgrams.doc.request')::uuid and document_id is not null) <> 2 then
    raise exception 'Partial completion did not retain two independently supplied items';
  end if;
  if (select fulfilled_at from public.document_requests
      where id = current_setting('cpgrams.doc.request')::uuid) is not null then
    raise exception 'Document request completed before all required items were supplied';
  end if;
end;
$partial_assertions$;

select public.citizen_finalize_document_upload(
  current_setting('cpgrams.doc.case')::uuid,
  current_setting('cpgrams.doc.citizen') || '/' || current_setting('cpgrams.doc.case')
    || '/' || current_setting('cpgrams.doc.order') || '-order.pdf',
  'order.pdf', 'application/pdf', 44,
  current_setting('cpgrams.doc.order')::uuid,
  current_setting('cpgrams.doc.order')::uuid,
  'requested_evidence'
);

do $completion_assertions$
declare v_case uuid := current_setting('cpgrams.doc.case')::uuid;
begin
  if (select count(*) from public.document_request_items
      where request_id = current_setting('cpgrams.doc.request')::uuid and document_id is not null) <> 3 then
    raise exception 'Final completion did not retain all three item links';
  end if;
  if (select fulfilled_at from public.document_requests
      where id = current_setting('cpgrams.doc.request')::uuid) is null then
    raise exception 'Document request did not complete after all required items were supplied';
  end if;
  if (select count(*) from public.documents where grievance_id = v_case) <> 3
     or (select count(*) from public.case_events
         where grievance_id = v_case and event_type = 'DOCUMENT_UPLOADED') <> 3 then
    raise exception 'Final completion did not preserve one document and event per item';
  end if;
end;
$completion_assertions$;

reset role;
select set_config('request.jwt.claim.sub', current_setting('cpgrams.doc.gro'), true);
set local role authenticated;

do $officer_visibility$
begin
  if (select count(*) from public.documents
      where grievance_id = current_setting('cpgrams.doc.case')::uuid) <> 3 then
    raise exception 'Assigned GRO cannot see the exact evidence count';
  end if;
end;
$officer_visibility$;

reset role;
select set_config('request.jwt.claim.sub', current_setting('cpgrams.doc.citizen'), true);
set local role authenticated;

do $citizen_visibility$
begin
  if (select count(*) from public.documents
      where grievance_id = current_setting('cpgrams.doc.case')::uuid) <> 3 then
    raise exception 'Citizen cannot see the exact evidence count';
  end if;
end;
$citizen_visibility$;

reset role;
rollback;

select 'DOC-01/DOC-02 document upload integration checks passed' as result;
