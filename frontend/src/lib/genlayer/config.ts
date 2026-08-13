export const GENLAYER_CONFIG = {
  chainId: 61999,
  rpcUrl: process.env.NEXT_PUBLIC_GENLAYER_RPC_URL || 'https://studio.genlayer.com/api',
  explorerUrl: process.env.NEXT_PUBLIC_GENLAYER_EXPLORER_URL || 'https://explorer-studio.genlayer.com',
  contractAddress: process.env.NEXT_PUBLIC_TEMPER_CONTRACT_ADDRESS || '0x99DE89DbD5d3c2750Cc924d59613fAdc3fe9FAbf',
} as const;
