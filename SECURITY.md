# Temper Security

## Financial Security

- **Checks-effects-interactions**: State updates before value transfers
- **Pull payments**: Users call `claim_payout` — no push to multiple users
- **No duplicate claims**: Policy status transitions to PAID after claim
- **No reserved capital withdrawal**: Free capital check on all withdrawals
- **Basis-point bounds**: All percentages use integer BPS (0-10000)
- **Integer arithmetic only**: No floating-point financial calculations
- **Solvency assertions**: reserved <= gross, claimable <= limit, slash <= bond
- **Emergency pause**: `set_paused` stops new operations, cannot confiscate

## Access Control

- **Operator**: Can only manage own commitments
- **Underwriter**: Can only withdraw own shares
- **Policyholder**: Can only claim own policies
- **Observer**: Permissionless trigger, no decision authority
- **Resolver**: Cannot resolve own incident (operator address check)
- **Admin**: Cannot alter final verdicts, cannot withdraw user funds

## Web Access Security

- **Allowlisted targets**: Commitment configures target URL at creation
- **Bounded response**: Body truncated to 500 chars in contract
- **Source timeout**: Try/except around all web fetches
- **Prompt-injection defence**: Validator checks enum validity, bounded values
- **Source failure classification**: Distinguishes target vs source outage

## Non-Deterministic Execution

- **run_nondet_unsafe**: Not strict_eq (web responses differ between validators)
- **Validator checks**:
  - All enum values must be in allowed set
  - Slash cannot exceed policy bounds
  - Payout tier must exist in commitment config
  - Facts must be supported by fetched evidence
  - Instructions embedded in fetched content are ignored
- **Consensus storage**: Results stored only after consensus completes

## Observer Runner Security

- **Server-side key**: Private key never exposed to frontend
- **Permissionless fallback**: Any address can trigger due observations
- **Idempotency**: Per commitment/window tracking prevents duplicates
- **No verdict authority**: Runner submits transactions, contract decides
- **Multiple runners safe**: Duplicate triggers rejected by contract

## Known Limitations

- StudioNet is a testnet — no real financial value at risk
- TreeMap `[]` raises KeyError — all access uses `.get()` with defaults
- DynArray may have occasional validator failures (majority consensus handles)
- The `_now()` function uses message datetime, not block timestamp
