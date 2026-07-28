# Temper Commitment Schema

## Identity Fields

| Field | Type | Description |
|-------|------|-------------|
| commitment_id | u256 | Auto-incremented unique ID |
| operator | Address | Creator and responsible party |
| service_name | str | Human-readable service name |
| description | str | Public description of the promise |
| template | u256 | 0 = ENDPOINT, 1 = ONCHAIN_STATE |
| version | u256 | Incremented on material changes |

## Observation Policy

| Field | Type | Description |
|-------|------|-------------|
| target_url | str | Primary URL to monitor |
| backup_url | str | Secondary source URL |
| observation_interval | u256 | Seconds between checks |
| grace_period | u256 | Seconds before breach escalation |
| failure_threshold | u256 | Consecutive failures for MATERIAL breach |

## Breach Policy

| Field | Type | Description |
|-------|------|-------------|
| slash_ladder | str (JSON) | Severity → slash BPS mapping |
| max_cumulative_slash_bps | u256 | Maximum total slash as BPS of original bond |
| challenge_window | u256 | Seconds operator has to challenge |

### Default Slash Ladder
```json
{"1": 0, "2": 500, "3": 2500, "4": 10000}
```
Severity codes: 1=WARNING, 2=MINOR, 3=MATERIAL, 4=CRITICAL

## Coverage Policy

| Field | Type | Description |
|-------|------|-------------|
| payout_tiers | str (JSON) | Severity → payout BPS of policy limit |
| max_policy_limit | u256 | Maximum coverage per policy |
| min_policy_limit | u256 | Minimum coverage per policy |
| max_policy_duration | u256 | Maximum policy duration (seconds) |
| min_policy_duration | u256 | Minimum policy duration (seconds) |
| base_premium_bps | u256 | Annual premium rate in BPS |
| deductible_bps | u256 | Deductible as BPS of policy limit |
| waiting_period | u256 | Seconds before new policy covers incidents |

### Default Payout Tiers
```json
{"0": 0, "1": 1000, "2": 3500, "3": 10000}
```

## Immutability After Activation

After `activate_commitment`, the operator cannot change:
- target_url, backup_url
- Thresholds, intervals, grace periods
- Slash ladder, payout tiers
- Coverage limits, premiums, deductibles
- Challenge window
