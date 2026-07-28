# Temper Observer Runner

## Purpose

The observer runner is a TypeScript worker that reads active commitments from the deployed Temper contract and submits observation transactions when checks are due.

## Design Principles

- **Permissionless**: Any address can trigger a due observation
- **No decision authority**: Runner submits transactions; contract decides verdicts
- **Idempotent**: Tracks processed windows to prevent duplicates
- **Multi-runner safe**: Duplicate triggers rejected by contract
- **Server-side key**: Private key never exposed to frontend

## Architecture

```
observer/
├── src/
│   ├── index.ts     # Main runner loop
│   ├── client.ts    # GenLayer client setup
│   └── health.ts    # Health endpoint (port 3002)
├── package.json
├── tsconfig.json
└── .env.example
```

## Configuration

```env
OBSERVER_RPC_URL=https://studio.genlayer.com/api
OBSERVER_CONTRACT_ADDRESS=0xEB323128a51198261Cedfd540a86129B2f490590
OBSERVER_PRIVATE_KEY=<server-side-only>
OBSERVER_INTERVAL_MS=60000
```

## Runner Loop

1. Call `get_due_observations()` (view) → array of commitment IDs
2. For each due commitment:
   a. Check idempotency key (commitmentId:windowTimestamp)
   b. Submit `request_observation(commitment_id)` (write)
   c. Track pending transaction
   d. Record result
3. Exponential backoff on RPC failures
4. Health status available at `/health`

## Idempotency Key

```
chain_id + contract_address + commitment_id + window_timestamp
```

## Health Endpoint

```
GET :3002/health
{
  "status": "running",
  "last_run": "2026-07-20T15:00:00Z",
  "pending_txs": 0,
  "processed_windows": 42
}
```

## Deployment

```bash
cd observer
npm install
cp .env.example .env
# Set OBSERVER_PRIVATE_KEY
npm start
```
