# Temper Economics

## Fully Collateralised Model

The MVP enforces conservative reservation: the full maximum payout is reserved for every active policy.

### Coverage Capacity

```
available_capacity = free_underwriter_capital + (remaining_operator_bond / 4)

free_capital = gross_capital - reserved_capital - pending_claims - realised_losses
```

Coverage purchase reverts when `requested_limit > available_capacity`.

No leverage, fractional reserve, or assumed future premium.

## Value Flows

### Operator Bond
- Deposited via `deposit_operator_bond` (payable)
- Subject to slash schedule per severity
- Cannot be withdrawn while active exposure exists
- Withdrawable only after wind-down, all policies expired, all incidents settled

### Underwriter Capital
- Deposited via `deposit_coverage_capital` (payable)
- Tracked as shares (proportional to gross capital at deposit time)
- Withdrawal queued → locked during incidents → executable against free capital
- Earns premium share from policy purchases

### Premium Allocation (basis points)
- Protocol fee: 200 bps (2%)
- Observer reward: 100 bps (1%)
- Underwriter share: remainder (97%)

### Premium Pricing
Deterministic formula:
```
base_premium = limit × base_bps × duration / (10000 × 365 × 86400)
utilisation_adjustment = base_bps × (reserved / gross) / 10000
adjusted_bps = base_bps + utilisation_adjustment
premium = limit × adjusted_bps × duration / (10000 × 365 × 86400)
```

Minimum premium: 1 wei.

## Slash Schedule

Per severity (configurable per commitment):
```
WARNING  = 0 bps       → 0% of remaining bond
MINOR    = 500 bps     → 5% of remaining bond
MATERIAL = 2500 bps    → 25% of remaining bond
CRITICAL = 10000 bps   → 100% of remaining bond
```

Cumulative slash cap enforced per commitment.

## Payout Tiers (Parametric)

Per severity (configurable per commitment):
```
Tier 0 (NONE)     = 0 bps     → 0% of policy limit
Tier 1 (WARNING)  = 1000 bps  → 10% of policy limit
Tier 2 (MINOR)    = 3500 bps  → 35% of policy limit
Tier 3 (MATERIAL) = 10000 bps → 100% of policy limit
Tier 4 (CRITICAL) = 10000 bps → 100% of policy limit
```

Net payout = max(0, gross_payout - deductible), capped at policy limit.

## Solvency Invariants

```
reserved_capital <= gross_capital
claimable_payout <= policy_limit
slash_amount <= remaining_operator_bond
withdrawal <= free_capital
sum(policy_claimable) <= reserved_capital + slash_recovery
```

All arithmetic is integer-only. No floating point.
