# Temper Handoff

## ⚠ Known Platform Limitation (read this first)

**Confirmed 2026-07-28, root-caused, NOT fixable in application code**: `emit_transfer` — the
only value-sending primitive GenVM exposes (`gl.get_contract_at(addr).emit_transfer(value=...)`)
— debits the sender's balance but **never credits a plain wallet (EOA) recipient** on StudioNet.
The value is effectively destroyed. This affects every money-out path in Temper: `purchase_coverage`
refunds, `claim_payout`, `request_bond_withdrawal`, `execute_underwriter_withdrawal`,
`withdraw_protocol_treasury` — anything that pays a real user, since real users are always EOAs.

**How this was confirmed** (see `scripts/probe4-final.mjs`-style tests, not committed —
throwaway): deployed a probe contract, sent value to a plain EOA — sender's balance dropped by the
exact amount, recipient's on-chain balance stayed `0` even after 30s. Repeated with fresh EOAs,
same result every time. Sent value to a *contract* address instead (also via `emit_transfer`) —
that one **did** work (sender debited, recipient credited). The `dir()` of the value-transfer
proxy object shows only `emit_transfer`, `emit`, `view`, `balance`, `address` — there is no
alternate API to try. This means: **contract-to-contract transfers work; contract-to-EOA
transfers silently lose the funds.** Every prior "SUCCESS" result for `claim_payout` etc. in this
repo's history reflects the contract's internal ledger updating correctly (which it does, and
which is auditable/correct) — but the actual GEN never reached anyone's wallet.

