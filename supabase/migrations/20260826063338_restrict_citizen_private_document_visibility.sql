-- Case authorization alone is insufficient for citizen document reads: an
-- officer can attach internal evidence to a citizen-owned case. Citizens may
-- read their own uploads and files explicitly marked citizen-visible; staff
-- retain their existing RLS-authorized case access.
drop policy if exists "view documents on authorized cases" on public.documents;
create policy "view documents on authorized cases" on public.documents
  for select to authenticated using (
    private.can_view_grievance(grievance_id)
    and (
      citizen_visible
      or uploaded_by = (select auth.uid())
      or private.current_role_of((select auth.uid())) <> 'citizen'
    )
  );

-- Signed URLs must use exactly the same rule as the document metadata lookup;
-- otherwise a citizen could retrieve an internal object's path directly.
drop policy if exists "read own or authorized grievance files" on storage.objects;
create policy "read own or authorized grievance files" on storage.objects
  for select to authenticated using (
    bucket_id = 'grievance-documents'
    and exists (
      select 1
      from public.documents d
      where d.storage_path = name
        and private.can_view_grievance(d.grievance_id)
        and (
          d.citizen_visible
          or d.uploaded_by = (select auth.uid())
          or private.current_role_of((select auth.uid())) <> 'citizen'
        )
    )
  );
