"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { GENLAYER_CONFIG } from "@/lib/genlayer";

interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

const STUDIONET_CHAIN_ID_HEX = `0x${GENLAYER_CONFIG.chainId.toString(16)}`;

interface WalletState {
  address: `0x${string}` | null;
  connecting: boolean;
  error: string | null;
  provider: EthereumProvider | null;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletState | null>(null);

async function ensureStudioNetChain(eth: EthereumProvider) {
  const currentChainId = (await eth.request({ method: "eth_chainId" })) as string;
  if (currentChainId?.toLowerCase() === STUDIONET_CHAIN_ID_HEX.toLowerCase()) {
    return;
  }
  try {
    await eth.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: STUDIONET_CHAIN_ID_HEX }],
    });
  } catch (switchError) {
    const code = (switchError as { code?: number })?.code;
    if (code === 4902) {
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: STUDIONET_CHAIN_ID_HEX,
            chainName: "GenLayer Studio Network",
            nativeCurrency: { name: "GenLayer", symbol: "GEN", decimals: 18 },
            rpcUrls: [GENLAYER_CONFIG.rpcUrl],
            blockExplorerUrls: [GENLAYER_CONFIG.explorerUrl],
          },
        ],
      });
    } else {
      throw switchError;
    }
  }
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<`0x${string}` | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getEth = useCallback((): EthereumProvider | null => {
    if (typeof window === "undefined") return null;
    return window.ethereum ?? null;
  }, []);

  const connect = useCallback(async () => {
    const eth = getEth();
    if (!eth) {
      setError("No wallet found. Install MetaMask or another EIP-1193 wallet.");
      return;
    }
    setConnecting(true);
    setError(null);
    try {
      const accounts = (await eth.request({ method: "eth_requestAccounts" })) as string[];
      await ensureStudioNetChain(eth);
      setAddress((accounts[0] as `0x${string}`) ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setConnecting(false);
    }
  }, [getEth]);

  const disconnect = useCallback(() => {
    setAddress(null);
    setError(null);
  }, []);

  useEffect(() => {
    const eth = getEth();
    if (!eth?.on) return;
    const handleAccountsChanged = (...args: unknown[]) => {
      const accounts = args[0] as string[];
      setAddress((accounts?.[0] as `0x${string}`) ?? null);
    };
    eth.on("accountsChanged", handleAccountsChanged);
    return () => eth.removeListener?.("accountsChanged", handleAccountsChanged);
  }, [getEth]);

  const value = useMemo(
    () => ({ address, connecting, error, provider: getEth(), connect, disconnect }),
    [address, connecting, error, getEth, connect, disconnect],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within a WalletProvider");
  return ctx;
}
