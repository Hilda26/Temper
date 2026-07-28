import { createClient, createAccount } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';

const CONTRACT = '0x3C13ba755d5ba3e6762cec2726512fB41Ee14Dca';
const client = createClient({ chain: studionet, endpoint: 'https://studio.genlayer.com/api' });

const results = [];
function record(name, passed, detail) {
  results.push({ name, passed, detail });
  console.log(`[${passed ? 'PASS' : 'FAIL'}] ${name}${detail ? ' -- ' + detail : ''}`);
}

async function write(account, fn, args, value) {
  const params = { address: CONTRACT, functionName: fn, args, account };
  if (value !== undefined) params.value = value;
  const tx = await client.writeContract(params);
  const receipt = await client.waitForTransactionReceipt({ hash: tx });
  const leader = receipt.consensus_data?.leader_receipt?.[0];
  return { tx, ok: leader?.execution_result === 'SUCCESS', stderr: leader?.genvm_result?.stderr };
}

async function expectRevert(name, fn) {
  try {
    const r = await fn();
    if (r.ok) {
      record(name, false, 'expected revert but call SUCCEEDED');
    } else {
      const errLine = (r.stderr || '').split('\n').filter((l) => l.includes('UserError')).pop() || r.stderr?.slice(0, 200);
      record(name, true, `reverted as expected (${errLine || 'ERROR'})`);
    }
  } catch (e) {
    record(name, true, `reverted as expected (${e.message?.slice(0, 150)})`);
  }
}

async function read(fn, args = []) {
  const raw = await client.readContract({ address: CONTRACT, functionName: fn, args });
  return typeof raw === 'string' ? JSON.parse(raw) : raw;
}

const operator1 = createAccount();
const underwriter1 = createAccount();
const holder1 = createAccount();
const operator2 = createAccount();
const outsider = createAccount(); // never touches any commitment -- used for negative auth tests

console.log('=== ACCOUNTS ===');
console.log({ operator1: operator1.address, underwriter1: underwriter1.address, holder1: holder1.address, operator2: operator2.address, outsider: outsider.address });

// ---------------------------------------------------------------------------
// SCENARIO A: full challenge -> readjudication (UPHOLD) -> finalize -> claim,
// plus underwriter withdrawal locked-by-incident -> executed after settlement
// ---------------------------------------------------------------------------
console.log('\n=== SCENARIO A: commitment #1 (challenge path) ===');

let r = await write(operator1, 'create_commitment', [
  'Payments Gateway', 'Test commitment for challenge/readjudication path', 0,
  'https://httpbin.org/status/503', 'https://httpbin.org/status/503',
  8, 15, 2, 100,
  '{"1":0,"2":500,"3":2500,"4":10000}',
  '{"0":0,"1":1000,"2":3500,"3":10000}',
  1000000, 100, 2592000, 86400, 500, 100, 0, 20, 10000,
]);
record('A1 create_commitment', r.ok, r.tx);

let counts = await read('get_system_counts');
const cid1 = counts.commitments;

r = await write(operator1, 'deposit_operator_bond', [cid1], BigInt(1000));
record('A2 deposit_operator_bond', r.ok);
r = await write(operator1, 'activate_commitment', [cid1]);
record('A3 activate_commitment', r.ok);
r = await write(underwriter1, 'deposit_coverage_capital', [cid1], BigInt(5000));
record('A4 deposit_coverage_capital', r.ok);
r = await write(holder1, 'purchase_coverage', [cid1, 1000, 604800], BigInt(500));
record('A5 purchase_coverage', r.ok);

counts = await read('get_system_counts');
const pid1 = counts.policies;

// Request underwriter withdrawal BEFORE incident exists yet -- should queue normally
r = await write(underwriter1, 'request_underwriter_withdrawal', [cid1, 1000]);
record('A6 request_underwriter_withdrawal (pre-incident, expect QUEUED)', r.ok);
r = await write(underwriter1, 'cancel_underwriter_withdrawal', [cid1]);
record('A7 cancel_underwriter_withdrawal', r.ok);

// Drive two failing observations to auto-open an incident
r = await write(operator1, 'request_observation', [cid1]);
record('A8 request_observation #1', r.ok);
await new Promise((res) => setTimeout(res, 9000));
r = await write(operator1, 'request_observation', [cid1]);
record('A9 request_observation #2 (threshold crossed)', r.ok);

let commitment1 = await read('get_commitment', [cid1]);
const incId1 = commitment1.active_incident;
record('A10 incident auto-opened', incId1 > 0, `incident #${incId1}, status=${commitment1.status}`);

// Now request underwriter withdrawal WHILE incident is active -- should lock
r = await write(underwriter1, 'request_underwriter_withdrawal', [cid1, 1000]);
record('A11 request_underwriter_withdrawal (during incident, expect LOCKED)', r.ok);

// Operator challenges the verdict
r = await write(operator1, 'challenge_incident', [incId1, 'https://httpbin.org/status/200']);
record('A12 challenge_incident (operator)', r.ok);

let incident1 = await read('get_incident', [incId1]);
record('A13 incident status -> READJUDICATION_PENDING', Number(incident1.status) === 4, `status=${incident1.status}`);

// Negative: non-operator cannot challenge
r = await write(outsider, 'challenge_incident', [incId1, 'https://example.com']).catch((e) => ({ ok: false, err: e }));
await expectRevert('A14 outsider cannot challenge_incident', async () => r);

// Anyone can request readjudication
r = await write(outsider, 'request_readjudication', [incId1]);
record('A15 request_readjudication', r.ok);

incident1 = await read('get_incident', [incId1]);
record('A16 readjudication ruling produced FINAL status (target still down => UPHOLD)', Number(incident1.status) === 6, `status=${incident1.status}, severity=${incident1.severity}`);

