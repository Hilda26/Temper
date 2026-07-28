import type { Address } from 'viem';
import type { ContractSchema } from 'genlayer-js/types';
import { GENLAYER_CONFIG } from './config';
import { getReadClient } from './client';

/**
 * The Temper insurance contract address.
 */
export const TEMPER_CONTRACT_ADDRESS = GENLAYER_CONFIG.contractAddress as Address;

/**
 * Cached contract schema, fetched once from the chain.
 */
let _schema: ContractSchema | null = null;

/**
 * Fetch the contract schema (ABI-equivalent for GenLayer intelligent contracts).
 * Cached after first call.
 */
export async function getContractSchema(): Promise<ContractSchema> {
  if (!_schema) {
    const client = getReadClient();
    _schema = await client.getContractSchema(TEMPER_CONTRACT_ADDRESS);
  }
  return _schema;
}

/**
 * Reset the cached contract schema (useful for testing).
 */
export function resetContractSchema() {
  _schema = null;
}
