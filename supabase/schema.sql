-- DevPulse — Projects feature schema for Supabase.
--
-- Run this once in your Supabase project's SQL Editor (Dashboard →
-- SQL Editor → New query → paste this whole file → Run), then run
-- supabase/seed.sql to load the starter project catalog.
--
-- Design notes:
--   • `projects` is publicly readable, writable only by admins.
--   • `project_participants` / `project_solutions` are publicly
--     readable, but a row can only be inserted with `user_id` equal to
--     the caller's own `auth.uid()` — enforced server-side, so there's
--     no way to record a project as started, or a solution as
--     submitted, by anyone other than the real signed-in account.
--   • `admin_users` has NO public policies at all — it's managed only
--     from the Supabase dashboard (or by another admin via the SQL
--     editor), never from the app's own UI.
--   • Votes go through a SECURITY DEFINER function instead of a
--     direct UPDATE grant, so a visitor can bump a counter without
--     also being able to overwrite the rest of that solution's row.
--
-- If you ran an earlier version of this file (with `user_email`
-- columns instead of `user_id`), drop the two tables first so they're
-- recreated with the new shape — safe to do before any real users
-- have signed up:
--   drop table if exists project_solutions, project_participants cascade;

-- ─────────────────────────────────────────────────────────────
-- Extensions
-- ─────────────────────────────────────────────────────────────

create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ─────────────────────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────────────────────

create table if not exists projects (
  id                 uuid primary key default gen_random_uuid(),
  slug               text unique not null,
  title              text not null,
  category           text not null,
  difficulty         text not null check (difficulty in ('Beginner', 'Intermediate', 'Advanced')),
  roles              text[] not null default '{}',
  tags               text[] not null default '{}',
  short_description  text not null,
  full_description   text not null,
  requirements       text[] not null default '{}',
  constraints        text[] not null default '{}',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table if not exists project_participants (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  started_at   timestamptz not null default now(),
  unique (project_id, user_id)
);

create table if not exists project_solutions (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  user_name    text not null,
  language     text not null default 'Other',
  github_link  text not null default '',
  live_link    text not null default '',
  note         text not null default '',
  upvotes      integer not null default 0,
  downvotes    integer not null default 0,
  created_at   timestamptz not null default now()
);

-- One row per admin. `id` matches the corresponding row in
-- Supabase's own auth.users table (Authentication → Users).
create table if not exists admin_users (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text not null,
  created_at   timestamptz not null default now()
);

create index if not exists project_participants_project_id_idx on project_participants(project_id);
create index if not exists project_solutions_project_id_idx on project_solutions(project_id);

-- ─────────────────────────────────────────────────────────────
-- Keep updated_at current on projects
-- ─────────────────────────────────────────────────────────────

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists projects_set_updated_at on projects;
create trigger projects_set_updated_at
  before update on projects
  for each row
  execute function set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- project_counts — pre-aggregated "N started" / "N solutions",
-- queried directly by the app instead of counting client-side.
-- ─────────────────────────────────────────────────────────────

create or replace view project_counts as
select
  p.id as project_id,
  coalesce(pp.cnt, 0) as started_count,
  coalesce(ps.cnt, 0) as solution_count
from projects p
left join (
  select project_id, count(*) as cnt from project_participants group by project_id
) pp on pp.project_id = p.id
left join (
  select project_id, count(*) as cnt from project_solutions group by project_id
) ps on ps.project_id = p.id;

grant select on project_counts to anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- is_admin() — used inside RLS policies below. SECURITY DEFINER
-- means it can read admin_users even though admin_users itself has
-- no policy granting that to the caller directly.
-- ─────────────────────────────────────────────────────────────

create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from admin_users where id = auth.uid());
$$;

-- ─────────────────────────────────────────────────────────────
-- increment_solution_vote — the only way `upvotes`/`downvotes`
-- change. SECURITY DEFINER lets it write even though there's no
-- direct UPDATE policy on project_solutions for anon/authenticated.
-- ─────────────────────────────────────────────────────────────

create or replace function increment_solution_vote(p_solution_id uuid, p_direction text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_direction = 'up' then
    update project_solutions set upvotes = upvotes + 1 where id = p_solution_id;
  elsif p_direction = 'down' then
    update project_solutions set downvotes = downvotes + 1 where id = p_solution_id;
  else
    raise exception 'p_direction must be ''up'' or ''down''';
  end if;
end;
$$;

grant execute on function increment_solution_vote(uuid, text) to anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────

alter table projects enable row level security;
alter table project_participants enable row level security;
alter table project_solutions enable row level security;
alter table admin_users enable row level security;

-- projects: public read, admin-only write
drop policy if exists "projects_public_read" on projects;
create policy "projects_public_read" on projects
  for select using (true);

drop policy if exists "projects_admin_insert" on projects;
create policy "projects_admin_insert" on projects
  for insert with check (is_admin());

drop policy if exists "projects_admin_update" on projects;
create policy "projects_admin_update" on projects
  for update using (is_admin()) with check (is_admin());

drop policy if exists "projects_admin_delete" on projects;
create policy "projects_admin_delete" on projects
  for delete using (is_admin());

-- project_participants: public read (needed for "N started" counts
-- and "have I started this?" checks), but insert is only allowed when
-- the row's user_id matches the caller's own auth.uid() — an
-- authenticated visitor can record themselves starting a project, and
-- nothing else. No update/delete policy — nothing in the app needs one.
drop policy if exists "participants_public_read" on project_participants;
create policy "participants_public_read" on project_participants
  for select using (true);

drop policy if exists "participants_self_insert" on project_participants;
create policy "participants_self_insert" on project_participants
  for insert with check (user_id = auth.uid());

-- project_solutions: public read, but insert only as yourself — same
-- reasoning as above. Votes never go through a table policy at all;
-- see increment_solution_vote(). Admins can delete for moderation.
drop policy if exists "solutions_public_read" on project_solutions;
create policy "solutions_public_read" on project_solutions
  for select using (true);

drop policy if exists "solutions_self_insert" on project_solutions;
create policy "solutions_self_insert" on project_solutions
  for insert with check (user_id = auth.uid());

drop policy if exists "solutions_admin_delete" on project_solutions;
create policy "solutions_admin_delete" on project_solutions
  for delete using (is_admin());

-- admin_users: an admin can read their own row (used by the app to
-- confirm "am I an admin?" right after signing in). Nobody can read
-- anyone else's row, and nothing can insert/update/delete from the
-- client — that only happens from the Supabase dashboard.
drop policy if exists "admin_users_self_read" on admin_users;
create policy "admin_users_self_read" on admin_users
  for select using (id = auth.uid());
