"use client";

import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import ValueDisplay from "@/components/ValueDisplay";
import { listIncidents, incidentStatusLabel, severityLabel, toBadgeStatus } from "@/lib/genlayer";
import { useContractData } from "@/lib/useContractData";

function formatDuration(seconds: number): string {
  if (seconds <= 0) return "--";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function IncidentsPage() {
  const { data: incidents, loading, error } = useContractData(listIncidents, [], 15000);
  const open = (incidents ?? []).filter((i) => Number(i.status) < 8);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-mono text-xs uppercase tracking-[0.15em] text-stone-900 dark:text-stone-100">
            Active Incidents
          </h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            Open and contested incidents across commitments
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-600 animate-signal" />
          <span className="font-mono text-[0.5625rem] uppercase tracking-wider text-stone-400 dark:text-stone-500">
            {loading ? "Loading..." : `${open.length} Open`}
          </span>
        </div>
      </div>

      {error && (
        <div className="border border-red-600/30 bg-red-600/5 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          Failed to load incidents: {error}
        </div>
      )}

      {!error && !loading && open.length === 0 && (
        <div className="border border-[var(--color-border-default)] bg-[var(--color-surface)] p-16 text-center font-mono text-xs uppercase tracking-wider text-stone-400 dark:text-stone-500">
          No open incidents.
        </div>
      )}

      {!error && open.length > 0 && (
        <div className="border border-[var(--color-border-default)]">
          {open.map((inc, i) => (
            <Link
              key={inc.id as number}
              href={`/incidents/${inc.id}`}
              className={`group flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-[var(--color-surface-alt)] md:flex-row md:items-center md:justify-between ${
                i > 0 ? "border-t border-[var(--color-border-default)]" : ""
              } bg-[var(--color-surface)]`}
            >
              <div className="flex items-center gap-4">
                <span className="font-mono text-xs text-stone-500 dark:text-stone-400 w-16 shrink-0">
                  #{String(inc.id)}
                </span>
                <div>
                  <div className="text-sm text-stone-900 dark:text-stone-100">
                    Commitment #{String(inc.commitment_id)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6 md:gap-8">
                <div className="text-right">
                  <div className="font-mono text-[0.5625rem] uppercase tracking-wider text-stone-400 dark:text-stone-500">
                    Severity
                  </div>
                  <div className="font-mono text-xs text-stone-700 dark:text-stone-300">
                    {severityLabel(Number(inc.severity))}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-[0.5625rem] uppercase tracking-wider text-stone-400 dark:text-stone-500">
                    Duration
                  </div>
                  <div className="font-mono text-xs text-stone-700 dark:text-stone-300">
                    {formatDuration(Number(inc.duration))}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-[0.5625rem] uppercase tracking-wider text-stone-400 dark:text-stone-500">
                    Slash Amount
                  </div>
                  <ValueDisplay value={Number(inc.slash_amount).toLocaleString()} size="sm" />
                </div>
                <StatusBadge status={toBadgeStatus(incidentStatusLabel(Number(inc.status)))} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
