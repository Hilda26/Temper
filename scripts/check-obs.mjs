import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
const client = createClient({ chain: studionet, endpoint: 'https://studio.genlayer.com/api' });
const c = await client.readContract({ address: '0x99DE89DbD5d3c2750Cc924d59613fAdc3fe9FAbf', functionName: 'get_commitment', args: [1] });
console.log(c);
