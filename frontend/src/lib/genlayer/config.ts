export const GENLAYER_CONFIG = {
  chainId: 61999,
  rpcUrl: process.env.NEXT_PUBLIC_GENLAYER_RPC_URL || 'https://studio.genlayer.com/api',
  explorerUrl: process.env.NEXT_PUBLIC_GENLAYER_EXPLORER_URL || 'https://explorer-studio.genlayer.com',
  contractAddress: process.env.NEXT_PUBLIC_TEMPER_CONTRACT_ADDRESS || '0xEe05F0c3bcE19533c81dABbbc86D761cc0DF327D',
} as const;
