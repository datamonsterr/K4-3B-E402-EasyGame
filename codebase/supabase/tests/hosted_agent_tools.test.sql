-- Authenticated mutation tools derive actor and guild from auth.uid() and data.
set role service_role;
insert into public.questions(id, guild_id, message_id, intent)
select
  '10000000-0000-0000-0000-000000000010',
  guild_id,
  id,
  'hosted-alert-test'
from public.source_messages
where record_ordinal = 7;
reset role;

select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000001',
  false
);
set role authenticated;
select test.assert(
  exists(select 1 from public.list_radar_items()
    where question_id = '10000000-0000-0000-0000-000000000010'),
  'learner receives bounded radar metadata for their own guild'
);
do $$
begin
  begin
    perform public.record_agent_run(
      '00000000-0000-0000-0000-000000000001',
      (select guild_id from public.memberships where user_id = '00000000-0000-0000-0000-000000000001'),
      'clarify', 'v0', 3, 'Clarification required', null,
      'gemini', 'validation-model', false, false, '[]'::jsonb
    );
    raise exception 'authenticated caller forged run evidence';
  exception when insufficient_privilege then null;
  end;
end
$$;
reset role;
set role service_role;
select public.record_agent_run(
  '00000000-0000-0000-0000-000000000001',
  (select guild_id from public.memberships where user_id = '00000000-0000-0000-0000-000000000001'),
  'clarify', 'v0', 3, 'Clarification required', null,
  'gemini', 'validation-model', false, false,
  '[{"type":"decision","summary":"Clarification required"}]'::jsonb
);
select test.assert(
  (select count(*) = 1 from public.assistant_runs
   where actor_id = '00000000-0000-0000-0000-000000000001'
     and decision_summary = 'Clarification required'),
  'trusted server recorder stores one bounded run for an authenticated actor'
);
do $$
begin
  begin
    perform public.record_agent_run(
      '00000000-0000-0000-0000-000000000001',
      (select guild_id from public.memberships where user_id = '00000000-0000-0000-0000-000000000001'),
      'clarify', 'v0', 3, 'Bearer secret-token', null,
      'gemini', 'validation-model', false, false, '[]'::jsonb
    );
    raise exception 'unsafe run evidence unexpectedly permitted';
  exception when invalid_parameter_value then null;
  end;
end
$$;
reset role;
set role authenticated;
do $$
begin
  begin
    perform public.create_staff_alert(
      '10000000-0000-0000-0000-000000000010',
      1,
      'Synthetic learner denial',
      'validation:learner-denied'
    );
    raise exception 'learner alert unexpectedly permitted';
  exception when insufficient_privilege then null;
  end;
end
$$;
reset role;

select test.assert(
  (select count(*) = 0 from public.radar_alerts
   where question_id = '10000000-0000-0000-0000-000000000010'),
  'learner denial creates no alert'
);

select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000002',
  false
);
set role authenticated;
select public.create_staff_alert(
  '10000000-0000-0000-0000-000000000010',
  2,
  'Synthetic tier one warning',
  'validation:alert:one'
);
select public.create_staff_alert(
  '10000000-0000-0000-0000-000000000010',
  2,
  'Synthetic tier one warning',
  'validation:alert:one'
);
reset role;

select test.assert(
  (select count(*) = 1 from public.radar_alerts
   where question_id = '10000000-0000-0000-0000-000000000010'
     and tier = 2
     and actor_id = '00000000-0000-0000-0000-000000000002'
     and summary = 'Synthetic tier one warning'),
  'coach retry is idempotent and records the authenticated actor'
);

select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000005',
  false
);
set role authenticated;
select test.assert(
  not exists(select 1 from public.list_radar_items()
    where question_id = '10000000-0000-0000-0000-000000000010'),
  'cross-guild member cannot receive another guild radar item'
);
do $$
begin
  begin
    perform public.create_staff_alert(
      '10000000-0000-0000-0000-000000000010',
      2,
      'Synthetic cross guild denial',
      'validation:cross-guild'
    );
    raise exception 'cross-guild alert unexpectedly permitted';
  exception when insufficient_privilege then null;
  end;
end
$$;
reset role;

select test.assert(
  (select count(*) = 1 from public.radar_alerts
   where question_id = '10000000-0000-0000-0000-000000000010'),
  'cross-guild denial creates no alert'
);

do $$
begin
  begin
    set local role anon;
    perform public.create_staff_alert(
      '10000000-0000-0000-0000-000000000010',
      1,
      'Synthetic anonymous denial',
      'validation:anonymous'
    );
    raise exception 'anonymous alert unexpectedly permitted';
  exception when insufficient_privilege then null;
  end;
end
$$;

set role service_role;
update public.questions
set status = 'resolved', resolved_at = now(), version = version + 1
where id = '10000000-0000-0000-0000-000000000010';
reset role;

select 'Hosted agent tool database assertions passed' as result;
