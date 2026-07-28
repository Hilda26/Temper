-- Temper backend schema.
-- Supabase supports UX, caching, and telemetry only. It never decides incidents,
-- calculates slashes, creates payouts, changes capital, or verifies evidence —
-- all of that lives on-chain in the GenLayer Temper contract. See SUPABASE.md.

-- ---------------------------------------------------------------------------
-- Helper: shared updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------------
-- profiles — one row per Supabase auth user
-- ---------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  wallet_address text unique,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on profiles
  for each row execute function set_updated_at();

alter table profiles enable row level security;

create policy "profiles_select_own" on profiles
  for select using (auth.uid() = id);
create policy "profiles_insert_own" on profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on profiles
  for update using (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- operator_profiles — operator metadata, keyed by wallet address
-- ---------------------------------------------------------------------------
create table operator_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  wallet_address text not null unique,
  organization_name text,
  contact_email text,
  website_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger operator_profiles_set_updated_at
  before update on operator_profiles
  for each row execute function set_updated_at();

alter table operator_profiles enable row level security;

create policy "operator_profiles_select_own" on operator_profiles
  for select using (auth.uid() = user_id);
create policy "operator_profiles_insert_own" on operator_profiles
  for insert with check (auth.uid() = user_id);
create policy "operator_profiles_update_own" on operator_profiles
  for update using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- resolver_profiles — human resolver registration for deadlocked incidents
-- ---------------------------------------------------------------------------
create table resolver_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  wallet_address text not null unique,
  credentials text,
  status text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'SUSPENDED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger resolver_profiles_set_updated_at
  before update on resolver_profiles
  for each row execute function set_updated_at();

alter table resolver_profiles enable row level security;

create policy "resolver_profiles_select_own" on resolver_profiles
  for select using (auth.uid() = user_id);
create policy "resolver_profiles_insert_own" on resolver_profiles
  for insert with check (auth.uid() = user_id);
create policy "resolver_profiles_update_own" on resolver_profiles
  for update using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- commitment_drafts — pre-activation commitment config, saved before the
-- operator submits create_commitment on-chain
-- ---------------------------------------------------------------------------
create table commitment_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  draft jsonb not null,
  submitted_commitment_id bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger commitment_drafts_set_updated_at
  before update on commitment_drafts
  for each row execute function set_updated_at();

alter table commitment_drafts enable row level security;

create policy "commitment_drafts_select_own" on commitment_drafts
  for select using (auth.uid() = user_id);
create policy "commitment_drafts_insert_own" on commitment_drafts
  for insert with check (auth.uid() = user_id);
create policy "commitment_drafts_update_own" on commitment_drafts
  for update using (auth.uid() = user_id);
create policy "commitment_drafts_delete_own" on commitment_drafts
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- cached_commitments — indexed mirror of on-chain commitments (read cache only)
-- ---------------------------------------------------------------------------
create table cached_commitments (
  commitment_id bigint primary key,
  operator_address text not null,
  service_name text not null,
  description text,
  status smallint not null,
  target_url text,
  backup_url text,
  bond numeric not null default 0,
  bond_slashed numeric not null default 0,
  min_bond numeric not null default 0,
  observation_interval integer,
  grace_period integer,
  failure_threshold integer,
  consecutive_failures integer,
  incident_count integer not null default 0,
  active_incident bigint,
  policy_count integer not null default 0,
  active_policy_count integer not null default 0,
  raw jsonb not null,
  synced_at timestamptz not null default now()
);

create index cached_commitments_operator_idx on cached_commitments(operator_address);
create index cached_commitments_status_idx on cached_commitments(status);

alter table cached_commitments enable row level security;

create policy "cached_commitments_select_all" on cached_commitments
  for select using (true);

-- ---------------------------------------------------------------------------
-- cached_observations — indexed observation results
-- ---------------------------------------------------------------------------
create table cached_observations (
  observation_id bigint primary key,
  commitment_id bigint not null references cached_commitments(commitment_id) on delete cascade,
  status smallint not null,
  window_start timestamptz,
  window_end timestamptz,
  result_hash jsonb,
  triggerer_address text,
  raw jsonb not null,
  synced_at timestamptz not null default now()
);

create index cached_observations_commitment_idx on cached_observations(commitment_id);

alter table cached_observations enable row level security;

create policy "cached_observations_select_all" on cached_observations
  for select using (true);

-- ---------------------------------------------------------------------------
-- cached_incidents — indexed incident data
-- ---------------------------------------------------------------------------
create table cached_incidents (
  incident_id bigint primary key,
  commitment_id bigint not null references cached_commitments(commitment_id) on delete cascade,
  status smallint not null,
  severity smallint,
  event_status smallint,
  responsibility smallint,
  start_time timestamptz,
  end_time timestamptz,
  challenger_address text,
  challenge_time timestamptz,
  counter_evidence_urls text,
  raw jsonb not null,
  synced_at timestamptz not null default now()
);

create index cached_incidents_commitment_idx on cached_incidents(commitment_id);
create index cached_incidents_status_idx on cached_incidents(status);

alter table cached_incidents enable row level security;

create policy "cached_incidents_select_all" on cached_incidents
  for select using (true);

-- ---------------------------------------------------------------------------
-- cached_policies — indexed policy data
-- ---------------------------------------------------------------------------
create table cached_policies (
  policy_id bigint primary key,
  commitment_id bigint not null references cached_commitments(commitment_id) on delete cascade,
  holder_address text not null,
  status smallint not null,
  "limit" numeric not null default 0,
  premium_paid numeric not null default 0,
  deductible numeric not null default 0,
  start_time timestamptz,
  end_time timestamptz,
  claimable numeric not null default 0,
  claimed numeric not null default 0,
  incident_id bigint,
  raw jsonb not null,
  synced_at timestamptz not null default now()
);

create index cached_policies_commitment_idx on cached_policies(commitment_id);
create index cached_policies_holder_idx on cached_policies(holder_address);

alter table cached_policies enable row level security;

create policy "cached_policies_select_all" on cached_policies
  for select using (true);

-- ---------------------------------------------------------------------------
-- cached_capital_positions — underwriter positions per commitment vault
-- ---------------------------------------------------------------------------
create table cached_capital_positions (
  id uuid primary key default gen_random_uuid(),
  commitment_id bigint not null references cached_commitments(commitment_id) on delete cascade,
  underwriter_address text not null,
  shares numeric not null default 0,
  deposited numeric not null default 0,
  withdrawal_status smallint,
  withdrawal_shares numeric,
  raw jsonb not null,
  synced_at timestamptz not null default now(),
  unique (commitment_id, underwriter_address)
);

create index cached_capital_positions_commitment_idx on cached_capital_positions(commitment_id);
create index cached_capital_positions_underwriter_idx on cached_capital_positions(underwriter_address);

alter table cached_capital_positions enable row level security;

create policy "cached_capital_positions_select_all" on cached_capital_positions
  for select using (true);

-- ---------------------------------------------------------------------------
-- cached_settlements — settlement receipts once an incident finalizes
-- ---------------------------------------------------------------------------
create table cached_settlements (
  id uuid primary key default gen_random_uuid(),
  incident_id bigint not null references cached_incidents(incident_id) on delete cascade,
  commitment_id bigint not null references cached_commitments(commitment_id) on delete cascade,
  slash_amount numeric not null default 0,
  total_payouts numeric not null default 0,
  tx_hash text,
  settled_at timestamptz not null default now(),
  raw jsonb not null
);

create index cached_settlements_incident_idx on cached_settlements(incident_id);
create index cached_settlements_commitment_idx on cached_settlements(commitment_id);

alter table cached_settlements enable row level security;

create policy "cached_settlements_select_all" on cached_settlements
  for select using (true);

-- ---------------------------------------------------------------------------
-- notification_subscriptions — which events a user wants notified about
-- ---------------------------------------------------------------------------
create table notification_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  commitment_id bigint,
  event_types text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (user_id, commitment_id)
);

