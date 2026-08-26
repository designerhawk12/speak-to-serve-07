-- Rollback-only integration test for the real connected development project.
-- It proves the reply target and responder scope use the same organization.
begin;
-- Reuse an existing development profile only inside this transaction to
-- exercise the unrelated-GRO branch; ROLLBACK restores it exactly.
update public.profiles set role = 'gro', organization_id = '11111111-1111-1111-1111-111111111105' where id = '132f4f81-f508-4db6-8caa-00bc2ab84b1f';
set local role authenticated;

do $$
declare
  v_appeal uuid := '90000000-0000-4000-8000-000000000409';
  v_grievance uuid := '90000000-0000-4000-8000-000000000010';
  v_gro uuid := '9d1cba4c-b3ec-4ca0-b7d1-0e5e6bc92f09';
  v_authorized_nodal uuid := 'd717b02e-7a6e-4829-b5f8-6cb427f7c3e0';
  v_appellate uuid := '9fea16f1-c4a8-491d-9299-1df34d688a48';
  v_unscoped_nodal uuid := '132f4f81-f508-4db6-8caa-00bc2ab84b1f';
  v_target_org uuid := '11111111-1111-1111-1111-111111111102';
  v_reply_message uuid;
begin
  perform set_config('request.jwt.claim.sub', v_appellate::text, true);
  perform public.appellate_request_office_reply(v_appeal, 'Integration test: provide the office record.');

  if not exists (
    select 1 from public.appeal_events
    where appeal_id = v_appeal and event_type = 'APPEAL_OFFICE_REPLY_REQUESTED'
      and metadata ->> 'requested_organization_id' = v_target_org::text
  ) then raise exception 'reply request did not record its target office'; end if;
  perform set_config('request.jwt.claim.sub', v_gro::text, true);
  if not exists (
    select 1 from public.notifications
    where appeal_id = v_appeal and user_id = v_gro and kind = 'appeal_office_reply_request'
  ) then raise exception 'target GRO did not receive a reply-request notification'; end if;
  v_reply_message := public.officer_reply_to_appeal(v_appeal, 'Integration test: authorized GRO reply.');
  if v_reply_message is null or not exists (
    select 1 from public.appeal_events
    where appeal_id = v_appeal and event_type = 'APPEAL_OFFICE_REPLY_PROVIDED'
      and actor_id = v_gro and metadata ->> 'requested_organization_id' = v_target_org::text
  ) then raise exception 'authorized GRO reply was not recorded'; end if;
  perform set_config('request.jwt.claim.sub', v_appellate::text, true);
  if not exists (
    select 1 from public.notifications
    where appeal_id = v_appeal and user_id = v_appellate and kind = 'appeal_office_reply'
  ) then raise exception 'Appellate Authority was not notified of the reply'; end if;
  if (select administrative_state from public.grievances where id = v_grievance) <> 'ASSIGNED' then
    raise exception 'office reply changed grievance administration state';
  end if;

  perform set_config('request.jwt.claim.sub', v_authorized_nodal::text, true);
  if public.officer_reply_to_appeal(v_appeal, 'Integration test: authorized Nodal reply.') is null then
    raise exception 'authorized Nodal reply was not recorded';
  end if;

  perform set_config('request.jwt.claim.sub', v_unscoped_nodal::text, true);
  begin
    perform public.officer_reply_to_appeal(v_appeal, 'Integration test: unauthorized reply.');
    raise exception 'unrelated GRO reply unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end;
$$;

rollback;
