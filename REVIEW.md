# Temper Review Response

## Review Item

i was asked to address the following:

> Validators confirm endpoint reachability but do not independently enforce the incident status, severity, counter-evidence, and ruling that drive financial outcomes. Make those fields derive from authenticated service evidence, and close the waiting-policy and partial-withdrawal lifecycle gaps.

## Corrections Made

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

## Submission Summary

Temper now uses GenLayer validators for trustless adjudication of the fields that drive financial outcomes. Endpoint failures, counter-evidence, readjudication rulings, severity, responsibility, and coverage triggers are recomputed by validators from authenticated committed evidence and checked against deterministic derivation rules before state changes are accepted.

The waiting-policy and partial-withdrawal lifecycle gaps have also been closed.
