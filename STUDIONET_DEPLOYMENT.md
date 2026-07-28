# StudioNet Deployment

## Temper Main Contract (current, production)

- **Contract**: `contracts/temper.py`
- **Address**: `0xEe05F0c3bcE19533c81dABbbc86D761cc0DF327D`
- **Deployed**: manually by the user on 2026-07-27, redeploying the same `contracts/temper.py`
  source that was verified below. Zero on-chain state (no commitments/incidents/policies) as of
  redeploy — the verification history below was run against the prior address.
- **Network**: StudioNet (chain 61999)
- **RPC**: `https://studio.genlayer.com/api`
- **Explorer**: `https://explorer-studio.genlayer.com`
- **Depends**: `py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6`
- **Schema**: 44 methods (17 view, 27 write)
- All of `frontend/.env.local`, `frontend/.env.example`, `frontend/src/lib/genlayer/config.ts`
  (fallback default), `observer/.env`, `observer/.env.example`, and `scripts/*.mjs` now point at
  this address.

### Verification history (same contract code, prior address)

- **Address**: `0xE514E721165Dba2871fe5ADd5d2447578aCc3579`
- **Deploy TX**: `0x175f02914987334bc4b0dfa1c799756c7d6c37d57d879267143ac2b4ff40dad4`
- **Result**: MAJORITY_AGREE, 5/5 AGREE, ACCEPTED
- **Linter**: OK (3 checks passed)
- **Verified**: full funded flow + full incident lifecycle (create → bond → activate →
  capital → purchase coverage → auto-incident → challenge window → finalize → slash →
  claim payout), all live on StudioNet. See LIVE_TEST_RECEIPTS.md — those tx hashes are
  real and against that address specifically, not the current one.

Prior deployments superseded during this build (kwargs-arg fix, then two rounds of the
`emit_transfer` API fix): `0xEB323128a51198261Cedfd540a86129B2f490590`,
`0xa6f69E12E178E5Da717bFCa1257c798326ebD329`, `0xa66A63621d284aD2B0D159EA5a06b4a402b123A0`,
`0x3882B71bfFe8dbC05D8F09D890FA8A3BC40696D9`, `0xE514E721165Dba2871fe5ADd5d2447578aCc3579`.

## Manual Redeploy Runbook

If you need to redeploy the contract yourself (e.g. after further edits):

```bash
genlayer network set studionet
genlayer deploy --contract contracts/temper.py
```

Then update the new contract address in all three places that hardcode it:
1. `frontend/.env.local` → `NEXT_PUBLIC_TEMPER_CONTRACT_ADDRESS`
2. `frontend/src/lib/genlayer/config.ts` → fallback default (used only if env var is missing)
3. `observer/.env` → `OBSERVER_CONTRACT_ADDRESS`

Known gotchas hit during this build (see "Key Rules" below for the full list) — the two
that will bite hardest on a fresh contract edit:
- `create_commitment` params must NOT use `*` to force keyword-only args — the CLI/SDK send
  positional args.
- Any code that sends value out of the contract must use `gl.get_contract_at(addr)`, not
  `gl.contract.get_at(addr)` (doesn't exist), and must NOT re-wrap an already-`Address`-typed
  value (e.g. `gl.message.sender_address`, or a value read from a `TreeMap[_, Address]`) in
  `Address(...)` — that throws `TypeError: cannot convert 'Address' object to bytes`.

## Deploying the frontend

`frontend/` is a standard Next.js app — deploy to Vercel (or any Node host) with:
```bash
cd frontend
vercel deploy --prod
```
Set the env vars from `frontend/.env.example` in the hosting provider's dashboard
(the `NEXT_PUBLIC_SUPABASE_*` and `NEXT_PUBLIC_TEMPER_CONTRACT_ADDRESS` values currently in
`frontend/.env.local` are safe to reuse — they're public/anon-scoped by design).

## Deploying the observer runner

`observer/` is a long-running Node process (not serverless) — needs a host that keeps a
process alive: Railway, Fly.io, a small VPS, etc.
```bash
cd observer
npm install
npm run build
node dist/index.js
```
Set the env vars from `observer/.env.example`. `OBSERVER_PRIVATE_KEY` currently in
`observer/.env` is a dedicated throwaway StudioNet key with no funds needed (StudioNet is
gasless) — reuse it or generate a fresh one with `genlayer-js`'s `generatePrivateKey()`.
`SUPABASE_SERVICE_ROLE_KEY` must stay server-side only — never ship it to the frontend.

## Deploying the reference service

`reference-service/` is a stateful Express app (in-memory mode state) used for end-to-end
testing against a controllable "fake service." Deploy anywhere that runs Node
(Railway/Fly/Render/a VPS) — it is not yet deployed publicly; all testing so far has used
`httpbin.org/status/{200,503}` as a stand-in reliably-failing/healthy endpoint instead. Once
deployed, point a commitment's `target_url` at it and use `POST /admin/set-mode` to flip it
between HEALTHY/DEGRADED/UNAVAILABLE/RECOVERED to drive real incidents through the full UI
instead of a throwaway public test endpoint.

## Probe Contract

- **Address**: `0x84c93940E2360432D7877818C93bD529E71BB8c8`
- **Deploy TX**: `0x4d986c61d71c259811441c3b689125a12a94afab593ec3e82e5a4dc9ffd237f3`

## Verified Storage Patterns

| Pattern | Status |
|---------|--------|
| TreeMap[u256, u256] | PASS |
| TreeMap[u256, Address] | PASS |
| TreeMap[u256, str] | PASS |
| TreeMap[str, u256] | PASS |
| DynArray[str] | PASS (majority) |
| Scalar u256 | PASS |
| Scalar str | PASS |
| Scalar bool | PASS |
| Scalar Address | PASS |
| @gl.public.write.payable | Schema confirmed |
| gl.nondet.web.get() | PASS (with run_nondet, NOT strict_eq) |

## Key Rules

1. TreeMap `[]` raises KeyError — always use `.get(key, default)` or `.get(key)`
2. Do NOT use `strict_eq` for web fetch — use `run_nondet_unsafe` with custom validator
3. Correct Depends hash: `1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6`
4. StudioNet is gasless — 0 GEN balance is expected
