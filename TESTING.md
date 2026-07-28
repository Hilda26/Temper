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

1. Operator deposits bond → `deposit_operator_bond`
2. Operator activates commitment → `activate_commitment`
3. Underwriter deposits capital → `deposit_coverage_capital`
4. User buys coverage → `purchase_coverage`
5. Observer triggers healthy observation → `request_observation`
6. Reference service changes to UNAVAILABLE
7. Observer triggers observation → `request_observation`
8. Contract fetches sources → consensus confirms incident
9. Challenge path runs → `challenge_incident` → `request_readjudication`
10. Slash is recorded → `finalize_incident`
11. Payout is claimable → policy status = PAYOUT_READY
12. Holder claims real value → `claim_payout`
13. Balances reconcile

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
