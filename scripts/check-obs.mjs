import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
const client = createClient({ chain: studionet, endpoint: 'https://studio.genlayer.com/api' });
const c = await client.readContract({ address: '0xEe05F0c3bcE19533c81dABbbc86D761cc0DF327D', functionName: 'get_commitment', args: [1] });
console.log(c);
