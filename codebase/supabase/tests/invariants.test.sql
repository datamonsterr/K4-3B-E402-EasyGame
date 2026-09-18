-- A rejected file leaves no partial dataset, guild, author, or message behind.
select test.assert(not has_table_privilege('anon','public.source_messages','select'), 'anonymous role has no imported-table privilege');
select test.assert(not has_schema_privilege('anon','private','usage'), 'anonymous role has no private-schema access');
select test.assert(not has_function_privilege('anon','private.is_member(uuid)','execute'), 'anonymous role cannot execute membership helpers');
set role service_role;
do $$ begin
 begin
 perform public.import_pack(repeat('b',64),'bad-date','[{"record_ordinal":1,"source_label":"bad","guild_label":"Bad","channel_label":"public","author_label":"human","is_bot":false,"message_type":"message","sent_at":"2026-02-30T00:00:00Z","content":"Synthetic","mentions_bot":false,"attachment_count":0,"source_char_count":9}]');
 raise exception 'invalid calendar date unexpectedly imported';
 exception when datetime_field_overflow then null; end;
 perform test.assert(not exists(select 1 from public.datasets where sha256=repeat('b',64)), 'invalid date rolls back dataset');
 perform test.assert(not exists(select 1 from public.guilds where source_namespace=repeat('b',64)), 'invalid date rolls back guild');
 begin
 perform public.import_pack(repeat('b',64),'no-zone','[{"record_ordinal":1,"source_label":"bad","guild_label":"Bad","channel_label":"public","author_label":"human","is_bot":false,"message_type":"message","sent_at":"2026-09-18T00:00:00","content":"Synthetic","mentions_bot":false,"attachment_count":0,"source_char_count":9}]');
 raise exception 'timezone-less timestamp unexpectedly imported';
 exception when invalid_datetime_format then null; end;
end $$;
select test.assert(public.enqueue_radar('2026-09-20T00:00:00Z')=0, 'resolved question stops SLA tracking');
reset role;
-- Confirm unknown provenance cannot be turned into an authoritative notice by a learner.
do $$ declare message public.source_messages; begin
 select * into message from public.source_messages where record_ordinal=1;
 begin
 insert into public.notices(guild_id,message_id,topic_key,verified_by,published_at,answer_excerpt)
 values(message.guild_id,message.id,'test','00000000-0000-0000-0000-000000000001',now(),'Synthetic');
 raise exception 'learner verification unexpectedly permitted';
 exception when insufficient_privilege then null; end;
 begin
 insert into public.notices(guild_id,message_id,topic_key,verified_by,published_at,answer_excerpt)
 values(message.guild_id,message.id,'too-long','00000000-0000-0000-0000-000000000002',now(),repeat('x',301));
 raise exception 'overlong verified notice unexpectedly accepted';
 exception when check_violation then null; end;
 begin
 insert into public.run_events(run_id,sequence,event_type,summary,safe_metadata)
 values('20000000-0000-0000-0000-000000000001',1,'tool','Synthetic','{"raw_message":"must not be accepted"}');
 raise exception 'unsafe telemetry key unexpectedly accepted';
 exception when check_violation then null; end;
end $$;
-- A different checksum is a separate namespace and must not reuse a prior parent.
set role service_role;
select public.import_pack(repeat('c',64),'second-version','[{"record_ordinal":1,"source_label":"separate","guild_label":"A","channel_label":"public","author_label":"human","is_bot":false,"message_type":"reply","sent_at":"2026-09-18T00:00:00Z","content":"Synthetic","mentions_bot":false,"attachment_count":0,"source_char_count":9,"reply_source_label":"missing"}]');
select test.assert((select reply_resolution='missing' and reply_to_id is null from public.source_messages where source_label='separate'), 'reply resolution never crosses dataset');
reset role;
-- Without guild membership even an existing authenticated identity sees no metadata.
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000099',false);
set role authenticated;
select test.assert((select count(*)=0 from public.datasets), 'unprovisioned account sees no datasets');
select test.assert((select count(*)=0 from public.authors), 'unprovisioned account sees no authors');
select test.assert((select count(*)=0 from public.assistant_runs), 'unprovisioned account sees no runs');
reset role;