**What this means for submission**: the adjudication logic — non-deterministic web-fetch
evidence gathering, consensus, the full state machine, bps-accurate slash and payout math — is
proven correct end-to-end (see TESTING.md, 37/37 automated checks). What's not currently provable
live is the very last step (funds landing in a user's wallet), because the platform primitive for
that doesn't work for EOA recipients on StudioNet as of this date. This is worth reporting to the
GenLayer team directly — if it's a StudioNet-specific gap (vs. a mainnet one), that's exactly the
kind of thing worth flagging before others hit it too.

## Deployed Addresses

| Component | Address | Status |
|-----------|---------|--------|
| Temper Contract | `0xEe05F0c3bcE19533c81dABbbc86D761cc0DF327D` | **Current — redeployed manually by the user 2026-07-27, same contract code, zero on-chain state** |
| Probe Contract | `0x84c93940E2360432D7877818C93bD529E71BB8c8` | Deployed, partially tested |

Prior deployments superseded (kept for history): `0xa6f69E12E178E5Da717bFCa1257c798326ebD329` (kwargs/`_now()` fixes), `0xa66A63621d284aD2B0D159EA5a06b4a402b123A0`, `0x3882B71bfFe8dbC05D8F09D890FA8A3BC40696D9` (both mid-fix for the `emit_transfer` bug below), `0xE514E721165Dba2871fe5ADd5d2447578aCc3579` (the address all live-test verification below was actually run against — see LIVE_TEST_RECEIPTS.md; contract code is identical, so those results carry over, but the new address starts with no commitments/incidents/policies).

All frontend/observer config now points at the new address. If you redeploy again, update the
same three places listed in STUDIONET_DEPLOYMENT.md's runbook.

## Frontend Deployment

**Live**: https://temper-alpha.vercel.app — Vercel project `temper` under scope
`auras-projects-2f862c53`, deployed from `frontend/` via `vercel --prod`. All 6 env vars from
`frontend/.env.local` are set in the Vercel dashboard (Production environment): GenLayer chain
ID/RPC/explorer, contract address, and Supabase URL/anon key. Confirmed live and connected —
landing page shows "LIVE ON STUDIONET" with real (currently zero) system counts.

To redeploy after code changes: `cd frontend && vercel --prod`. To update env vars after a
contract redeploy: `vercel env rm <VAR> production` then `vercel env add <VAR> production`, or
just edit them in the Vercel dashboard, then redeploy.

## Network

- Chain: GenLayer StudioNet
- Chain ID: `61999`
- RPC: `https://studio.genlayer.com/api`
- Explorer: `https://explorer-studio.genlayer.com`
- Depends: `py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6`
- SDK: `genlayer-js@1.2.0`

## Current Balances

- StudioNet is gasless (0 GEN is expected)
- No bonds deposited yet on main contract
- No coverage capital deposited yet

## Passing Flows

- Contract deployment: PASS (5/5 AGREE)
- Schema retrieval: PASS (44 methods)
- Linter: PASS (3 checks)
- Probe storage tests: PASS (scalars, TreeMap, DynArray, Address)
- Probe web fetch: PASS (with run_nondet_unsafe)
- **Full funded end-to-end flow: PASS** (`scripts/test-full-flow.mjs` against `0xE514E721165Dba2871fe5ADd5d2447578aCc3579`):
  - create_commitment: PASS
  - deposit_operator_bond (payable, value received): PASS
  - activate_commitment: PASS
  - deposit_coverage_capital (payable, value received): PASS
  - purchase_coverage (payable, with overpayment refund via `emit_transfer`): PASS
  - request_observation (live web fetch, nondeterministic consensus): PASS

## Flows Requiring Live Testing

- Full observation cycle triggering an actual incident (consecutive failures past threshold)
- Incident creation and adjudication
- Challenge and re-adjudication
- Slash and payout calculation
- Claim withdrawal (`emit_transfer` path fixed, not yet exercised live)
- Underwriter withdrawal (`emit_transfer` path fixed, not yet exercised live)
- Operator bond withdrawal (`emit_transfer` path fixed, not yet exercised live)
- Admin protocol treasury withdrawal (`emit_transfer` path fixed, not yet exercised live)

## Exact Next Actions

1. Deploy reference service to a public host (Cloudflare Workers, Railway, etc.)
2. Fund a StudioNet wallet (if value testing possible)
3. Execute the full funded scenario:
   - create_commitment with reference service URL
   - deposit_operator_bond
   - activate_commitment
   - deposit_coverage_capital
   - purchase_coverage
   - request_observation (healthy)
   - Change reference service to UNAVAILABLE
   - request_observation (should trigger incident)
   - finalize_incident
   - claim_payout
4. Record all TX hashes in LIVE_TEST_RECEIPTS.md
5. Deploy observer runner
6. Deploy frontend to Vercel

## Fixed: `emit_transfer` API bug (critical)

All 5 value-distribution call sites in `contracts/temper.py` used a non-existent API:
`gl.contract.get_at(Address(x)).emit_transfer(value=...)`. This crashed with
`AttributeError: module 'genlayer.gl' has no attribute 'contract'` whenever a real payout,
refund, or withdrawal was attempted (confirmed live: `purchase_coverage`'s overpayment-refund
path failed on StudioNet).

Root cause found by deploying a probe contract (`dir(gl)` on live GenVM) — the real API is
`gl.get_contract_at(addr)`, not `gl.contract.get_at(addr)`. Additionally, `Address`-typed values
already sourced from `gl.message.sender_address` or TreeMap/scalar storage must NOT be re-wrapped
in `Address(...)` — doing so throws `TypeError: cannot convert 'Address' object to bytes`. Correct
pattern verified live:

```python
gl.get_contract_at(commitment_operator_value).emit_transfer(value=u256(amount))
```

Fixed at all 5 sites: `request_bond_withdrawal`, underwriter withdrawal, `purchase_coverage`
refund, policy payout, `withdraw_protocol_treasury`. Confirmed fixed via
`scripts/test-full-flow.mjs` (see Passing Flows above).

## Frontend Status

All 9 read-only pages are now wired to live contract data (verified in-browser against
`0xE514E721165Dba2871fe5ADd5d2447578aCc3579`): landing (`/`), `/field`, `/commitments`,
`/commitments/[id]`, `/incidents`, `/incidents/[id]`, `/coverage`, `/capital`, `/archive`.
No mock data remains on these pages — each fetches via `frontend/src/lib/genlayer/reads.ts`
(new bulk helpers `listCommitments`, `listIncidents`, `listPolicies` added since the contract
has no bulk view methods; they fetch `get_system_counts` then read each entity by ID in
parallel). Status enum codes are mapped to labels in `frontend/src/lib/genlayer/statusLabels.ts`
(kept in sync with the enums in `contracts/temper.py`).

**Wallet + write flows: done.** `frontend/src/lib/wallet/WalletProvider.tsx` implements EIP-1193
wallet connection (MetaMask-compatible) with automatic StudioNet chain add/switch
(`wallet_addEthereumChain` / `wallet_switchEthereumChain`, chain ID `0xf22f`). `ConnectButton` in
the nav wires it up globally.

**Critical fix found during this phase**: `frontend/src/lib/genlayer/writes.ts` was written
against an imagined contract API — wrong method names (`withdraw_operator_bond`,
`report_incident`, `transfer_ownership`, etc., none of which exist on-chain) and `create_commitment`
called with kwargs when the real contract requires 20 positional args. It has been fully rewritten
to match `contracts/temper.py`'s actual 27 write methods exactly (verified via direct source
inspection, not assumption). `frontend/src/lib/genlayer/index.ts` export list updated to match.

Write flows now wired into the UI:
- `/operator`: wallet-gated, lists the connected address's commitments via `get_operator_positions`,
  inline bond deposit + activate actions, and a create-commitment form (uses sensible defaults for
  the less common risk parameters, matching the values proven live in `scripts/test-full-flow.mjs`).
- `/capital`: inline deposit / request-withdrawal per vault row.
- `/commitments/[id]`: inline purchase-coverage form (limit/duration/max-premium; overpayment is
  refunded on-chain via the now-fixed `emit_transfer` path).
