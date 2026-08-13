# Live Test Receipts

**Read HANDOFF.md's "Known Platform Limitation" section first.** Every "claim_payout SUCCESS" /
"claimed=X" line below is accurate for the contract call and internal ledger — but the actual GEN
transfer to the recipient's wallet does not land, confirmed via direct on-chain balance checks.
Not a Temper bug — `emit_transfer` to plain wallet addresses silently loses value on StudioNet.

## Contract Deployment

Deployed 4 times during this build while fixing bugs discovered in live testing. Final address is authoritative.

| Deployment | TX Hash | Contract Address | Status | Notes |
|---|---|---|---|---|
| 1 (initial) | `0xa29aece73348aac731f5b7aaab0542d238db482cc719c9c9814720419381fa6c` | `0xEB323128a51198261Cedfd540a86129B2f490590` | ACCEPTED, 5/5 AGREE | Had kwargs-only `create_commitment` bug |
| 2 (kwargs fix) | — | `0xa6f69E12E178E5Da717bFCa1257c798326ebD329` | ACCEPTED | Fixed positional args + `_now()` |
| 3 (partial emit_transfer fix) | `0x2393898e510ac0c17f03e477eac87874a84265b66b5b792972fa40e61186035a` | `0xa66A63621d284aD2B0D159EA5a06b4a402b123A0` | ACCEPTED, 5/5 AGREE | Removed double `Address()` wrap only — still broken (wrong function name) |
| 4 (correct API, still wrong wrap) | `0x9e2ac2b5c6303b412c51aed1fab6da09274c0813907fc832695de9ac5cdcb811` | `0x3882B71bfFe8dbC05D8F09D890FA8A3BC40696D9` | ACCEPTED, 5/5 AGREE | Fixed `gl.get_contract_at`, still wrapped stored Address in `Address()` — still broken |
| 5 (final, fully fixed) | `0x175f02914987334bc4b0dfa1c799756c7d6c37d57d879267143ac2b4ff40dad4` | `0xE514E721165Dba2871fe5ADd5d2447578aCc3579` | ACCEPTED, 5/5 AGREE | Superseded — see below |
| 6 (user manual redeploy) | — | **`0xEe05F0c3bcE19533c81dABbbc86D761cc0DF327D`** | ACCEPTED | Prior production address before the review-fix redeploy |
| 7 (review-fix redeploy) | `0xd6112dd3635d11f9166a2adf3cd20997a9a600feba1cf2fce2d1913d0b584ed2` | **`0x99DE89DbD5d3c2750Cc924d59613fAdc3fe9FAbf`** | ACCEPTED / MAJORITY_AGREE | **Current production address** — evidence-derived adjudication, waiting-policy activation, partial-withdraw lifecycle |

## Seed Data (PASS)

Executed via `scripts/seed-live.mjs` against `0xEe05F0c3bcE19533c81dABbbc86D761cc0DF327D` to give
the freshly-redeployed (empty) contract one real, presentable commitment + settled incident to
show instead of an all-zero landing page.

