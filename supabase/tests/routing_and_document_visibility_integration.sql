-- Linked integration check. Every mutation is rolled back.
begin;

do $routing$
declare v_gro uuid; v_nodal uuid;
begin
  select id into strict v_gro from public.profiles where email = 'gro@demo.cpgrams.in';
  select id into strict v_nodal from public.profiles where email = 'nodal@demo.cpgrams.in';

  perform set_config('request.jwt.claim.sub', v_gro::text, true);
  if not private.can_view_grievance('73788a69-4ab7-4eec-aa56-4d533c335e31') then
    raise exception 'GRO cannot see the ULB-PMC Streetlight grievance';
  end if;
  if private.can_view_grievance('60e4e865-286c-4a50-b952-2df0fd4d1b74') then
    raise exception 'GRO can incorrectly see the unrelated CPAO Pension grievance';
  end if;

  perform set_config('request.jwt.claim.sub', v_nodal::text, true);
  if not private.can_view_grievance('73788a69-4ab7-4eec-aa56-4d533c335e31') then
    raise exception 'Nodal officer cannot see a grievance in the MOHUA organization subtree';
  end if;
  if private.can_view_grievance('60e4e865-286c-4a50-b952-2df0fd4d1b74') then
    raise exception 'Nodal officer can incorrectly see the unrelated pension organization tree';
  end if;
end;
$routing$;

insert into public.documents (
  id, grievance_id, uploaded_by, storage_path, file_name, doc_kind, citizen_visible
) values (
  '90000000-0000-4000-8000-000000000901',
  '73788a69-4ab7-4eec-aa56-4d533c335e31',
  (select id from public.profiles where email = 'gro@demo.cpgrams.in'),
  'test-private-document-not-an-object.txt',
  'internal-officer-note.txt',
  'government_evidence',
  false
);

set local role authenticated;
do $document_visibility$
begin
  perform set_config('request.jwt.claim.sub', '6fbe0c21-3f41-4a08-b8d7-0b1c76e4cacf', true);
  if exists (select 1 from public.documents where id = '90000000-0000-4000-8000-000000000901') then
    raise exception 'Citizen can see a government document marked citizen_visible = false';
  end if;
end;
$document_visibility$;

rollback;
select 'routing and document visibility integration checks passed' as result;
