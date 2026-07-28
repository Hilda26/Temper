import { GENLAYER_CONFIG } from './config';

/**
 * Build an explorer URL for a transaction hash.
 */
export function txUrl(hash: string): string {
  return `${GENLAYER_CONFIG.explorerUrl}/tx/${hash}`;
}

/**
 * Build an explorer URL for an address.
 */
export function addressUrl(address: string): string {
  return `${GENLAYER_CONFIG.explorerUrl}/address/${address}`;
}

/**
 * Build an explorer URL for a contract.
 */
export function contractUrl(address: string): string {
  return `${GENLAYER_CONFIG.explorerUrl}/contract/${address}`;
}
