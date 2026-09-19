-- Authenticated agent mutations. Identity and guild scope are derived from
-- auth.uid() and the target row; neither is accepted from the model.
alter table public.radar_alerts
  add column actor_id uuid,
  add column summary text,
  add column idempotency_key text;

alter table public.radar_alerts
  add constraint radar_alerts_actor_membership_fkey
  foreign key (guild_id, actor_id)
  references public.memberships(guild_id, user_id),
  add constraint radar_alerts_summary_length
  check (summary is null or char_length(btrim(summary)) between 1 and 300),
  add constraint radar_alerts_idempotency_key_length
  check (
    idempotency_key is null
    or char_length(btrim(idempotency_key)) between 1 and 200
  );

create index radar_alerts_actor_idx
  on public.radar_alerts(actor_id)
  where actor_id is not null;

create unique index radar_alerts_idempotency_key_idx
  on public.radar_alerts(idempotency_key)
  where idempotency_key is not null;

create function public.create_staff_alert(
  p_question_id uuid,
  p_tier integer,
  p_summary text,
  p_idempotency_key text
)
returns public.radar_alerts
language plpgsql
security definer
set search_path = ''
as $$
declare
  q public.questions;
  v_sent_at timestamptz;
  v_actual_tier integer;
  result public.radar_alerts;
  caller uuid := (select auth.uid());
begin
  if caller is null then
    raise exception 'Coach access required' using errcode = '42501';
  end if;
  if p_tier not in (1, 2)
    or char_length(btrim(coalesce(p_summary, ''))) not between 1 and 300
    or char_length(btrim(coalesce(p_idempotency_key, ''))) not between 1 and 200
  then
    raise exception 'Invalid staff alert input' using errcode = '22023';
  end if;

  select * into q
  from public.questions
  where id = p_question_id;

  if not found or not private.is_coach(q.guild_id) then
    raise exception 'Coach access required' using errcode = '42501';
  end if;
  select sent_at into v_sent_at
  from public.source_messages
  where id = q.message_id and guild_id = q.guild_id;
  v_actual_tier := case
    when v_sent_at <= statement_timestamp() - interval '240 minutes' then 2
    when v_sent_at <= statement_timestamp() - interval '120 minutes' then 1
    else 0
  end;
  if q.status = 'resolved' or v_actual_tier = 0 or p_tier <> v_actual_tier then
    raise exception 'Alert tier does not match current question state'
      using errcode = '22023';
  end if;

  insert into public.radar_alerts(
    guild_id,
    question_id,
    tier,
    status,
    actor_id,
    summary,
    idempotency_key
  )
  values(
    q.guild_id,
    q.id,
    p_tier,
    'pending',
    caller,
    btrim(p_summary),
    btrim(p_idempotency_key)
  )
  on conflict (question_id, tier) do update
  set actor_id = coalesce(public.radar_alerts.actor_id, excluded.actor_id),
      summary = coalesce(public.radar_alerts.summary, excluded.summary),
      idempotency_key = coalesce(
        public.radar_alerts.idempotency_key,
        excluded.idempotency_key
      )
  where public.radar_alerts.idempotency_key is null
     or public.radar_alerts.idempotency_key = excluded.idempotency_key
  returning * into result;

  if result.id is null then
    raise exception 'Idempotency key conflicts with existing alert'
      using errcode = '22023';
  end if;

  if result.actor_id is distinct from caller
    or result.summary is distinct from btrim(p_summary)
    or result.idempotency_key is distinct from btrim(p_idempotency_key)
  then
    raise exception 'Idempotency key reused with different input'
      using errcode = '22023';
  end if;

  return result;
end
$$;

revoke all on function public.create_staff_alert(uuid, integer, text, text)
  from public, anon, authenticated;
grant execute on function public.create_staff_alert(uuid, integer, text, text)
  to authenticated;
