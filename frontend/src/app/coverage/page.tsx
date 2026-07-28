"use client";

import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import ValueDisplay from "@/components/ValueDisplay";
import {
  listCommitments,
  getCapitalState,
  getCommitmentPolicy,
  commitmentStatusLabel,
  toBadgeStatus,
} from "@/lib/genlayer";
import { useContractData } from "@/lib/useContractData";

interface CoverageOffer {
  commitment: Record<string, unknown>;
  capital: Record<string, unknown>;
  policy: Record<string, unknown>;
}

async function loadOffers(): Promise<CoverageOffer[]> {
  const commitments = await listCommitments();
  const active = commitments.filter((c) => Number(c.status) === 3 || Number(c.status) === 4);
  const [capitalStates, policies] = await Promise.all([
    Promise.all(active.map((c) => getCapitalState(BigInt(c.id as number)))),
    Promise.all(active.map((c) => getCommitmentPolicy(BigInt(c.id as number)))),
  ]);
  return active.map((commitment, i) => ({ commitment, capital: capitalStates[i], policy: policies[i] }));
}

export default function CoveragePage() {
  const { data: offers, loading, error } = useContractData(loadOffers, [], 20000);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="font-mono text-xs uppercase tracking-[0.15em] text-stone-900 dark:text-stone-100">
          Coverage Explorer
        </h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Browse commitments and purchase coverage policies
        </p>
      </div>

      {error && (
        <div className="border border-red-600/30 bg-red-600/5 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          Failed to load coverage offers: {error}
        </div>
      )}

      {!error && !loading && (offers ?? []).length === 0 && (
        <div className="border border-[var(--color-border-default)] bg-[var(--color-surface)] p-16 text-center font-mono text-xs uppercase tracking-wider text-stone-400 dark:text-stone-500">
          No active commitments accepting coverage right now.
        </div>
      )}

      {!error && (offers ?? []).length > 0 && (
        <div className="space-y-0 border border-[var(--color-border-default)]">
          {(offers ?? []).map((offer, i) => {
            const c = offer.commitment;
            const cap = offer.capital;
            const capacity = Number(cap.available_capacity ?? 0);
            const reserved = Number(cap.reserved_capital ?? 0);
            const utilizationPct =
              capacity + reserved > 0 ? Math.round((reserved / (capacity + reserved)) * 100) : 0;

            return (
              <div
                key={c.id as number}
                className={`bg-[var(--color-surface)] ${i > 0 ? "border-t border-[var(--color-border-default)]" : ""}`}
              >
                <div className="flex flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/commitments/${c.id}`}
                          className="text-sm font-medium text-stone-900 hover:text-amber-700 dark:text-stone-100 dark:hover:text-amber-500 transition-colors"
                        >
                          {c.service_name as string}
                        </Link>
                        <StatusBadge status={toBadgeStatus(commitmentStatusLabel(Number(c.status)))} />
                      </div>
                      <div className="mt-1 font-mono text-[0.5625rem] text-stone-400 dark:text-stone-500">
                        #{String(c.id)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-8">
                    <div>
                      <div className="font-mono text-[0.5625rem] uppercase tracking-wider text-stone-400 dark:text-stone-500">
                        Base Premium
                      </div>
                      <span className="font-mono text-xs text-stone-700 dark:text-stone-300">
                        {String(offer.policy.base_premium_bps ?? "--")} bps
                      </span>
                    </div>
                    <div>
                      <div className="font-mono text-[0.5625rem] uppercase tracking-wider text-stone-400 dark:text-stone-500">
                        Limit Range
                      </div>
                      <span className="font-mono text-xs text-stone-700 dark:text-stone-300">
                        {String(offer.policy.min_policy_limit ?? "--")} - {String(offer.policy.max_policy_limit ?? "--")}
                      </span>
                    </div>
                    <div className="w-32">
                      <div className="font-mono text-[0.5625rem] uppercase tracking-wider text-stone-400 dark:text-stone-500">
                        Capacity
                      </div>
                      <div className="mt-1 h-1.5 w-full bg-stone-200 dark:bg-stone-700">
                        <div
                          className={`h-full ${utilizationPct > 80 ? "bg-amber-600" : "bg-emerald-600"}`}
                          style={{ width: `${utilizationPct}%` }}
                        />
                      </div>
                      <div className="mt-0.5 font-mono text-[0.5rem] text-stone-400 dark:text-stone-500">
                        {utilizationPct}% used -- <ValueDisplay value={capacity.toLocaleString()} size="sm" /> avail.
                      </div>
                    </div>
                    <Link
                      href={`/commitments/${c.id}`}
                      className="shrink-0 border border-[var(--color-border-default)] px-4 py-1.5 font-mono text-[0.625rem] uppercase tracking-wider text-stone-700 transition-colors hover:border-amber-600 hover:text-amber-700 dark:text-stone-300 dark:hover:border-amber-500 dark:hover:text-amber-500"
                    >
                      View
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
