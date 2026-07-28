# Temper Architecture

## System Overview

Temper is an on-chain assurance system built on GenLayer StudioNet.

```
┌─────────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Next.js Frontend  │────▶│  GenLayer RPC    │◀────│ Observer Runner │
│   (Operator, UW,    │     │  (StudioNet)     │     │ (TypeScript)    │
│    Holder, Public)  │     └────────┬─────────┘     └────────┬────────┘
└─────────────────────┘              │                        │
                                     ▼                        │
                           ┌─────────────────┐                │
                           │ Temper Contract  │◀───────────────┘
                           │ (Intelligent     │
                           │  Contract)       │
                           │                  │──── gl.nondet.web.get() ──▶ Public Sources
                           └─────────────────┘
                                     │
                           ┌─────────────────┐
                           │ Reference Service│
                           │ (Test endpoint)  │
                           └─────────────────┘
```

## Components

### 1. Temper Contract (`contracts/temper.py`)
Single GenLayer Intelligent Contract with parallel primitive map storage.
- 44 methods (17 view, 27 write)
- Handles: commitments, bonds, vaults, policies, observations, incidents, slashing, payouts
- Non-deterministic: web fetch + consensus for adjudication
- Deployed to StudioNet at `0xEB323128a51198261Cedfd540a86129B2f490590`

### 2. Frontend (`frontend/`)
Next.js App Router with TypeScript and Tailwind CSS.
- GenLayer service layer at `src/lib/genlayer/`
- No raw SDK calls in UI components
- Observatory design — not a dashboard

### 3. Observer Runner (`observer/`)
TypeScript worker that reads active commitments and submits due observation transactions.
- Idempotent per window
- Multiple runners safe
- No decision authority

### 4. Reference Service (`reference-service/`)
Express.js server with public health endpoints for end-to-end testing.
- Admin can change service state (HEALTHY/DEGRADED/UNAVAILABLE/RECOVERED)
- Contract independently fetches public endpoints

## Storage Architecture

All contract storage uses parallel primitive maps (TreeMap) keyed by entity ID.
No nested dataclasses in maps (known StudioNet limitation).

```
commitment_operator[id]     → Address
commitment_status[id]       → u256
commitment_bond[id]         → u256
vault_gross_capital[id]     → u256
policy_holder[id]           → Address
incident_status[id]         → u256
underwriter_shares["id:addr"] → u256
```

## Data Flow

1. Operator creates commitment + deposits bond
2. Underwriters deposit coverage capital
3. Users purchase coverage (fully collateralised)
4. Observer triggers due checks via `request_observation`
5. Contract fetches public sources via `gl.nondet.web.get()`
6. Validators reach consensus on observation result
7. Confirmed breach creates incident with severity
8. Operator can challenge → re-adjudication with fresh fetch
9. Finalization applies slash to bond, creates claimable payouts
10. Policyholders pull-claim actual value

## Key Design Decisions

- **Single contract**: Cross-contract calls add complexity on StudioNet
- **Parallel primitive maps**: Avoids dataclass-in-TreeMap failure
- **JSON arrays for ID lists**: DynArray works but JSON-in-str is more reliable
- **run_nondet_unsafe**: Not strict_eq — web responses differ between validators
- **Pull payments**: No push payments to avoid gas issues
- **Fully collateralised**: Reserve full max payout per active policy
