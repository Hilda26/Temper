"use client";

import { useWallet } from "@/lib/wallet/WalletProvider";

function shortAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function ConnectButton() {
  const { address, connecting, error, connect, disconnect } = useWallet();

  if (address) {
    return (
      <button
        onClick={disconnect}
        className="inline-flex items-center gap-1.5 border border-emerald-600/40 px-3 py-1 font-mono text-[0.625rem] uppercase tracking-wider text-emerald-700 transition-colors hover:border-red-500 hover:text-red-600 dark:text-emerald-400 dark:hover:text-red-400"
        title="Click to disconnect"
      >
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-600" />
        {shortAddress(address)}
      </button>
    );
  }

  return (
    <button
      onClick={connect}
      disabled={connecting}
      className="inline-flex items-center gap-1.5 border border-[var(--color-border-default)] px-3 py-1 font-mono text-[0.625rem] uppercase tracking-wider text-stone-500 transition-colors hover:border-amber-600 hover:text-amber-700 disabled:opacity-50 dark:text-stone-400 dark:hover:text-amber-500"
      title={error ?? undefined}
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-stone-400 dark:bg-stone-500" />
      {connecting ? "Connecting..." : error ? "Retry Connect" : "Connect"}
    </button>
  );
}
