import { createClient, createAccount } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
const client = createClient({ chain: studionet, endpoint: 'https://studio.genlayer.com/api' });
const CONTRACT = '0x3C13ba755d5ba3e6762cec2726512fB41Ee14Dca';
const acc = createAccount();

const counts = JSON.parse(await client.readContract({ address: CONTRACT, functionName: 'get_system_counts', args: [] }));
console.log('paused flag:', counts.paused);

try {
  const tx = await client.writeContract({ address: CONTRACT, functionName: 'create_commitment', args: [
    'Should Fail', 'x', 0, 'https://httpbin.org/status/200', '', 60, 120, 3, 100,
    '{}', '{}', 1000, 100, 2592000, 86400, 500, 100, 0, 300, 10000,
  ], account: acc });
  const receipt = await client.waitForTransactionReceipt({ hash: tx });
  const leader = receipt.consensus_data?.leader_receipt?.[0];
  console.log('write while paused result:', leader?.execution_result);
  console.log(leader?.execution_result !== 'SUCCESS' ? '[PASS] write correctly blocked while paused' : '[FAIL] write succeeded while paused!');
} catch (e) {
  console.log('[PASS] write correctly blocked while paused (threw):', e.message?.slice(0,150));
}

try {
  const tx = await client.writeContract({ address: CONTRACT, functionName: 'set_paused', args: [false], account: acc });
  const receipt = await client.waitForTransactionReceipt({ hash: tx });
  const leader = receipt.consensus_data?.leader_receipt?.[0];
  console.log(leader?.execution_result !== 'SUCCESS' ? '[PASS] non-admin cannot unpause' : '[FAIL] non-admin unpaused the contract!');
} catch (e) {
  console.log('[PASS] non-admin cannot unpause (threw):', e.message?.slice(0,150));
}
