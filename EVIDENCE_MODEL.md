# Temper Evidence Model

## Primary Rule

Every decisive fact must come from public evidence fetched during GenLayer non-deterministic execution. Observer-submitted measurements are hints, never final evidence.

## Evidence Flow

```
Observer triggers request_observation(commitment_id)
    ↓
Contract enters non-deterministic block (leader_fn)
    ↓
gl.nondet.web.get(target_url) — fetches primary source
gl.nondet.web.get(backup_url) — fetches backup source
    ↓
Leader normalizes results into structured JSON
    ↓
Validator independently fetches same sources
Validator checks: enums valid, values bounded, health agrees
    ↓
Consensus reached → result stored on-chain
```

## Evidence Classes

### Endpoint Availability
- Direct HTTP response (status code, response body)
- Backup source response
- Status page content

### On-Chain State
- RPC query response
- Contract state read
- Block explorer API

## Consensus-Friendly Retrieval

Sources may change between validator requests. The contract:
- Requests bounded, relevant data (body truncated to 500 chars)
- Avoids volatile fields
- Uses multiple independent sources where available
- Distinguishes source outage from target outage
- Returns structured JSON, not raw HTML
- Does NOT use strict equality (uses custom validator)

## Verdict Schema (Compact)

```json
{
  "primary_status": "UP|DOWN|UNREACHABLE|UNKNOWN",
  "backup_status": "UP|DOWN|UNREACHABLE|UNKNOWN",
  "is_healthy": true|false,
  "event_status": "NOT_CONFIRMED|CONFIRMED|INSUFFICIENT_EVIDENCE|SOURCE_FAILURE|CONFLICTING_EVIDENCE",
  "severity": "NONE|WARNING|MINOR|MATERIAL|CRITICAL",
  "consecutive_failures": 0,
  "summary": "string"
}
```

## Prompt-Injection Defence

The validator function enforces:
- All enum values must be in the allowed set
- Boolean health status must match validator's own observation
- No invented sources or values
- Fetched content cannot alter verdict options
