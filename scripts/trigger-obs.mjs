import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
const client = createClient({ chain: studionet, endpoint: 'https://studio.genlayer.com/api' });
const CONTRACT = '0xEe05F0c3bcE19533c81dABbbc86D761cc0DF327D';
const cid = 2;

async function obs(account) {
  const tx = await client.writeContract({ address: CONTRACT, functionName: 'request_observation', args: [cid], account });
  const receipt = await client.waitForTransactionReceipt({ hash: tx });
  const leader = receipt.consensus_data?.leader_receipt?.[0];
  console.log('observation tx', tx, leader?.execution_result);
  if (leader?.execution_result !== 'SUCCESS') console.log(leader?.genvm_result?.stderr?.slice(0,400));
}
import { createAccount } from 'genlayer-js';
const acc = createAccount();
await obs(acc);
const c = await client.readContract({ address: CONTRACT, functionName: 'get_commitment', args: [cid] });
console.log(c);
