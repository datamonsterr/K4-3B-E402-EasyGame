-- Forward hardening for the dataset-first foundation.
-- Anonymous previews are served from synthetic application fixtures and need
-- no direct Data API privileges on imported or operational tables.
revoke select on all tables in schema public from anon;
revoke usage on schema private from anon;
revoke execute on all functions in schema private from anon;

-- Functions are executable by PUBLIC unless their privileges are restricted.
-- Keep future database functions closed until a migration grants the exact
-- role required by their interface.
alter default privileges in schema public
  revoke execute on functions from public, anon, authenticated;
alter default privileges in schema private
  revoke execute on functions from public, anon, authenticated;

-- RLS helpers remain available only to authenticated requests. They derive
-- identity from auth.uid(); callers never provide a user identifier.
create or replace function private.is_member(p_guild uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists(
    select 1
    from public.memberships
    where guild_id = p_guild
      and user_id = (select auth.uid())
  )
$$;

create or replace function private.is_coach(p_guild uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists(
    select 1
    from public.memberships
    where guild_id = p_guild
      and user_id = (select auth.uid())
      and role = 'lab_coach'
  )
$$;

create or replace function private.can_read_channel(
  p_guild uuid,
  p_channel uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists(
    select 1
    from public.memberships m
    join public.channels c on c.guild_id = m.guild_id
    where m.guild_id = p_guild
      and m.user_id = (select auth.uid())
      and c.id = p_channel
      and (m.role = 'lab_coach' or c.visibility = 'public')
  )
$$;

revoke execute on function private.is_member(uuid) from public, anon;
revoke execute on function private.is_coach(uuid) from public, anon;
revoke execute on function private.can_read_channel(uuid, uuid) from public, anon;
grant execute on function private.is_member(uuid) to authenticated;
grant execute on function private.is_coach(uuid) to authenticated;
grant execute on function private.can_read_channel(uuid, uuid) to authenticated;

-- Grounded Response text is bounded at the data seam as well as at answer
-- composition. PostgreSQL char_length counts characters rather than bytes.
alter table public.notices
  add constraint notices_answer_excerpt_length
  check (
    char_length(btrim(answer_excerpt)) between 1 and 300
  ) not valid;

alter table public.notices
  validate constraint notices_answer_excerpt_length;
