alter table public.assistant_runs
  drop constraint assistant_runs_status_check,
  add constraint assistant_runs_status_check
    check (status in ('answered','clarify','fallback','refused','completed','error')),
  add column provider text,
  add column model text,
  add column provider_attempted boolean not null default false,
  add column provider_succeeded boolean not null default false,
  add column execution_mode text not null default 'live_provider'
    check (execution_mode = 'live_provider'),
  add constraint assistant_runs_provider_evidence_check check (
    (provider_attempted and provider is not null and model is not null)
    or (not provider_attempted and not provider_succeeded)
  );

create or replace function public.record_agent_run(
  p_actor_id uuid,
  p_guild_id uuid,
  p_status text,
  p_artifact_version text,
  p_latency_ms integer,
  p_decision_summary text,
  p_notice_id uuid,
  p_provider text,
  p_model text,
  p_provider_attempted boolean,
  p_provider_succeeded boolean,
  p_events jsonb
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := p_actor_id;
  v_guild uuid := p_guild_id;
  v_run uuid;
  v_event jsonb;
  v_sequence integer := 0;
begin
  if v_actor is null or v_guild is null
    or not exists (
      select 1 from public.memberships
      where user_id = v_actor and guild_id = v_guild
    )
    or (select count(*) from public.memberships where user_id = v_actor) <> 1 then
    raise exception 'Exactly one membership is required' using errcode = '42501';
  end if;
  if p_latency_ms < 0 or char_length(p_decision_summary) > 500
    or char_length(coalesce(p_provider, '')) > 40
    or char_length(coalesce(p_model, '')) > 100
    or jsonb_typeof(p_events) <> 'array'
    or jsonb_array_length(p_events) > 12
    or p_decision_summary ~* '(bearer[[:space:]]|password|api[_-]?key|access[_-]?token|cookie|thought[[:space:]_-]*process|chain.?of.?thought|raw.?provider)' then
    raise exception 'Invalid run evidence' using errcode = '22023';
  end if;
  if p_notice_id is not null and not exists (
    select 1 from public.notices
    where id = p_notice_id and guild_id = v_guild
  ) then
    raise exception 'Selected notice is outside the authenticated guild'
      using errcode = '42501';
  end if;

  insert into public.assistant_runs(
    guild_id, actor_id, status, artifact_version, latency_ms,
    decision_summary, notice_id, provider, model,
    provider_attempted, provider_succeeded, execution_mode
  ) values (
    v_guild, v_actor, p_status, p_artifact_version, p_latency_ms,
    p_decision_summary, p_notice_id, p_provider, p_model,
    p_provider_attempted, p_provider_succeeded, 'live_provider'
  ) returning id into v_run;

  for v_event in select value from jsonb_array_elements(p_events)
  loop
    if v_event - array['type','tool','summary'] <> '{}'::jsonb
      or v_event->>'type' not in ('decision','tool_call','observation')
      or char_length(coalesce(v_event->>'summary','')) not between 1 and 500
      or char_length(coalesce(v_event->>'tool','')) > 64
      or v_event->>'summary' ~* '(bearer[[:space:]]|password|api[_-]?key|access[_-]?token|cookie|thought[[:space:]_-]*process|chain.?of.?thought|raw.?provider)' then
      raise exception 'Invalid run event' using errcode = '22023';
    end if;
    insert into public.run_events(run_id, sequence, event_type, summary, safe_metadata)
    values (
      v_run,
      v_sequence,
      case v_event->>'type'
        when 'decision' then 'retrieval'
        when 'tool_call' then 'tool'
        else 'result'
      end,
      v_event->>'summary',
      case when v_event ? 'tool' then jsonb_build_object('tool', v_event->>'tool') else '{}'::jsonb end
    );
    v_sequence := v_sequence + 1;
  end loop;
  return v_run;
end;
$$;

revoke all on function public.record_agent_run(uuid,uuid,text,text,integer,text,uuid,text,text,boolean,boolean,jsonb)
  from public, anon, authenticated;
grant execute on function public.record_agent_run(uuid,uuid,text,text,integer,text,uuid,text,text,boolean,boolean,jsonb)
  to service_role;
