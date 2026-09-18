-- Dataset foundation. No external notification delivery or automatic source authority.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, anon, service_role;

create table public.datasets (
 id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(),
 sha256 text unique not null check (sha256 ~ '^[a-f0-9]{64}$'), name text not null,
 source_kind text not null default 'pack' check (source_kind in ('pack','synthetic','live')),
 row_count integer not null check (row_count >= 0), imported_at timestamptz not null default now()
);
create table public.guilds (
 id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(),
 source_namespace text not null, source_label text not null check (length(btrim(source_label))>0),
 timezone text not null default 'Asia/Ho_Chi_Minh', unique(source_namespace,source_label)
);
create table public.channels (
 id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(),
 guild_id uuid not null references public.guilds, source_label text not null check(length(btrim(source_label))>0), display_name text,
 visibility text not null default 'unknown' check(visibility in ('unknown','public','staff')),
 unique(guild_id,source_label), unique(guild_id,id)
);
create table public.authors (
 id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(),
 source_namespace text not null, source_label text not null check(length(btrim(source_label))>0), is_bot boolean not null,
 unique(source_namespace,source_label)
);
create table public.source_messages (
 id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(),
 dataset_id uuid not null references public.datasets, record_ordinal integer not null check(record_ordinal>0),
 guild_id uuid not null references public.guilds, channel_id uuid not null, author_id uuid not null references public.authors,
 source_label text not null check(length(btrim(source_label))>0), message_type text not null check(message_type in ('message','reply')),
 sent_at timestamptz not null check(isfinite(sent_at)), content text not null, mentions_bot boolean not null,
 attachment_count integer not null check(attachment_count>=0), source_char_count integer not null check(source_char_count>=0),
 reply_source_label text, reply_to_id uuid, reply_resolution text not null check(reply_resolution in ('none','resolved','missing','ambiguous')),
 discord_jump_url text check(discord_jump_url ~ '^https://discord[.]com/channels/[0-9]+/[0-9]+/[0-9]+$'),
 unique(dataset_id,record_ordinal), unique(dataset_id,guild_id,id), unique(guild_id,id),
 foreign key(guild_id,channel_id) references public.channels(guild_id,id),
 foreign key(dataset_id,guild_id,reply_to_id) references public.source_messages(dataset_id,guild_id,id),
 check((reply_to_id is not null) = (reply_resolution='resolved')),
 check((reply_source_label is null) = (reply_resolution='none'))
);
create table public.memberships (
 guild_id uuid not null references public.guilds, user_id uuid not null references auth.users,
 created_at timestamptz not null default now(), role text not null check(role in ('learner','lab_coach')), primary key(guild_id,user_id)
);
create table public.notices (
 id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(),
 guild_id uuid not null references public.guilds, message_id uuid not null, topic_key text not null,
 verified_by uuid not null, verified_at timestamptz not null default now(), published_at timestamptz not null, answer_excerpt text not null,
 foreign key(guild_id,message_id) references public.source_messages(guild_id,id),
 foreign key(guild_id,verified_by) references public.memberships(guild_id,user_id), unique(message_id,topic_key), unique(guild_id,id)
);
create table public.questions (
 id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(),
 guild_id uuid not null references public.guilds, message_id uuid unique not null, intent text not null,
 status text not null default 'open' check(status in ('open','claimed','answered','resolved')),
 claimed_by uuid, resolved_at timestamptz, version integer not null default 0 check(version>=0),
 foreign key(guild_id,message_id) references public.source_messages(guild_id,id),
 foreign key(guild_id,claimed_by) references public.memberships(guild_id,user_id), unique(guild_id,id),
 check((status='resolved')=(resolved_at is not null)), check(status <> 'claimed' or claimed_by is not null)
);
create table public.question_events (
 id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(),
 guild_id uuid not null references public.guilds, question_id uuid not null, event_type text not null check(event_type in ('detected','claimed','replied','resolved','reopened')),
 actor_id uuid references auth.users, occurred_at timestamptz not null default now(), idempotency_key text unique not null, summary text not null,
 foreign key(guild_id,question_id) references public.questions(guild_id,id)
);
create table public.radar_alerts (
 id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(),
 guild_id uuid not null references public.guilds, question_id uuid not null, tier integer not null check(tier in (1,2)),
 status text not null default 'pending' check(status in ('pending','sent','failed')), attempts integer not null default 0 check(attempts>=0), sent_at timestamptz,
 foreign key(guild_id,question_id) references public.questions(guild_id,id), unique(question_id,tier), check((status='sent')=(sent_at is not null))
);
create table public.digests (
 id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(),
 guild_id uuid not null references public.guilds, local_date date not null, status text not null default 'pending' check(status in ('pending','sent','failed')),
 summary text not null, sent_at timestamptz, unique(guild_id,local_date), check((status='sent')=(sent_at is not null))
);
create table public.assistant_runs (
 id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(),
 guild_id uuid not null references public.guilds, actor_id uuid not null references auth.users, status text not null check(status in ('answered','clarify','fallback','error')),
 artifact_version text not null, latency_ms integer not null check(latency_ms>=0), confidence numeric check(confidence between 0 and 1), decision_summary text not null,
 notice_id uuid, foreign key(guild_id,notice_id) references public.notices(guild_id,id),
 foreign key(guild_id,actor_id) references public.memberships(guild_id,user_id)
);
create table public.run_events (
 id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(),
 run_id uuid not null references public.assistant_runs, sequence integer not null check(sequence>=0),
 event_type text not null check(event_type in ('retrieval','tool','result','error')), summary text not null,
 safe_metadata jsonb not null default '{}'::jsonb,
 check(jsonb_typeof(safe_metadata)='object' and safe_metadata - array['tool','outcome','source_count','artifact_version'] = '{}'::jsonb), unique(run_id,sequence)
);

