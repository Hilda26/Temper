import { TransactionStatus } from 'genlayer-js/types';
import { getReadClient } from './client';
import { TransactionTimeoutError } from './errors';

/**
 * The shape of a transaction receipt from the GenLayer network.
 */
export interface TransactionReceipt {
  hash: string;
  status: string;
  from_address?: string;
  to_address?: string;
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Wait for a transaction to reach the requested decided state.
 *
 * @param txHash - The transaction hash to watch
 * @param options - Optional polling configuration
 * @returns The final transaction receipt
 * @throws TransactionTimeoutError if the transaction does not settle in time
 */
export async function waitForTransaction(
  txHash: string,
  options?: { interval?: number; retries?: number; status?: TransactionStatus },
): Promise<TransactionReceipt> {
  const client = getReadClient();
  try {
    const result = await client.waitForTransactionReceipt({
      hash: txHash as `0x${string}` & { length: 66 },
      status: options?.status ?? TransactionStatus.FINALIZED,
      interval: options?.interval ?? 2000,
      retries: options?.retries ?? 60,
    });
    return result as unknown as TransactionReceipt;
  } catch (error) {
    if (error instanceof Error && error.message.includes('timeout')) {
      throw new TransactionTimeoutError(txHash);
    }
    throw error;
  }
}

/**
 * Get the current status of a transaction.
 *
 * @param txHash - The transaction hash to check
 * @returns The transaction status string (e.g. "PENDING", "ACCEPTED", "FINALIZED")
 */
export async function getTransactionStatus(txHash: string): Promise<string> {
  const client = getReadClient();
  const tx = await client.getTransaction({
    hash: txHash as `0x${string}` & { length: 66 },
  });
  return (tx.statusName ?? tx.status?.toString() ?? 'UNKNOWN') as string;
}
