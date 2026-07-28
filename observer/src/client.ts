import { createClient, createAccount } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import type { GenLayerClient } from "genlayer-js/types";

export interface ObserverConfig {
  rpcUrl: string;
  contractAddress: `0x${string}`;
  privateKey: `0x${string}`;
}

/**
 * Build a GenLayer client configured for StudioNet with the observer's
 * private-key signer.  The signer key MUST be kept server-side only.
 */
export function buildClient(config: ObserverConfig) {
  const account = createAccount(config.privateKey);

  const client = createClient({
    chain: studionet,
    endpoint: config.rpcUrl,
    account,
  });

  return { client, account, contractAddress: config.contractAddress };
}

export type { GenLayerClient };
