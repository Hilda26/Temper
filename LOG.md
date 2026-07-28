# Temper Build Log

## Found

- GenLayer StudioNet deploys work with Depends hash `1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6`
- TreeMap `[]` raises KeyError — must use `.get()` with defaults
- `strict_eq` does NOT work for web fetch — responses differ between validators
- DynArray works but may have occasional validator failures (majority still passes)
- `genlayer-js` npm package versioning: spec says 1.18 but actual latest is 1.2.0
- StudioNet is gasless — 0 GEN balance is expected and okay

## Fixed

- Probe contract: Changed from `strict_eq` to `run_nondet_unsafe` for web fetch
- Probe contract: Fixed TreeMap access to use `.get()` instead of `[]`
- Temper contract: Used correct Depends hash from start
- Temper contract: All TreeMap access uses `.get(key)` or `.get(key, default)`
- Temper contract: Removed non-ASCII box-drawing characters (cp1252 encoding issue with linter)

## Decision

- Single contract architecture instead of multi-contract (avoids cross-contract complexity on StudioNet)
- Parallel primitive maps for all storage (avoids dataclass-in-TreeMap failure)
- JSON arrays stored as strings for ID lists (more reliable than nested DynArray)
- `run_nondet_unsafe` with custom validator for all adjudication
- Pull payment pattern for all value distribution
- Fully collateralised: reserve full max payout per active policy

## Rule Earned

- Always use `.get()` for TreeMap access — never `[]`
- Never use `strict_eq` for web-fetched data
- Test every storage pattern on StudioNet before using in production contract
- Keep contract source ASCII-only (linter uses system encoding)

## Evidence

- Probe deployed: TX `0x4d986c61d71c259811441c3b689125a12a94afab593ec3e82e5a4dc9ffd237f3`
- Temper deployed: TX `0xa29aece73348aac731f5b7aaab0542d238db482cc719c9c9814720419381fa6c`
- Schema verified: 44 methods (17 view, 27 write)
- Linter: OK (3 checks passed)

## Remaining Uncertainty

- Payable deposit with actual value not yet tested on main contract
- Value withdrawal (emit_transfer) not yet tested on main contract
- DynArray[u256] not directly tested (expected to work)
- Time handling via `gl.message.raw["datetime"]` — accuracy on StudioNet unclear
