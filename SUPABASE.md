# Temper Supabase

## Role

Supabase supports UX, caching, and telemetry. It does NOT decide incidents, calculate slashes, create payouts, change capital, or verify evidence.

## Planned Tables

| Table | Purpose |
|-------|---------|
| profiles | Auth user profiles |
| operator_profiles | Operator metadata |
| resolver_profiles | Resolver registration |
| commitment_drafts | Pre-activation commitment config |
| cached_commitments | Indexed on-chain commitments |
| cached_observations | Indexed observation results |
| cached_incidents | Indexed incident data |
| cached_policies | Indexed policy data |
| cached_capital_positions | Underwriter positions |
| cached_settlements | Settlement receipts |
| notification_subscriptions | User notification prefs |
| notifications | Notification delivery queue |
| observer_instances | Registered runner instances |
| observer_runs | Runner telemetry |
| indexer_checkpoints | Last indexed block/tx |
| transaction_attempts | TX reconciliation |
| source_health | Domain health cache |

## RLS Rules

- Users can only read/write their own profiles and drafts
- Cached chain data is read-only for all authenticated users
- Observer telemetry writable by service role only
- Notification subscriptions owned by user

## Auth

Email/password via Supabase Auth.

## Status

**Implemented.** Project `Temper` created (ref `qepuqyyvhailxmzqtnfr`, region `eu-west-1`).
All 17 planned tables above are live with RLS enabled — migration at
`supabase/migrations/20260727000000_initial_schema.sql`, applied via `supabase db push`.

- **Frontend** (`frontend/.env.local` / `.env.example`): `NEXT_PUBLIC_SUPABASE_URL` and
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set. No frontend code queries Supabase yet — the
  read-only pages still read the GenLayer contract directly (that's correct: cached_* tables
  are a read-optimization layer for future scale, not a requirement for correctness). Wiring
  the frontend to read from `cached_*` tables instead of live RPC calls, and building
  auth/profile/notification UI, is not yet done.
- **Observer runner** (`observer/src/telemetry.ts`, wired into `observer/src/index.ts`):
  registers itself in `observer_instances` on startup, heartbeats every 30s, and records
  every observation attempt to `observer_runs` (service-role key, `observer/.env`). Verified
  live — see LIVE_TEST_RECEIPTS.md.
- **Indexer**: not built. `cached_commitments` / `cached_observations` / `cached_incidents` /
  `cached_policies` / `cached_capital_positions` / `cached_settlements` /
  `indexer_checkpoints` tables exist but nothing populates them yet — this is a real gap if
  the frontend needs to move off direct RPC reads for scale (currently direct RPC reads work
  fine at this scale, so it wasn't urgent to build for this pass).
- **Auth**: not wired — `profiles` / `operator_profiles` / `resolver_profiles` /
  `commitment_drafts` / `notification_subscriptions` / `notifications` tables exist with RLS
  policies but no Supabase Auth UI has been built in the frontend yet.
- **DB password**: generated during project creation, saved to the scratchpad (not the repo)
  — rotate it in the Supabase dashboard if you want a fresh one you control.
