# Temper Accounting Invariants

These invariants must hold at all times. Violation indicates a bug.

## Capital Invariants

```
contract_accounted_balance <= actual_contract_balance

reserved_capital <= gross_vault_capital

free_capital = gross_capital - reserved_capital - pending_claims - realised_losses
free_capital >= 0

sum(policy_claimable) <= reserved_capital + allocated_slash_recovery
```

## Bond Invariants

```
operator_slash <= remaining_operator_bond

remaining_bond = bond - bond_slashed
remaining_bond >= 0

cumulative_slash <= (bond × max_cumulative_slash_bps) / 10000
```

## Policy Invariants

```
policy_payout <= policy_limit

policy_claimed <= policy_claimable

one policy cannot be paid twice for one incident

no policy can cover an incident that began before its waiting period ended
```

## Uniqueness Invariants

```
one observation window cannot finalise twice

one resolver ruling cannot execute twice

no withdrawal can consume incident-reserved funds
```

## Lifecycle Invariants

```
no new policy can start during an active incident

no underwriter withdrawal during active incident (locked)

no operator bond withdrawal while active policies or incidents exist

commitment cannot be closed while active policies or incidents exist
```

## Capacity Invariants

```
available_coverage_capacity = free_capital + (remaining_bond / 4)

coverage_purchase reverts when limit > available_capacity

premium >= 1 (minimum premium)
```
