create schema if not exists private;
grant usage on schema private to authenticated;

-- move helpers into private schema
create or replace function private.current_role_of(_user_id uuid)
returns public.app_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = _user_id
$$;

create or replace function private.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = _user_id and role = _role)
$$;

create or replace function private.current_org(_user_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select organization_id from public.profiles where id = _user_id
$$;

create or replace function private.org_subtree(_root uuid)
returns setof uuid language sql stable security definer set search_path = public as $$
  with recursive t as (
    select id from public.organizations where id = _root
    union all
    select o.id from public.organizations o join t on o.parent_id = t.id
  ) select id from t
$$;

create or replace function private.can_view_grievance(_g uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.grievances g, public.profiles p
    where g.id = _g and p.id = auth.uid()
      and (
        g.citizen_id = p.id
        or p.role = 'platform_admin'
        or (p.role = 'gro' and g.organization_id = p.organization_id)
        or (p.role = 'nodal' and p.organization_id is not null
            and g.organization_id in (select private.org_subtree(p.organization_id)))
        or (p.role = 'appellate' and g.appellate_organization_id = p.organization_id)
      )
  )
$$;

create or replace function private.can_view_request(_r uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select private.can_view_grievance((select grievance_id from public.document_requests where id = _r))
$$;

create or replace function private.can_view_appeal(_a uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.appeals a, public.profiles p
    where a.id = _a and p.id = auth.uid()
      and (a.citizen_id = p.id
           or p.role = 'platform_admin'
           or (p.role = 'appellate' and a.appellate_organization_id = p.organization_id)
           or (p.role in ('gro','nodal') and private.can_view_grievance(a.grievance_id)))
  )
$$;

create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, phone)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'full_name',''),
          new.email,
          new.raw_user_meta_data->>'phone')
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

revoke all on function private.current_role_of(uuid) from public;
revoke all on function private.has_role(uuid, public.app_role) from public;
revoke all on function private.current_org(uuid) from public;
revoke all on function private.org_subtree(uuid) from public;
revoke all on function private.can_view_grievance(uuid) from public;
revoke all on function private.can_view_request(uuid) from public;
revoke all on function private.can_view_appeal(uuid) from public;
revoke all on function private.handle_new_user() from public;
grant execute on function private.current_role_of(uuid) to authenticated;
grant execute on function private.has_role(uuid, public.app_role) to authenticated;
grant execute on function private.current_org(uuid) to authenticated;
grant execute on function private.org_subtree(uuid) to authenticated;
grant execute on function private.can_view_grievance(uuid) to authenticated;
grant execute on function private.can_view_request(uuid) to authenticated;
grant execute on function private.can_view_appeal(uuid) to authenticated;

-- recreate policies against private helpers
drop policy "users read own profile" on public.profiles;
create policy "users read own profile" on public.profiles
  for select to authenticated using (id = auth.uid() or private.has_role(auth.uid(),'platform_admin'));

drop policy "staff see authorized grievances" on public.grievances;
create policy "staff see authorized grievances" on public.grievances
  for select to authenticated using (
    private.has_role(auth.uid(),'platform_admin')
    or (private.current_role_of(auth.uid()) = 'gro' and organization_id = private.current_org(auth.uid()))
    or (private.current_role_of(auth.uid()) = 'nodal' and private.current_org(auth.uid()) is not null
        and organization_id in (select private.org_subtree(private.current_org(auth.uid()))))
    or (private.current_role_of(auth.uid()) = 'appellate' and appellate_organization_id = private.current_org(auth.uid()))
  );

drop policy "staff update authorized grievances" on public.grievances;
create policy "staff update authorized grievances" on public.grievances
  for update to authenticated using (
    private.has_role(auth.uid(),'platform_admin')
    or (private.current_role_of(auth.uid()) = 'gro' and organization_id = private.current_org(auth.uid()))
    or (private.current_role_of(auth.uid()) = 'nodal' and private.current_org(auth.uid()) is not null
        and organization_id in (select private.org_subtree(private.current_org(auth.uid()))))
    or (private.current_role_of(auth.uid()) = 'appellate' and appellate_organization_id = private.current_org(auth.uid()))
  ) with check (true);