create index messages_reply_lookup on public.source_messages(dataset_id,guild_id,source_label);
create index messages_feed on public.source_messages(guild_id,channel_id,sent_at desc,id);
create index messages_reply on public.source_messages(reply_to_id) where reply_to_id is not null;
create index messages_author on public.source_messages(author_id);
create index memberships_actor on public.memberships(user_id,guild_id);
create index notices_latest on public.notices(guild_id,topic_key,published_at desc,id);
create index notices_verifier on public.notices(verified_by);
create index questions_open on public.questions(guild_id,status,created_at,id) where status <> 'resolved';
create index questions_claimed on public.questions(claimed_by) where claimed_by is not null;
create index question_event_replay on public.question_events(question_id,occurred_at,id);
create index question_events_guild on public.question_events(guild_id);
create index question_events_actor on public.question_events(actor_id);
create index alerts_pending on public.radar_alerts(status,created_at) where status <> 'sent';
create index alerts_guild on public.radar_alerts(guild_id);
create index runs_actor on public.assistant_runs(actor_id,created_at desc);
create index runs_guild on public.assistant_runs(guild_id);
create index runs_notice on public.assistant_runs(notice_id) where notice_id is not null;

create function private.is_member(p_guild uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.memberships where guild_id=p_guild and user_id=auth.uid())
$$;
create function private.is_coach(p_guild uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.memberships where guild_id=p_guild and user_id=auth.uid() and role='lab_coach')
$$;
create function private.can_read_channel(p_guild uuid,p_channel uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.memberships m join public.channels c on c.guild_id=m.guild_id
 where m.guild_id=p_guild and m.user_id=auth.uid() and c.id=p_channel and (m.role='lab_coach' or c.visibility='public'))
$$;
revoke all on all functions in schema private from public;
grant execute on all functions in schema private to authenticated, anon;

