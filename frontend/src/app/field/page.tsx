"use client";

import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import AddressDisplay from "@/components/AddressDisplay";
import ValueDisplay from "@/components/ValueDisplay";
import { listCommitments, commitmentStatusLabel, toBadgeStatus } from "@/lib/genlayer";
import { useContractData } from "@/lib/useContractData";

export default function FieldPage() {
  const { data: commitments, loading, error } = useContractData(listCommitments, [], 15000);
  const activeCount = (commitments ?? []).filter(
    (c) => Number(c.status) === 3 || Number(c.status) === 4 || Number(c.status) === 5,
  ).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-mono text-xs uppercase tracking-[0.15em] text-stone-900 dark:text-stone-100">
            Commitment Field
          </h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            Active commitments across the network
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-600 animate-signal" />
          <span className="font-mono text-[0.5625rem] uppercase tracking-wider text-stone-400 dark:text-stone-500">
            {loading ? "Loading..." : `${activeCount} Active`}
          </span>
        </div>
      </div>

      {error && (
        <div className="border border-red-600/30 bg-red-600/5 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          Failed to load commitments: {error}
        </div>
      )}

      {!error && (
        <>
          {/* Table header */}
          <div className="hidden border-b border-[var(--color-border-default)] pb-2 md:grid md:grid-cols-[1fr_1.5fr_auto_auto_auto_auto] md:gap-4">
            {["Operator", "Service", "Status", "Bond", "Policies", "Consec. Failures"].map(
              (h) => (
                <div
                  key={h}
                  className="font-mono text-[0.5625rem] uppercase tracking-[0.15em] text-stone-400 dark:text-stone-500"
                >
                  {h}
                </div>
              )
            )}
          </div>

          {/* Rows */}
          <div className="divide-y divide-[var(--color-border-default)]">
            {(commitments ?? []).map((c) => (
              <Link
                key={c.id as number}
                href={`/commitments/${c.id}`}
                className="group grid items-center gap-4 py-3 transition-colors hover:bg-[var(--color-surface-alt)] md:grid-cols-[1fr_1.5fr_auto_auto_auto_auto]"
              >
                <div>
                  <AddressDisplay address={c.operator as string} />
                </div>
                <div className="text-sm text-stone-900 dark:text-stone-100">
                  {c.service_name as string}
                </div>
                <div>
                  <StatusBadge status={toBadgeStatus(commitmentStatusLabel(Number(c.status)))} />
                </div>
                <div>
                  <ValueDisplay value={Number(c.bond).toLocaleString()} size="sm" />
                </div>
                <div className="font-mono text-xs text-stone-500 dark:text-stone-400">
                  {String(c.active_policy_count)} / {String(c.policy_count)}
                </div>
                <div className="font-mono text-xs text-stone-500 dark:text-stone-400">
                  {String(c.consecutive_failures)}
                </div>
              </Link>
            ))}
            {!loading && (commitments ?? []).length === 0 && (
              <div className="flex items-center justify-center py-16 text-sm text-stone-400 dark:text-stone-500">
                No commitments have been created yet.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
