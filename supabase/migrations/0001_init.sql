-- 0001_init: Core tables for Prism task sync
-- Prerequisites: Supabase Auth enabled (Magic Link)

-- ═══════════════════════════════════════════════════════════════
--  Helper: auto-update updated_at on row change
-- ═══════════════════════════════════════════════════════════════

create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ═══════════════════════════════════════════════════════════════
--  tasks
-- ═══════════════════════════════════════════════════════════════

create table if not exists tasks (
  id          uuid primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null default '',
  completed   boolean not null default false,
  created_at  timestamptz not null default now(),
  completed_at timestamptz,
  due_date    date,
  tags        text[] not null default '{}',
  important   boolean not null default false,
  pinned      boolean not null default false,
  is_daily    boolean not null default false,
  parent_id   uuid,
  updated_at  timestamptz not null default now(),
  is_deleted  boolean not null default false
);

-- auto-update trigger
create trigger trg_tasks_updated_at
  before update on tasks
  for each row
  execute function update_updated_at_column();

-- indexes
create index if not exists idx_tasks_user_id on tasks (user_id);
create index if not exists idx_tasks_user_updated on tasks (user_id, updated_at desc);
create index if not exists idx_tasks_user_due on tasks (user_id, due_date);

-- ═══════════════════════════════════════════════════════════════
--  daily_completions
-- ═══════════════════════════════════════════════════════════════

create table if not exists daily_completions (
  task_id uuid not null references tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  date    date not null,
  primary key (task_id, date)
);

create index if not exists idx_dc_user_date on daily_completions (user_id, date);

-- ═══════════════════════════════════════════════════════════════
--  Row-Level Security (RLS)
-- ═══════════════════════════════════════════════════════════════

alter table tasks enable row level security;
alter table daily_completions enable row level security;

-- tasks: users can only access their own rows
create policy "Users can manage their own tasks"
  on tasks
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- daily_completions: users can only access their own rows
create policy "Users can manage their own daily completions"
  on daily_completions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
--  Realtime publication (required for postgres_changes)
-- ═══════════════════════════════════════════════════════════════

alter publication supabase_realtime add table tasks;
alter publication supabase_realtime add table daily_completions;