drop policy "view events on authorized cases" on public.case_events;
create policy "view events on authorized cases" on public.case_events
  for select to authenticated using (
    private.can_view_grievance(grievance_id)
    and (citizen_visible or private.current_role_of(auth.uid()) <> 'citizen')
  );
drop policy "append events on authorized cases" on public.case_events;
create policy "append events on authorized cases" on public.case_events
  for insert to authenticated with check (private.can_view_grievance(grievance_id));

drop policy "view documents on authorized cases" on public.documents;
create policy "view documents on authorized cases" on public.documents
  for select to authenticated using (private.can_view_grievance(grievance_id));
drop policy "upload documents on authorized cases" on public.documents;
create policy "upload documents on authorized cases" on public.documents
  for insert to authenticated with check (private.can_view_grievance(grievance_id) and uploaded_by = auth.uid());

drop policy "view document requests on authorized cases" on public.document_requests;
create policy "view document requests on authorized cases" on public.document_requests
  for select to authenticated using (private.can_view_grievance(grievance_id));
drop policy "staff create document requests" on public.document_requests;
create policy "staff create document requests" on public.document_requests
  for insert to authenticated with check (private.can_view_grievance(grievance_id) and private.current_role_of(auth.uid()) <> 'citizen');
drop policy "participants update document requests" on public.document_requests;
create policy "participants update document requests" on public.document_requests
  for update to authenticated using (private.can_view_grievance(grievance_id)) with check (private.can_view_grievance(grievance_id));

drop policy "view request items" on public.document_request_items;
create policy "view request items" on public.document_request_items
  for select to authenticated using (private.can_view_request(request_id));
drop policy "staff create request items" on public.document_request_items;
create policy "staff create request items" on public.document_request_items
  for insert to authenticated with check (private.can_view_request(request_id) and private.current_role_of(auth.uid()) <> 'citizen');
drop policy "participants update request items" on public.document_request_items;
create policy "participants update request items" on public.document_request_items
  for update to authenticated using (private.can_view_request(request_id)) with check (private.can_view_request(request_id));

drop policy "view messages on authorized cases" on public.messages;
create policy "view messages on authorized cases" on public.messages
  for select to authenticated using (
    private.can_view_grievance(grievance_id)
    and (citizen_visible or private.current_role_of(auth.uid()) <> 'citizen')
  );
drop policy "send messages on authorized cases" on public.messages;
create policy "send messages on authorized cases" on public.messages
  for insert to authenticated with check (private.can_view_grievance(grievance_id) and sender_id = auth.uid());

drop policy "view resolutions on authorized cases" on public.resolutions;
create policy "view resolutions on authorized cases" on public.resolutions
  for select to authenticated using (private.can_view_grievance(grievance_id));
drop policy "staff author resolutions" on public.resolutions;
create policy "staff author resolutions" on public.resolutions
  for insert to authenticated with check (private.can_view_grievance(grievance_id) and private.current_role_of(auth.uid()) <> 'citizen');

drop policy "view feedback on authorized cases" on public.feedback;
create policy "view feedback on authorized cases" on public.feedback
  for select to authenticated using (private.can_view_grievance(grievance_id));
drop policy "citizen records own feedback" on public.feedback;
create policy "citizen records own feedback" on public.feedback
  for insert to authenticated with check (citizen_id = auth.uid() and private.can_view_grievance(grievance_id));

