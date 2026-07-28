# Live Test Receipts

## Contract Deployment

Deployed 4 times during this build while fixing bugs discovered in live testing. Final address is authoritative.

| Deployment | TX Hash | Contract Address | Status | Notes |
|---|---|---|---|---|
| 1 (initial) | `0xa29aece73348aac731f5b7aaab0542d238db482cc719c9c9814720419381fa6c` | `0xEB323128a51198261Cedfd540a86129B2f490590` | ACCEPTED, 5/5 AGREE | Had kwargs-only `create_commitment` bug |
| 2 (kwargs fix) | — | `0xa6f69E12E178E5Da717bFCa1257c798326ebD329` | ACCEPTED | Fixed positional args + `_now()` |
| 3 (partial emit_transfer fix) | `0x2393898e510ac0c17f03e477eac87874a84265b66b5b792972fa40e61186035a` | `0xa66A63621d284aD2B0D159EA5a06b4a402b123A0` | ACCEPTED, 5/5 AGREE | Removed double `Address()` wrap only — still broken (wrong function name) |
| 4 (correct API, still wrong wrap) | `0x9e2ac2b5c6303b412c51aed1fab6da09274c0813907fc832695de9ac5cdcb811` | `0x3882B71bfFe8dbC05D8F09D890FA8A3BC40696D9` | ACCEPTED, 5/5 AGREE | Fixed `gl.get_contract_at`, still wrapped stored Address in `Address()` — still broken |
| 5 (final, fully fixed) | `0x175f02914987334bc4b0dfa1c799756c7d6c37d57d879267143ac2b4ff40dad4` | **`0xE514E721165Dba2871fe5ADd5d2447578aCc3579`** | ACCEPTED, 5/5 AGREE | **Current production address** |

## Funded Scenario — Full Flow (PASS)

Executed via `scripts/test-full-flow.mjs` against `0xE514E721165Dba2871fe5ADd5d2447578aCc3579`.
Random operator account created per run, no pre-funding required (StudioNet is gasless; value
transfers between accounts still move real GEN balances on the contract).

| Step | TX Hash | Result |
|------|---------|--------|
| create_commitment | `0xc368f4e46888fd8943a2729081b860826782cbfb971eb417fd2bfc2b94130993` | SUCCESS |
| deposit_operator_bond (payable, 100) | `0xa420f8e5da5efbe282933438a78be43616f83a413ce1a1f6ae9a875687dacd05` | SUCCESS |
| activate_commitment | `0x2c9c7a7fb3c6438d12a64415b089db6fb610877827548dc368174472e2b2825d` | SUCCESS on-chain (client-side receipt wait timed out; confirmed via later state read showing status=ACTIVE) |
| deposit_coverage_capital (payable, 500) | `0xd9727996ee8e5fe7a19b663b53b289d586f3e1ceed87e9b083209a9ca95b88ab` | SUCCESS |
| purchase_coverage (payable, 50; premium=1, refund=49 via `emit_transfer`) | `0x9b4b8093ec96d575852f5def2fa5ee520ad979e0c9440170ced23955c01ba2f2` | SUCCESS — reserved_capital 0→100, refund path exercised and confirmed working |
| request_observation (live web fetch to httpbin.org, nondeterministic consensus) | `0x1306f55e17edddf89f4ea3f478adf331c21badde2d18c6125ef95cc6ba0ea0cc` | SUCCESS — observation recorded ANOMALY/WARNING (target returned DOWN on both primary/backup checks at fetch time) |

Contract balance after run: 650 (100 bond + 500 capital + 50 premium - refund settled on-chain).

## Full Incident Lifecycle (PASS)

Executed via `scripts/drive-incident2.mjs` → `scripts/full-cycle3.mjs` → `scripts/finalize-claim3.mjs`
against `0xE514E721165Dba2871fe5ADd5d2447578aCc3579`. Commitment #3 created with a deliberately
failing target (`httpbin.org/status/503`), 5s observation interval, failure_threshold=2, 15s
challenge window — tuned for fast iteration, not production values.