alter table notification_subscriptions enable row level security;

create policy "notification_subscriptions_select_own" on notification_subscriptions
  for select using (auth.uid() = user_id);
create policy "notification_subscriptions_insert_own" on notification_subscriptions
  for insert with check (auth.uid() = user_id);
create policy "notification_subscriptions_update_own" on notification_subscriptions
  for update using (auth.uid() = user_id);
create policy "notification_subscriptions_delete_own" on notification_subscriptions
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- notifications — delivery queue / inbox
-- ---------------------------------------------------------------------------
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type text not null,
  payload jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on notifications(user_id, created_at desc);

alter table notifications enable row level security;

create policy "notifications_select_own" on notifications
  for select using (auth.uid() = user_id);
create policy "notifications_update_own" on notifications
  for update using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- observer_instances — registered runner instances
-- ---------------------------------------------------------------------------
create table observer_instances (
  id uuid primary key default gen_random_uuid(),
  instance_name text not null unique,
  wallet_address text,
  status text not null default 'OFFLINE' check (status in ('ONLINE', 'OFFLINE', 'DEGRADED')),
  last_heartbeat_at timestamptz,
  version text,
  created_at timestamptz not null default now()
);

alter table observer_instances enable row level security;

create policy "observer_instances_select_all" on observer_instances
  for select using (true);
