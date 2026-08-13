import { createClient, createAccount, generatePrivateKey } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';

const CONTRACT = '0x99DE89DbD5d3c2750Cc924d59613fAdc3fe9FAbf';
const client = createClient({ chain: studionet, endpoint: 'https://studio.genlayer.com/api' });
const pk = generatePrivateKey();
const account = createAccount(pk);
console.log('Seed account PK:', pk);
console.log('Seed account address:', account.address);

async function write(fn, args, value) {
  const params = { address: CONTRACT, functionName: fn, args, account };
  if (value !== undefined) params.value = value;
  const tx = await client.writeContract(params);
  const receipt = await client.waitForTransactionReceipt({ hash: tx });
  const leader = receipt.consensus_data?.leader_receipt?.[0];
  console.log(`${fn}:`, leader?.execution_result, tx);
  if (leader?.execution_result !== 'SUCCESS') {
    console.log('  stderr:', leader?.genvm_result?.stderr?.slice(0, 500));
    throw new Error(`${fn} failed`);
  }
  return tx;
}

async function read(fn, args = []) {
  return client.readContract({ address: CONTRACT, functionName: fn, args });
}

// 1. Create a presentable demo commitment
await write('create_commitment', [
  'Checkout API Uptime',
  'Availability commitment for the primary checkout API endpoint, with a hot-standby region as backup.',
  0,
  'https://httpbin.org/status/503', // deliberately down for this demo seed
  'https://httpbin.org/status/503',
  10,      // observation_interval (s)
  20,      // grace_period (s)
  2,       // failure_threshold
  100,     // min_bond
  '{"1":0,"2":500,"3":2500,"4":10000}',   // slash_ladder
  '{"0":0,"1":1000,"2":3500,"3":10000}',  // payout_tiers
  1000000, // max_policy_limit
  100,     // min_policy_limit
  2592000, // max_policy_duration
  86400,   // min_policy_duration
  500,     // base_premium_bps
  100,     // deductible_bps
  0,       // waiting_period
  25,      // challenge_window (s) -- short for demo
  10000,   // max_cumulative_slash_bps
]);

const counts = JSON.parse(await read('get_system_counts'));
const cid = counts.commitments;
console.log('Commitment ID:', cid);

// 2. Bond, activate, capitalize, purchase coverage
await write('deposit_operator_bond', [cid], BigInt(1000));
await write('activate_commitment', [cid]);
await write('deposit_coverage_capital', [cid], BigInt(5000));
await write('purchase_coverage', [cid, 1000, 604800], BigInt(500)); // limit=1000, 7-day policy

const polCounts = JSON.parse(await read('get_system_counts'));
const pid = polCounts.policies;
console.log('Policy ID:', pid);

// 3. Drive two failing observations to auto-open an incident
await write('request_observation', [cid]);
console.log('Waiting for observation interval...');
await new Promise((r) => setTimeout(r, 11000));
await write('request_observation', [cid]);

const commitmentAfter = JSON.parse(await read('get_commitment', [cid]));
console.log('Commitment after observations:', commitmentAfter);
const incId = commitmentAfter.active_incident;
console.log('Incident ID:', incId);

// 4. Wait for challenge window, then finalize
console.log('Waiting for challenge window...');
await new Promise((r) => setTimeout(r, 26000));
await write('finalize_provisional_verdict', [incId]);
await write('finalize_incident', [incId]);

// 5. Claim payout
const policy = JSON.parse(await read('get_policy', [pid]));
console.log('Policy before claim:', policy);
await write('claim_payout', [pid]);
const policyAfter = JSON.parse(await read('get_policy', [pid]));
console.log('Policy after claim:', policyAfter);

const incident = JSON.parse(await read('get_incident', [incId]));
console.log('\nFinal incident state:', incident);
console.log('\n=== SEED COMPLETE ===');
console.log(JSON.stringify({ pk, address: account.address, commitmentId: cid, incidentId: incId, policyId: pid }));
