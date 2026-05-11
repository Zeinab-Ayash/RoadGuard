-- RoadGuard schema (Supabase / Postgres)
-- Source of truth for tables created in the project's Supabase instance.
-- The app does not yet connect to this DB.

create table company (
  company_id uuid primary key default gen_random_uuid(),
  company_name text not null,
  email text unique not null,
  password text not null,
  phone text,
  logo_path text,
  created_at timestamp default now()
);

create table driver (
  driver_id uuid primary key default gen_random_uuid(),
  company_id uuid not null references company(company_id) on delete cascade,
  driver_name text not null,
  driver_code text unique not null,
  phone text unique not null,
  password text not null,
  profile_image text,
  current_score integer default 100,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamp default now()
);
-- Note: driver.status is the soft-delete flag. The Deactivate button on
-- DriverProfileScreen sets it to 'inactive' instead of DELETE-ing the row,
-- which preserves history. The /drivers list endpoint should filter by
-- status='active'. Login should also check status='active'.
-- Note: driver.current_score is a denormalized cache of the current
-- monthly_score row. Duplication is intentional (read performance).

create table driving_session (
  session_id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references driver(driver_id) on delete cascade,
  start_time timestamp default now(),
  end_time timestamp,
  is_active boolean default true
);

create table misbehavior_type (
  type_id uuid primary key default gen_random_uuid(),
  behavior_name text unique not null,
  severity_score integer not null
);

create table misbehavior (
  misbehavior_id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references driver(driver_id) on delete cascade,
  session_id uuid not null references driving_session(session_id) on delete cascade,
  type_id uuid not null references misbehavior_type(type_id),
  detected_at timestamp default now()
);

create table notification (
  notification_id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references driver(driver_id) on delete cascade,
  misbehavior_id uuid unique not null references misbehavior(misbehavior_id) on delete cascade,
  is_read boolean default false,
  created_at timestamp default now()
);
-- Note: notification.misbehavior_id is UNIQUE — exactly one notification
-- per detected misbehavior (1:1 relationship), not 1:many.

create table monthly_score (
  monthly_score_id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references driver(driver_id) on delete cascade,
  year integer not null,
  month integer not null,
  score integer default 100,
  unique (driver_id, year, month)
);
