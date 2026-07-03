-- 003_profiles_rls: Add RLS policies for profiles and user_profiles tables
-- Fix for 403 error when inserting/selecting from profiles

-- ═══════════════════════════════════════════════════════════════
--  Enable RLS on new tables
-- ═══════════════════════════════════════════════════════════════

alter table profiles enable row level security;
alter table user_profiles enable row level security;

-- ═══════════════════════════════════════════════════════════════
--  profiles policies
-- ═══════════════════════════════════════════════════════════════

-- Any authenticated user can create a profile
create policy "Authenticated users can create profiles"
  on profiles
  for insert
  to authenticated
  with check (true);

-- Any authenticated user can read profiles (needed to look up by sync_code)
create policy "Authenticated users can read profiles"
  on profiles
  for select
  to authenticated
  using (true);

-- ═══════════════════════════════════════════════════════════════
--  user_profiles policies
-- ═══════════════════════════════════════════════════════════════

-- Users can create their own profile mappings
create policy "Users can create their own profile mappings"
  on user_profiles
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- Users can read their own profile mappings
create policy "Users can read their own profile mappings"
  on user_profiles
  for select
  to authenticated
  using (user_id = auth.uid());
