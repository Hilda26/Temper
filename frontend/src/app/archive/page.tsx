"use client";

import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import ValueDisplay from "@/components/ValueDisplay";
import {
  listCommitments,
  listIncidents,
  commitmentStatusLabel,
  incidentStatusLabel,
  responsibilityLabel,
  toBadgeStatus,
} from "@/lib/genlayer";
import { useContractData } from "@/lib/useContractData";

interface ArchiveData {
  settledIncidents: Record<string, unknown>[];
  closedCommitments: Record<string, unknown>[];
}

async function loadArchive(): Promise<ArchiveData> {
  const [commitments, incidents] = await Promise.all([listCommitments(), listIncidents()]);
  return {
    settledIncidents: incidents.filter(
      (i) => Number(i.status) === 7 || Number(i.status) === 8 || Number(i.status) === 9,
    ),
    closedCommitments: commitments.filter((c) => Number(c.status) === 8),
  };
}

export default function ArchivePage() {
  const { data, loading, error } = useContractData(loadArchive, [], 20000);
  const settledIncidents = data?.settledIncidents ?? [];
  const closedCommitments = data?.closedCommitments ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="font-mono text-xs uppercase tracking-[0.15em] text-stone-900 dark:text-stone-100">
          Archive
        </h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Settled incidents and closed commitments
        </p>
      </div>

      {error && (
        <div className="border border-red-600/30 bg-red-600/5 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          Failed to load archive: {error}
        </div>
      )}

      {!error && (
        <>
          {/* Settled Incidents */}
          <section className="mb-10 border border-[var(--color-border-default)] bg-[var(--color-surface)]">
            <div className="border-b border-[var(--color-border-default)] px-4 py-2">
              <span className="font-mono text-[0.5625rem] uppercase tracking-[0.15em] text-stone-400 dark:text-stone-500">
                Settled Incidents
              </span>
            </div>
            {!loading && settledIncidents.length === 0 && (
              <div className="px-4 py-12 text-center font-mono text-xs uppercase tracking-wider text-stone-400 dark:text-stone-500">
                No settled incidents yet.
              </div>
            )}
            <div className="divide-y divide-[var(--color-border-default)]">
              {settledIncidents.map((inc) => (
                <Link
                  key={inc.id as number}
                  href={`/incidents/${inc.id}`}
                  className="flex flex-col gap-3 px-4 py-3 transition-colors hover:bg-[var(--color-surface-alt)] md:flex-row md:items-center md:justify-between"
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
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="font-mono text-[0.5rem] uppercase tracking-wider text-stone-400 dark:text-stone-500">
                        Responsibility
                      </div>
                      <span className="font-mono text-xs text-stone-700 dark:text-stone-300">
                        {responsibilityLabel(Number(inc.responsibility))}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-[0.5rem] uppercase tracking-wider text-stone-400 dark:text-stone-500">
                        Slashed
                      </div>
                      <ValueDisplay value={Number(inc.slash_amount).toLocaleString()} size="sm" />
                    </div>
                    <StatusBadge status={toBadgeStatus(incidentStatusLabel(Number(inc.status)))} />
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* Closed Commitments */}
          <section className="border border-[var(--color-border-default)] bg-[var(--color-surface)]">
            <div className="border-b border-[var(--color-border-default)] px-4 py-2">
              <span className="font-mono text-[0.5625rem] uppercase tracking-[0.15em] text-stone-400 dark:text-stone-500">
                Closed Commitments
              </span>
            </div>
            {!loading && closedCommitments.length === 0 && (
              <div className="px-4 py-12 text-center font-mono text-xs uppercase tracking-wider text-stone-400 dark:text-stone-500">
                No closed commitments yet.
              </div>
            )}
            <div className="divide-y divide-[var(--color-border-default)]">
              {closedCommitments.map((c) => (
                <Link
                  key={c.id as number}
                  href={`/commitments/${c.id}`}
                  className="flex flex-col gap-3 px-4 py-3 transition-colors hover:bg-[var(--color-surface-alt)] md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-xs text-stone-500 dark:text-stone-400 w-16 shrink-0">
                      #{String(c.id)}
                    </span>
                    <div className="text-sm text-stone-900 dark:text-stone-100">
                      {c.service_name as string}
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="font-mono text-[0.5rem] uppercase tracking-wider text-stone-400 dark:text-stone-500">
                        Total Bonded
                      </div>
                      <ValueDisplay value={Number(c.bond).toLocaleString()} size="sm" />
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-[0.5rem] uppercase tracking-wider text-stone-400 dark:text-stone-500">
                        Incidents
                      </div>
                      <span className="font-mono text-xs text-stone-700 dark:text-stone-300">
                        {String(c.incident_count)}
                      </span>
                    </div>
                    <StatusBadge status={toBadgeStatus(commitmentStatusLabel(Number(c.status)))} />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
