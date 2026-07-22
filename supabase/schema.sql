-- Enid Resource Network — Supabase schema + RLS
-- Run this once in the Supabase SQL Editor for a fresh project.
--
-- Deviation from the original migration plan, called out explicitly:
-- the plan's write policies checked `auth.uid() is not null`, which grants write
-- access to anyone who signs up via magic link — not just approved editors — even
-- though Step 4 describes manual editor approval as "the actual access-control
-- boundary." That boundary only holds if it's enforced in SQL, so the policies
-- below gate writes on actual membership in the `editors` table via `is_editor()`.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table resources (
  id text primary key,
  name text not null,
  category text not null,
  secondary_categories text[] default '{}',
  subcategory text default '',
  address text default '',
  phone text default '',
  website text default '',
  populations text default '',
  exclusions text default '',
  insurance text default '',
  notes text default '',
  issues text[] default '{}',
  barriers text[] default '{}',
  verified_date date,
  status text not null default 'active' check (status in ('active','closed')),
  edited_by text default '',
  edited_date date,
  created_at timestamptz default now()
);

create table schedule (
  id uuid primary key default gen_random_uuid(),
  resource_id text not null references resources(id) on delete cascade,
  day text not null,
  time text not null,
  label text not null,
  frequency text default 'Weekly'
);

create table connections (
  resource_id text not null references resources(id) on delete cascade,
  connected_resource_id text not null references resources(id) on delete cascade,
  primary key (resource_id, connected_resource_id)
);

create table saved_views (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  query text default '',
  active_category text default 'all',
  issue_filters text[] default '{}',
  barrier_filters text[] default '{}',
  created_by text default '',
  created_at timestamptz default now()
);

create table search_misses (
  term text primary key,
  hit_count int not null default 1,
  last_searched timestamptz default now()
);

-- One row per approved staff editor, linked to their Supabase Auth account
create table editors (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- is_editor(): the real write-access boundary
--
-- security definer so it can read `editors` even from a policy context where
-- the calling user has no direct select grant on that table; stable so the
-- planner can reuse the result within a single statement.
-- ---------------------------------------------------------------------------
create or replace function is_editor()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from editors where id = auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table resources enable row level security;
alter table schedule enable row level security;
alter table connections enable row level security;
alter table saved_views enable row level security;
alter table search_misses enable row level security;
alter table editors enable row level security;

-- RESOURCES: public reads active ones; logged-in editors read everything (incl. closed) and write
create policy "public reads active resources" on resources
  for select using (status = 'active' or is_editor());

create policy "editors insert resources" on resources
  for insert with check (is_editor());

create policy "editors update resources" on resources
  for update using (is_editor());

create policy "editors delete resources" on resources
  for delete using (is_editor());

-- SCHEDULE / CONNECTIONS: public read, editors write
create policy "public reads schedule" on schedule for select using (true);
create policy "editors write schedule" on schedule for all using (is_editor()) with check (is_editor());

create policy "public reads connections" on connections for select using (true);
create policy "editors write connections" on connections for all using (is_editor()) with check (is_editor());

-- SAVED VIEWS: public can read and create (so client-mode users can save their own filters);
-- only editors can delete, so someone can't grief the shared view list
create policy "anyone reads saved views" on saved_views for select using (true);
create policy "anyone creates saved views" on saved_views for insert with check (true);
create policy "editors delete saved views" on saved_views for delete using (is_editor());

-- SEARCH MISSES: anyone can log a miss (it's the point of the feature); anyone can read the rollup
create policy "anyone logs misses" on search_misses for insert with check (true);
create policy "anyone updates misses" on search_misses for update using (true);
create policy "anyone reads misses" on search_misses for select using (true);

-- EDITORS: any logged-in user can see the editor list (just names); nobody can self-assign editor status
create policy "editors read editor list" on editors for select using (auth.uid() is not null);
-- Deliberately no insert/update policy here — add new editors via the Supabase dashboard
-- or a service-role script, not from the client. This is the actual access-control boundary,
-- and is_editor() above is what makes it actually bind on resources/schedule/connections writes.
