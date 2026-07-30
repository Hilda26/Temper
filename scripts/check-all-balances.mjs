import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
const client = createClient({ chain: studionet, endpoint: 'https://studio.genlayer.com/api' });

const addrs = {
  'seed account (claim_payout recipient, prod)': '0x7834Cc4914A4475d8946A47EC8ADA509788B9Eb4',
  'holder1 (claim_payout recipient, test contract)': '0x760A02088c04a159630591f29B9E5Ca26f398797',
  'underwriter1 (withdrawal recipient, test contract)': '0xF8C0AB4CCc423c4D891f40bc3d8daC46c36DdC5A',
  'operator2 (bond withdrawal recipient, test contract)': '0x2F6181bc1e4adc82d021453eD422eCe9BfDF3083',
};

for (const [label, addr] of Object.entries(addrs)) {
  const bal = await client.getBalance({ address: addr });
  console.log(label, '=', bal.toString());
}
