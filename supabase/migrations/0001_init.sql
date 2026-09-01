-- Qwibi initial schema: jobs, deliverables, wallet statements, transaction cache, schedules.
-- RLS is enabled on every table from the start - no permissive dev policies left in.

create extension if not exists "pgcrypto";

create type job_status as enum ('queued', 'planning', 'fetching', 'computing', 'composing', 'attesting', 'delivered', 'failed');

create table jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  service text not null,
  status job_status not null default 'queued',
  prompt text,
  inputs jsonb not null default '{}'::jsonb,
  plan jsonb,
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table deliverables (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs (id) on delete cascade,
  file_path text not null,
  file_type text not null,
  attestation_hash text,
  manifest jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table wallet_statements (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs (id) on delete cascade,
  addresses text[] not null,
  chain_coverage text[] not null default '{}',
  period_start date,
  period_end date,
  summary jsonb not null default '{}'::jsonb
);

create table transactions_cache (
  id uuid primary key default gen_random_uuid(),
  address text not null,
  chain text not null,
  tx_hash text not null,
  block_time timestamptz not null,
  direction text not null,
  counterparty text,
  asset text not null,
  amount numeric not null,
  usd_value numeric,
  classification text,
  source text not null,
  raw jsonb not null default '{}'::jsonb,
  unique (chain, tx_hash, address)
);

create table schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  service text not null,
  config jsonb not null default '{}'::jsonb,
  cron text not null,
  next_run timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table jobs enable row level security;
alter table deliverables enable row level security;
alter table wallet_statements enable row level security;
alter table transactions_cache enable row level security;
alter table schedules enable row level security;

create policy "jobs: owner read" on jobs for select using (auth.uid() = user_id);
create policy "jobs: owner insert" on jobs for insert with check (auth.uid() = user_id);
create policy "jobs: owner update" on jobs for update using (auth.uid() = user_id);

create policy "deliverables: owner read" on deliverables for select using (
  exists (select 1 from jobs where jobs.id = deliverables.job_id and jobs.user_id = auth.uid())
);

create policy "wallet_statements: owner read" on wallet_statements for select using (
  exists (select 1 from jobs where jobs.id = wallet_statements.job_id and jobs.user_id = auth.uid())
);

-- transactions_cache holds no user_id (shared cache keyed by address/chain/tx) - service role only.
create policy "transactions_cache: service role only" on transactions_cache for all using (false);

create policy "schedules: owner read" on schedules for select using (auth.uid() = user_id);
create policy "schedules: owner insert" on schedules for insert with check (auth.uid() = user_id);
create policy "schedules: owner update" on schedules for update using (auth.uid() = user_id);
create policy "schedules: owner delete" on schedules for delete using (auth.uid() = user_id);