- `/observer`: due-observations list from `get_due_observations`, with a wallet-gated "Trigger Now"
  calling `request_observation`. The previous mock "runner health" stats (uptime, completed count)
  were removed — that data lives in the actual observer runner process (`observer/src/health.ts`),
  not the contract, and was never real.

**Incident lifecycle UI: done.** `/incidents/[id]` (the "Incident Room") now has status-gated
action buttons wired to the real contract: `request_incident_update` / `request_recovery_check`
(SUSPECTED/EVIDENCE_GATHERING), operator-only `challenge_incident` + anyone's
`finalize_provisional_verdict` (PROVISIONAL_VERDICT/CHALLENGE_WINDOW), `request_readjudication`
(READJUDICATION_PENDING), `finalize_incident` (FINAL), and a claim-payout section for the
connected wallet's own policies once settled. **Not built**: the resolver flow
(`accept_resolver_assignment`, `declare_resolver_conflict`, `submit_resolver_ruling`) — the
contract's `INC_RESOLVER_PENDING` status is defined but no code path ever transitions an
incident into it, so those three write methods are currently unreachable dead code on-chain.
Building UI for them would be pure decoration; flag this to whoever revisits adjudication design.

**Full incident lifecycle verified live end-to-end** (`scripts/drive-incident2.mjs`,
`scripts/full-cycle3.mjs`, `scripts/finalize-claim3.mjs` — a deliberately-failing test
commitment against `httpbin.org/status/503`): create → bond → activate → capital → purchase
coverage → two failing `request_observation` calls auto-opened incident #2 → challenge window
elapsed → `finalize_provisional_verdict` → `finalize_incident` (slash_amount=25 correctly
computed as 2500bps of 100 bond; policy claimable=99 correctly computed as tier-3 (10000bps)
payout on a 100 limit minus 1 deductible) → `claim_payout` succeeded, policy status moved to
PAID. Confirmed rendering live in the Incident Room UI (`/incidents/2`) with real slash/payout
numbers. See LIVE_TEST_RECEIPTS.md for tx hashes.

One oddity worth knowing: `get_contract_balance` didn't visibly decrease after the 99-GEN
`claim_payout` transfer in our test (stayed at 1803 before and after). The internal
bookkeeping (`policy_claimed`, `policy_status`) updated correctly and the transaction achieved
consensus, so the claim itself is correct — this looks like `self.balance` (a GenVM builtin) not
reflecting `emit_transfer` sends synchronously within the same block/round, consistent with the
same non-decreasing-balance behavior observed on the `purchase_coverage` refund path in earlier
testing. Not investigated further; doesn't block correctness of the on-chain state.

Verified in-browser throughout (no wallet extension installed in the test browser, so only the
"connect wallet" gated states were visually confirmed for write actions — the actual writes were
exercised via `genlayer-js` scripts, not by clicking through MetaMask). `npx tsc --noEmit` and
`npx next build` both pass with zero errors across all 12 routes.

## Backend (Supabase)

Set up and documented in SUPABASE.md — new project `Temper` (ref `qepuqyyvhailxmzqtnfr`), all 17
planned tables live with RLS, observer runner telemetry wired and verified live. Frontend has the
connection configured but doesn't query it yet (still reads GenLayer RPC directly, which is
correct at this scale). No indexer, no auth UI — see SUPABASE.md "Status" for the exact remaining
gaps.

## Unresolved Risks

- Time handling via `gl.message.raw["datetime"]` — accuracy unknown (contract now uses `time.time()` instead)
- DynArray[u256] not directly tested
- Newer runner Depends hash exists but was proven broken in earlier test
- Long JSON arrays in TreeMap[u256, str] may hit size limits
- All withdrawal/payout/refund paths (`purchase_coverage` refund, `claim_payout`,
  `request_bond_withdrawal`, `execute_underwriter_withdrawal`, `withdraw_protocol_treasury`) call
  correctly and update internal state correctly — but per the platform limitation flagged at the
  top of this file, the actual GEN transfer to the recipient's wallet does not land. This is not
  fixable in `contracts/temper.py`.
- `INC_RESOLVER_PENDING` is unreachable — the human-resolver escalation path for deadlocked
  incidents cannot currently be triggered by any code path in the contract
- (Fixed during this pass) `frontend/src/app/archive/page.tsx` filtered incidents for status
  8/9 ("SETTLED"/"RECOVERED") to show in the archive, but `finalize_incident` actually leaves
  incidents at status 7 (`SETTLEMENT_READY`) since `INC_SETTLED` is unreachable — every
  completed incident was invisible in Archive. Filter now includes status 7 too. Caught by
  driving a real incident through the full lifecycle and checking the Archive page.
- `get_contract_balance` didn't reflect a completed `claim_payout` transfer in earlier testing —
  now explained: the transfer never actually delivered, see the platform limitation at the top
- No indexer populates the `cached_*` Supabase tables yet — they exist but are empty
- No Supabase Auth UI in the frontend yet — profile/draft/notification tables exist unused
