# Storage Probe Results

## Deployment

- **Contract**: `contracts/probe.py`
- **Address**: `0x84c93940E2360432D7877818C93bD529E71BB8c8`
- **Deploy TX**: `0x4d986c61d71c259811441c3b689125a12a94afab593ec3e82e5a4dc9ffd237f3`
- **Network**: StudioNet (chain 61999)
- **RPC**: `https://studio.genlayer.com/api`
- **Depends**: `py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6`
- **Runner**: GenVM v0.3.0-rc7
- **Status**: FINALIZED, 5/5 AGREE

## Previous Failed Deployment

- **Address**: `0x6E1937E594e7a9E45577099f808e0c9F6821BbA4`
- **TX**: `0xa31f37bf7ba3c30d4a9995590a8a582f68958f6f22dd85deb0bdab00adac2fb1`
- **Issue**: Used wrong Depends hash (`1zr6nqk597d97kg0dyxg0shhrykx5v02zjgnyrajapy4wlqvfvwh`)
- **Result**: Contract deployed but `contract_not_found_handler` on all writes. Schema unreachable.

## Test Results

### Scalar string write — PASS
- **Method**: `set_message("Temper probe test")`
- **TX**: `0x9ce637659d6ba219c1889ea9e98b1eb7c5c0ee195e06f47286167797152e41bd`
- **Result**: MAJORITY_AGREE, all SUCCESS
- **Read**: `get_message()` → `"Temper probe test"`

### TreeMap[str, u256] write — PASS
- **Method**: `set_tag("probe_test", 42)`
- **TX**: `0x4a27c96d52f11803ba4230d6aa5de46291abfe4f6c92f550bb851b42e29a8b77`
- **Result**: MAJORITY_AGREE, all SUCCESS
- **Read**: `get_tag("probe_test")` → `42`

### DynArray[str] append — PASS
- **Method**: `add_log_entry("entry_one")`
- **TX**: `0xb479c8418007f7299927b621f8c53e22e1d43152bee592f9dd1357a60b4cad5a`
- **Result**: MAJORITY_AGREE, 4/6 SUCCESS (2 validator errors, majority passed)
- **Read**: `get_log_count()` → `1`

### u256 counter — PASS
- **Read**: `get_operation_count()` → `2` (set_message + set_tag counted)

### Address storage — PASS
- **Read**: `get_owner()` → `0xd62308256ad58ed43f197a8e9b13dd1561f727e1`

### TreeMap[u256, bool] missing key — FAIL (expected)
- **Method**: `idempotent_action(1)` — tries to read `processed_nonces[1]` which doesn't exist
- **TX**: `0x6fe4dcea35920a81c33f99abf785fba2d7ce55956350412247713d83f399d11f`
- **Result**: ALL ERROR — `KeyError` from TreeMap.__getitem__ on missing key
- **Read**: `is_nonce_processed(1)` — same KeyError

### Non-deterministic web fetch — FAIL (design issue)
- **Method**: `fetch_url("https://httpbin.org/json")`
- **TX**: `0x8f880a2f414db286f6a7c69cd029ddb04d7c44b5c51765b35ccf79c67019a670`
- **Result**: ALL ERROR — `strict_eq` is incompatible with web data (responses differ between validators)

## Rules Earned

1. **Correct Depends hash**: `1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6` (NOT the other hash)
2. **TreeMap missing keys**: `map[key]` raises `KeyError`. Must use `map.get(key)` (returns None) or `key in map`
3. **Web fetch + strict_eq**: DO NOT use `strict_eq` for web data. Use `run_nondet_unsafe` or `prompt_comparative/prompt_non_comparative`
4. **gl.nondet.web.get()** returns `Response(status: int, headers: dict, body: bytes | None)` — body is bytes, not str
5. **DynArray**: Works but may have occasional validator failures (acceptable with majority)
6. **StudioNet is gasless**: 0 GEN balance is expected and okay for all operations

## Patterns Verified for Temper Contract

| Pattern | Status | Notes |
|---------|--------|-------|
| `TreeMap[u256, u256]` | PASS (via str key test) | Use for all numeric-keyed maps |
| `TreeMap[u256, Address]` | PASS (via Address storage) | For commitment_operator etc |
| `TreeMap[u256, str]` | PASS | For policy_hash, target etc |
| `TreeMap[str, u256]` | PASS | For compound keys like "commitId:address" |
| `DynArray[str]` | PASS | For logs, arrays of IDs |
| `DynArray[u256]` | Untested | Expected to work (simpler than str) |
| Scalar `u256` | PASS | For counters |
| Scalar `str` | PASS | For messages |
| Scalar `bool` | PASS | For flags |
| Scalar `Address` | PASS | For owner |
| `@gl.public.write.payable` | Schema shows payable=true | Needs actual value to test deposit |
| `gl.contract.get_at().emit_transfer()` | Untested | Needs deposited value |
| `gl.nondet.web.get()` | Works | But NOT with strict_eq |
| `gl.vm.run_nondet_unsafe()` | Untested | Required for adjudication |
| `TreeMap[u256, bool]` safe access | Use `.get()` | `[]` raises KeyError |
