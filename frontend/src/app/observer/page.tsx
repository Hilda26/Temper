"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import AddressDisplay from "@/components/AddressDisplay";
import TransactionLink from "@/components/TransactionLink";
import {
  getDueObservations,
  getCommitment,
  requestObservation,
  commitmentStatusLabel,
  toBadgeStatus,
  extractErrorMessage,
} from "@/lib/genlayer";
import { useContractData } from "@/lib/useContractData";
import { useWallet } from "@/lib/wallet/WalletProvider";

async function loadDue() {
  const ids = await getDueObservations();
  if (ids.length === 0) return [];
  const settled = await Promise.allSettled(ids.map((id) => getCommitment(BigInt(id))));
  return settled
    .filter((result): result is PromiseFulfilledResult<Record<string, unknown>> => result.status === "fulfilled")
    .map((result) => result.value)
    .filter((commitment) => Object.keys(commitment).length > 0);
}

export default function ObserverPage() {
  const { data: due, loading, error } = useContractData(loadDue, [], 10000);
  const { provider, address, connect } = useWallet();
  const [pending, setPending] = useState<number | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string; txHash?: string } | null>(
    null,
  );

  const trigger = useCallback(
    async (commitmentId: number) => {
      setPending(commitmentId);
      setMessage(null);
      try {
        const tx = await requestObservation({ provider, account: address ?? undefined }, commitmentId);
        setMessage({ kind: "ok", text: "Observation triggered", txHash: tx });
        setTimeout(() => window.location.reload(), 2500);
      } catch (e) {
        setMessage({ kind: "err", text: extractErrorMessage(e) });
      } finally {
        setPending(null);
      }
    },
    [provider, address],
  );

  const rows = due ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-mono text-xs uppercase tracking-[0.15em] text-stone-900 dark:text-stone-100">
            Observer Console
          </h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            Commitments due for an observation cycle. Anyone may trigger; the observer runner
            does this automatically off-chain.
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${
              error ? "bg-red-500" : "bg-emerald-600 animate-signal"
            }`}
          />
          <span className="font-mono text-[0.5625rem] uppercase tracking-wider text-stone-400 dark:text-stone-500">
            {error ? "Connection Error" : `${rows.length} Due`}
          </span>
        </div>
      </div>

      {!address && (
        <div className="mb-6 border border-[var(--color-border-default)] bg-[var(--color-surface)] px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-stone-500 dark:text-stone-400">
            Connect a wallet to manually trigger observations.
          </span>
          <button
            onClick={connect}
            className="border border-amber-600 px-4 py-1.5 font-mono text-[0.625rem] uppercase tracking-wider text-amber-700 hover:bg-amber-600 hover:text-white dark:text-amber-500"
          >
            Connect Wallet
          </button>
        </div>
      )}

      {message && (
        <div
          className={`mb-6 flex items-center gap-2 border px-4 py-2 font-mono text-xs ${
            message.kind === "ok"
              ? "border-emerald-600/40 text-emerald-700 dark:text-emerald-400"
              : "border-red-600/40 text-red-700 dark:text-red-400"
          }`}
        >
          <span>{message.text}</span>
          {message.txHash && <TransactionLink hash={message.txHash} />}
        </div>
      )}

      {/* Due Observations */}
      <section className="border border-[var(--color-border-default)] bg-[var(--color-surface)]">
        <div className="border-b border-[var(--color-border-default)] px-4 py-2">
          <span className="font-mono text-[0.5625rem] uppercase tracking-[0.15em] text-stone-400 dark:text-stone-500">
            Due Observations
          </span>
        </div>
        {loading && (
          <div className="px-4 py-8 text-center font-mono text-xs uppercase tracking-wider text-stone-400 dark:text-stone-500">
            Loading...
          </div>
        )}
        {error && (
          <div className="px-4 py-4 text-sm text-red-600 dark:text-red-400">Failed to load: {error}</div>
        )}
        {!loading && !error && rows.length === 0 && (
          <div className="px-4 py-8 text-center font-mono text-xs uppercase tracking-wider text-stone-400 dark:text-stone-500">
            Nothing due right now.
          </div>
        )}
        <div className="divide-y divide-[var(--color-border-default)]">
          {rows.map((c) => (
            <div
              key={c.id as number}
              className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between"
            >
              <Link
                href={`/commitments/${c.id}`}
                className="flex items-center gap-4 hover:text-amber-700 dark:hover:text-amber-500"
              >
                <span className="font-mono text-xs text-stone-500 dark:text-stone-400 w-16 shrink-0">
                  #{String(c.id)}
                </span>
                <div>
                  <div className="text-sm text-stone-900 dark:text-stone-100">
                    {c.service_name as string}
                  </div>
                  <AddressDisplay address={c.operator as string} />
                </div>
              </Link>
              <div className="flex items-center gap-6">
                <StatusBadge status={toBadgeStatus(commitmentStatusLabel(Number(c.status)))} />
                <button
                  disabled={!address || pending === Number(c.id)}
                  onClick={() => trigger(Number(c.id))}
                  className="border border-[var(--color-border-default)] px-3 py-1 font-mono text-[0.625rem] uppercase tracking-wider text-stone-600 transition-colors hover:border-amber-600 hover:text-amber-700 disabled:opacity-50 dark:text-stone-400 dark:hover:border-amber-500 dark:hover:text-amber-500"
                >
                  {pending === Number(c.id) ? "Triggering..." : "Trigger Now"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
