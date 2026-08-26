-- Technical platform administration is not blanket grievance or appeal
-- authority. Keep case access purpose-specific and organization-scoped.
create or replace function private.can_view_grievance(_g uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.grievances g, public.profiles p
    where g.id = _g and p.id = auth.uid()
      and (
        g.citizen_id = p.id
        or (p.role = 'gro' and g.organization_id = p.organization_id)
        or (p.role = 'nodal' and p.organization_id is not null
            and g.organization_id in (select private.org_subtree(p.organization_id)))
        or (p.role = 'appellate' and g.appellate_organization_id = p.organization_id)
      )
  )
$$;

create or replace function private.can_view_appeal(_a uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.appeals a, public.profiles p
    where a.id = _a and p.id = auth.uid()
      and (a.citizen_id = p.id
           or (p.role = 'appellate' and a.appellate_organization_id = p.organization_id)
           or (p.role in ('gro','nodal') and private.can_view_grievance(a.grievance_id)))
  )
$$;

drop policy if exists "staff see authorized grievances" on public.grievances;
create policy "staff see authorized grievances" on public.grievances
  for select to authenticated using (
    (private.current_role_of(auth.uid()) = 'gro' and organization_id = private.current_org(auth.uid()))
    or (private.current_role_of(auth.uid()) = 'nodal' and private.current_org(auth.uid()) is not null
        and organization_id in (select private.org_subtree(private.current_org(auth.uid()))))
    or (private.current_role_of(auth.uid()) = 'appellate' and appellate_organization_id = private.current_org(auth.uid()))
  );

drop policy if exists "staff update authorized grievances" on public.grievances;
create policy "staff update authorized grievances" on public.grievances
  for update to authenticated using (
    (private.current_role_of(auth.uid()) = 'gro' and organization_id = private.current_org(auth.uid()))
    or (private.current_role_of(auth.uid()) = 'nodal' and private.current_org(auth.uid()) is not null
        and organization_id in (select private.org_subtree(private.current_org(auth.uid()))))
  ) with check (true);

drop policy if exists "authorized staff see appeals" on public.appeals;
create policy "authorized staff see appeals" on public.appeals
  for select to authenticated using (
    (private.current_role_of(auth.uid()) = 'appellate' and appellate_organization_id = private.current_org(auth.uid()))
    or (private.current_role_of(auth.uid()) in ('gro','nodal') and private.can_view_grievance(grievance_id))
  );

drop policy if exists "appellate updates appeals" on public.appeals;
create policy "appellate updates appeals" on public.appeals
  for update to authenticated using (
    private.current_role_of(auth.uid()) = 'appellate'
    and appellate_organization_id = private.current_org(auth.uid())
  ) with check (true);
