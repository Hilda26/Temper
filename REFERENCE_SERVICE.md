# Temper Reference Service

## Purpose

A small public HTTP service used for end-to-end testing. The GenLayer contract fetches its public endpoints to determine if the monitored service is operational. An admin can change the service state to simulate failures.

## Public Endpoints (No Auth)

### GET /health
```json
{
  "status": "ok",
  "service_id": "temper-ref-001",
  "mode": "HEALTHY",
  "version": 1,
  "last_transition": "2026-07-20T15:00:00.000Z"
}
```
Returns 503 when mode is UNAVAILABLE.

### GET /status
Same fields plus uptime, operational flag, degraded flag.

### GET /commitment-state
```json
{
  "operational": true,
  "mode": "HEALTHY",
  "observation_version": 1,
  "last_transition_time": "2026-07-20T15:00:00.000Z"
}
```
Always returns 200 — contract reads `operational` field.

## Admin Endpoint

### POST /admin/set-mode
Requires `x-admin-secret` header.

```json
{"mode": "HEALTHY|DEGRADED|UNAVAILABLE|RECOVERED"}
```

Changes actual public service state. Increments observation_version.

## Modes

| Mode | /health | /commitment-state.operational |
|------|---------|-------------------------------|
| HEALTHY | 200 | true |
| DEGRADED | 200 | true (degraded flag set) |
| UNAVAILABLE | 503 | false |
| RECOVERED | 200 | true |

## Deployment

```bash
cd reference-service
npm install
cp .env.example .env
# Set ADMIN_SECRET
npm start  # Port 3001
```

## Key Rule

The contract does NOT receive hardcoded verdicts. It independently fetches these public endpoints and infers commitment state from the responses and the commitment's configured policy.
