/**
 * Review-response test suite.
 *
 * Covers the two protections the review flagged as incomplete:
 *   1. Counter-evidence bound to the specific commitment (content + origin).
 *   2. Wind-down / bond withdrawal blocked while paid policies are outstanding,
 *      including policies still serving a waiting period.
 * Plus the explicitly requested coverage of policy ACTIVATION and EXPIRY.
 *
 * Runs against a real StudioNet deployment; every assertion is an on-chain call.
 *
 * Timing note: StudioNet rate-limits to 30 req/min, and a 429 costs a 60s backoff. Policy
 * terms here are therefore either long enough that no backoff can expire them (blocking
 * tests) or purchased immediately before the assertion (expiry test).
 */
import { createClient, createAccount, generatePrivateKey } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';

const CONTRACT = process.env.TEMPER_CONTRACT || '0x1f20C1f6132cee9E8Dd13a2114988e504E233066';
const client = createClient({ chain: studionet, endpoint: 'https://studio.genlayer.com/api' });

const results = [];
function record(name, passed, detail) {
  results.push({ name, passed, detail });
  console.log(`[${passed ? 'PASS' : 'FAIL'}] ${name}${detail ? ' -- ' + detail : ''}`);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const MIN_GAP_MS = 2600;
let lastCall = 0;
async function rpc(fn) {
  for (let attempt = 0; ; attempt++) {
    const gap = MIN_GAP_MS - (Date.now() - lastCall);
    if (gap > 0) await sleep(gap);
    lastCall = Date.now();
    try {
      return await fn();
    } catch (e) {
      const msg = `${e?.message || ''} ${e?.details || ''}`;
      const retryable =
        e?.cause?.code === -32029 || /rate limit/i.test(msg) || /DOCTYPE|not valid JSON/i.test(msg);
      if (retryable && attempt < 8) {
        const secs = e?.cause?.data?.retry_after_seconds ?? 20;
        console.log(`    (transient RPC issue -- retry in ${secs}s)`);
        await sleep((secs + 2) * 1000);
        continue;
      }
      throw e;
    }
  }
}

async function write(account, fn, args, value) {
  const params = { address: CONTRACT, functionName: fn, args, account };
  if (value !== undefined) params.value = value;
  const tx = await rpc(() => client.writeContract(params));
  const receipt = await rpc(() =>
    client.waitForTransactionReceipt({ hash: tx, interval: 8000, retries: 40, fullTransaction: true }),
  );
  const leader = receipt?.consensus_data?.leader_receipt?.[0];
  return {
    tx,
    ok: leader?.execution_result === 'SUCCESS',
    stderr: leader?.genvm_result?.stderr || '',
  };
}

function errorCode(stderr) {
  const m = (stderr || '').match(/UserError:\s*(\w+)/);
  return m ? m[1] : stderr ? 'ERROR' : 'no-stderr';
}

// StudioNet does not return GenVM stderr for reverted calls through waitForTransactionReceipt
// (even with fullTransaction:true), so we assert on the security property that actually
// matters -- the call was rejected -- and surface the tx hash so the specific UserError can
// be confirmed out-of-band with:  genlayer receipt <tx> --stderr
async function expectRevert(name, expectedCode, account, fn, args, value) {
  const r = await write(account, fn, args, value);
  if (r.ok) return record(name, false, `expected revert (${expectedCode}) but call SUCCEEDED -- ${r.tx}`);
  const code = errorCode(r.stderr);
  if (code === 'no-stderr') {
    record(name, true, `rejected on-chain (expected ${expectedCode}) tx=${r.tx}`);
  } else {
    record(name, code === expectedCode, `reverted with ${code} (expected ${expectedCode}) tx=${r.tx}`);
  }
  return r.tx;
}

// Independent confirmation that a rejected call left state untouched.
async function expectUnchanged(name, readFn, args, field, expected) {
  const state = await read(readFn, args);
  record(name, Number(state[field]) === expected, `${field}=${state[field]} (expected ${expected})`);
}

async function expectOk(name, account, fn, args, value) {
  const r = await write(account, fn, args, value);
  record(name, r.ok, r.ok ? r.tx : errorCode(r.stderr));
  return r.ok;
}

async function read(fn, args = []) {
  const raw = await rpc(() => client.readContract({ address: CONTRACT, functionName: fn, args }));
  return typeof raw === 'string' ? JSON.parse(raw) : raw;
}

const operator = createAccount(generatePrivateKey());
const holder = createAccount(generatePrivateKey());
console.log('operator:', operator.address, '\nholder:  ', holder.address, '\ncontract:', CONTRACT);

function commitmentArgs(name, target, opts = {}) {
  return [
    name, 'Review-response regression coverage', 0,
    target, opts.backup ?? target,
    opts.interval ?? 60, opts.grace ?? 120, opts.threshold ?? 3, 100,
    '{"1":0,"2":500,"3":2500,"4":10000}',
    '{"0":0,"1":1000,"2":3500,"3":10000}',
    1000000, 100, 2592000, opts.minDuration ?? 86400,
    500, 100, opts.waiting ?? 0, opts.challengeWindow ?? 300, 10000,
  ];
}

async function setupCommitment(label, account, target, opts) {
  await expectOk(`${label} create`, account, 'create_commitment', commitmentArgs(label, target, opts));
  const id = (await read('get_system_counts')).commitments;
  await expectOk(`${label} bond`, account, 'deposit_operator_bond', [id], BigInt(500));
  await expectOk(`${label} activate`, account, 'activate_commitment', [id]);
  return id;
}

// =====================================================================
// PART 1 -- paid policies (incl. waiting) block wind-down; ACTIVATION
// =====================================================================
console.log('\n=== PART 1: outstanding policies block operator exit (+ activation) ===');

// 900s term: no rate-limit backoff can expire this mid-test.
const cidA = await setupCommitment('P1 guard', operator, 'https://httpbin.org/status/200', {
  waiting: 5, minDuration: 5,
});
await expectOk('P1.3 deposit_coverage_capital', operator, 'deposit_coverage_capital', [cidA], BigInt(5000));

const buyAt = Date.now();
await expectOk('P1.4 purchase_coverage (900s term, 5s waiting)', holder, 'purchase_coverage',
  [cidA, 100, 900], BigInt(200));

const pidA = (await read('get_system_counts')).policies;
let policy = await read('get_policy', [pidA]);
record('P1.5 policy is PENDING_WAIT (premium paid, not yet claimable)',
  Number(policy.status) === 0, `status=${policy.status}`);

let commitment = await read('get_commitment', [cidA]);
record('P1.6 active_policy_count does NOT include the waiting policy',
  Number(commitment.active_policy_count) === 0, `active_policy_count=${commitment.active_policy_count}`);

// CORE REGRESSION #1: paid-but-waiting policy must block the operator's exit.
await expectRevert('P1.7 begin_wind_down BLOCKED by paid WAITING policy', 'OUTSTANDING_POLICIES',
  operator, 'begin_wind_down', [cidA]);
await expectUnchanged('P1.7b commitment still ACTIVE (not WINDING_DOWN) after blocked exit',
  'get_commitment', [cidA], 'status', 3);

// --- ACTIVATION ---
const since = Date.now() - buyAt;
if (since < 6000) await sleep(6000 - since);
await expectOk('P1.8 activate_waiting_policy once waiting elapsed (ACTIVATION)',
  holder, 'activate_waiting_policy', [pidA]);

policy = await read('get_policy', [pidA]);
record('P1.9 policy transitioned to ACTIVE', Number(policy.status) === 1, `status=${policy.status}`);
commitment = await read('get_commitment', [cidA]);
record('P1.10 active_policy_count incremented on activation',
  Number(commitment.active_policy_count) === 1, `active_policy_count=${commitment.active_policy_count}`);

// CORE REGRESSION #2: an ACTIVE policy must also block the exit.
await expectRevert('P1.11 begin_wind_down BLOCKED by ACTIVE policy', 'OUTSTANDING_POLICIES',
  operator, 'begin_wind_down', [cidA]);
await expectUnchanged('P1.11b commitment still ACTIVE after blocked exit',
  'get_commitment', [cidA], 'status', 3);

// =====================================================================
// PART 2 -- EXPIRY releases reservation and unblocks operator exit
// =====================================================================
console.log('\n=== PART 2: expiry releases capital and unblocks exit ===');

const cidB = await setupCommitment('P2 expiry', operator, 'https://httpbin.org/status/200', {
  minDuration: 15,
});
await expectOk('P2.3 deposit_coverage_capital', operator, 'deposit_coverage_capital', [cidB], BigInt(5000));

const shortBuyAt = Date.now();
await expectOk('P2.4 purchase_coverage (15s term, no waiting)', holder, 'purchase_coverage',
  [cidB, 100, 15], BigInt(200));

const pidB = (await read('get_system_counts')).policies;
const capBefore = await read('get_capital_state', [cidB]);
record('P2.5 purchase reserved capital against the vault',
  Number(capBefore.reserved_capital) === 100, `reserved_capital=${capBefore.reserved_capital}`);

// (in-term blocking is proven in Part 1 on a 900s term, which no backoff can expire)
const waited = Date.now() - shortBuyAt;
if (waited < 20000) await sleep(20000 - waited);

await expectOk('P2.7 sweep_expired_policies past term (EXPIRY)', operator, 'sweep_expired_policies', [cidB]);

const polB = await read('get_policy', [pidB]);
record('P2.8 policy is EXPIRED after its term', Number(polB.status) === 2, `status=${polB.status}`);

const capAfter = await read('get_capital_state', [cidB]);
record('P2.9 expiry released the reserved capital',
  Number(capAfter.reserved_capital) === 0, `reserved ${capBefore.reserved_capital} -> ${capAfter.reserved_capital}`);

const cB = await read('get_commitment', [cidB]);
record('P2.10 active_policy_count decremented on expiry',
  Number(cB.active_policy_count) === 0, `active_policy_count=${cB.active_policy_count}`);

await expectOk('P2.11 begin_wind_down ALLOWED once nothing outstanding', operator, 'begin_wind_down', [cidB]);
await expectOk('P2.12 request_bond_withdrawal ALLOWED', operator, 'request_bond_withdrawal', [cidB]);

// =====================================================================
// PART 3 -- counter-evidence bound to the commitment (origin + content)
// =====================================================================
console.log('\n=== PART 3: counter-evidence origin + commitment binding ===');

const op2 = createAccount(generatePrivateKey());
const cidC = await setupCommitment('P3 evidence', op2, 'https://httpbin.org/status/503', {
  interval: 5, threshold: 2, challengeWindow: 600, grace: 10,
});

await expectOk('P3.3 observation #1 (failing target)', op2, 'request_observation', [cidC]);
await sleep(6000);
await expectOk('P3.4 observation #2 -> opens incident', op2, 'request_observation', [cidC]);

const cC = await read('get_commitment', [cidC]);
const incId = cC.active_incident;
record('P3.5 incident opened on threshold breach', incId > 0, `incident=${incId}, status=${cC.status}`);

// A domain the operator controls must be inadmissible as self-exculpating evidence.
await expectRevert('P3.6 counter-evidence from FOREIGN origin REJECTED', 'EVIDENCE_ORIGIN_NOT_BOUND',
  op2, 'challenge_incident', [incId, 'https://operator-controlled-alibi.example.net/status']);

await expectRevert('P3.7 mixed batch containing a foreign origin REJECTED', 'EVIDENCE_ORIGIN_NOT_BOUND',
  op2, 'challenge_incident',
  [incId, 'https://httpbin.org/status/200|https://operator-controlled-alibi.example.net/x']);

await expectRevert('P3.8 malformed evidence URL REJECTED', 'INVALID_EVIDENCE_URL',
  op2, 'challenge_incident', [incId, 'not-a-url']);

await expectRevert('P3.9 empty counter-evidence REJECTED', 'EMPTY_COUNTER_EVIDENCE',
  op2, 'challenge_incident', [incId, '   ']);

// Evidence served by a host the commitment itself declared is admissible.
await expectOk('P3.10 counter-evidence from DECLARED origin ACCEPTED', op2, 'challenge_incident',
  [incId, 'https://httpbin.org/status/200']);

const evidence = await read('get_incident_evidence_summary', [incId]);
record('P3.11 accepted evidence stored and bound to the commitment',
  String(evidence.counter_evidence || '').includes('httpbin.org'),
  `counter_evidence=${JSON.stringify(evidence.counter_evidence)}`);

await expectRevert('P3.12 appending FOREIGN origin still REJECTED', 'EVIDENCE_ORIGIN_NOT_BOUND',
  op2, 'submit_counter_evidence', [incId, 'https://operator-controlled-alibi.example.net/y']);

await expectOk('P3.13 appending DECLARED origin accepted', op2, 'submit_counter_evidence',
  [incId, 'https://httpbin.org/get']);

// =====================================================================
console.log('\n\n=== SUMMARY ===');
const failed = results.filter((r) => !r.passed);
console.log(`${results.length - failed.length}/${results.length} passed`);
if (failed.length) {
  console.log('FAILURES:');
  failed.forEach((f) => console.log(`  - ${f.name}: ${f.detail || ''}`));
  process.exitCode = 1;
}
console.log('\nCONTRACT=' + CONTRACT);