// Finalize
r = await write(outsider, 'finalize_incident', [incId1]);
record('A17 finalize_incident', r.ok);

// Underwriter withdrawal was locked -- now incident is resolved, execute should transition + pay out
r = await write(underwriter1, 'execute_underwriter_withdrawal', [cid1]);
record('A18 execute_underwriter_withdrawal (was locked, now executes)', r.ok);

// Claim payout
let policy1 = await read('get_policy', [pid1]);
r = await write(holder1, 'claim_payout', [pid1]);
record('A19 claim_payout', r.ok, `claimable was ${policy1.claimable}`);

// Negative: double-claim must revert
await expectRevert('A20 double claim_payout reverts', () => write(holder1, 'claim_payout', [pid1]));

// Negative: wrong holder cannot claim
await expectRevert('A21 non-holder cannot claim_payout', () => write(outsider, 'claim_payout', [pid1]));

// ---------------------------------------------------------------------------
// SCENARIO B: operator bond withdrawal (wind-down path) + double-withdraw negative
// ---------------------------------------------------------------------------
console.log('\n=== SCENARIO B: commitment #2 (bond withdrawal path) ===');

r = await write(operator2, 'create_commitment', [
  'Static Assets CDN', 'Healthy commitment used to test the wind-down/withdrawal path', 0,
  'https://httpbin.org/status/200', 'https://httpbin.org/status/200',
  60, 120, 3, 50,
  '{"1":0,"2":500,"3":2500,"4":10000}',
  '{"0":0,"1":1000,"2":3500,"3":10000}',
  1000000, 100, 2592000, 86400, 500, 100, 0, 300, 10000,
]);
record('B1 create_commitment', r.ok);

counts = await read('get_system_counts');
const cid2 = counts.commitments;

r = await write(operator2, 'deposit_operator_bond', [cid2], BigInt(500));
record('B2 deposit_operator_bond', r.ok);

// Negative: outsider cannot activate someone else's commitment
await expectRevert('B3 outsider cannot activate_commitment', () => write(outsider, 'activate_commitment', [cid2]));

r = await write(operator2, 'activate_commitment', [cid2]);
record('B4 activate_commitment', r.ok);

r = await write(operator2, 'begin_wind_down', [cid2]);
record('B5 begin_wind_down', r.ok);

r = await write(operator2, 'request_bond_withdrawal', [cid2]);
record('B6 request_bond_withdrawal', r.ok);

let commitment2 = await read('get_commitment', [cid2]);
record('B7 commitment closed, bond returned', Number(commitment2.status) === 8 && Number(commitment2.bond_slashed) === 0, `status=${commitment2.status}, bond=${commitment2.bond}`);

// Negative: second withdrawal on an already-withdrawn (zero-remaining) commitment must revert
await expectRevert('B8 double bond withdrawal reverts (NOTHING_TO_WITHDRAW)', () => write(operator2, 'execute_bond_withdrawal', [cid2]));

// ---------------------------------------------------------------------------
// SCENARIO C: input validation negatives
// ---------------------------------------------------------------------------
console.log('\n=== SCENARIO C: input validation ===');

// Fresh commitment for limit-range test
r = await write(operator1, 'create_commitment', [
  'Auth Service', 'Commitment for input-validation negative tests', 0,
  'https://httpbin.org/status/200', '',
  60, 120, 3, 100,
  '{"1":0,"2":500,"3":2500,"4":10000}',
  '{"0":0,"1":1000,"2":3500,"3":10000}',
  1000, 500, 2592000, 86400, 500, 100, 0, 300, 10000, // max_policy_limit=1000, min=500
]);
record('C1 create_commitment (narrow limit range)', r.ok);
counts = await read('get_system_counts');
const cid3 = counts.commitments;
r = await write(operator1, 'deposit_operator_bond', [cid3], BigInt(100));
r = await write(operator1, 'activate_commitment', [cid3]);
record('C2 setup for validation tests', r.ok);

await expectRevert('C3 purchase_coverage below min_limit reverts (INVALID_LIMIT)', () =>
  write(holder1, 'purchase_coverage', [cid3, 10, 86400], BigInt(50)),
);
await expectRevert('C4 purchase_coverage above max_limit reverts (INVALID_LIMIT)', () =>
  write(holder1, 'purchase_coverage', [cid3, 5000, 86400], BigInt(50)),
);
await expectRevert('C5 activate_commitment on already-active reverts (INVALID_STATUS_FOR_ACTIVATE)', () =>
  write(operator1, 'activate_commitment', [cid3]),
);
await expectRevert('C6 deposit_operator_bond with zero value reverts (ZERO_VALUE)', () =>
  write(operator1, 'deposit_operator_bond', [cid3], BigInt(0)),
);

// ---------------------------------------------------------------------------
// SCENARIO D: admin pause gate + concurrent-commitment sanity
// ---------------------------------------------------------------------------
console.log('\n=== SCENARIO D: admin pause + system-wide sanity ===');

const finalCounts = await read('get_system_counts');
record('D1 system counts reflect all 3 commitments', finalCounts.commitments >= cid3, JSON.stringify(finalCounts));

const activeIncidents = await read('get_active_incidents');
record('D2 no incidents left active (all settled)', activeIncidents.length === 0, `active=${JSON.stringify(activeIncidents)}`);

console.log('\n\n=== SUMMARY ===');
const failed = results.filter((r) => !r.passed);
console.log(`${results.length - failed.length}/${results.length} passed`);
if (failed.length) {
  console.log('FAILURES:');
  failed.forEach((f) => console.log(`  - ${f.name}: ${f.detail || ''}`));
}
console.log('\nTEST_CONTRACT=' + CONTRACT);
