-- Deterministic GRO assignment, assignment-aware officer actions, appeal-only
-- Appellate case context, and a bounded RLS-respecting queue projection.

create table public.officer_assignment_profiles (
  officer_id uuid primary key references public.profiles(id) on delete cascade,
  is_active boolean not null default true,
  jurisdiction_state_names text[] not null default '{}',
  jurisdiction_district_names text[] not null default '{}',
  jurisdiction_location_terms text[] not null default '{}',
  last_assigned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant all on table public.officer_assignment_profiles to service_role;
alter table public.officer_assignment_profiles enable row level security;

create trigger trg_officer_assignment_profiles_updated
  before update on public.officer_assignment_profiles
  for each row execute function public.update_updated_at_column();

create index idx_profiles_active_gro_organization
  on public.profiles (organization_id, id)
  where role = 'gro';
create index idx_officer_assignment_profiles_active_order
  on public.officer_assignment_profiles (is_active, last_assigned_at, officer_id);
create index idx_grievances_active_assignee
  on public.grievances (assigned_officer_id, administrative_state)
  where assigned_officer_id is not null;
create index idx_grievance_priorities_queue_order
  on public.grievance_priorities (priority_score desc, grievance_id);

create or replace function private.ensure_gro_assignment_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role = 'gro' then
    insert into public.officer_assignment_profiles (officer_id)
    values (new.id)
    on conflict (officer_id) do nothing;
  end if;
  return new;
end;
$$;

revoke all on function private.ensure_gro_assignment_profile() from public, anon, authenticated, service_role;

create trigger trg_profiles_ensure_gro_assignment_profile
  after insert or update of role on public.profiles
  for each row execute function private.ensure_gro_assignment_profile();

insert into public.officer_assignment_profiles (officer_id)
select p.id
from public.profiles p
where p.role = 'gro'
on conflict (officer_id) do nothing;

create or replace function private.assign_grievance_to_eligible_gro()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_officer_id uuid;
  v_location_haystack text := lower(concat_ws(' ', new.state_name, new.district_name, new.location_text));
begin
  if new.organization_id is null
     or new.assigned_officer_id is not null
     or new.administrative_state = 'DRAFT'
     or new.submitted_at is null then
    return new;
  end if;

  -- Serialize assignments per organization so simultaneous submissions cannot
  -- all observe the same least-loaded GRO.
  perform pg_advisory_xact_lock(hashtext(new.organization_id::text));

  select p.id
  into v_officer_id
  from public.profiles p
  join public.officer_assignment_profiles ap on ap.officer_id = p.id
  where p.role = 'gro'
    and p.organization_id = new.organization_id
    and ap.is_active
    and (
      cardinality(ap.jurisdiction_state_names) = 0
      or exists (
        select 1 from unnest(ap.jurisdiction_state_names) state_name
        where lower(trim(state_name)) = lower(trim(coalesce(new.state_name, '')))
      )
    )
    and (
      cardinality(ap.jurisdiction_district_names) = 0
      or exists (
        select 1 from unnest(ap.jurisdiction_district_names) district_name
        where lower(trim(district_name)) = lower(trim(coalesce(new.district_name, '')))
      )
    )
    and (
      cardinality(ap.jurisdiction_location_terms) = 0
      or exists (
        select 1 from unnest(ap.jurisdiction_location_terms) location_term
        where v_location_haystack like ('%' || lower(trim(location_term)) || '%')
      )
    )
  order by (
    select count(*)
    from public.grievances active_case
    where active_case.assigned_officer_id = p.id
      and active_case.administrative_state not in ('DISPOSED', 'APPEAL_DECIDED', 'CLOSED')
      and active_case.citizen_confirmation_state <> 'CONFIRMED_RESOLVED'
  ) asc,
  ap.last_assigned_at asc nulls first,
  p.id asc
  limit 1;

  if v_officer_id is not null then
    new.assigned_officer_id := v_officer_id;
    if new.administrative_state in ('SUBMITTED', 'ROUTING', 'ROUTED') then
      new.administrative_state := 'ASSIGNED';
    end if;
    update public.officer_assignment_profiles
    set last_assigned_at = clock_timestamp()
    where officer_id = v_officer_id;
  end if;

  return new;
end;
$$;

revoke all on function private.assign_grievance_to_eligible_gro() from public, anon, authenticated, service_role;

create trigger trg_grievances_assign_eligible_gro
  before insert or update of organization_id, assigned_officer_id
  on public.grievances
  for each row execute function private.assign_grievance_to_eligible_gro();

create or replace function private.append_grievance_assignment_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.assigned_officer_id is null then
    return new;
  end if;

  if tg_op = 'UPDATE' and new.assigned_officer_id is not distinct from old.assigned_officer_id then
    return new;
  end if;

    insert into public.case_events (
      grievance_id, event_type, actor_type, organization_id, title,
      description, metadata, citizen_visible
    ) values (
      new.id, 'CASE_ASSIGNED', 'system', new.organization_id, 'Case assigned to an officer',
      'The responsible organization assigned this grievance to an eligible officer.',
      jsonb_build_object('assigned_officer_id', new.assigned_officer_id), true
    );
  return new;
end;
$$;

revoke all on function private.append_grievance_assignment_event() from public, anon, authenticated, service_role;

create trigger trg_z_grievances_assignment_event
  after insert or update of assigned_officer_id on public.grievances
  for each row execute function private.append_grievance_assignment_event();

-- Appellate Authority grievance access exists only as context for an appeal.
create or replace function private.can_view_grievance(_g uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.grievances g
    join public.profiles p on p.id = (select auth.uid())
    where g.id = _g
      and (
        g.citizen_id = p.id
        or (p.role = 'gro' and g.organization_id = p.organization_id)
        or (
          p.role = 'nodal'
          and p.organization_id is not null
          and g.organization_id in (select private.org_subtree(p.organization_id))
        )
        or (
          p.role = 'appellate'
          and exists (
            select 1
            from public.appeals a
            where a.grievance_id = g.id
              and a.appellate_organization_id = p.organization_id
          )
        )
      )
  )
$$;

create or replace function private.can_act_on_grievance(_g uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.grievances g
    join public.profiles p on p.id = (select auth.uid())
    where g.id = _g
      and (
        (p.role = 'gro' and g.assigned_officer_id = p.id)
        or (
          p.role = 'nodal'
          and p.organization_id is not null
          and g.organization_id in (select private.org_subtree(p.organization_id))
        )
      )
  )
$$;

revoke all on function private.can_act_on_grievance(uuid) from public, anon, authenticated, service_role;
grant execute on function private.can_act_on_grievance(uuid) to authenticated;

drop policy if exists "staff see authorized grievances" on public.grievances;
create policy "staff see authorized grievances" on public.grievances
  for select to authenticated
  using (
    (select private.current_role_of((select auth.uid()))) <> 'citizen'
    and private.can_view_grievance(id)
  );

drop policy if exists "staff update authorized grievances" on public.grievances;
create policy "staff update assigned grievances" on public.grievances
  for update to authenticated
  using (private.can_act_on_grievance(id))
  with check (private.can_act_on_grievance(id));

-- A security-invoker view keeps the underlying grievance/priority RLS active
-- while allowing query-level filtering, ordering, counting, and pagination.
create or replace view public.officer_case_queue
with (security_invoker = true)
as
select
  g.*,
  o.name as organization_name,
  c.name as category_name,
  coalesce(gp.priority_level, 'NORMAL'::public.priority_level) as priority_level,
  coalesce(gp.priority_score, 0) as priority_score,
  coalesce(gp.priority_reasons, '{}'::text[]) as priority_reasons,
  coalesce(gp.waiting_on_citizen, false) as waiting_on_citizen,
  gp.last_meaningful_government_action_at,
  lower(concat_ws(' ', g.registration_number, g.short_title, c.name, g.location_text)) as search_text,
  (
    g.citizen_confirmation_state in ('PARTIALLY_RESOLVED', 'NOT_RESOLVED')
    or exists (
      select 1 from public.appeals a
      where a.grievance_id = g.id and a.state in ('FILED', 'UNDER_REVIEW')
    )
  ) as has_appeal_attention
from public.grievances g
left join public.organizations o on o.id = g.organization_id
left join public.grievance_categories c on c.id = g.category_id
left join public.grievance_priorities gp on gp.grievance_id = g.id;

grant select on public.officer_case_queue to authenticated;
grant select on public.officer_case_queue to service_role;

create or replace function public.officer_mark_grievance_opened(p_grievance_id uuid)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare v_user_id uuid := (select auth.uid()); v_opened_at timestamptz; v_organization_id uuid;
begin
  if v_user_id is null or not private.can_act_on_grievance(p_grievance_id) then raise exception 'You are not authorised to open this case' using errcode = '42501'; end if;
  select organization_id into v_organization_id from public.grievances where id = p_grievance_id;
  insert into public.grievance_priorities (grievance_id, first_opened_at) values (p_grievance_id, now())
  on conflict (grievance_id) do update set first_opened_at = coalesce(public.grievance_priorities.first_opened_at, excluded.first_opened_at)
  returning first_opened_at into v_opened_at;
  if not exists (select 1 from public.case_events where grievance_id = p_grievance_id and event_type = 'CASE_OPENED') then
    insert into public.case_events (grievance_id, event_type, actor_type, actor_id, organization_id, title, description, metadata, citizen_visible)
    values (p_grievance_id, 'CASE_OPENED', 'officer', v_user_id, v_organization_id, 'Case opened by an officer', 'The assigned case was opened for examination.', jsonb_build_object('opened_at', v_opened_at), false);
  end if;
  return v_opened_at;
end; $$;
