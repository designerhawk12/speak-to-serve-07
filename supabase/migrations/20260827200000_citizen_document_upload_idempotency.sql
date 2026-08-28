-- Citizen document uploads are finalized atomically after the authenticated
-- browser has created the private Storage object.  A stable upload key makes
-- repeated clicks/retries return the original document instead of duplicating
-- metadata, request links, or immutable history.

alter table public.documents
  add column upload_idempotency_key uuid;

create unique index documents_citizen_upload_idempotency_idx
  on public.documents (uploaded_by, grievance_id, upload_idempotency_key)
  where upload_idempotency_key is not null;

create unique index document_request_items_document_id_unique_idx
  on public.document_request_items (document_id)
  where document_id is not null;

create or replace function private.finalize_citizen_document_upload(
  p_grievance_id uuid,
  p_storage_path text,
  p_file_name text,
  p_mime_type text,
  p_size_bytes bigint,
  p_upload_idempotency_key uuid,
  p_request_item_id uuid default null,
  p_doc_kind text default 'citizen_evidence'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_grievance public.grievances%rowtype;
  v_request_item public.document_request_items%rowtype;
  v_request_id uuid;
  v_document_id uuid;
  v_expected_prefix text;
  v_doc_kind text;
begin
  if v_user_id is null or private.current_role_of(v_user_id) <> 'citizen' then
    raise exception 'Only the citizen who owns this grievance can upload documents'
      using errcode = '42501';
  end if;

  if p_grievance_id is null
     or p_upload_idempotency_key is null
     or coalesce(length(trim(p_storage_path)), 0) = 0
     or coalesce(length(trim(p_file_name)), 0) = 0
     or p_size_bytes is null
     or p_size_bytes <= 0 then
    raise exception 'A valid document upload is required' using errcode = '22023';
  end if;

  select * into v_grievance
  from public.grievances
  where id = p_grievance_id
  for update;

  if not found or v_grievance.citizen_id <> v_user_id then
    raise exception 'This grievance is unavailable' using errcode = '42501';
  end if;

  select d.id into v_document_id
  from public.documents d
  where d.uploaded_by = v_user_id
    and d.grievance_id = p_grievance_id
    and d.upload_idempotency_key = p_upload_idempotency_key;

  if found then
    return v_document_id;
  end if;

  v_expected_prefix := v_user_id::text || '/' || p_grievance_id::text || '/'
    || p_upload_idempotency_key::text || '-';
  if left(p_storage_path, length(v_expected_prefix)) <> v_expected_prefix
     or not exists (
       select 1
       from storage.objects so
       where so.bucket_id = 'grievance-documents'
         and so.name = p_storage_path
     ) then
    raise exception 'The uploaded private file is unavailable for this grievance'
      using errcode = '42501';
  end if;

  if p_request_item_id is not null then
    select dri.* into v_request_item
    from public.document_request_items dri
    join public.document_requests dr on dr.id = dri.request_id
    where dri.id = p_request_item_id
      and dr.grievance_id = p_grievance_id
    for update of dri;

    if not found then
      raise exception 'The requested document item is unavailable for this grievance'
        using errcode = '42501';
    end if;

    if v_request_item.document_id is not null then
      raise exception 'This requested document item has already been supplied'
        using errcode = '55000';
    end if;
    v_doc_kind := 'requested_evidence';
    v_request_id := v_request_item.request_id;
  else
    v_doc_kind := coalesce(nullif(trim(p_doc_kind), ''), 'citizen_evidence');
    if v_doc_kind not in ('citizen_evidence', 'clarification_response', 'appeal_evidence') then
      raise exception 'The document kind is not available for citizen upload'
        using errcode = '22023';
    end if;
  end if;

  insert into public.documents (
    grievance_id,
    uploaded_by,
    storage_path,
    file_name,
    mime_type,
    size_bytes,
    doc_kind,
    citizen_visible,
    upload_idempotency_key
  ) values (
    p_grievance_id,
    v_user_id,
    p_storage_path,
    p_file_name,
    nullif(trim(p_mime_type), ''),
    p_size_bytes,
    v_doc_kind,
    true,
    p_upload_idempotency_key
  ) returning id into v_document_id;

  if p_request_item_id is not null then
    update public.document_request_items
    set document_id = v_document_id
    where id = p_request_item_id;

    if not exists (
      select 1
      from public.document_request_items dri
      where dri.request_id = v_request_id
        and dri.is_required
        and dri.document_id is null
    ) then
      update public.document_requests
      set fulfilled_at = coalesce(fulfilled_at, statement_timestamp())
      where id = v_request_id;
    end if;
  end if;

  insert into public.case_events (
    grievance_id,
    actor_id,
    actor_type,
    organization_id,
    event_type,
    title,
    description,
    metadata,
    citizen_visible
  ) values (
    p_grievance_id,
    v_user_id,
    'citizen',
    v_grievance.organization_id,
    'DOCUMENT_UPLOADED',
    case when p_request_item_id is null
      then 'Citizen uploaded supporting evidence'
      else 'Citizen uploaded a requested document'
    end,
    p_file_name,
    jsonb_build_object(
      'document_id', v_document_id,
      'request_item_id', p_request_item_id,
      'upload_idempotency_key', p_upload_idempotency_key
    ),
    true
  );

  return v_document_id;
end;
$$;

revoke all on function private.finalize_citizen_document_upload(
  uuid, text, text, text, bigint, uuid, uuid, text
) from public, anon, authenticated, service_role;
grant execute on function private.finalize_citizen_document_upload(
  uuid, text, text, text, bigint, uuid, uuid, text
) to authenticated, service_role;

create or replace function public.citizen_finalize_document_upload(
  p_grievance_id uuid,
  p_storage_path text,
  p_file_name text,
  p_mime_type text,
  p_size_bytes bigint,
  p_upload_idempotency_key uuid,
  p_request_item_id uuid default null,
  p_doc_kind text default 'citizen_evidence'
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.finalize_citizen_document_upload(
    p_grievance_id,
    p_storage_path,
    p_file_name,
    p_mime_type,
    p_size_bytes,
    p_upload_idempotency_key,
    p_request_item_id,
    p_doc_kind
  )
$$;

revoke all on function public.citizen_finalize_document_upload(
  uuid, text, text, text, bigint, uuid, uuid, text
) from public, anon, authenticated, service_role;
grant execute on function public.citizen_finalize_document_upload(
  uuid, text, text, text, bigint, uuid, uuid, text
) to authenticated;
