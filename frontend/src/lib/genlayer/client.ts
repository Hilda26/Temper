import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import type { Address } from 'viem';
import { GENLAYER_CONFIG } from './config';

export type { GenLayerClient } from 'genlayer-js/types';

/** Minimal EIP-1193 provider shape (e.g. window.ethereum). Not exported by genlayer-js or viem. */
export interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
}

/**
 * Creates a GenLayer client configured for StudioNet.
 *
 * For read-only operations, no account is needed.
 * For write operations, pass an account or provider.
 */
export function createGenLayerClient(options?: {
  account?: `0x${string}`;
  provider?: unknown;
}) {
  return createClient({
    chain: studionet,
    endpoint: GENLAYER_CONFIG.rpcUrl,
    ...(options?.account ? { account: options.account as Address } : {}),
    ...(options?.provider ? { provider: options.provider as EthereumProvider } : {}),
  });
}

/**
 * Singleton read-only client instance for view calls.
 * Lazily initialized on first access.
 */
let _readClient: ReturnType<typeof createGenLayerClient> | null = null;

export function getReadClient() {
  if (!_readClient) {
    _readClient = createGenLayerClient();
  }
  return _readClient;
}

/**
 * Reset the singleton read client (useful for testing or reconfiguration).
 */
export function resetReadClient() {
  _readClient = null;
}
