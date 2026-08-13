import { createClient, createAccount } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
const client = createClient({ chain: studionet, endpoint: 'https://studio.genlayer.com/api' });
const CONTRACT = '0x99DE89DbD5d3c2750Cc924d59613fAdc3fe9FAbf';
// Must use the SAME account that purchased the policy (holder). Re-derive from drive-incident.mjs's operator - but that was a random account we don't have the key for anymore in this script.
