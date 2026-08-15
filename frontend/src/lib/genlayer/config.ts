export const GENLAYER_CONFIG = {
  chainId: 61999,
  rpcUrl: process.env.NEXT_PUBLIC_GENLAYER_RPC_URL || 'https://studio.genlayer.com/api',
  explorerUrl: process.env.NEXT_PUBLIC_GENLAYER_EXPLORER_URL || 'https://explorer-studio.genlayer.com',
  contractAddress: process.env.NEXT_PUBLIC_TEMPER_CONTRACT_ADDRESS || '0x1f20C1f6132cee9E8Dd13a2114988e504E233066',
} as const;
