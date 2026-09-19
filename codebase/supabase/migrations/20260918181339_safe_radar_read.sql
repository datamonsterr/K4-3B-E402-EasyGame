create or replace function public.list_radar_items()
returns table(question_id uuid, status text, version integer, tier integer)
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_actor uuid := auth.uid();
  v_guild uuid;
  v_memberships integer;
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  select count(*) into v_memberships from public.memberships where user_id = v_actor;
  select guild_id into v_guild from public.memberships where user_id = v_actor order by guild_id limit 1;
  if v_memberships <> 1 then
    raise exception 'Exactly one membership is required' using errcode = '42501';
  end if;
  return query
  select q.id, q.status, q.version,
    case
      when m.sent_at <= statement_timestamp() - interval '240 minutes' then 2
      when m.sent_at <= statement_timestamp() - interval '120 minutes' then 1
      else 0
    end
  from public.questions q
  join public.source_messages m on m.id = q.message_id and m.guild_id = q.guild_id
  where q.guild_id = v_guild and q.status <> 'resolved'
  order by m.sent_at, q.id;
end;
$$;

revoke all on function public.list_radar_items() from public, anon;
grant execute on function public.list_radar_items() to authenticated;