create policy "observer_instances_service_write" on observer_instances
  for all using (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- observer_runs — per-cycle runner telemetry
-- ---------------------------------------------------------------------------
create table observer_runs (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid references observer_instances(id) on delete set null,
  commitment_id bigint,
  observation_id bigint,
  tx_hash text,
  result text not null check (result in ('SUCCESS', 'ERROR', 'SKIPPED')),
  error_message text,
  ran_at timestamptz not null default now()
);

create index observer_runs_instance_idx on observer_runs(instance_id, ran_at desc);
create index observer_runs_commitment_idx on observer_runs(commitment_id);

alter table observer_runs enable row level security;

create policy "observer_runs_select_all" on observer_runs
  for select using (true);
create policy "observer_runs_service_write" on observer_runs
  for all using (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- indexer_checkpoints — last indexed position per chain/source
-- ---------------------------------------------------------------------------
create table indexer_checkpoints (
  source text primary key,
  last_block bigint,
  last_tx_hash text,
  last_commitment_id bigint,
  last_incident_id bigint,
  last_policy_id bigint,
  last_observation_id bigint,
  updated_at timestamptz not null default now()
);

alter table indexer_checkpoints enable row level security;

create policy "indexer_checkpoints_service_all" on indexer_checkpoints
  for all using (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- transaction_attempts — client-side TX submission reconciliation
-- ---------------------------------------------------------------------------
create table transaction_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,
  wallet_address text,
  function_name text not null,
  args jsonb,
  tx_hash text,
  status text not null default 'PENDING' check (status in ('PENDING', 'SUCCESS', 'ERROR')),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index transaction_attempts_user_idx on transaction_attempts(user_id, created_at desc);

create trigger transaction_attempts_set_updated_at
  before update on transaction_attempts
  for each row execute function set_updated_at();

alter table transaction_attempts enable row level security;

create policy "transaction_attempts_select_own" on transaction_attempts
  for select using (auth.uid() = user_id);
create policy "transaction_attempts_insert_own" on transaction_attempts
  for insert with check (auth.uid() = user_id);
create policy "transaction_attempts_update_own" on transaction_attempts
  for update using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- source_health — cached health checks of commitment target/backup URLs
-- ---------------------------------------------------------------------------
create table source_health (
  url text primary key,
  last_status text,
  last_checked_at timestamptz not null default now(),
  latency_ms integer,
  consecutive_failures integer not null default 0
);

alter table source_health enable row level security;

create policy "source_health_select_all" on source_health
  for select using (true);
create policy "source_health_service_write" on source_health
  for all using (auth.role() = 'service_role');