do $$ declare t text; begin
 foreach t in array array['datasets','guilds','channels','authors','source_messages','memberships','notices','questions','question_events','radar_alerts','digests','assistant_runs','run_events'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon, authenticated',t);
 execute format('grant select on public.%I to anon, authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 end loop;
end $$;
create policy guild_read on public.guilds for select to authenticated using(private.is_member(id));
create policy channel_read on public.channels for select to authenticated using(private.can_read_channel(guild_id,id));
create policy message_read on public.source_messages for select to authenticated using(private.can_read_channel(guild_id,channel_id));
create policy dataset_read on public.datasets for select to authenticated using(exists(select 1 from public.source_messages m where m.dataset_id=datasets.id));
create policy author_read on public.authors for select to authenticated using(exists(select 1 from public.source_messages m where m.author_id=authors.id));
create policy membership_read on public.memberships for select to authenticated using(user_id=auth.uid() or private.is_coach(guild_id));
create policy notice_read on public.notices for select to authenticated using(exists(select 1 from public.source_messages m where m.id=message_id));
create policy question_read on public.questions for select to authenticated using(private.is_coach(guild_id));
create policy question_event_read on public.question_events for select to authenticated using(private.is_coach(guild_id));
create policy alert_read on public.radar_alerts for select to authenticated using(private.is_coach(guild_id));
create policy digest_read on public.digests for select to authenticated using(private.is_coach(guild_id));
create policy run_read on public.assistant_runs for select to authenticated using(private.is_member(guild_id) and (actor_id=auth.uid() or private.is_coach(guild_id)));
create policy run_event_read on public.run_events for select to authenticated using(exists(select 1 from public.assistant_runs r where r.id=run_id));

create function private.verify_notice_author() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.memberships where guild_id=new.guild_id and user_id=new.verified_by and role='lab_coach') then
 raise exception 'Notice verification requires a guild coach' using errcode='42501';
 end if;
 return new;
end $$;
create trigger notice_author before insert or update on public.notices for each row execute function private.verify_notice_author();
revoke all on function private.verify_notice_author() from public;

create function public.claim_question(p_question_id uuid,p_expected_version integer) returns public.questions language plpgsql security definer set search_path='' as $$
declare q public.questions;
begin
 select * into q from public.questions where id=p_question_id for update;
 if not found or not private.is_coach(q.guild_id) then raise exception 'Coach access required' using errcode='42501'; end if;
 if q.version is distinct from p_expected_version or q.claimed_by is not null or q.status='resolved' then raise exception 'Question changed or already claimed' using errcode='40001'; end if;
 update public.questions set claimed_by=auth.uid(),status=case when status='answered' then status else 'claimed' end,version=version+1 where id=q.id returning * into q;
 insert into public.question_events(guild_id,question_id,event_type,actor_id,idempotency_key,summary)
 values(q.guild_id,q.id,'claimed',auth.uid(),q.id::text||':claimed:'||q.version::text,'Claimed by an authenticated guild coach');
 return q;
end $$;
create function public.resolve_question(p_question_id uuid,p_expected_version integer) returns public.questions language plpgsql security definer set search_path='' as $$
declare q public.questions;
begin
 select * into q from public.questions where id=p_question_id for update;
 if not found or not private.is_coach(q.guild_id) then raise exception 'Coach access required' using errcode='42501'; end if;
 if q.version is distinct from p_expected_version or q.status='resolved' then raise exception 'Question changed or already resolved' using errcode='40001'; end if;
 update public.questions set status='resolved',resolved_at=now(),version=version+1 where id=q.id returning * into q;
 insert into public.question_events(guild_id,question_id,event_type,actor_id,idempotency_key,summary)
 values(q.guild_id,q.id,'resolved',auth.uid(),q.id::text||':resolved:'||q.version::text,'Resolution confirmed by an authenticated guild coach');
 return q;
end $$;
create function public.enqueue_radar(p_now timestamptz default now()) returns integer language plpgsql security definer set search_path='' as $$
declare inserted integer;
begin
 insert into public.radar_alerts(guild_id,question_id,tier)
 select q.guild_id,q.id,t.tier from public.questions q join public.source_messages m on m.id=q.message_id
 cross join (values(1,interval '2 hours'),(2,interval '4 hours')) t(tier,elapsed)
 where q.status<>'resolved' and m.sent_at+t.elapsed<=p_now on conflict(question_id,tier) do nothing;
 get diagnostics inserted=row_count; return inserted;
end $$;
create function public.enqueue_digests(p_now timestamptz default now()) returns integer language plpgsql security definer set search_path='' as $$
declare inserted integer;
begin
 insert into public.digests(guild_id,local_date,summary)
 select g.id,(p_now at time zone g.timezone)::date,
 'Unresolved questions: '||(select count(*) from public.questions q where q.guild_id=g.id and q.status<>'resolved')::text
 from public.guilds g where (p_now at time zone g.timezone)::time >= time '22:00'
 on conflict(guild_id,local_date) do nothing;
 get diagnostics inserted=row_count; return inserted;
end $$;

create function public.import_pack(p_sha256 text,p_name text,p_records jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare dataset uuid; item jsonb; guild uuid; channel uuid; author uuid; expected_count integer; actual_count integer;
begin
 -- Serialize imports for the same checksum, including simultaneous first imports.
 perform pg_advisory_xact_lock(hashtextextended(p_sha256,0));
 select id,row_count into dataset,actual_count from public.datasets where sha256=p_sha256;
 if found then return jsonb_build_object('dataset_id',dataset,'already_imported',true,'row_count',actual_count); end if;
 if jsonb_typeof(p_records)<>'array' then raise exception 'Records must be an array' using errcode='22023'; end if;
 expected_count:=jsonb_array_length(p_records);
 insert into public.datasets(sha256,name,row_count) values(p_sha256,p_name,expected_count) returning id into dataset;
 for item in select value from jsonb_array_elements(p_records) loop
 if item->>'sent_at' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}([.][0-9]+)?(Z|[+-][0-9]{2}:[0-9]{2})$' then
 raise exception 'Timestamp must contain an explicit timezone' using errcode='22007'; end if;
 insert into public.guilds(source_namespace,source_label) values(p_sha256,item->>'guild_label') on conflict(source_namespace,source_label) do nothing;
 select id into guild from public.guilds where source_namespace=p_sha256 and source_label=item->>'guild_label';
 insert into public.channels(guild_id,source_label) values(guild,item->>'channel_label') on conflict(guild_id,source_label) do nothing;
 select id into channel from public.channels where guild_id=guild and source_label=item->>'channel_label';
 insert into public.authors(source_namespace,source_label,is_bot) values(p_sha256,item->>'author_label',(item->>'is_bot')::boolean) on conflict(source_namespace,source_label) do nothing;
 select id into author from public.authors where source_namespace=p_sha256 and source_label=item->>'author_label';
 if exists(select 1 from public.authors where id=author and is_bot<>(item->>'is_bot')::boolean) then raise exception 'Conflicting source author bot identity' using errcode='22023'; end if;
 insert into public.source_messages(dataset_id,record_ordinal,guild_id,channel_id,author_id,source_label,message_type,sent_at,content,mentions_bot,attachment_count,source_char_count,reply_source_label,reply_resolution)
 values(dataset,(item->>'record_ordinal')::integer,guild,channel,author,item->>'source_label',item->>'message_type',(item->>'sent_at')::timestamptz,item->>'content',(item->>'mentions_bot')::boolean,(item->>'attachment_count')::integer,(item->>'source_char_count')::integer,
 nullif(item->>'reply_source_label',''),case when nullif(item->>'reply_source_label','') is null then 'none' else 'missing' end);
 end loop;
 if (select count(*) from public.source_messages where dataset_id=dataset and record_ordinal between 1 and expected_count) <> expected_count then
 raise exception 'Record ordinals must be contiguous from one' using errcode='22023'; end if;
 with targets as (
 select child.id,count(parent.id) as matches,(array_agg(parent.id) filter(where parent.id is not null))[1] as target
 from public.source_messages child left join public.source_messages parent
 on parent.dataset_id=child.dataset_id and parent.guild_id=child.guild_id and parent.source_label=child.reply_source_label
 where child.dataset_id=dataset and child.reply_source_label is not null group by child.id
 ) update public.source_messages m set reply_to_id=case when t.matches=1 then t.target else null end,
 reply_resolution=case when t.matches=1 then 'resolved' when t.matches>1 then 'ambiguous' else 'missing' end from targets t where m.id=t.id;
 return jsonb_build_object('dataset_id',dataset,'already_imported',false,'row_count',expected_count);
end $$;

revoke all on function public.claim_question(uuid,integer), public.resolve_question(uuid,integer), public.enqueue_radar(timestamptz), public.enqueue_digests(timestamptz), public.import_pack(text,text,jsonb) from public, anon, authenticated;
grant execute on function public.claim_question(uuid,integer),public.resolve_question(uuid,integer) to authenticated;
grant execute on function public.enqueue_radar(timestamptz),public.enqueue_digests(timestamptz),public.import_pack(text,text,jsonb) to service_role;
