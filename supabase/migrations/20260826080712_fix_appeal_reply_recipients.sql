-- Do not enumerate protected profile rows from an authenticated workflow.
-- The grievance already records its responsible officer; the request event
-- records the specific Appellate Authority that must receive the reply.

create or replace function public.appellate_request_office_reply(p_appeal_id uuid, p_instructions text)
returns uuid language plpgsql security invoker set search_path = public, private as $$
declare v_appeal public.appeals%rowtype; v_grievance public.grievances%rowtype; v_message_id uuid;
begin
  if private.current_role_of(auth.uid()) <> 'appellate' then raise exception 'Only an Appellate Authority can request an office reply' using errcode = '42501'; end if;
  if nullif(trim(p_instructions), '') is null then raise exception 'Reply instructions are required' using errcode = '22023'; end if;
  select * into v_appeal from public.appeals where id = p_appeal_id and appellate_organization_id = private.current_org(auth.uid()) for update;
  if not found then raise exception 'Appeal is unavailable or outside your authority' using errcode = '42501'; end if;
  if v_appeal.state in ('DECIDED', 'REJECTED', 'WITHDRAWN') then raise exception 'This appeal is already closed' using errcode = '22023'; end if;
  select * into v_grievance from public.grievances where id = v_appeal.grievance_id;
  if not found or v_grievance.organization_id is null then raise exception 'The responsible office is unavailable' using errcode = '22023'; end if;
  update public.appeals set state = 'UNDER_REVIEW' where id = v_appeal.id;
  insert into public.messages (grievance_id, sender_id, sender_type, body, citizen_visible) values (v_grievance.id, auth.uid(), 'officer', 'Appellate Authority reply request: ' || trim(p_instructions), false) returning id into v_message_id;
  insert into public.appeal_events (appeal_id, event_type, actor_type, actor_id, organization_id, title, description, metadata, citizen_visible) values (v_appeal.id, 'APPEAL_OFFICE_REPLY_REQUESTED', 'officer', auth.uid(), v_appeal.appellate_organization_id, 'Office reply requested', trim(p_instructions), jsonb_build_object('message_id', v_message_id, 'requested_organization_id', v_grievance.organization_id), false);
  insert into public.case_events (grievance_id, event_type, actor_type, actor_id, organization_id, title, description, metadata, citizen_visible) values (v_grievance.id, 'APPEAL_OFFICE_REPLY_REQUESTED', 'officer', auth.uid(), v_appeal.appellate_organization_id, 'Office reply requested for appeal', trim(p_instructions), jsonb_build_object('appeal_id', v_appeal.id, 'message_id', v_message_id, 'requested_organization_id', v_grievance.organization_id), false);
  if v_grievance.assigned_officer_id is not null then
    insert into public.notifications (user_id, grievance_id, appeal_id, title, body, kind, action_required) values (v_grievance.assigned_officer_id, v_grievance.id, v_appeal.id, 'Appellate reply requested', trim(p_instructions), 'appeal_office_reply_request', true);
  end if;
  return v_message_id;
end; $$;

create or replace function public.officer_reply_to_appeal(p_appeal_id uuid, p_reply text)
returns uuid language plpgsql security invoker set search_path = public, private as $$
declare v_appeal public.appeals%rowtype; v_grievance public.grievances%rowtype; v_requested_organization_id uuid; v_requester_id uuid; v_message_id uuid;
begin
  if private.current_role_of(auth.uid()) not in ('gro', 'nodal') then raise exception 'Only an authorized office user can reply to an appeal' using errcode = '42501'; end if;
  if nullif(trim(p_reply), '') is null then raise exception 'A reply is required' using errcode = '22023'; end if;
  select * into v_appeal from public.appeals where id = p_appeal_id;
  if not found then raise exception 'Appeal is unavailable or outside your office scope' using errcode = '42501'; end if;
  if v_appeal.state <> 'UNDER_REVIEW' then raise exception 'This appeal is not awaiting an office reply' using errcode = '22023'; end if;
  select * into v_grievance from public.grievances where id = v_appeal.grievance_id;
  if not found then raise exception 'The grievance linked to this appeal is unavailable' using errcode = '22023'; end if;
  select nullif(metadata ->> 'requested_organization_id', '')::uuid, actor_id into v_requested_organization_id, v_requester_id from public.appeal_events where appeal_id = v_appeal.id and event_type = 'APPEAL_OFFICE_REPLY_REQUESTED' order by created_at desc limit 1;
  v_requested_organization_id := coalesce(v_requested_organization_id, v_grievance.organization_id);
  if v_requested_organization_id is null then raise exception 'The requested office is unavailable' using errcode = '22023'; end if;
  if private.current_role_of(auth.uid()) = 'gro' and private.current_org(auth.uid()) <> v_requested_organization_id then raise exception 'Appeal is unavailable or outside your office scope' using errcode = '42501'; end if;
  if private.current_role_of(auth.uid()) = 'nodal' and (private.current_org(auth.uid()) is null or v_requested_organization_id not in (select private.org_subtree(private.current_org(auth.uid())))) then raise exception 'Appeal is unavailable or outside your office scope' using errcode = '42501'; end if;
  if not private.can_view_grievance(v_appeal.grievance_id) then raise exception 'Appeal is unavailable or outside your office scope' using errcode = '42501'; end if;
  insert into public.messages (grievance_id, sender_id, sender_type, body, citizen_visible) values (v_appeal.grievance_id, auth.uid(), 'officer', 'Office reply to the Appellate Authority: ' || trim(p_reply), false) returning id into v_message_id;
  insert into public.appeal_events (appeal_id, event_type, actor_type, actor_id, organization_id, title, description, metadata, citizen_visible) values (v_appeal.id, 'APPEAL_OFFICE_REPLY_PROVIDED', 'officer', auth.uid(), private.current_org(auth.uid()), 'Office reply provided', trim(p_reply), jsonb_build_object('message_id', v_message_id, 'requested_organization_id', v_requested_organization_id), false);
  insert into public.case_events (grievance_id, event_type, actor_type, actor_id, organization_id, title, description, metadata, citizen_visible) values (v_appeal.grievance_id, 'APPEAL_OFFICE_REPLY_PROVIDED', 'officer', auth.uid(), private.current_org(auth.uid()), 'Office reply provided for appeal', trim(p_reply), jsonb_build_object('appeal_id', v_appeal.id, 'message_id', v_message_id, 'requested_organization_id', v_requested_organization_id), false);
  if v_requester_id is not null then insert into public.notifications (user_id, grievance_id, appeal_id, title, body, kind, action_required) values (v_requester_id, v_appeal.grievance_id, v_appeal.id, 'Office reply received for an appeal', trim(p_reply), 'appeal_office_reply', false); end if;
  return v_message_id;
end; $$;