| Step | TX Hash | Result |
|------|---------|--------|
| create_commitment (commitment #3) | (see `drive-incident2.mjs` output) | SUCCESS |
| deposit_operator_bond (100) | — | SUCCESS |
| activate_commitment | — | SUCCESS |
| deposit_coverage_capital (500) | — | SUCCESS |
| purchase_coverage (limit=100, duration=86400, value=50) | — | SUCCESS, policy #3 |
| request_observation #1 (DOWN, consecutive_failures→1) | `0xcb00527c31076b70d00df5e4350368029f7bf8083538d52a62eb1c1e9c6cb073` | SUCCESS |
| request_observation #2 (DOWN, threshold crossed) | `0xbaec4b45a0e68ad434314e36f249161059ba5d84bd297577d239dc2f745016f9` | SUCCESS — auto-opened incident #2, commitment status→INCIDENT_OPEN, severity=MATERIAL, slash_bps=2500 |
| finalize_provisional_verdict (incident #2) | `0x44f4dfc023fe64809590016aefc437892125b7f55ebbd832fcd096cfbafd3e76` | SUCCESS — challenge window elapsed, status→FINAL |
| finalize_incident (incident #2) | `0x24b1606cabdac66dae316b008d318d03afc0717d9c6e0ac61e7ad2a537f33c0f` | SUCCESS — slash_amount=25 (2500bps × 100 bond), policy #3 claimable=99 (tier-3/10000bps × 100 limit − 1 deductible), status→SETTLEMENT_READY |
| claim_payout (policy #3) | `0x03e415a1f0ac34b59793550889797a0272c547f298e35bfc956f7ddd72793420` | SUCCESS — policy status→PAID, claimed=99 |

Verified in the Incident Room UI at `/incidents/2` — rendered live slash BPS (2500), slash amount
(25 GEN), payout tier (3), and full decision-sequence progress matching on-chain state exactly.

An earlier dry run (`scripts/drive-incident.mjs` + `scripts/trigger-obs.mjs`, commitment #2,
incident #1) proved the same auto-incident-opening mechanism using a randomly generated account
whose private key wasn't saved, so it couldn't be carried through to `claim_payout` — hence the
second full run above with a saved key.

### Not yet exercised live

- Underwriter withdrawal (`request_underwriter_withdrawal` / `execute_underwriter_withdrawal`)
- Operator bond withdrawal (`request_bond_withdrawal` / `execute_bond_withdrawal`)
- Admin protocol treasury withdrawal (`withdraw_protocol_treasury`)
- The `challenge_incident` → `request_readjudication` path (our test incident was never
  challenged — it went straight through the unchallenged finalize path)
- Resolver flow — confirmed unreachable, see HANDOFF.md

## Bug Found and Fixed: `emit_transfer` API

Original code called `gl.contract.get_at(Address(x)).emit_transfer(value=...)` — `gl.contract`
does not exist in the GenVM Python runtime (confirmed via `dir(gl)` on a live probe contract).
Correct API is `gl.get_contract_at(x)`, and `x` must NOT be re-wrapped in `Address(...)` if it
already came from `gl.message.sender_address` or contract storage (re-wrapping throws
`TypeError: cannot convert 'Address' object to bytes`). See `HANDOFF.md` for full details.

## Supabase Telemetry (PASS)

Ran `observer/src/index.ts` locally against the live contract for ~20s. Confirmed via direct
REST query against the new Supabase project (`qepuqyyvhailxmzqtnfr`):

- `observer_instances`: one row, `instance_name=observer-primary`,
  `wallet_address=0x4fB7Be1161A835E1Fe5A7dEc07bF834413491B60`, `status=ONLINE`.
- `observer_runs`: one row recording the real `request_observation` tx
  (`0xcd4763624a972cbc5d199bb0714f2d03d55d1153fc81a3764350e811a7312244`) with `result=SUCCESS`.

## Explorer Links

- Contract: https://explorer-studio.genlayer.com/address/0xE514E721165Dba2871fe5ADd5d2447578aCc3579
- Deploy TX: https://explorer-studio.genlayer.com/tx/0x175f02914987334bc4b0dfa1c799756c7d6c37d57d879267143ac2b4ff40dad4
