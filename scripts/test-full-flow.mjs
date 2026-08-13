import { createClient, createAccount } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';

const CONTRACT = '0x99DE89DbD5d3c2750Cc924d59613fAdc3fe9FAbf';
let COMMITMENT_ID = null;

const client = createClient({
  chain: studionet,
  endpoint: 'https://studio.genlayer.com/api',
});

const operator = createAccount();
console.log('Operator:', operator.address);

async function writeTx(name, params) {
  console.log(`\n--- ${name} ---`);
  try {
    const txHash = await client.writeContract({ ...params, account: operator });
    console.log('TX:', txHash);
    const receipt = await client.waitForTransactionReceipt({ hash: txHash });
    const leader = receipt.consensus_data?.leader_receipt?.[0];
    if (leader?.execution_result === 'SUCCESS') {
      console.log('Result: SUCCESS');
    } else {
      console.log('Result:', leader?.execution_result);
      console.log('Stderr:', leader?.genvm_result?.stderr?.substring(0, 500));
    }
    return { txHash, receipt, success: leader?.execution_result === 'SUCCESS' };
  } catch (e) {
    console.log('Error:', e.message?.substring(0, 300));
    return { success: false };
  }
}

async function readContract(name, functionName, args = []) {
  const result = await client.readContract({ address: CONTRACT, functionName, args });
  console.log(`${name}:`, result);
  return result;
}

// Step 1: Create commitment
console.log('\n=== STEP 1: Create Commitment ===');
const createResult = await writeTx('create_commitment', {
  address: CONTRACT,
  functionName: 'create_commitment',
  args: [
    'Temper E2E Test',
    'Endpoint availability test for full flow',
    0,
    'https://httpbin.org/status/200',
    'https://httpbin.org/get',
    60, 120, 3, 1,
    '{"1":0,"2":500,"3":2500,"4":10000}',
    '{"0":0,"1":1000,"2":3500,"3":10000}',
    1000000, 100, 2592000, 86400, 500, 100, 0, 300, 10000,
  ],
});

const countsRaw = await readContract('System counts', 'get_system_counts');
const counts = JSON.parse(countsRaw);
const cid = counts.commitments;
console.log('Using commitment ID:', cid);

await readContract('Commitment', 'get_commitment', [cid]);

// Step 2: Deposit operator bond (payable)
console.log('\n=== STEP 2: Deposit Operator Bond ===');
const bondResult = await writeTx('deposit_operator_bond', {
  address: CONTRACT,
  functionName: 'deposit_operator_bond',
  args: [cid],
  value: BigInt(100),
});

await readContract('Commitment after bond', 'get_commitment', [cid]);

// Step 3: Activate commitment
console.log('\n=== STEP 3: Activate Commitment ===');
const activateResult = await writeTx('activate_commitment', {
  address: CONTRACT,
  functionName: 'activate_commitment',
  args: [cid],
});

await readContract('Commitment after activate', 'get_commitment', [cid]);

// Step 4: Deposit coverage capital (underwriter)
console.log('\n=== STEP 4: Deposit Coverage Capital ===');
const capitalResult = await writeTx('deposit_coverage_capital', {
  address: CONTRACT,
  functionName: 'deposit_coverage_capital',
  args: [cid],
  value: BigInt(500),
});

await readContract('Capital state', 'get_capital_state', [cid]);

// Step 5: Purchase coverage (policyholder)
console.log('\n=== STEP 5: Purchase Coverage ===');
const coverageResult = await writeTx('purchase_coverage', {
  address: CONTRACT,
  functionName: 'purchase_coverage',
  args: [cid, 100, 86400],
  value: BigInt(50),
});

await readContract('Capital after purchase', 'get_capital_state', [cid]);
await readContract('Policy 1', 'get_policy', [1]);

// Step 6: Request observation (healthy)
console.log('\n=== STEP 6: Request Observation (healthy target) ===');
const obsResult = await writeTx('request_observation', {
  address: CONTRACT,
  functionName: 'request_observation',
  args: [cid],
});

await readContract('Observation 1', 'get_observation', [1]);
await readContract('Commitment after obs', 'get_commitment', [cid]);

// Step 7: Contract balance
console.log('\n=== STEP 7: Contract Balance ===');
await readContract('Contract balance', 'get_contract_balance');

// Summary
console.log('\n\n=== SUMMARY ===');
console.log('Create commitment:', createResult.success ? 'PASS' : 'FAIL', createResult.txHash || '');
console.log('Deposit bond:', bondResult.success ? 'PASS' : 'FAIL', bondResult.txHash || '');
console.log('Activate:', activateResult.success ? 'PASS' : 'FAIL', activateResult.txHash || '');
console.log('Deposit capital:', capitalResult.success ? 'PASS' : 'FAIL', capitalResult.txHash || '');
console.log('Purchase coverage:', coverageResult.success ? 'PASS' : 'FAIL', coverageResult.txHash || '');
console.log('Request observation:', obsResult.success ? 'PASS' : 'FAIL', obsResult.txHash || '');
