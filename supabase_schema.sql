-- ─────────────────────────────────────────────────────────────────────────────
-- Rental Evaluator — Supabase Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)
--
-- Authentication is handled entirely by Supabase Auth (auth.users).
-- This schema extends auth.users with app-specific tables.
-- ─────────────────────────────────────────────────────────────────────────────


-- ── profiles ───────────────────────────────────────────────────────────────────
-- One row per registered user. Extends auth.users with persona/preferences.
-- Auto-created on signup via trigger below.

create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text,
  profile     jsonb not null default '{}',   -- persona form data (priorities, etc.)
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on profiles;
create trigger profiles_updated_at
  before update on profiles
  for each row execute procedure update_updated_at();

-- Auto-insert a blank profile when a user signs up via Supabase Auth
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();


-- ── evaluations ────────────────────────────────────────────────────────────────

create table if not exists evaluations (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  address       text not null,
  zip_code      text not null,
  report        jsonb not null default '{}',
  status        text not null default 'pending'
                  check (status in ('pending', 'running', 'complete', 'failed')),
  trace_id      text,
  created_at    timestamptz default now()
);

create index if not exists idx_evaluations_user_id on evaluations(user_id);
create index if not exists idx_evaluations_created on evaluations(created_at desc);
create index if not exists idx_evaluations_status  on evaluations(status);

-- Computed column: pull overall_score out of JSONB for cheap list queries
alter table evaluations
  add column if not exists overall_score integer
  generated always as ((report->>'overall_score')::integer) stored;


-- ── neighborhood_cache ─────────────────────────────────────────────────────────
-- Shared cache keyed by zip code — no user ownership, service role only.

create table if not exists neighborhood_cache (
  zip_code    text primary key,
  data        jsonb not null default '{}',
  expires_at  timestamptz not null,
  created_at  timestamptz default now()
);

create index if not exists idx_cache_expires on neighborhood_cache(expires_at);


-- ── Row Level Security ─────────────────────────────────────────────────────────

alter table profiles              enable row level security;
alter table evaluations           enable row level security;
alter table neighborhood_cache    enable row level security;

-- Drop existing policies (idempotent re-runs)
drop policy if exists "users_own_profile"       on profiles;
drop policy if exists "users_own_evaluations"   on evaluations;
drop policy if exists "service_only"            on neighborhood_cache;
-- Legacy policy names from old schema
drop policy if exists "service_only" on profiles;
drop policy if exists "service_only" on evaluations;

-- profiles: each user can read/write only their own row
create policy "users_own_profile" on profiles
  for all
  using  (id = auth.uid())
  with check (id = auth.uid());

-- evaluations: each user can read/write only their own rows
create policy "users_own_evaluations" on evaluations
  for all
  using  (user_id = auth.uid())
  with check (user_id = auth.uid());

-- neighborhood_cache: no direct client access — backend service role only
create policy "service_only" on neighborhood_cache
  for all using (false);


-- ── Optional: cleanup expired cache (call via pg_cron or a cron job) ──────────

create or replace function cleanup_expired_cache()
returns void language sql as $$
  delete from neighborhood_cache where expires_at < now();
$$;
