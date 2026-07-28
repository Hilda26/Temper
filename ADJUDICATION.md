# Temper Adjudication

## Overview

GenLayer adjudicates every incident through its Optimistic Democracy consensus. A leader proposes a result, validators independently evaluate, and the consensus outcome becomes permanent.

## Deterministic Responsibilities

The contract uses deterministic logic for:
- Authorization and access control
- Value accounting (bond, capital, premiums)
- Policy purchase and reservation
- Basis-point arithmetic
- Slash bounds enforcement
- Claimable payout calculation
- State transitions
- Challenge deadlines and finality
- Payment claims (pull pattern)

## Non-Deterministic Responsibilities

GenLayer's `gl.vm.run_nondet_unsafe` handles:
- Fetching public evidence via `gl.nondet.web.get()`
- Comparing evidence against commitment policy
- Distinguishing source outage from target outage
- Assigning severity within configured options
- Re-adjudicating challenged verdicts

## Observation Adjudication

```python
def leader_fn():
    # Fetch primary and backup sources
    # Determine health status
    # Apply failure threshold logic
    # Return structured JSON verdict

def validator_fn(leader_result):
    # Verify enum validity
    # Independently fetch primary source
    # Compare health status (UP/DOWN)
    # Reject if health disagrees
```

## Re-Adjudication (Challenge)

When an operator challenges:
1. Contract fetches target again (fresh evidence)
2. Contract fetches operator's counter-evidence URLs
3. Leader determines ruling: UPHOLD, REDUCE_SEVERITY, OVERTURN
4. Validators independently verify health status agrees
5. Ruling applied deterministically (slash recalculated)

## Allowed Outcomes

### Event Status
NOT_CONFIRMED, CONFIRMED, INSUFFICIENT_EVIDENCE, SOURCE_FAILURE, CONFLICTING_EVIDENCE

### Severity
NONE, WARNING, MINOR, MATERIAL, CRITICAL

### Responsibility
OPERATOR, EXTERNAL_DEPENDENCY, CLAIMANT, SHARED, UNKNOWN

### Re-Adjudication Rulings
UPHOLD, REDUCE_SEVERITY, INCREASE_WITHIN_POLICY, OVERTURN, MARK_SOURCE_FAILURE, APPLY_SHARED_RESPONSIBILITY

## Key Constraint

The consensus verdict can only select from allowed enum values and configured severity levels. It cannot invent arbitrary slash amounts or create values outside the commitment's configured bounds.
