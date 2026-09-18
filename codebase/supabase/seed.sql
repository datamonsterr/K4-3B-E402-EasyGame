-- Local synthetic seed only. These are fictitious identities and messages.
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
update public.datasets set source_kind='synthetic' where sha256=repeat('a',64);
