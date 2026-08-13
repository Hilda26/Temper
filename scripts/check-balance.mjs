import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
const client = createClient({ chain: studionet, endpoint: 'https://studio.genlayer.com/api' });
const bal = await client.getBalance({ address: '0x7834Cc4914A4475d8946A47EC8ADA509788B9Eb4' });
console.log('Recipient balance:', bal);
const contractBal = await client.getBalance({ address: '0x99DE89DbD5d3c2750Cc924d59613fAdc3fe9FAbf' });
console.log('Contract balance (chain-level):', contractBal);
