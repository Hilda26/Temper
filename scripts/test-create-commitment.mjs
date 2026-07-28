import { createClient, createAccount } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';

const CONTRACT = '0xEe05F0c3bcE19533c81dABbbc86D761cc0DF327D';

const client = createClient({
  chain: studionet,
  endpoint: 'https://studio.genlayer.com/api',
});

const account = createAccount();
console.log('Account:', account.address);

try {
  const txHash = await client.writeContract({
    address: CONTRACT,
    functionName: 'create_commitment',
    args: [
      'Temper Test Service',
      'Endpoint availability commitment for testing',
      0,
      'https://httpbin.org/status/200',
      'https://httpbin.org/get',
      60,
      120,
      3,
      1,
      '{"1":0,"2":500,"3":2500,"4":10000}',
      '{"0":0,"1":1000,"2":3500,"3":10000}',
      1000000,
      100,
      2592000,
      86400,
      500,
      100,
      0,
      300,
      10000,
    ],
    account,
  });
  console.log('TX Hash:', txHash);

  const receipt = await client.waitForTransactionReceipt({ hash: txHash });
  console.log('Receipt status:', receipt.status);
  console.log('Result:', JSON.stringify(receipt, null, 2));

  // Read back
  const counts = await client.readContract({
    address: CONTRACT,
    functionName: 'get_system_counts',
    args: [],
  });
  console.log('System counts:', counts);

  const commitment = await client.readContract({
    address: CONTRACT,
    functionName: 'get_commitment',
    args: [1],
  });
  console.log('Commitment 1:', commitment);

} catch (e) {
  console.error('Error:', e.message);
  console.error(e);
}
