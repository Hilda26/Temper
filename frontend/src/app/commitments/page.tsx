"use client";

import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import AddressDisplay from "@/components/AddressDisplay";
import { listCommitments, commitmentStatusLabel, toBadgeStatus } from "@/lib/genlayer";
import { useContractData } from "@/lib/useContractData";

const GROUP_DEFS = [
  { label: "Active", statuses: [3, 4], badge: "ACTIVE" },
  { label: "Incident Open", statuses: [5], badge: "INCIDENT_OPEN" },
  { label: "Bonding / Capitalising", statuses: [0, 1, 2], badge: "OBSERVING" },
  { label: "Closed", statuses: [6, 7, 8], badge: "CLOSED" },
];

export default function CommitmentsPage() {
  const { data: commitments, loading, error } = useContractData(listCommitments, [], 15000);
  const list = commitments ?? [];

  const groups = GROUP_DEFS.map((g) => ({
    ...g,
    count: list.filter((c) => g.statuses.includes(Number(c.status))).length,
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="font-mono text-xs uppercase tracking-[0.15em] text-stone-900 dark:text-stone-100">
          Commitments
        </h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          All registered commitments and their current state
        </p>
      </div>

      {/* Status summary */}
      <div className="mb-8 grid grid-cols-2 gap-px border border-[var(--color-border-default)] bg-[var(--color-border-default)] md:grid-cols-4">
        {groups.map((g) => (
          <div key={g.label} className="bg-[var(--color-surface)] p-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[0.5625rem] uppercase tracking-[0.15em] text-stone-400 dark:text-stone-500">
                {g.label}
              </span>
              <StatusBadge status={g.badge} />
            </div>
            <div className="mt-2 font-mono text-2xl text-stone-900 dark:text-stone-100">
              {loading ? "--" : g.count}
            </div>
          </div>
        ))}
      </div>

      {/* List */}
      <div className="border border-[var(--color-border-default)]">
        <div className="border-b border-[var(--color-border-default)] bg-[var(--color-surface)] px-4 py-3">
          <span className="font-mono text-[0.5625rem] uppercase tracking-[0.15em] text-stone-400 dark:text-stone-500">
            All Commitments
          </span>
        </div>

        {error && (
          <div className="px-4 py-6 text-sm text-red-700 dark:text-red-400">
            Failed to load commitments: {error}
          </div>
        )}

        {!error && loading && (
          <div className="flex items-center justify-center bg-[var(--color-surface)] p-16">
            <div className="font-mono text-xs uppercase tracking-wider text-stone-400 dark:text-stone-500">
              Loading commitment registry...
            </div>
          </div>
        )}

        {!error && !loading && list.length === 0 && (
          <div className="flex items-center justify-center bg-[var(--color-surface)] p-16">
            <div className="text-center">
              <div className="font-mono text-xs uppercase tracking-wider text-stone-400 dark:text-stone-500">
                No commitments yet
              </div>
              <Link
                href="/operator"
                className="mt-4 inline-block font-mono text-[0.625rem] uppercase tracking-wider text-amber-700 hover:text-amber-600 dark:text-amber-500 dark:hover:text-amber-400 transition-colors"
              >
                Create the first one
              </Link>
            </div>
          </div>
        )}

        {!error && !loading && list.length > 0 && (
          <div className="divide-y divide-[var(--color-border-default)] bg-[var(--color-surface)]">
            {list.map((c) => (
              <Link
                key={c.id as number}
                href={`/commitments/${c.id}`}
                className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-[var(--color-surface-alt)]"
              >
                <div className="flex items-center gap-4">
                  <span className="font-mono text-xs text-stone-500 dark:text-stone-400 w-10 shrink-0">
                    #{String(c.id)}
                  </span>
                  <div>
                    <div className="text-sm text-stone-900 dark:text-stone-100">
                      {c.service_name as string}
                    </div>
                    <AddressDisplay address={c.operator as string} />
                  </div>
                </div>
                <StatusBadge status={toBadgeStatus(commitmentStatusLabel(Number(c.status)))} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
