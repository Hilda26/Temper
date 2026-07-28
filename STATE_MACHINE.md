# Temper State Machine

## Commitment Lifecycle

```
DRAFT → BONDING → CAPITALISING → ACTIVE → WATCH → INCIDENT_OPEN → SUSPENDED → WINDING_DOWN → CLOSED
                                    ↑                     |
                                    └─────────────────────┘ (recapitalise)
```

| From | To | Trigger |
|------|----|---------|
| DRAFT | BONDING | deposit_operator_bond |
| BONDING | CAPITALISING | deposit_coverage_capital |
| BONDING/CAPITALISING | ACTIVE | activate_commitment (bond >= min_bond) |
| ACTIVE | INCIDENT_OPEN | Confirmed breach via request_observation |
| INCIDENT_OPEN | ACTIVE | Recovery or overturn |
| ACTIVE/INCIDENT_OPEN | SUSPENDED | Bond falls below min after slash |
| SUSPENDED | ACTIVE | add_operator_bond restores min + no active incident |
| ACTIVE/WATCH | WINDING_DOWN | begin_wind_down |
| WINDING_DOWN/CLOSED | CLOSED | request_bond_withdrawal |

## Observation States

```
DUE → REQUESTED → CONSENSUS_PENDING → NOMINAL | ANOMALY | FAILED | STALE
```

| Code | Value | Meaning |
|------|-------|---------|
| DUE | 0 | Observation interval elapsed |
| REQUESTED | 1 | Transaction submitted |
| CONSENSUS_PENDING | 2 | Awaiting validator consensus |
| NOMINAL | 3 | Service healthy |
| ANOMALY | 4 | Service unhealthy |
| FAILED | 5 | Observation execution failed |
| STALE | 6 | Window expired without result |

## Incident States

```
SUSPECTED → EVIDENCE_GATHERING → PROVISIONAL_VERDICT → CHALLENGE_WINDOW → READJUDICATION_PENDING → FINAL → SETTLEMENT_READY → SETTLED
                                                                                                              ↓
                                                                                                          RECOVERED
```

| Code | Value | Meaning |
|------|-------|---------|
| SUSPECTED | 0 | Manually opened, awaiting evidence |
| EVIDENCE_GATHERING | 1 | Collecting observations |
| PROVISIONAL_VERDICT | 2 | Initial consensus result |
| CHALLENGE_WINDOW | 3 | Operator can challenge |
| READJUDICATION_PENDING | 4 | Challenge filed, awaiting re-adjudication |
| RESOLVER_PENDING | 5 | Escalated to resolver |
| FINAL | 6 | Verdict finalized |
| SETTLEMENT_READY | 7 | Slash applied, payouts calculated |
| SETTLED | 8 | All claims processed |
| RECOVERED | 9 | Service recovered, incident closed |

## Policy States

```
PENDING_WAIT → ACTIVE → EXPIRED | INCIDENT_LOCKED → PAYOUT_READY → PAID
```

| Code | Value | Meaning |
|------|-------|---------|
| PENDING_WAIT | 0 | Waiting period active |
| ACTIVE | 1 | Coverage active |
| EXPIRED | 2 | Duration ended |
| INCIDENT_LOCKED | 3 | Locked during incident |
| PAYOUT_READY | 4 | Claimable payout available |
| PAID | 5 | Payout claimed |
| CANCELLED | 6 | Policy cancelled |

## Withdrawal States

| Code | Value | Meaning |
|------|-------|---------|
| NONE | 0 | No withdrawal pending |
| QUEUED | 1 | Withdrawal requested |
| LOCKED_BY_INCIDENT | 2 | Frozen during active incident |
| EXECUTABLE | 3 | Ready to execute |
| EXECUTED | 4 | Withdrawal completed |
| CANCELLED | 5 | Withdrawal cancelled |
