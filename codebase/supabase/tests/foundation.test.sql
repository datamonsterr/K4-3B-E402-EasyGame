select test.assert((select count(*) = 13 from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE'), 'all thirteen domain tables exist');
insert into auth.users(id) values
 ('00000000-0000-0000-0000-000000000001'),
 ('00000000-0000-0000-0000-000000000002'),
 ('00000000-0000-0000-0000-000000000003'),
 ('00000000-0000-0000-0000-000000000004');
set role service_role;
select public.import_pack(repeat('a',64),'synthetic-test', '[
 {"record_ordinal":1,"source_label":"duplicate","guild_label":"A","channel_label":"public","author_label":"human","is_bot":false,"message_type":"message","sent_at":"2026-09-18T00:00:00Z","content":"First","mentions_bot":false,"attachment_count":0,"source_char_count":5},
 {"record_ordinal":2,"source_label":"duplicate","guild_label":"A","channel_label":"staff","author_label":"human","is_bot":false,"message_type":"message","sent_at":"2026-09-18T00:00:00Z","content":"Second","mentions_bot":false,"attachment_count":0,"source_char_count":6},
 {"record_ordinal":3,"source_label":"ambiguous","guild_label":"A","channel_label":"public","author_label":"human","is_bot":false,"message_type":"reply","sent_at":"2026-09-18T00:01:00Z","content":"Third","mentions_bot":false,"attachment_count":0,"source_char_count":5,"reply_source_label":"duplicate"},
 {"record_ordinal":4,"source_label":"missing","guild_label":"A","channel_label":"public","author_label":"human","is_bot":false,"message_type":"reply","sent_at":"2026-09-18T00:02:00Z","content":"Fourth","mentions_bot":false,"attachment_count":0,"source_char_count":6,"reply_source_label":"absent"},
 {"record_ordinal":5,"source_label":"resolved","guild_label":"A","channel_label":"public","author_label":"bot","is_bot":true,"message_type":"reply","sent_at":"2026-09-18T00:03:00Z","content":"Fifth","mentions_bot":false,"attachment_count":0,"source_char_count":5,"reply_source_label":"missing"},
 {"record_ordinal":6,"source_label":"duplicate","guild_label":"B","channel_label":"public","author_label":"other","is_bot":false,"message_type":"message","sent_at":"2026-09-18T00:00:00Z","content":"Private guild","mentions_bot":false,"attachment_count":0,"source_char_count":13},
 {"record_ordinal":7,"source_label":"unknown","guild_label":"A","channel_label":"unknown","author_label":"human","is_bot":false,"message_type":"message","sent_at":"2026-09-18T00:00:00Z","content":"Uncurated","mentions_bot":false,"attachment_count":0,"source_char_count":9}
 ]'::jsonb);
select test.assert((public.import_pack(repeat('a',64),'retry','[]'::jsonb)->>'already_imported')::boolean, 'duplicate checksum is idempotent');
select test.assert((select count(*)=7 from public.source_messages), 'duplicate source labels preserve every record');
select test.assert((select reply_resolution='ambiguous' and reply_to_id is null from public.source_messages where record_ordinal=3), 'ambiguous reply stays unresolved');
select test.assert((select reply_resolution='missing' and reply_to_id is null from public.source_messages where record_ordinal=4), 'missing reply stays unresolved');
select test.assert((select reply_resolution='resolved' and reply_to_id is not null from public.source_messages where record_ordinal=5), 'unique reply resolves');
reset role;
update public.channels set visibility=source_label where source_label in ('public','staff');
insert into public.memberships(guild_id,user_id,role)
select id, '00000000-0000-0000-0000-000000000001', 'learner' from public.guilds where source_label='A';
insert into public.memberships(guild_id,user_id,role)
select id, '00000000-0000-0000-0000-000000000002', 'lab_coach' from public.guilds where source_label='A';
insert into public.memberships(guild_id,user_id,role)
select id, '00000000-0000-0000-0000-000000000003', 'lab_coach' from public.guilds where source_label='A';
insert into public.memberships(guild_id,user_id,role)
select id, '00000000-0000-0000-0000-000000000004', 'learner' from public.guilds where source_label='B';
insert into public.questions(id,guild_id,message_id,intent)
select '10000000-0000-0000-0000-000000000001',guild_id,id,'synthetic' from public.source_messages where record_ordinal=1;
insert into public.assistant_runs(id,guild_id,actor_id,status,artifact_version,latency_ms,decision_summary)
select '20000000-0000-0000-0000-000000000001',id,'00000000-0000-0000-0000-000000000001','fallback','v0',1,'No verified evidence' from public.guilds where source_label='A';
insert into public.assistant_runs(id,guild_id,actor_id,status,artifact_version,latency_ms,decision_summary)
select '20000000-0000-0000-0000-000000000002',id,'00000000-0000-0000-0000-000000000003','fallback','v0',1,'No verified evidence' from public.guilds where source_label='A';
insert into public.run_events(run_id,sequence,event_type,summary) values
 ('20000000-0000-0000-0000-000000000001',0,'result','Fallback'),
 ('20000000-0000-0000-0000-000000000002',0,'result','Fallback');
set role anon;
do $$ begin
 begin perform 1 from public.source_messages; raise exception 'anonymous pack read unexpectedly allowed'; exception when insufficient_privilege then null; end;
 begin perform 1 from public.datasets; raise exception 'anonymous dataset read unexpectedly allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
set role authenticated;
select test.assert((select count(*)=4 from public.source_messages), 'learner sees own guild public channels only');
select test.assert((select count(*)=1 from public.guilds), 'cross guild isolated');
select test.assert((select count(*)=2 from public.authors), 'authors scoped through visible messages');
select test.assert((select count(*)=0 from public.questions), 'learner cannot see radar');
select test.assert((select count(*)=1 from public.assistant_runs), 'learner only own runs');
select test.assert((select count(*)=1 from public.run_events), 'events inherit run visibility');
do $$ begin
 begin update public.memberships set role='lab_coach'; raise exception 'self promotion unexpectedly allowed'; exception when insufficient_privilege then null; end;
 begin perform public.claim_question('10000000-0000-0000-0000-000000000001',0); raise exception 'learner claim unexpectedly allowed'; exception when insufficient_privilege then null; end;
 begin perform public.import_pack(repeat('b',64),'unauthorized','[]'); raise exception 'learner import unexpectedly allowed'; exception when insufficient_privilege then null; end;
 begin perform public.enqueue_radar('2026-09-18T05:00:00Z'); raise exception 'learner scheduler unexpectedly allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
set role authenticated;
select test.assert((select count(*)=6 from public.source_messages), 'coach sees staff and unknown in own guild');
select test.assert((select count(*)=2 from public.assistant_runs), 'coach sees own guild runs');
do $$ begin
 begin perform public.claim_question('10000000-0000-0000-0000-000000000001',null); raise exception 'null version unexpectedly allowed'; exception when serialization_failure then null; end;
end $$;
select public.claim_question('10000000-0000-0000-0000-000000000001',0);
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',false);
set role authenticated;
do $$ begin
 begin perform public.claim_question('10000000-0000-0000-0000-000000000001',0); raise exception 'stale claim unexpectedly allowed'; exception when serialization_failure then null; end;
 begin perform public.claim_question('10000000-0000-0000-0000-000000000001',1); raise exception 'stealing claim unexpectedly allowed'; exception when serialization_failure then null; end;
end $$;
reset role;
set role service_role;
select test.assert(public.enqueue_radar('2026-09-18T01:59:59Z')=0, 'no early alert');
select test.assert(public.enqueue_radar('2026-09-18T02:00:00Z')=1, 'two hour threshold');
select test.assert(public.enqueue_radar('2026-09-18T04:00:00Z')=1, 'four hour threshold');
select test.assert(public.enqueue_radar('2026-09-19T04:00:00Z')=0, 'radar retries idempotent');
select test.assert(public.enqueue_digests('2026-09-18T14:59:59Z')=0, 'digest not before local 22:00');
select test.assert(public.enqueue_digests('2026-09-18T15:00:00Z')=2, 'digest per guild at local 22:00');
select test.assert(public.enqueue_digests('2026-09-18T15:00:00Z')=0, 'digest retries idempotent');
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
set role authenticated;
select public.resolve_question('10000000-0000-0000-0000-000000000001',1);
select test.assert((select status='resolved' and resolved_at is not null and version=2 from public.questions), 'authorized resolution increments version');
reset role;
do $$ declare gid uuid; mid uuid; begin
 select id into gid from public.guilds where source_label='B';
 select id into mid from public.source_messages where record_ordinal=3;
 begin insert into public.questions(guild_id,message_id,intent) values(gid,mid,'cross-guild'); raise exception 'cross guild question unexpectedly allowed'; exception when foreign_key_violation then null; end;
 begin update public.source_messages set reply_to_id=(select id from public.source_messages where record_ordinal=6),reply_resolution='resolved' where record_ordinal=4; raise exception 'cross guild reply unexpectedly allowed'; exception when foreign_key_violation then null; end;
end $$;
select test.assert((select count(*)=2 from public.question_events), 'claim and resolve audit events committed');
select 'All foundation database assertions passed' as result;