| Step | TX Hash | Result |
|------|---------|--------|
| create_commitment ("Checkout API Uptime", commitment #1) | `0xd62c6fed1175060a54af620da4f1658df17fce557966c9e99e6d29c789829dce` | SUCCESS |
| deposit_operator_bond (1000) | `0xdd165ae914e5274b56e61586b348a38798cc9520df5827104671d24cded45110` | SUCCESS |
| activate_commitment | `0x9471494d9fef6125640e1b6a6bbd6961ea86b9ab6e3c622be6cabb93fdcec84f` | SUCCESS |
| deposit_coverage_capital (5000) | `0x8a293bfcb4162493a85346f9df14e3dd02bfddad2ce2bd612cc0211f341fb9a3` | SUCCESS |
| purchase_coverage (limit=1000, duration=7d, policy #1) | `0x67b59dee5f10058d2ce5487be9a09247c452b0f059d2ebc48e9295043f9a3dc9` | SUCCESS |
| request_observation #1 | `0x21c1feee78da171e5466b5b417db67dbd38d5b05cc1cc3d7f955af30cae8ea9b` | SUCCESS |
| request_observation #2 (threshold crossed) | `0x70267ab938c3c9d695485d8409835397a0e6f1d9a074ad99fbb41aef981d6b13` | SUCCESS — auto-opened incident #1, severity=MATERIAL, slash_bps=2500 |
| finalize_provisional_verdict | `0xd5c3d8ac40bb64dbfe6807db0a731fbb627b21d144b8d001e13cfd658a8279e3` | SUCCESS |
| finalize_incident | `0x73287edb50b866372a402368901f89b9aa45b0e6e50eab05c78c0b791d16f511` | SUCCESS — slash_amount=250 (2500bps × 1000 bond), policy claimable=990 (tier-3 × 1000 limit − 10 deductible) |
| claim_payout (policy #1) | `0x356ab8eccf0755586e3fadbca1ab752db92923c27db9f17755c9206272877d26` | SUCCESS — claimed=990 |

**Bug found while verifying this on the live site**: the landing page's "Open Incidents" stat was
bound to `get_system_counts().incidents`, which is a lifetime total (`next_incident_id - 1`), not
a currently-open count — so a fully-settled incident still showed as "1 open." Same issue existed
for "Active Commitments" (bound to lifetime `commitments` count). Fixed in `frontend/src/app/page.tsx`
by computing real counts from `listCommitments()` (filtered to ACTIVE/WATCH/INCIDENT_OPEN) and
`getActiveIncidents()` instead. Redeployed to production and confirmed correct (0 open incidents
shown for the now-settled seed incident, 1 active commitment still shown correctly).

## Funded Scenario — Full Flow (historical, prior address, PASS)

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

## Review-Fix Verification (PASS, 2026-08-13)

Current contract: `0x99DE89DbD5d3c2750Cc924d59613fAdc3fe9FAbf`
Deploy tx: `0xd6112dd3635d11f9166a2adf3cd20997a9a600feba1cf2fce2d1913d0b584ed2`

### Authenticated endpoint settlement

| Step | TX Hash | Result |
|---|---|---|
| create_commitment (#1, failing primary + failing backup) | `0x96801a7e7f4ff578eb526f10f8b6e979a4041a195204c57c24e176ec4b9ee552` | SUCCESS |
| deposit_operator_bond | `0xa2725c7bf7d6346efdb860ad23fb6521fb1011476ab97ff0a9a0e2c19acc404f` | SUCCESS |
| activate_commitment | `0xa79f2d5b2f6914c12e7b7c91b565b8ac8b2d13e4851a2cf8563de88440bd9695` | SUCCESS |
| deposit_coverage_capital | `0xd11e5cd8587a8f2b89f6bd62421bcf279fd6a8ba3984aec7cefd6948ad2efd91` | SUCCESS |
| purchase_coverage (#1) | `0x779cc09042c490250c85a9cbf1d9ab15440572576e001425318a20afd3a26ec0` | SUCCESS |
| request_observation #1 | `0x4674d9ba178c60de155661a1d38b5e05a35ff98173534ab0879e1f399dc54c13` | SUCCESS |
| request_observation #2 | `0x8e47d1e9edecc9319b58a1967c7fedd9047cf51949c67b6de479bd512b8d4c9b` | SUCCESS, opened incident #1 with `AUTHENTICATED_PRIMARY_AND_BACKUP_FAILURE` |
| finalize_provisional_verdict | `0xe54c0872629d04ba68d2ec2c928989c7b07a4f76bcfa681260836c3c553140bd` | SUCCESS |
| finalize_incident | `0x0f2927f2ad32e63062f9a72f96aee0d9306cf3076476764b7f07f15b8b82c61e` | SUCCESS, severity MATERIAL, slash 250 |
| claim_payout | `0x3f9afa9d01a1ccc282e28d7d7b93b0e77486a7dd0d4b906509ddff32b73d7a25` | SUCCESS, policy claimed 990 |

### Counter-evidence readjudication

| Step | TX Hash | Result |
|---|---|---|
| create_commitment (#3, failing primary + failing backup) | `0xf0aa94a7218d5097a737798d8f34c4376cf883ecc6290f16dbefeef029650fba` | SUCCESS |
| deposit_operator_bond | `0x70c3b99a4dd6f69e17c4761979d6576a0c44ff93b37e13efc7ec32f9fd7f07aa` | SUCCESS |
| activate_commitment | `0x11d061321a3338ce463c3baa262e4308414de9a250f70e9f171a975632bdbdac` | SUCCESS |
| deposit_coverage_capital | `0x2769e5ae14518bde27f4f380a667979798818287ada5e56fca10705ebe0d8b89` | SUCCESS |
| request_observation | `0x09b24bd4e9254fe97029d0bb128f9cd6d6576b76cbe680576e6de1aa61eb945b` | SUCCESS, opened incident #2 |
| challenge_incident (`https://httpbin.org/status/200`) | `0x750a355f49dde34f3452b9f7e57f5c1e1f511d3ece87c48445eb5010de09b69b` | SUCCESS |
| request_readjudication | `0x074c43c2a91d34906670348c5d058660732ec9e03b8123af6eadb355f95e2d05` | SUCCESS, incident #2 FINAL, severity MINOR, responsibility SHARED, evidence `AUTHENTICATED_FAILURE_WITH_COUNTER_EVIDENCE` |