drop policy "authorized staff see appeals" on public.appeals;
create policy "authorized staff see appeals" on public.appeals
  for select to authenticated using (
    private.has_role(auth.uid(),'platform_admin')
    or (private.current_role_of(auth.uid()) = 'appellate' and appellate_organization_id = private.current_org(auth.uid()))
    or (private.current_role_of(auth.uid()) in ('gro','nodal') and private.can_view_grievance(grievance_id))
  );
drop policy "appellate updates appeals" on public.appeals;
create policy "appellate updates appeals" on public.appeals
  for update to authenticated using (
    private.has_role(auth.uid(),'platform_admin')
    or (private.current_role_of(auth.uid()) = 'appellate' and appellate_organization_id = private.current_org(auth.uid()))
  ) with check (true);

drop policy "view appeal events" on public.appeal_events;
create policy "view appeal events" on public.appeal_events
  for select to authenticated using (
    private.can_view_appeal(appeal_id)
    and (citizen_visible or private.current_role_of(auth.uid()) <> 'citizen')
  );
drop policy "append appeal events" on public.appeal_events;
create policy "append appeal events" on public.appeal_events
  for insert to authenticated with check (private.can_view_appeal(appeal_id));

drop policy "staff create notifications" on public.notifications;
create policy "staff create notifications" on public.notifications
  for insert to authenticated with check (private.current_role_of(auth.uid()) <> 'citizen' or user_id = auth.uid());

drop policy "staff read ai runs" on public.ai_runs;
create policy "staff read ai runs" on public.ai_runs
  for select to authenticated using (
    private.current_role_of(auth.uid()) <> 'citizen'
    and (grievance_id is null or private.can_view_grievance(grievance_id))
  );
drop policy "staff create ai runs" on public.ai_runs;
create policy "staff create ai runs" on public.ai_runs
  for insert to authenticated with check (private.current_role_of(auth.uid()) <> 'citizen');
drop policy "staff update ai runs" on public.ai_runs;
create policy "staff update ai runs" on public.ai_runs
  for update to authenticated using (private.current_role_of(auth.uid()) <> 'citizen') with check (true);

drop policy "staff read clusters" on public.issue_clusters;
create policy "staff read clusters" on public.issue_clusters
  for select to authenticated using (private.current_role_of(auth.uid()) <> 'citizen');
drop policy "staff write clusters" on public.issue_clusters;
create policy "staff write clusters" on public.issue_clusters
  for insert to authenticated with check (private.current_role_of(auth.uid()) <> 'citizen');
drop policy "staff update clusters" on public.issue_clusters;
create policy "staff update clusters" on public.issue_clusters
  for update to authenticated using (private.current_role_of(auth.uid()) <> 'citizen') with check (true);

drop policy "staff read cluster members" on public.issue_cluster_members;
create policy "staff read cluster members" on public.issue_cluster_members
  for select to authenticated using (private.current_role_of(auth.uid()) <> 'citizen');
drop policy "staff write cluster members" on public.issue_cluster_members;
create policy "staff write cluster members" on public.issue_cluster_members
  for insert to authenticated with check (private.current_role_of(auth.uid()) <> 'citizen');
drop policy "staff delete cluster members" on public.issue_cluster_members;
create policy "staff delete cluster members" on public.issue_cluster_members
  for delete to authenticated using (private.current_role_of(auth.uid()) <> 'citizen');

drop policy if exists "read own or authorized grievance files" on storage.objects;
create policy "read own or authorized grievance files" on storage.objects
  for select to authenticated using (
    bucket_id = 'grievance-documents'
    and exists (select 1 from public.documents d where d.storage_path = name and private.can_view_grievance(d.grievance_id))
  );

drop function if exists public.can_view_appeal(uuid);
drop function if exists public.can_view_request(uuid);
drop function if exists public.can_view_grievance(uuid);
drop function if exists public.org_subtree(uuid);
drop function if exists public.current_org(uuid);
drop function if exists public.has_role(uuid, public.app_role);
drop function if exists public.current_role_of(uuid);
drop function if exists public.handle_new_user();