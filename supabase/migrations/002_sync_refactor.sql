-- 002_sync_refactor: Anonymous auth + profile-based device pairing
-- Replaces user_id-based isolation with profile_id-based isolation
-- Prerequisites: Anonymous Sign-In enabled in Supabase Dashboard

-- ═══════════════════════════════════════════════════════════════
--  profiles: cross-device user groups
-- ═══════════════════════════════════════════════════════════════

create table if not exists profiles (
  id          uuid primary key default gen_random_uuid(),
  sync_code   text unique not null,
  created_at  timestamptz not null default now()
);

-- ═══════════════════════════════════════════════════════════════
--  user_profiles: anonymous user → profile mapping
-- ═══════════════════════════════════════════════════════════════

create table if not exists user_profiles (
  user_id     uuid not null references auth.users(id) on delete cascade,
  profile_id  uuid not null references profiles(id) on delete cascade,
  joined_at   timestamptz not null default now(),
  primary key (user_id, profile_id)
);

create index if not exists idx_up_profile on user_profiles (profile_id);

-- ═══════════════════════════════════════════════════════════════
--  tasks: add profile_id column
-- ═══════════════════════════════════════════════════════════════

alter table tasks
  add column if not exists profile_id uuid references profiles(id) on delete cascade;

-- ═══════════════════════════════════════════════════════════════
--  daily_completions: add profile_id column
-- ═══════════════════════════════════════════════════════════════

alter table daily_completions
  add column if not exists profile_id uuid references profiles(id) on delete cascade;

-- ═══════════════════════════════════════════════════════════════
--  RLS: replace user_id-based policies with profile_id-based
-- ═══════════════════════════════════════════════════════════════

-- Drop old policies
drop policy if exists "Users can manage their own tasks" on tasks;
drop policy if exists "Users can manage their own daily completions" on daily_completions;

-- tasks: accessible if user belongs to the task's profile, or owns a local-only task
create policy "Users can access profile tasks or own local tasks"
  on tasks
  for all
  using (
    profile_id in (select up.profile_id from user_profiles up where up.user_id = auth.uid())
    or (profile_id is null and user_id = auth.uid())
  )
  with check (
    profile_id in (select up.profile_id from user_profiles up where up.user_id = auth.uid())
    or (profile_id is null and user_id = auth.uid())
  );

-- daily_completions: same pattern
create policy "Users can access profile completions or own local completions"
  on daily_completions
  for all
  using (
    profile_id in (select up.profile_id from user_profiles up where up.user_id = auth.uid())
    or (profile_id is null and user_id = auth.uid())
  )
  with check (
    profile_id in (select up.profile_id from user_profiles up where up.user_id = auth.uid())
    or (profile_id is null and user_id = auth.uid())
  );

-- ═══════════════════════════════════════════════════════════════
--  Indexes for profile-based queries
-- ═══════════════════════════════════════════════════════════════

create index if not exists idx_tasks_profile_id on tasks (profile_id);
create index if not exists idx_tasks_profile_updated on tasks (profile_id, updated_at desc);
create index if not exists idx_dc_profile on daily_completions (profile_id, date);

-- ═══════════════════════════════════════════════════════════════
--  Realtime publication (ensure new columns are included)
--  Tables already in publication; alter publication adds columns automatically
-- ═══════════════════════════════════════════════════════════════
