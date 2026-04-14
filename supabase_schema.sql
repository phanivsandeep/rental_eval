-- ─────────────────────────────────────────────────────────────────────────────
-- Rental Evaluator — Supabase Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── users ──────────────────────────────────────────────────────────────────────

create table if not exists users (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid unique not null,
  profile      jsonb not null default '{}',
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create index if not exists idx_users_session_id on users(session_id);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_updated_at on users;
create trigger users_updated_at
  before update on users
  for each row execute procedure update_updated_at();


-- ── evaluations ────────────────────────────────────────────────────────────────

create table if not exists evaluations (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references users(id) on delete cascade,
  address      text not null,
  zip_code     text not null,
  report       jsonb not null default '{}',
  status       text not null default 'pending'
                 check (status in ('pending', 'running', 'complete', 'failed')),
  trace_id     text,
  created_at   timestamptz default now()
);

create index if not exists idx_evaluations_user_id  on evaluations(user_id);
create index if not exists idx_evaluations_created  on evaluations(created_at desc);
create index if not exists idx_evaluations_status   on evaluations(status);

-- Computed column: extract overall_score from JSONB for cheap list queries
alter table evaluations
  add column if not exists overall_score integer
  generated always as ((report->>'overall_score')::integer) stored;


-- ── neighborhood_cache ─────────────────────────────────────────────────────────

create table if not exists neighborhood_cache (
  zip_code    text primary key,
  data        jsonb not null default '{}',
  expires_at  timestamptz not null,
  created_at  timestamptz default now()
);

create index if not exists idx_cache_expires on neighborhood_cache(expires_at);


-- ── Row Level Security ─────────────────────────────────────────────────────────
-- All access goes through the backend service role key only.
-- Frontend never touches Supabase directly.

alter table users              enable row level security;
alter table evaluations        enable row level security;
alter table neighborhood_cache enable row level security;

-- Drop existing policies first (idempotent)
drop policy if exists "service_only" on users;
drop policy if exists "service_only" on evaluations;
drop policy if exists "service_only" on neighborhood_cache;

-- Block all direct client access
create policy "service_only" on users              for all using (false);
create policy "service_only" on evaluations        for all using (false);
create policy "service_only" on neighborhood_cache for all using (false);


-- ── Cleanup function (optional, run periodically) ──────────────────────────────

create or replace function cleanup_expired_cache()
returns void language sql as $$
  delete from neighborhood_cache where expires_at < now();
$$;
