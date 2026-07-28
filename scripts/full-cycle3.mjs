import { createClient, createAccount } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
const client = createClient({ chain: studionet, endpoint: 'https://studio.genlayer.com/api' });
const CONTRACT = '0xEe05F0c3bcE19533c81dABbbc86D761cc0DF327D';
const pk = '0x7ff2824c69ea84398e87f4a151d9bd526a6160f425f3c8f1d9f28c4187166d0b';
const acc = createAccount(pk);
const cid = 3;

async function write(fn, args, value) {
  const params = { address: CONTRACT, functionName: fn, args, account: acc };
  if (value !== undefined) params.value = value;
  const tx = await client.writeContract(params);
  const receipt = await client.waitForTransactionReceipt({ hash: tx });
  const leader = receipt.consensus_data?.leader_receipt?.[0];
  console.log(fn, ':', leader?.execution_result, tx);
  if (leader?.execution_result !== 'SUCCESS') console.log(leader?.genvm_result?.stderr?.slice(0,400));
  return leader?.execution_result === 'SUCCESS';
}

await write('request_observation', [cid]);
await new Promise(r => setTimeout(r, 6000));
await write('request_observation', [cid]);

const c = await client.readContract({ address: CONTRACT, functionName: 'get_commitment', args: [cid] });
console.log(c);
