-- ============ ENUMS ============
create type public.app_role as enum ('citizen','gro','nodal','appellate','platform_admin');

create type public.administrative_state as enum (
  'DRAFT','SUBMITTED','ROUTING','ROUTED','ASSIGNED','UNDER_EXAMINATION',
  'CLARIFICATION_REQUIRED','CITIZEN_RESPONSE_RECEIVED','ACTION_IN_PROGRESS',
  'INTERIM_RESPONSE','RESOLUTION_PROVIDED','DISPOSED','APPEAL_FILED',
  'APPEAL_UNDER_REVIEW','APPEAL_DECIDED','CLOSED'
);

create type public.outcome_state as enum (
  'UNKNOWN','UNRESOLVED','PARTIALLY_RESOLVED','RESOLUTION_PROPOSED','RESOLVED'
);

create type public.citizen_confirmation_state as enum (
  'NOT_REQUESTED','AWAITING_CONFIRMATION','CONFIRMED_RESOLVED','PARTIALLY_RESOLVED','NOT_RESOLVED'
);

create type public.actor_type as enum ('citizen','officer','system','ai_advisor');
create type public.org_level as enum ('central_ministry','central_department','state','district','local_body','appellate_cell');
create type public.appeal_state as enum ('FILED','UNDER_REVIEW','DECIDED','REJECTED','WITHDRAWN');
create type public.urgency_level as enum ('routine','time_sensitive','urgent');

-- ============ SHARED TRIGGER FN ============
create or replace function public.update_updated_at_column()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

-- ============ ORGANIZATIONS ============
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  level public.org_level not null default 'central_department',
  parent_id uuid references public.organizations(id) on delete set null,
  is_appellate_office boolean not null default false,
  state_name text,
  contact_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.organizations to anon;
grant select on public.organizations to authenticated;
grant all on public.organizations to service_role;
alter table public.organizations enable row level security;
create policy "organizations are public reference data" on public.organizations for select using (true);
create trigger trg_organizations_updated before update on public.organizations
  for each row execute function public.update_updated_at_column();

-- ============ PROFILES ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text,
  phone text,
  role public.app_role not null default 'citizen',
  organization_id uuid references public.organizations(id) on delete set null,
  designation text,
  preferred_language text not null default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.update_updated_at_column();

-- security-definer helpers (avoid recursive RLS)
create or replace function public.current_role_of(_user_id uuid)
returns public.app_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = _user_id
$$;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = _user_id and role = _role)
$$;

