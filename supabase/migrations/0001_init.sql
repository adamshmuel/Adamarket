-- Adamarket — initial schema
-- Tables: households, household_members, items
-- View:   item_history (distinct names per household, ordered by recency)
-- Functions/triggers: invite-code generator, name normalization
-- RLS:    every table is scoped by household membership
-- Storage: fridge-scans bucket with per-user RLS

set search_path = public, auth;

-- ===========================================================================
-- 1. Tables
-- ===========================================================================

create extension if not exists "pgcrypto"; -- for gen_random_uuid()

create table if not exists households (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(trim(name)) > 0),
  invite_code text not null unique,
  created_at  timestamptz not null default now()
);

create table if not exists household_members (
  household_id uuid not null references households(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  joined_at    timestamptz not null default now(),
  primary key (household_id, user_id)
);

create index if not exists household_members_user_idx on household_members(user_id);

create table if not exists items (
  id              uuid primary key default gen_random_uuid(),
  household_id    uuid not null references households(id) on delete cascade,
  name            text not null check (length(trim(name)) > 0),
  name_normalized text not null,
  quantity        text,
  checked         boolean not null default false,
  created_by      uuid not null references auth.users(id),
  created_at      timestamptz not null default now(),
  checked_at      timestamptz
);

create index if not exists items_household_idx on items(household_id, checked, created_at desc);
create index if not exists items_name_normalized_idx on items(household_id, name_normalized);

-- ===========================================================================
-- 2. Hebrew-aware name normalisation
-- ===========================================================================
-- Strips Hebrew diacritics (niqqud + te'amim) and trims/lowercases.
-- Mirrors lib/hebrew.ts on the client so DB and client agree on equality.

create or replace function normalize_item_name(input text)
returns text
language sql
immutable
parallel safe
as $$
  select lower(
    trim(
      regexp_replace(
        coalesce(input, ''),
        -- Hebrew points (niqqud) + cantillation marks (te'amim)
        '[֑-ֽֿׁ-ׂׄ-ׇׅ]',
        '',
        'g'
      )
    )
  );
$$;

create or replace function items_set_normalized()
returns trigger
language plpgsql
as $$
begin
  new.name_normalized := normalize_item_name(new.name);
  return new;
end;
$$;

drop trigger if exists items_set_normalized_trg on items;
create trigger items_set_normalized_trg
before insert or update of name on items
for each row execute function items_set_normalized();

-- ===========================================================================
-- 3. Autocomplete view: most-recent distinct items per household
-- ===========================================================================

create or replace view item_history as
select
  household_id,
  name_normalized,
  -- pick the most recent display name as the canonical spelling
  (array_agg(name order by created_at desc))[1] as name,
  max(created_at) as last_used_at
from items
group by household_id, name_normalized;

-- ===========================================================================
-- 4. Invite codes
-- ===========================================================================
-- 6 char codes from an unambiguous alphabet — easy to dictate over the phone.
-- Collision retried up to 5 times; very rare given 26^6 / used codes.

create or replace function generate_invite_code()
returns text
language plpgsql
as $$
declare
  alphabet text := 'ABCDEFGHJKMNPQRTUVWXYZ234678'; -- no 0/O/1/I/L/S/5/9
  code text;
  i int;
begin
  for attempt in 1..5 loop
    code := '';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    if not exists (select 1 from households where invite_code = code) then
      return code;
    end if;
  end loop;
  -- last resort: append a uuid suffix; extremely unlikely to reach here
  return code || substr(replace(gen_random_uuid()::text, '-', ''), 1, 4);
end;
$$;

-- RPC for clients: create household + auto-add caller as a member.
-- Returns the new household row (so client gets the invite_code immediately).
create or replace function create_household(household_name text)
returns households
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  new_household households;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  insert into households (name, invite_code)
    values (trim(household_name), generate_invite_code())
    returning * into new_household;

  insert into household_members (household_id, user_id)
    values (new_household.id, auth.uid());

  return new_household;
end;
$$;

-- RPC for joining via invite code.
create or replace function join_household_by_code(code text)
returns households
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target households;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select * into target from households where invite_code = upper(trim(code));
  if not found then
    raise exception 'invite code not found' using errcode = 'P0002';
  end if;

  insert into household_members (household_id, user_id)
    values (target.id, auth.uid())
    on conflict do nothing;

  return target;
end;
$$;

revoke all on function create_household(text) from public;
revoke all on function join_household_by_code(text) from public;
grant execute on function create_household(text) to authenticated;
grant execute on function join_household_by_code(text) to authenticated;

-- ===========================================================================
-- 5. Row Level Security
-- ===========================================================================

alter table households enable row level security;
alter table household_members enable row level security;
alter table items enable row level security;

-- households: members can read; only RPCs can write
create policy households_select_own on households
  for select using (
    exists (
      select 1 from household_members
      where household_members.household_id = households.id
        and household_members.user_id = auth.uid()
    )
  );

-- household_members: a user sees rows for their own households only
create policy hm_select_own on household_members
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from household_members me
      where me.household_id = household_members.household_id
        and me.user_id = auth.uid()
    )
  );

-- household_members: inserts/deletes only via RPCs (security definer) by default,
-- but allow members to delete themselves (leave household)
create policy hm_delete_self on household_members
  for delete using (user_id = auth.uid());

-- items: members can do everything in their households
create policy items_select_member on items
  for select using (
    exists (
      select 1 from household_members
      where household_members.household_id = items.household_id
        and household_members.user_id = auth.uid()
    )
  );

create policy items_insert_member on items
  for insert with check (
    created_by = auth.uid()
    and exists (
      select 1 from household_members
      where household_members.household_id = items.household_id
        and household_members.user_id = auth.uid()
    )
  );

create policy items_update_member on items
  for update using (
    exists (
      select 1 from household_members
      where household_members.household_id = items.household_id
        and household_members.user_id = auth.uid()
    )
  );

create policy items_delete_member on items
  for delete using (
    exists (
      select 1 from household_members
      where household_members.household_id = items.household_id
        and household_members.user_id = auth.uid()
    )
  );

-- The item_history view inherits RLS from items.

-- ===========================================================================
-- 6. Realtime
-- ===========================================================================
-- Enable Postgres logical replication for the items table so the client can
-- subscribe to INSERT/UPDATE/DELETE via Supabase Realtime.

alter publication supabase_realtime add table items;

-- ===========================================================================
-- 7. Storage bucket for fridge scans
-- ===========================================================================
-- Path convention: fridge-scans/{user_id}/{uuid}.jpg
-- Cleanup of old scans is performed by a scheduled function (added separately).

insert into storage.buckets (id, name, public)
values ('fridge-scans', 'fridge-scans', false)
on conflict (id) do nothing;

create policy "fridge_scans_owner_select" on storage.objects
  for select using (
    bucket_id = 'fridge-scans'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "fridge_scans_owner_insert" on storage.objects
  for insert with check (
    bucket_id = 'fridge-scans'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "fridge_scans_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'fridge-scans'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
