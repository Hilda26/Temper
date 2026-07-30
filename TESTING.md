# Temper Testing

## Test Hierarchy

### 1. Contract Lint
```bash
genvm-lint check contracts/temper.py --json
```
Status: PASS (44 methods, 3 lint checks passed)

### 2. Direct Tests (pytest)
Fast in-memory unit tests of deterministic logic.
```bash
pytest tests/direct/ -v
```

### 3. Integration Tests (gltest)
Multi-validator consensus tests.
```bash
gltest tests/integration/ -v -s
```

### 4. StudioNet Tests
Real deployed contract with actual value.

## Required StudioNet Test Scenario

1. Operator deposits bond → `deposit_operator_bond` — **PASS**
2. Operator activates commitment → `activate_commitment` — **PASS**
3. Underwriter deposits capital → `deposit_coverage_capital` — **PASS**
4. User buys coverage → `purchase_coverage` — **PASS**
5. Observer triggers healthy observation → `request_observation` — **PASS**
6. Reference service changes to UNAVAILABLE — **not exercised** (reference-service isn't deployed publicly; `httpbin.org/status/503` used as a stand-in reliably-failing endpoint instead, see below)
7. Observer triggers observation → `request_observation` — **PASS**
8. Contract fetches sources → consensus confirms incident — **PASS** (auto-opens incident on threshold breach)
9. Challenge path runs → `challenge_incident` → `request_readjudication` — **PASS** (see Intensive E2E Run below — only the UPHOLD ruling branch was exercised; OVERTURN/REDUCE_SEVERITY require a target that becomes healthy mid-incident, which needs a real toggleable endpoint)
10. Slash is recorded → `finalize_incident` — **PASS**
11. Payout is claimable → policy status = PAYOUT_READY — **PASS**
12. Holder claims real value → `claim_payout` — **PASS at the contract-call level** (transaction
    succeeds, `policy_claimed`/`policy_status` update correctly) — **but see the platform
    limitation in HANDOFF.md**: the actual GEN transfer to the holder's wallet does not land.
    Confirmed via direct on-chain balance checks, not a Temper bug — `emit_transfer` to plain
    wallet (EOA) addresses silently loses the value on StudioNet.
13. Balances reconcile — **PASS for internal ledger** (slash_amount and claimable payout both
    verified against manual bps math) — **not provable for actual wallet balances**, per above.

## Intensive E2E Run (2026-07-28)

Ran a 37-scenario suite (`scripts/test-intensive-e2e.mjs` + manual CLI admin checks) against a
dedicated throwaway deployment (`0x3C13ba755d5ba3e6762cec2726512fB41Ee14Dca` — separate from the
production contract, so the live demo data was never touched). **37/37 automated checks passed**,
plus 4 manual admin-path checks. Full breakdown:

**Happy-path mechanics** (11): create → bond → activate → deposit capital → purchase coverage →
underwriter withdrawal request/cancel → two failing observations auto-opening an incident →
underwriter withdrawal request while incident is active (locked) → operator challenge →
`request_readjudication` → `finalize_incident` → locked withdrawal executes post-settlement →
`claim_payout`. Verified slash_amount (2500bps × 1000 bond = 250) and claimable payout (tier-3 ×
1000 limit − 10 deductible = 990) match the contract's bps math exactly.

**Wind-down path** (4): `begin_wind_down` → `request_bond_withdrawal` → commitment correctly
closes with bond returned → re-running the withdrawal on an already-empty bond correctly reverts
(`NOTHING_TO_WITHDRAW`).

**Authorization negatives** (4, all correctly reverted): non-operator challenging an incident;
non-operator activating someone else's commitment; double-claiming a paid-out policy; a
non-holder claiming someone else's policy.

**Input validation negatives** (4, all correctly reverted): `purchase_coverage` below
`min_policy_limit`; above `max_policy_limit`; `activate_commitment` on an already-active
commitment; `deposit_operator_bond` with zero value.

**Admin path** (4, run manually via `genlayer write`/`genlayer call` since the admin key lives in
the CLI's keystore, not scriptable): `set_paused(true)` correctly blocks all subsequent writes;
a non-admin account correctly cannot call `set_paused`; `set_paused(false)` correctly restores
writes; `withdraw_protocol_treasury` with an amount exceeding the treasury balance correctly
reverts (`INSUFFICIENT_TREASURY`) rather than underflowing.

**Known gap**: the OVERTURN and REDUCE_SEVERITY readjudication rulings were not exercised — both
require the commitment's `target_url` to actually recover mid-incident, which isn't possible with
a fixed public test endpoint (`target_url` is immutable after `create_commitment`). Exercising
those rulings needs `reference-service` deployed publicly with its `POST /admin/set-mode` toggle
pointed to by a live commitment.

## Test Categories

### Deterministic Tests
- Bond deposit/withdrawal
- Commitment activation with insufficient bond
- Underwriter deposit and share calculation
- Coverage capacity calculation
- Policy purchase with premium
- Premium allocation (protocol, observer, underwriter)
- Waiting period enforcement
- Duplicate trigger rejection
- Slash calculation with bounds
- Payout tier application
- Claim idempotency
- Withdrawal lock during incident
- Wind-down lifecycle

### Invariant Tests
- Solvency: reserved <= gross
- No negative free capital
- Slash bounded by bond
- Payout bounded by policy limit
- Reserved capital conserved
- No duplicate settlement
- Active policy capital locked

### Evidence Fixtures
- Endpoint healthy (200)
- Endpoint unavailable (503)
- Target down, status page claims healthy
- Status page unavailable, target healthy
- Conflicting sources
- Stale oracle data
- Recovery after material breach
- Prompt injection in page content (must be ignored)