create or replace function public.current_org(_user_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select organization_id from public.profiles where id = _user_id
$$;

-- org subtree (nodal visibility)
create or replace function public.org_subtree(_root uuid)
returns setof uuid language sql stable security definer set search_path = public as $$
  with recursive t as (
    select id from public.organizations where id = _root
    union all
    select o.id from public.organizations o join t on o.parent_id = t.id
  ) select id from t
$$;

create policy "users read own profile" on public.profiles
  for select to authenticated using (id = auth.uid() or public.has_role(auth.uid(),'platform_admin'));
create policy "users insert own profile" on public.profiles
  for insert to authenticated with check (id = auth.uid());
create policy "users update own profile" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- auto profile on signup
create or replace function public.handle_new_user()
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
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ CATEGORIES ============
create table public.grievance_categories (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  plain_language_hint text,
  parent_id uuid references public.grievance_categories(id) on delete set null,
  default_organization_id uuid references public.organizations(id) on delete set null,
  sla_days integer not null default 21,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.grievance_categories to anon;
grant select on public.grievance_categories to authenticated;
grant all on public.grievance_categories to service_role;
alter table public.grievance_categories enable row level security;
create policy "categories are public reference data" on public.grievance_categories for select using (true);
create trigger trg_categories_updated before update on public.grievance_categories
  for each row execute function public.update_updated_at_column();

-- ============ GRIEVANCES ============
create table public.grievances (
  id uuid primary key default gen_random_uuid(),
  registration_number text not null unique default ('CPG-' || to_char(now(),'YYYY') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  citizen_id uuid not null references public.profiles(id) on delete cascade,
  original_text text not null,
  short_title text not null default '',
  requested_outcome text,
  urgency public.urgency_level not null default 'routine',
  category_id uuid references public.grievance_categories(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,
  assigned_officer_id uuid references public.profiles(id) on delete set null,
  appellate_organization_id uuid references public.organizations(id) on delete set null,
  location_text text,
  state_name text,
  district_name text,
  administrative_state public.administrative_state not null default 'DRAFT',
  outcome_state public.outcome_state not null default 'UNKNOWN',
  citizen_confirmation_state public.citizen_confirmation_state not null default 'NOT_REQUESTED',
  submitted_at timestamptz,
  sla_due_at timestamptz,
  disposed_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_grievances_citizen on public.grievances(citizen_id);
create index idx_grievances_org on public.grievances(organization_id);
grant select, insert, update on public.grievances to authenticated;
grant all on public.grievances to service_role;
alter table public.grievances enable row level security;
create trigger trg_grievances_updated before update on public.grievances
  for each row execute function public.update_updated_at_column();

create or replace function public.can_view_grievance(_g uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.grievances g, public.profiles p
    where g.id = _g and p.id = auth.uid()
      and (
        g.citizen_id = p.id
        or p.role = 'platform_admin'
        or (p.role = 'gro' and g.organization_id = p.organization_id)
        or (p.role = 'nodal' and p.organization_id is not null
            and g.organization_id in (select public.org_subtree(p.organization_id)))
        or (p.role = 'appellate' and g.appellate_organization_id = p.organization_id)
      )
  )
$$;

create policy "citizens see own grievances" on public.grievances
  for select to authenticated using (citizen_id = auth.uid());
create policy "staff see authorized grievances" on public.grievances
  for select to authenticated using (
    public.has_role(auth.uid(),'platform_admin')
    or (public.current_role_of(auth.uid()) = 'gro' and organization_id = public.current_org(auth.uid()))
    or (public.current_role_of(auth.uid()) = 'nodal' and public.current_org(auth.uid()) is not null
        and organization_id in (select public.org_subtree(public.current_org(auth.uid()))))
    or (public.current_role_of(auth.uid()) = 'appellate' and appellate_organization_id = public.current_org(auth.uid()))
  );
create policy "citizens create own grievances" on public.grievances
  for insert to authenticated with check (citizen_id = auth.uid());
create policy "citizens update own grievances" on public.grievances
  for update to authenticated using (citizen_id = auth.uid()) with check (citizen_id = auth.uid());
create policy "staff update authorized grievances" on public.grievances
  for update to authenticated using (
    public.has_role(auth.uid(),'platform_admin')
    or (public.current_role_of(auth.uid()) = 'gro' and organization_id = public.current_org(auth.uid()))
    or (public.current_role_of(auth.uid()) = 'nodal' and public.current_org(auth.uid()) is not null
        and organization_id in (select public.org_subtree(public.current_org(auth.uid()))))
    or (public.current_role_of(auth.uid()) = 'appellate' and appellate_organization_id = public.current_org(auth.uid()))
  ) with check (true);

-- ============ CASE EVENTS (append-only) ============
create table public.case_events (
  id uuid primary key default gen_random_uuid(),
  grievance_id uuid not null references public.grievances(id) on delete cascade,
  event_type text not null,
  actor_type public.actor_type not null default 'system',
  actor_id uuid references public.profiles(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,
  title text not null default '',
  description text,
  metadata jsonb not null default '{}'::jsonb,
  citizen_visible boolean not null default true,
  created_at timestamptz not null default now()
);
create index idx_case_events_grievance on public.case_events(grievance_id, created_at);
grant select, insert on public.case_events to authenticated;
grant select, insert on public.case_events to service_role;
alter table public.case_events enable row level security;
create policy "view events on authorized cases" on public.case_events
  for select to authenticated using (
    public.can_view_grievance(grievance_id)
    and (citizen_visible or public.current_role_of(auth.uid()) <> 'citizen')
  );
create policy "append events on authorized cases" on public.case_events
  for insert to authenticated with check (public.can_view_grievance(grievance_id));

-- ============ DOCUMENTS ============
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  grievance_id uuid not null references public.grievances(id) on delete cascade,
  uploaded_by uuid references public.profiles(id) on delete set null,
  storage_path text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  doc_kind text,
  citizen_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.documents to authenticated;
grant all on public.documents to service_role;
alter table public.documents enable row level security;
create trigger trg_documents_updated before update on public.documents
  for each row execute function public.update_updated_at_column();
create policy "view documents on authorized cases" on public.documents
  for select to authenticated using (public.can_view_grievance(grievance_id));
create policy "upload documents on authorized cases" on public.documents
  for insert to authenticated with check (public.can_view_grievance(grievance_id) and uploaded_by = auth.uid());
create policy "uploader manages own documents" on public.documents
  for update to authenticated using (uploaded_by = auth.uid()) with check (uploaded_by = auth.uid());
create policy "uploader deletes own documents" on public.documents
  for delete to authenticated using (uploaded_by = auth.uid());

-- ============ DOCUMENT REQUESTS ============
create table public.document_requests (
  id uuid primary key default gen_random_uuid(),
  grievance_id uuid not null references public.grievances(id) on delete cascade,
  requested_by uuid references public.profiles(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,
  reason text,
  due_at timestamptz,
  fulfilled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.document_requests to authenticated;
grant all on public.document_requests to service_role;
alter table public.document_requests enable row level security;
create trigger trg_docreq_updated before update on public.document_requests
  for each row execute function public.update_updated_at_column();
create policy "view document requests on authorized cases" on public.document_requests
  for select to authenticated using (public.can_view_grievance(grievance_id));
create policy "staff create document requests" on public.document_requests
  for insert to authenticated with check (public.can_view_grievance(grievance_id) and public.current_role_of(auth.uid()) <> 'citizen');
create policy "participants update document requests" on public.document_requests
  for update to authenticated using (public.can_view_grievance(grievance_id)) with check (public.can_view_grievance(grievance_id));

create table public.document_request_items (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.document_requests(id) on delete cascade,
  label text not null,
  description text,
  is_required boolean not null default true,
  document_id uuid references public.documents(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.document_request_items to authenticated;
grant all on public.document_request_items to service_role;
alter table public.document_request_items enable row level security;
create trigger trg_docreqitem_updated before update on public.document_request_items
  for each row execute function public.update_updated_at_column();
create or replace function public.can_view_request(_r uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.can_view_grievance((select grievance_id from public.document_requests where id = _r))
$$;
create policy "view request items" on public.document_request_items
  for select to authenticated using (public.can_view_request(request_id));
create policy "staff create request items" on public.document_request_items
  for insert to authenticated with check (public.can_view_request(request_id) and public.current_role_of(auth.uid()) <> 'citizen');
create policy "participants update request items" on public.document_request_items
  for update to authenticated using (public.can_view_request(request_id)) with check (public.can_view_request(request_id));

-- ============ MESSAGES ============
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  grievance_id uuid not null references public.grievances(id) on delete cascade,
  sender_id uuid references public.profiles(id) on delete set null,
  sender_type public.actor_type not null default 'citizen',
  body text not null,
  citizen_visible boolean not null default true,
  created_at timestamptz not null default now()
);
grant select, insert on public.messages to authenticated;
grant all on public.messages to service_role;
alter table public.messages enable row level security;
create policy "view messages on authorized cases" on public.messages
  for select to authenticated using (
    public.can_view_grievance(grievance_id)
    and (citizen_visible or public.current_role_of(auth.uid()) <> 'citizen')
  );
create policy "send messages on authorized cases" on public.messages
  for insert to authenticated with check (public.can_view_grievance(grievance_id) and sender_id = auth.uid());

-- ============ RESOLUTIONS (government side) ============
create table public.resolutions (
  id uuid primary key default gen_random_uuid(),
  grievance_id uuid not null references public.grievances(id) on delete cascade,
  authored_by uuid references public.profiles(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,
  action_taken text not null,
  outcome_claimed public.outcome_state not null default 'RESOLUTION_PROPOSED',
  is_interim boolean not null default false,
  effective_from date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.resolutions to authenticated;
grant all on public.resolutions to service_role;
alter table public.resolutions enable row level security;
create trigger trg_resolutions_updated before update on public.resolutions
  for each row execute function public.update_updated_at_column();
create policy "view resolutions on authorized cases" on public.resolutions
  for select to authenticated using (public.can_view_grievance(grievance_id));
create policy "staff author resolutions" on public.resolutions
  for insert to authenticated with check (public.can_view_grievance(grievance_id) and public.current_role_of(auth.uid()) <> 'citizen');
create policy "author updates resolution" on public.resolutions
  for update to authenticated using (authored_by = auth.uid()) with check (authored_by = auth.uid());

-- ============ FEEDBACK (citizen side, separate) ============
create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  grievance_id uuid not null references public.grievances(id) on delete cascade,
  citizen_id uuid not null references public.profiles(id) on delete cascade,
  confirmation public.citizen_confirmation_state not null,
  satisfaction_rating smallint,
  comments text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.feedback to authenticated;
grant all on public.feedback to service_role;
alter table public.feedback enable row level security;
create trigger trg_feedback_updated before update on public.feedback
  for each row execute function public.update_updated_at_column();
create policy "view feedback on authorized cases" on public.feedback
  for select to authenticated using (public.can_view_grievance(grievance_id));
create policy "citizen records own feedback" on public.feedback
  for insert to authenticated with check (citizen_id = auth.uid() and public.can_view_grievance(grievance_id));
create policy "citizen updates own feedback" on public.feedback
  for update to authenticated using (citizen_id = auth.uid()) with check (citizen_id = auth.uid());

-- ============ APPEALS ============
create table public.appeals (
  id uuid primary key default gen_random_uuid(),
  grievance_id uuid not null references public.grievances(id) on delete cascade,
  citizen_id uuid not null references public.profiles(id) on delete cascade,
  appellate_organization_id uuid references public.organizations(id) on delete set null,
  reviewer_id uuid references public.profiles(id) on delete set null,
  reference_number text not null unique default ('APL-' || to_char(now(),'YYYY') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  grounds text not null,
  requested_relief text,
  state public.appeal_state not null default 'FILED',
  decision_summary text,
  decision_reasons text,
  filed_at timestamptz not null default now(),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.appeals to authenticated;
grant all on public.appeals to service_role;
alter table public.appeals enable row level security;
create trigger trg_appeals_updated before update on public.appeals
  for each row execute function public.update_updated_at_column();
create policy "citizen sees own appeals" on public.appeals
  for select to authenticated using (citizen_id = auth.uid());
create policy "authorized staff see appeals" on public.appeals
  for select to authenticated using (
    public.has_role(auth.uid(),'platform_admin')
    or (public.current_role_of(auth.uid()) = 'appellate' and appellate_organization_id = public.current_org(auth.uid()))
    or (public.current_role_of(auth.uid()) in ('gro','nodal') and public.can_view_grievance(grievance_id))
  );
create policy "citizen files own appeal" on public.appeals
  for insert to authenticated with check (citizen_id = auth.uid());
create policy "appellate updates appeals" on public.appeals
  for update to authenticated using (
    public.has_role(auth.uid(),'platform_admin')
    or (public.current_role_of(auth.uid()) = 'appellate' and appellate_organization_id = public.current_org(auth.uid()))
  ) with check (true);

create table public.appeal_events (
  id uuid primary key default gen_random_uuid(),
  appeal_id uuid not null references public.appeals(id) on delete cascade,
  event_type text not null,
  actor_type public.actor_type not null default 'system',
  actor_id uuid references public.profiles(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,
  title text not null default '',
  description text,
  metadata jsonb not null default '{}'::jsonb,
  citizen_visible boolean not null default true,
  created_at timestamptz not null default now()
);
grant select, insert on public.appeal_events to authenticated;
grant all on public.appeal_events to service_role;
alter table public.appeal_events enable row level security;
create or replace function public.can_view_appeal(_a uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.appeals a, public.profiles p
    where a.id = _a and p.id = auth.uid()
      and (a.citizen_id = p.id
           or p.role = 'platform_admin'
           or (p.role = 'appellate' and a.appellate_organization_id = p.organization_id)
           or (p.role in ('gro','nodal') and public.can_view_grievance(a.grievance_id)))
  )
$$;
create policy "view appeal events" on public.appeal_events
  for select to authenticated using (
    public.can_view_appeal(appeal_id)
    and (citizen_visible or public.current_role_of(auth.uid()) <> 'citizen')
  );
create policy "append appeal events" on public.appeal_events
  for insert to authenticated with check (public.can_view_appeal(appeal_id));

-- ============ NOTIFICATIONS ============
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  grievance_id uuid references public.grievances(id) on delete cascade,
  appeal_id uuid references public.appeals(id) on delete cascade,
  title text not null,
  body text,
  kind text not null default 'update',
  action_required boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create trigger trg_notifications_updated before update on public.notifications
  for each row execute function public.update_updated_at_column();
create policy "users see own notifications" on public.notifications
  for select to authenticated using (user_id = auth.uid());
create policy "users update own notifications" on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "staff create notifications" on public.notifications
  for insert to authenticated with check (public.current_role_of(auth.uid()) <> 'citizen' or user_id = auth.uid());

-- ============ AI RUNS (advisory only) ============
create table public.ai_runs (
  id uuid primary key default gen_random_uuid(),
  grievance_id uuid references public.grievances(id) on delete cascade,
  appeal_id uuid references public.appeals(id) on delete cascade,
  run_kind text not null,
  model_label text,
  input_summary text,
  suggestion jsonb not null default '{}'::jsonb,
  confidence numeric(4,3),
  requested_by uuid references public.profiles(id) on delete set null,
  accepted_by uuid references public.profiles(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.ai_runs to authenticated;
grant all on public.ai_runs to service_role;
alter table public.ai_runs enable row level security;
create policy "staff read ai runs" on public.ai_runs
  for select to authenticated using (
    public.current_role_of(auth.uid()) <> 'citizen'
    and (grievance_id is null or public.can_view_grievance(grievance_id))
  );
create policy "staff create ai runs" on public.ai_runs
  for insert to authenticated with check (public.current_role_of(auth.uid()) <> 'citizen');
create policy "staff update ai runs" on public.ai_runs
  for update to authenticated using (public.current_role_of(auth.uid()) <> 'citizen') with check (true);

-- ============ ISSUE CLUSTERS ============
create table public.issue_clusters (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text,
  organization_id uuid references public.organizations(id) on delete set null,
  category_id uuid references public.grievance_categories(id) on delete set null,
  case_count integer not null default 0,
  status text not null default 'observed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.issue_clusters to authenticated;
grant all on public.issue_clusters to service_role;
alter table public.issue_clusters enable row level security;
create trigger trg_clusters_updated before update on public.issue_clusters
  for each row execute function public.update_updated_at_column();
create policy "staff read clusters" on public.issue_clusters
  for select to authenticated using (public.current_role_of(auth.uid()) <> 'citizen');
create policy "staff write clusters" on public.issue_clusters
  for insert to authenticated with check (public.current_role_of(auth.uid()) <> 'citizen');
create policy "staff update clusters" on public.issue_clusters
  for update to authenticated using (public.current_role_of(auth.uid()) <> 'citizen') with check (true);

create table public.issue_cluster_members (
  id uuid primary key default gen_random_uuid(),
  cluster_id uuid not null references public.issue_clusters(id) on delete cascade,
  grievance_id uuid not null references public.grievances(id) on delete cascade,
  similarity numeric(4,3),
  created_at timestamptz not null default now(),
  unique (cluster_id, grievance_id)
);
grant select, insert, delete on public.issue_cluster_members to authenticated;
grant all on public.issue_cluster_members to service_role;
alter table public.issue_cluster_members enable row level security;
create policy "staff read cluster members" on public.issue_cluster_members
  for select to authenticated using (public.current_role_of(auth.uid()) <> 'citizen');
create policy "staff write cluster members" on public.issue_cluster_members
  for insert to authenticated with check (public.current_role_of(auth.uid()) <> 'citizen');
create policy "staff delete cluster members" on public.issue_cluster_members
  for delete to authenticated using (public.current_role_of(auth.uid()) <> 'citizen');

-- ============ STORAGE POLICIES (bucket created separately) ============
create policy "read own or authorized grievance files" on storage.objects
  for select to authenticated using (
    bucket_id = 'grievance-documents'
    and exists (select 1 from public.documents d where d.storage_path = name and public.can_view_grievance(d.grievance_id))
  );
create policy "upload grievance files into own folder" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'grievance-documents' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "delete own grievance files" on storage.objects
  for delete to authenticated using (
    bucket_id = 'grievance-documents' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============ SEED REFERENCE DATA ============
insert into public.organizations (id, code, name, level, parent_id, is_appellate_office, state_name) values
  ('11111111-1111-1111-1111-111111111101','MOHUA','Ministry of Housing and Urban Affairs','central_ministry',null,false,null),
  ('11111111-1111-1111-1111-111111111102','ULB-PMC','Pune Municipal Corporation','local_body','11111111-1111-1111-1111-111111111101',false,'Maharashtra'),
  ('11111111-1111-1111-1111-111111111103','MOF-PENSION','Department of Pension and Pensioners Welfare','central_department',null,false,null),
  ('11111111-1111-1111-1111-111111111104','CPAO','Central Pension Accounting Office','central_department','11111111-1111-1111-1111-111111111103',false,null),
  ('11111111-1111-1111-1111-111111111105','APPEAL-URBAN','Appellate Cell — Urban Affairs','appellate_cell','11111111-1111-1111-1111-111111111101',true,null),
  ('11111111-1111-1111-1111-111111111106','APPEAL-PENSION','Appellate Cell — Pension','appellate_cell','11111111-1111-1111-1111-111111111103',true,null);

insert into public.grievance_categories (id, code, name, plain_language_hint, default_organization_id, sla_days) values
  ('22222222-2222-2222-2222-222222222201','URBAN','Roads, water, streetlights and local services','Something in my street or neighbourhood is broken or missing','11111111-1111-1111-1111-111111111102',21),
  ('22222222-2222-2222-2222-222222222202','URBAN-LIGHT','Streetlight not working','A streetlight near me is dark or flickering','11111111-1111-1111-1111-111111111102',15),
  ('22222222-2222-2222-2222-222222222203','PENSION','Pension and retirement payments','My pension has not arrived or the amount is wrong','11111111-1111-1111-1111-111111111104',30),
  ('22222222-2222-2222-2222-222222222204','PENSION-DELAY','Pension payment delayed','My monthly pension has stopped or is late','11111111-1111-1111-1111-111111111104',30);

update public.grievance_categories set parent_id = '22222222-2222-2222-2222-222222222201' where code = 'URBAN-LIGHT';
update public.grievance_categories set parent_id = '22222222-2222-2222-2222-222222222203' where code = 'PENSION-DELAY';

insert into public.issue_clusters (id, title, summary, organization_id, category_id, case_count, status) values
  ('33333333-3333-3333-3333-333333333301','Repeated streetlight outages in Kothrud ward','Multiple dark-streetlight reports from the same ward within 60 days.','11111111-1111-1111-1111-111111111102','22222222-2222-2222-2222-222222222202',7,'observed'),
  ('33333333-3333-3333-3333-333333333302','Pension disbursement gaps after bank migration','Several pensioners report missed months following an account migration.','11111111-1111-1111-1111-111111111104','22222222-2222-2222-2222-222222222204',12,'observed');