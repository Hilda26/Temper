import { createClient, createAccount } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
const client = createClient({ chain: studionet, endpoint: 'https://studio.genlayer.com/api' });
const CONTRACT = '0xEe05F0c3bcE19533c81dABbbc86D761cc0DF327D';
const acc = createAccount();

async function write(fn, args) {
  const tx = await client.writeContract({ address: CONTRACT, functionName: fn, args, account: acc });
  const receipt = await client.waitForTransactionReceipt({ hash: tx });
  const leader = receipt.consensus_data?.leader_receipt?.[0];
  console.log(fn, ':', leader?.execution_result, tx);
  if (leader?.execution_result !== 'SUCCESS') console.log(leader?.genvm_result?.stderr?.slice(0,500));
  return leader?.execution_result === 'SUCCESS';
}

// Wait for challenge window (20s) to elapse from incident start (already ~30s+ old)
await write('finalize_provisional_verdict', [1]);
await write('finalize_incident', [1]);

const inc = await client.readContract({ address: CONTRACT, functionName: 'get_incident', args: [1] });
console.log(inc);
const pol = await client.readContract({ address: CONTRACT, functionName: 'get_policy', args: [2] });
console.log(pol);
