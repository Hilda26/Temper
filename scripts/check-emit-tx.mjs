import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
const client = createClient({ chain: studionet, endpoint: 'https://studio.genlayer.com/api' });

const hash = '0xb58c51d36f51a6b76d51218a0618eb62cc772508f24f1ffb83d566668e89e908';
const receipt = await client.waitForTransactionReceipt({ hash });
console.log(JSON.stringify(receipt, (k, v) => typeof v === 'bigint' ? v.toString() : v, 2));
