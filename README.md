# Temper

Temper is an on-chain assurance system built on GenLayer StudioNet. Operators create service commitments, underwriters collateralize coverage, policyholders buy protection, and observer-triggered web checks drive incident adjudication, slashing, and claim accounting.

Live frontend: https://temper-alpha.vercel.app  
Current StudioNet contract: `0x99DE89DbD5d3c2750Cc924d59613fAdc3fe9FAbf`

## Repo Layout

| Path | Purpose |
| --- | --- |
| `contracts/temper.py` | GenLayer Intelligent Contract for commitments, capital, incidents, and payouts |
| `frontend/` | Next.js app for operators, underwriters, holders, observers, and public views |
| `observer/` | TypeScript runner that submits due observation transactions |
| `reference-service/` | Toggleable Express service for end-to-end incident testing |
| `supabase/` | Supabase schema for cache, UX, and observer telemetry tables |
| `scripts/` | StudioNet flow, balance, observer, and lifecycle test scripts |
| `*.md` | Architecture, deployment, testing, security, and handoff notes |

## Quick Start

Frontend:

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Observer runner:

```bash
cd observer
npm install
cp .env.example .env
npm run dev
```

Reference service:

```bash
cd reference-service
npm install
npm run dev
```

## Environment

The frontend needs GenLayer public config plus optional Supabase anon config:

```bash
NEXT_PUBLIC_GENLAYER_CHAIN_ID=61999
NEXT_PUBLIC_GENLAYER_RPC_URL=https://studio.genlayer.com/api
NEXT_PUBLIC_GENLAYER_EXPLORER_URL=https://explorer-studio.genlayer.com
NEXT_PUBLIC_TEMPER_CONTRACT_ADDRESS=0x99DE89DbD5d3c2750Cc924d59613fAdc3fe9FAbf
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

The observer also needs a StudioNet private key and Supabase service role key if telemetry is enabled. Keep both server-side only.

## Useful Commands

```bash
# Frontend checks
cd frontend
npm run lint
npm run build

# Observer build
cd observer
npm run build

# Contract lint
genvm-lint check contracts/temper.py --json

# Local contract tests, where available
pytest tests/direct/ -v
gltest tests/integration/ -v -s
```

## Status Notes

- Contract schema: 44 methods, with live StudioNet verification recorded in `LIVE_TEST_RECEIPTS.md`.
- Supabase schema is implemented; frontend still reads the GenLayer contract directly.
- The observer records telemetry to Supabase when configured.
- StudioNet has shown platform-level limitations around `emit_transfer` to plain wallet addresses; see `HANDOFF.md` before relying on live wallet balance movement.

## More Detail

- `ARCHITECTURE.md` - system design and data flow
- `STUDIONET_DEPLOYMENT.md` - contract, frontend, observer, and reference-service deployment
- `TESTING.md` - test hierarchy and verified flows
- `SUPABASE.md` - database schema and current integration status
- `HANDOFF.md` - current state, known risks, and next actions
