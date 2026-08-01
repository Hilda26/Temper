"use client";

import { useState } from "react";

function truncateAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function AddressDisplay({
  address,
  full = false,
}: {
  address: string;
  full?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard not available
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 font-mono text-xs text-stone-700 hover:text-stone-900 dark:text-stone-300 dark:hover:text-stone-100 transition-colors"
      title={address}
    >
      <span>{full ? address : truncateAddress(address)}</span>
      <span className="text-[0.5rem] text-stone-400 dark:text-stone-500 uppercase tracking-wider">
        {copied ? "copied" : "copy"}
      </span>
    </button>
  );
}
