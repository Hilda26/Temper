import { createClient, createAccount, generatePrivateKey } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';

const CONTRACT = '0x99DE89DbD5d3c2750Cc924d59613fAdc3fe9FAbf';
const client = createClient({ chain: studionet, endpoint: 'https://studio.genlayer.com/api' });
const pk = generatePrivateKey();
const operator = createAccount(pk);
console.log('PK:', pk);
console.log('Operator:', operator.address);

async function wait(hash, label) {
  const receipt = await client.waitForTransactionReceipt({ hash });
  const leader = receipt.consensus_data?.leader_receipt?.[0];
  console.log(label, ':', leader?.execution_result);
  if (leader?.execution_result !== 'SUCCESS') console.log('  stderr:', leader?.genvm_result?.stderr?.slice(0, 400));
  return leader?.execution_result === 'SUCCESS';
}

const tx1 = await client.writeContract({
  address: CONTRACT,
  functionName: 'create_commitment',
  args: [
    'Incident Drive Test 2', 'Deliberately-failing endpoint', 0,
    'https://httpbin.org/status/503', 'https://httpbin.org/status/503',
    5, 10, 2, 1,
    '{"1":0,"2":500,"3":2500,"4":10000}',
    '{"0":0,"1":1000,"2":3500,"3":10000}',
    1000000, 100, 2592000, 86400, 500, 100, 0, 15, 10000,
  ],
  account: operator,
});
await wait(tx1, 'create_commitment');

const counts = JSON.parse(await client.readContract({ address: CONTRACT, functionName: 'get_system_counts', args: [] }));
const cid = counts.commitments;
console.log('Commitment ID:', cid);

await wait(await client.writeContract({ address: CONTRACT, functionName: 'deposit_operator_bond', args: [cid], value: BigInt(100), account: operator }), 'deposit_bond');
await wait(await client.writeContract({ address: CONTRACT, functionName: 'activate_commitment', args: [cid], account: operator }), 'activate');
await wait(await client.writeContract({ address: CONTRACT, functionName: 'deposit_coverage_capital', args: [cid], value: BigInt(500), account: operator }), 'deposit_capital');
await wait(await client.writeContract({ address: CONTRACT, functionName: 'purchase_coverage', args: [cid, 100, 86400], value: BigInt(50), account: operator }), 'purchase_coverage');

console.log(JSON.stringify({ pk, address: operator.address, commitmentId: cid }));
