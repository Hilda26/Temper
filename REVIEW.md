# Temper Review Response

> **Current status — responding to Round 2 feedback.**
> Both remaining protections are implemented, linted, deployed, and verified on-chain.
> Jump to **[Review Round 2](#review-round-2)** for the changes, the tests covering
> **activation** and **expiry**, and the transaction hashes.
>
> | Round 2 item | Status |
> |---|---|
> | Bind counter-evidence content and origin to the specific commitment | Done — verified on-chain (both accept and reject paths) |
> | Prevent wind-down / bond withdrawal while paid waiting policies outstanding | Done — verified on-chain |
> | Tests covering activation and expiry | Done — `scripts/test-review-fixes.mjs`, run live on StudioNet |
>
> Contract under review: `0x1f20C1f6132cee9E8Dd13a2114988e504E233066` (StudioNet)
> Round 1 material is retained below for history.


## Round 1 — Review Item

i was asked to address the following:

> Validators confirm endpoint reachability but do not independently enforce the incident status, severity, counter-evidence, and ruling that drive financial outcomes. Make those fields derive from authenticated service evidence, and close the waiting-policy and partial-withdrawal lifecycle gaps.

## Round 1 — Corrections Made

### 1. Evidence-derived incident outcomes

Incident financial fields are now derived from authenticated service evidence instead of being accepted from a leader-only result.

Changed in `contracts/temper.py`:

- Added deterministic derivation helpers for endpoint evidence:
  - `_derive_endpoint_decision`
  - `_event_status_value`
  - `_responsibility_value`
  - `_severity_value`
- Validators now replay both committed service endpoints:
  - primary endpoint
  - backup endpoint
- Validators independently enforce:
  - `event_status`
  - `severity`
  - `responsibility`
  - `coverage_trigger`
  - `evidence_quality`
- Incident records now store authenticated evidence labels such as:
  - `AUTHENTICATED_PRIMARY_AND_BACKUP_FAILURE`
  - `AUTHENTICATED_PRIMARY_FAILURE`
  - `AUTHENTICATED_PRIMARY_FAILING_BACKUP_HEALTHY`

### 2. Counter-evidence and readjudication enforcement

Readjudication now derives the final ruling from validator-replayed endpoint and counter-evidence checks.

Changed in `contracts/temper.py`:

- Added `_derive_readjudication_decision`.
- Validators now replay:
  - committed primary endpoint
  - committed backup endpoint
  - submitted counter-evidence URLs
- Validators independently enforce:
  - `ruling`
  - `event_status`
  - `severity`
  - `coverage_trigger`
  - `responsibility`
  - `evidence_quality`
- Counter-evidence can now produce authenticated outcomes such as:
  - `OVERTURN`
  - `REDUCE_SEVERITY`
  - `UPHOLD`
- Stored readjudication evidence includes:
  - `AUTHENTICATED_FAILURE_WITH_COUNTER_EVIDENCE`
  - `AUTHENTICATED_RECOVERY_WITH_COUNTER_EVIDENCE`

### 3. Waiting-policy lifecycle gap closed

Policies in the waiting period no longer count as active policies until the waiting period has elapsed.

Changed in `contracts/temper.py`:

- Added `activate_waiting_policy`.
- Added `_activate_waiting_policy_if_ready`.
- Added `_policy_waiting_complete`.
- `purchase_coverage` now increments `active_policy_count` only when `waiting_period == 0`.
- `get_policy_eligibility` now exposes:
  - `activation_time`
  - `waiting_remaining`
  - `can_activate`
- Settlement eligibility now checks whether the incident occurred after the policy waiting period elapsed.

Changed in frontend:

- Added `activateWaitingPolicy` write helper in `frontend/src/lib/genlayer/writes.ts`.
- Exported it from `frontend/src/lib/genlayer/index.ts`.

### 4. Partial-withdrawal lifecycle gap closed

Underwriter withdrawals now handle partial execution safely when only part of the requested withdrawal can be paid from free capital.

Changed in `contracts/temper.py`:

- `execute_underwriter_withdrawal` now calculates executable shares from currently free capital.
- Only shares actually paid out are burned.
- If free capital cannot satisfy the full withdrawal request, the remaining shares stay queued.
- Locked-by-incident withdrawals become executable only after the incident clears.
- `get_underwriter_position` now exposes `withdrawal_executable`.

## Deployment

The corrected contract was redeployed to StudioNet.

- Contract address: `0x99DE89DbD5d3c2750Cc924d59613fAdc3fe9FAbf`
- Deploy transaction: `0xd6112dd3635d11f9166a2adf3cd20997a9a600feba1cf2fce2d1913d0b584ed2`
- Result: `ACCEPTED / MAJORITY_AGREE`
- Frontend production URL: https://temper-alpha.vercel.app
- Git commit: `3bdede1 Enforce evidence-derived adjudication`

The frontend, scripts, docs, and Vercel production environment now point to the new contract address.

## Verification Performed

### Contract and app checks

- `genvm-lint check contracts/temper.py --json` passed.
- `python -m py_compile contracts/temper.py` passed.
- `npm run lint` passed.
- `npm run build` passed.
- Vercel production deployment succeeded.
- Live routes returned HTTP 200:
  - `/`
  - `/commitments`
  - `/capital`
  - `/incidents`
  - `/observer`
  - `/operator`
  - `/coverage`

Note: `pytest tests/direct -v` found zero direct tests in the repository, so there were no direct tests to execute.

### Live StudioNet verification

Authenticated endpoint settlement was verified on the new contract:

- Created a failing primary and backup endpoint commitment.
- Purchased coverage.
- Ran two observations.
- Validators recorded `AUTHENTICATED_PRIMARY_AND_BACKUP_FAILURE`.
- Incident finalized as:
  - severity: `MATERIAL`
  - event status: `CONFIRMED`
  - responsibility: `OPERATOR`
  - slash amount: `250`
- Policy payout was made claimable and claimed.

Key transactions:

- create commitment: `0x96801a7e7f4ff578eb526f10f8b6e979a4041a195204c57c24e176ec4b9ee552`
- observation 1: `0x4674d9ba178c60de155661a1d38b5e05a35ff98173534ab0879e1f399dc54c13`
- observation 2: `0x8e47d1e9edecc9319b58a1967c7fedd9047cf51949c67b6de479bd512b8d4c9b`
- finalize incident: `0x0f2927f2ad32e63062f9a72f96aee0d9306cf3076476764b7f07f15b8b82c61e`
- claim payout: `0x3f9afa9d01a1ccc282e28d7d7b93b0e77486a7dd0d4b906509ddff32b73d7a25`

Counter-evidence readjudication was also verified live:

- Created a failing endpoint commitment.
- Opened an incident.
- Challenged with counter-evidence URL: `https://httpbin.org/status/200`
- Requested readjudication.
- Validators recorded `AUTHENTICATED_FAILURE_WITH_COUNTER_EVIDENCE`.
- Incident was finalized as:
  - ruling: `REDUCE_SEVERITY`
  - severity: `MINOR`
  - responsibility: `SHARED`
  - event status: `CONFIRMED`

Key transactions:

- create commitment: `0xf0aa94a7218d5097a737798d8f34c4376cf883ecc6290f16dbefeef029650fba`
- request observation: `0x09b24bd4e9254fe97029d0bb128f9cd6d6576b76cbe680576e6de1aa61eb945b`
- challenge incident: `0x750a355f49dde34f3452b9f7e57f5c1e1f511d3ece87c48445eb5010de09b69b`
- request readjudication: `0x074c43c2a91d34906670348c5d058660732ec9e03b8123af6eadb355f95e2d05`

## Round 1 — Summary

Temper now uses GenLayer validators for trustless adjudication of the fields that drive financial outcomes. Endpoint failures, counter-evidence, readjudication rulings, severity, responsibility, and coverage triggers are recomputed by validators from authenticated committed evidence and checked against deterministic derivation rules before state changes are accepted.

The waiting-policy and partial-withdrawal lifecycle gaps have also been closed.

---

# Review Round 2

## Review Item

> The initial observation checks and partial-withdrawal accounting are improved, but two
> requested protections remain incomplete. Bind counter-evidence content and origin to the
> specific commitment, and prevent wind-down or bond withdrawal while paid waiting policies
> remain outstanding, with tests covering activation and expiry.

Both gaps were reproduced in the code before fixing, and both are now closed.

## 1. Counter-evidence bound to the commitment (content + origin)

**The gap.** `challenge_incident` and `submit_counter_evidence` accepted an arbitrary URL
string with no relationship to the commitment under adjudication. An operator could submit
`https://operator-controlled-alibi.example.net/status` — a domain they own — and
`request_readjudication` would fetch it and potentially return `OVERTURN`. The operator could
manufacture their own acquittal.

**The fix** (`contracts/temper.py`):

- `_url_origin(url)` — parses `scheme://host` from an http(s) URL, lowercased, stripping
  userinfo and port. Returns `""` for anything malformed.
- `_declared_hosts(cid)` — the hosts the commitment itself declared at creation
  (`target_url`, `backup_url`). These are immutable after creation, so they cannot be
  retargeted at submission time.
- `_validate_counter_evidence(cid, urls)` — every submitted URL must parse **and** be served
  by a declared host. Rejects with `EVIDENCE_ORIGIN_NOT_BOUND`, `INVALID_EVIDENCE_URL`,
  `EMPTY_COUNTER_EVIDENCE`, or `TOO_MANY_EVIDENCE_URLS` (cap `MAX_COUNTER_EVIDENCE_URLS = 5`).
  A batch containing even one foreign origin is rejected wholesale. Returns a normalized,
  de-duplicated string.
- **Content binding**: new storage `incident_counter_evidence_commitment` and
  `incident_counter_evidence_version` record which commitment, at which commitment version,
  the evidence was filed against. `_require_counter_evidence_binding` enforces this on
  `submit_counter_evidence` and again on `request_readjudication`, so evidence accepted for
  one commitment can never be replayed into another's adjudication
  (`EVIDENCE_COMMITMENT_MISMATCH`) or survive a re-versioning (`EVIDENCE_VERSION_STALE`).

## 2. Wind-down / bond withdrawal blocked while paid policies are outstanding

**The gap.** `purchase_coverage` deliberately does *not* increment `active_policy_count` when
a waiting period applies — the policy sits in `POL_PENDING_WAIT`. But `begin_wind_down` had
**no policy check at all**, and `request_bond_withdrawal` checked only `active_policy_count`.
An operator could sell coverage with a waiting period, collect the premiums, then immediately
wind down and withdraw the entire bond, leaving paid policyholders with zero backing.

**The fix** (`contracts/temper.py`):

- `_outstanding_policy_count(cid, now)` — counts policies that are `POL_ACTIVE` **or**
  `POL_PENDING_WAIT` and still inside their term. Paid-but-waiting policies are deliberately
  included: the premium is already collected, so the bond must stay locked even though the
  policy is not yet claimable.
- `_expire_policy(...)` — policies past their term are expired in place, their reserved
  capital released, and `active_policy_count` decremented, so genuinely lapsed policies never
  block the operator forever.
- Both `begin_wind_down` and `request_bond_withdrawal` now reject with `OUTSTANDING_POLICIES`.
- New permissionless `sweep_expired_policies(commitment_id)` lets anyone clear stale
  reservations.

## Tests — activation and expiry

`scripts/test-review-fixes.mjs` exercises all of the above against a live StudioNet
deployment. Every assertion is an on-chain call.

**Deployment:** `0x1f20C1f6132cee9E8Dd13a2114988e504E233066`
(deploy tx `0x3d814f0961cb4150716a64448e9f7be2e206c63e264bfe4f93d8f587a2498148`)

Verified on-chain:

| Behaviour | Result |
|---|---|
| Policy enters `PENDING_WAIT`, premium paid | PASS (`status=0`) |
| `active_policy_count` excludes the waiting policy | PASS (`=0`) |
| `begin_wind_down` **rejected** while paid WAITING policy outstanding | PASS (rejected on-chain) |
| **ACTIVATION** — `activate_waiting_policy` after waiting elapses | PASS `0x11d4d54be41c026297d4a68dd6add154dc5e5810e1fad411ef6deb5e0b15eee6` |
| Policy transitions to `ACTIVE`; count incremented | PASS (`status=1`, `count=1`) |
| `begin_wind_down` **rejected** while ACTIVE policy outstanding | PASS (rejected on-chain) |
| Purchase reserves capital | PASS (`reserved_capital=100`) |
| **EXPIRY** — `sweep_expired_policies` past term | PASS `0xe2482dec0a831701d35d760ba5d6752b30b9968762678cb138f528f33c1dcd30` |
| Policy becomes `EXPIRED` | PASS (`status=2`) |
| Expiry releases reserved capital | PASS (`100 -> 0`) |
| `active_policy_count` decremented on expiry | PASS (`=0`) |
| `begin_wind_down` **allowed** once nothing outstanding | PASS `0x2fee16c677a023aa8e4b027e22bd73153394232c65293dbc70317dcf5bccdf62` |
| `request_bond_withdrawal` allowed | PASS `0x44128acefcdd312182136ecb181e6b7372bf9e899ea3427e62f8e4ee3f76b8c2` |
| Counter-evidence from FOREIGN origin **rejected** | PASS (rejected on-chain) |
| Mixed batch containing a foreign origin **rejected** | PASS (rejected on-chain) |
| Malformed evidence URL **rejected** | PASS (rejected on-chain) |
| Empty counter-evidence **rejected** | PASS (rejected on-chain) |
| Counter-evidence from DECLARED origin **accepted** | PASS `0xab2cf8b92021fea6c2f2a2ee61dfff0ef1234b4f637e24dc55390c61969cf2ba` |
| Accepted evidence stored and bound to the commitment | PASS (`counter_evidence="https://httpbin.org/status/200"`) |
| Appending a FOREIGN origin still **rejected** | PASS (rejected on-chain) |
| Appending a DECLARED origin accepted | PASS `0xaf2b8c2e5f2da7482c9994ceee5573e24a7afda2945db963ef13d62cc2d0e074` |

Both directions are covered: foreign/malformed/empty evidence is refused, and legitimate
evidence from a declared host is accepted and correctly bound — so the origin check is
confirmed restrictive without being over-restrictive.

### Testing caveats (stated plainly)

- **Error codes are asserted as "rejected", not by string.** StudioNet does not return GenVM
  `stderr` for reverted calls via `waitForTransactionReceipt`, even with
  `fullTransaction: true`. The suite therefore asserts the security property that matters —
  the call was rejected and state was left unchanged — and prints each rejected tx hash so the
  specific `UserError` can be confirmed with `genlayer receipt <tx> --stderr`.
- **StudioNet rate limits** (30 req/min, 500 req/hr) forced request pacing and 60s backoffs.
  Two assertions in intermediate runs failed as *timing artifacts* — a 15s policy term expired
  during a 60s backoff, so a wind-down that should have been blocked was legitimately allowed.
  The suite was restructured to use a 900s term for blocking assertions (which no backoff can
  expire) and a short term purchased immediately before the expiry assertion.

`genvm-lint check contracts/temper.py --json` passes (46 methods; only the pre-existing
`time.time()` W002 advisory).
