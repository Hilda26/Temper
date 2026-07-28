import { createClient, createAccount } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
const client = createClient({ chain: studionet, endpoint: 'https://studio.genlayer.com/api' });
const CONTRACT = '0xEe05F0c3bcE19533c81dABbbc86D761cc0DF327D';
const pk = '0x7ff2824c69ea84398e87f4a151d9bd526a6160f425f3c8f1d9f28c4187166d0b';
const acc = createAccount(pk);
const incId = 2;

async function write(fn, args) {
  const tx = await client.writeContract({ address: CONTRACT, functionName: fn, args, account: acc });
  const receipt = await client.waitForTransactionReceipt({ hash: tx });
  const leader = receipt.consensus_data?.leader_receipt?.[0];
  console.log(fn, ':', leader?.execution_result, tx);
  if (leader?.execution_result !== 'SUCCESS') console.log(leader?.genvm_result?.stderr?.slice(0,500));
  return leader?.execution_result === 'SUCCESS';
}

await write('finalize_provisional_verdict', [incId]);
await write('finalize_incident', [incId]);

const pol = await client.readContract({ address: CONTRACT, functionName: 'get_policy', args: [3] });
console.log('policy before claim:', pol);

const balBefore = await client.readContract({ address: CONTRACT, functionName: 'get_contract_balance', args: [] });
console.log('contract balance before claim:', balBefore);

await write('claim_payout', [3]);

const polAfter = await client.readContract({ address: CONTRACT, functionName: 'get_policy', args: [3] });
console.log('policy after claim:', polAfter);
const balAfter = await client.readContract({ address: CONTRACT, functionName: 'get_contract_balance', args: [] });
console.log('contract balance after claim:', balAfter);
