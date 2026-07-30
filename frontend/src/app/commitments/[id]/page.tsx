"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import StatusBadge from "@/components/StatusBadge";
import AddressDisplay from "@/components/AddressDisplay";
import ValueDisplay from "@/components/ValueDisplay";
import {
  getCommitment,
  getCommitmentPolicy,
  getCapitalState,
  getIncidentHistory,
  commitmentStatusLabel,
  toBadgeStatus,
  purchaseCoverage,
  extractErrorMessage,
} from "@/lib/genlayer";
import { useContractData } from "@/lib/useContractData";
import { useWallet } from "@/lib/wallet/WalletProvider";

interface CommitmentDetail {
  commitment: Record<string, unknown>;
  policy: Record<string, unknown>;
  capital: Record<string, unknown>;
  incidentIds: number[];
}

export default function CommitmentDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const fetcher = useCallback(async (): Promise<CommitmentDetail> => {
    const cid = BigInt(id);
    const [commitment, policy, capital, incidentIds] = await Promise.all([
      getCommitment(cid),
      getCommitmentPolicy(cid),
      getCapitalState(cid),
      getIncidentHistory(cid),
    ]);
    return { commitment, policy, capital, incidentIds };
  }, [id]);

  const { data, loading, error } = useContractData(fetcher, [id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center font-mono text-xs uppercase tracking-wider text-stone-400 dark:text-stone-500">
        Loading commitment...
      </div>
    );
  }

  if (error || !data || Object.keys(data.commitment).length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center">
        <div className="font-mono text-xs uppercase tracking-wider text-stone-400 dark:text-stone-500">
          {error ? `Failed to load: ${error}` : `Commitment #${id} not found`}
        </div>
        <Link
          href="/commitments"
          className="mt-4 inline-block font-mono text-[0.625rem] uppercase tracking-wider text-amber-700 hover:text-amber-600 dark:text-amber-500 dark:hover:text-amber-400 transition-colors"
        >
          Back to Commitments
        </Link>
      </div>
    );
  }

  const c = data.commitment;
  const capital = data.capital;
  const badgeStatus = toBadgeStatus(commitmentStatusLabel(Number(c.status)));
  const capacity = Number(capital.available_capacity ?? 0);
  const reserved = Number(capital.reserved_capital ?? 0);
  const utilizationPct =
    capacity + reserved > 0 ? Math.round((reserved / (capacity + reserved)) * 100) : 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2">
        <Link
          href="/commitments"
          className="font-mono text-[0.5625rem] uppercase tracking-[0.15em] text-stone-400 hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300 transition-colors"
        >
          Commitments
        </Link>
        <span className="text-stone-300 dark:text-stone-600">/</span>
        <span className="font-mono text-[0.5625rem] uppercase tracking-[0.15em] text-stone-600 dark:text-stone-300">
          #{String(c.id)}
        </span>
      </div>

      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-lg font-medium text-stone-900 dark:text-stone-100">
            {c.service_name as string}
          </h1>
          <div className="mt-2">
            <AddressDisplay address={c.operator as string} />
          </div>
        </div>
        <StatusBadge status={badgeStatus} />
      </div>

      {/* Promise */}
      <section className="mb-8 border border-[var(--color-border-default)] bg-[var(--color-surface)]">
        <div className="border-b border-[var(--color-border-default)] px-4 py-2">
          <span className="font-mono text-[0.5625rem] uppercase tracking-[0.15em] text-stone-400 dark:text-stone-500">
            Immutable Promise
          </span>
        </div>
        <div className="px-4 py-4">
          <p className="text-sm leading-relaxed text-stone-700 dark:text-stone-300">
            {c.description as string}
          </p>
          <p className="mt-2 font-mono text-xs text-stone-500 dark:text-stone-400">
            Target: {c.target_url as string}
          </p>
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Observation Status */}
        <section className="border border-[var(--color-border-default)] bg-[var(--color-surface)]">
          <div className="border-b border-[var(--color-border-default)] px-4 py-2">
            <span className="font-mono text-[0.5625rem] uppercase tracking-[0.15em] text-stone-400 dark:text-stone-500">
              Observation Status
            </span>
          </div>
          <div className="space-y-3 px-4 py-4">
            <div className="flex justify-between">
              <span className="text-sm text-stone-500 dark:text-stone-400">Interval</span>
              <span className="font-mono text-sm text-stone-900 dark:text-stone-100">
                {String(c.observation_interval)}s
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-stone-500 dark:text-stone-400">Grace Period</span>
              <span className="font-mono text-sm text-stone-900 dark:text-stone-100">
                {String(c.grace_period)}s
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-stone-500 dark:text-stone-400">Failure Threshold</span>
              <span className="font-mono text-sm text-stone-900 dark:text-stone-100">
                {String(c.failure_threshold)} consecutive
              </span>
            </div>
            <div className="border-t border-[var(--color-border-default)] pt-3">
              <div className="flex justify-between">
                <span className="text-sm text-stone-500 dark:text-stone-400">Consecutive Failures</span>
                <span className="font-mono text-xs text-stone-600 dark:text-stone-400">
                  {String(c.consecutive_failures)}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Operator Bond */}
        <section className="border border-[var(--color-border-default)] bg-[var(--color-surface)]">
          <div className="border-b border-[var(--color-border-default)] px-4 py-2">
            <span className="font-mono text-[0.5625rem] uppercase tracking-[0.15em] text-stone-400 dark:text-stone-500">
              Operator Bond
            </span>
          </div>
          <div className="space-y-3 px-4 py-4">
            <div className="flex justify-between">
              <span className="text-sm text-stone-500 dark:text-stone-400">Bonded</span>
              <ValueDisplay value={Number(c.bond).toLocaleString()} />
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-stone-500 dark:text-stone-400">Slashed</span>
              <ValueDisplay value={Number(c.bond_slashed).toLocaleString()} />
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-stone-500 dark:text-stone-400">Operator</span>
              <AddressDisplay address={c.operator as string} />
            </div>
          </div>
        </section>

        {/* Coverage Vault */}
        <section className="border border-[var(--color-border-default)] bg-[var(--color-surface)]">
          <div className="border-b border-[var(--color-border-default)] px-4 py-2">
            <span className="font-mono text-[0.5625rem] uppercase tracking-[0.15em] text-stone-400 dark:text-stone-500">
              Coverage Vault
            </span>
          </div>
          <div className="space-y-3 px-4 py-4">
            <div className="flex justify-between">
              <span className="text-sm text-stone-500 dark:text-stone-400">Gross Capital</span>
              <ValueDisplay value={Number(capital.gross_capital ?? 0).toLocaleString()} />
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-stone-500 dark:text-stone-400">Reserved</span>
              <ValueDisplay value={Number(capital.reserved_capital ?? 0).toLocaleString()} />
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-stone-500 dark:text-stone-400">Free</span>
              <ValueDisplay value={Number(capital.free_capital ?? 0).toLocaleString()} />
            </div>
            <div className="border-t border-[var(--color-border-default)] pt-3">
              <div className="h-1.5 w-full bg-stone-200 dark:bg-stone-700">
                <div className="h-full bg-amber-600" style={{ width: `${utilizationPct}%` }} />
              </div>
              <div className="mt-1 font-mono text-[0.5625rem] text-stone-400 dark:text-stone-500 text-right">
                {utilizationPct}% reserved
              </div>
            </div>
          </div>
        </section>

        {/* Policy Terms */}
        <section className="border border-[var(--color-border-default)] bg-[var(--color-surface)]">
          <div className="border-b border-[var(--color-border-default)] px-4 py-2">
            <span className="font-mono text-[0.5625rem] uppercase tracking-[0.15em] text-stone-400 dark:text-stone-500">
              Policy Terms
            </span>
          </div>
          <div className="space-y-3 px-4 py-4">
            <div className="flex justify-between">
              <span className="text-sm text-stone-500 dark:text-stone-400">Base Premium</span>
              <span className="font-mono text-sm text-stone-900 dark:text-stone-100">
                {String(data.policy.base_premium_bps ?? "--")} bps
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-stone-500 dark:text-stone-400">Deductible</span>
              <span className="font-mono text-sm text-stone-900 dark:text-stone-100">
                {String(data.policy.deductible_bps ?? "--")} bps
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-stone-500 dark:text-stone-400">Limit Range</span>
              <span className="font-mono text-sm text-stone-900 dark:text-stone-100">
                {String(data.policy.min_policy_limit ?? "--")} - {String(data.policy.max_policy_limit ?? "--")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-stone-500 dark:text-stone-400">Active Policies</span>
              <span className="font-mono text-sm text-stone-900 dark:text-stone-100">
                {String(c.active_policy_count ?? 0)} / {String(c.policy_count ?? 0)}
              </span>
            </div>
          </div>
        </section>
      </div>

      {/* Incident History */}
      <section className="mt-6 border border-[var(--color-border-default)] bg-[var(--color-surface)]">
        <div className="border-b border-[var(--color-border-default)] px-4 py-2">
          <span className="font-mono text-[0.5625rem] uppercase tracking-[0.15em] text-stone-400 dark:text-stone-500">
            Incident History
          </span>
        </div>
        {data.incidentIds.length > 0 ? (
          <div className="divide-y divide-[var(--color-border-default)]">
            {data.incidentIds.map((incId) => (
              <Link
                key={incId}
                href={`/incidents/${incId}`}
                className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-[var(--color-surface-alt)]"
              >
                <span className="font-mono text-xs text-stone-600 dark:text-stone-400">
                  Incident #{incId}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="px-4 py-8 text-center text-sm text-stone-400 dark:text-stone-500">
            No incidents recorded.
          </div>
        )}
      </section>

      {/* Action */}
      {Number(c.status) === 3 && (
        <div className="mt-8">
          <PurchaseCoverageForm
            commitmentId={Number(c.id)}
            minLimit={Number(data.policy.min_policy_limit ?? 0)}
            maxLimit={Number(data.policy.max_policy_limit ?? 0)}
            minDuration={Number(data.policy.min_policy_duration ?? 0)}
            maxDuration={Number(data.policy.max_policy_duration ?? 0)}
          />
        </div>
      )}
    </div>
  );
}

function PurchaseCoverageForm({
  commitmentId,
  minLimit,
  maxLimit,
  minDuration,
  maxDuration,
}: {
  commitmentId: number;
  minLimit: number;
  maxLimit: number;
  minDuration: number;
  maxDuration: number;
}) {
  const { address, provider, connect } = useWallet();
  const [limit, setLimit] = useState(String(minLimit || 100));
  const [duration, setDuration] = useState(String(minDuration || 86400));
  const [maxPremium, setMaxPremium] = useState("100");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      const tx = await purchaseCoverage(
        { provider },
        commitmentId,
        Number(limit),
        Number(duration),
        BigInt(maxPremium),
      );
      setMessage({
        kind: "ok",
        text: `Policy purchased: ${tx.slice(0, 14)}... Note: any overpayment refund is queued via emit_transfer, which does not currently settle to wallet addresses on StudioNet -- see HANDOFF.md.`,
      });
      window.location.reload();
    } catch (e2) {
      setMessage({ kind: "err", text: extractErrorMessage(e2) });
    } finally {
      setSubmitting(false);
    }
  }

  if (!address) {
    return (
      <div className="flex justify-end">
        <button
          onClick={connect}
          className="border border-amber-600 px-6 py-2 font-mono text-[0.6875rem] uppercase tracking-[0.15em] text-amber-700 transition-colors hover:bg-amber-600 hover:text-white dark:text-amber-500 dark:hover:bg-amber-600 dark:hover:text-white"
        >
          Connect Wallet to Purchase Coverage
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border border-[var(--color-border-default)] bg-[var(--color-surface)] p-6"
    >
      <div className="mb-4 font-mono text-[0.625rem] uppercase tracking-[0.15em] text-stone-400 dark:text-stone-500">
        Purchase Coverage
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <label className="block">
          <span className="font-mono text-[0.5625rem] uppercase tracking-wider text-stone-400 dark:text-stone-500">
            Limit ({minLimit}-{maxLimit})
          </span>
          <input
            type="number"
            min={minLimit}
            max={maxLimit}
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            className="mt-1 w-full border border-[var(--color-border-default)] bg-transparent px-3 py-1.5 text-sm text-stone-900 dark:text-stone-100"
          />
        </label>
        <label className="block">
          <span className="font-mono text-[0.5625rem] uppercase tracking-wider text-stone-400 dark:text-stone-500">
            Duration secs ({minDuration}-{maxDuration})
          </span>
          <input
            type="number"
            min={minDuration}
            max={maxDuration}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="mt-1 w-full border border-[var(--color-border-default)] bg-transparent px-3 py-1.5 text-sm text-stone-900 dark:text-stone-100"
          />
        </label>
        <label className="block">
          <span className="font-mono text-[0.5625rem] uppercase tracking-wider text-stone-400 dark:text-stone-500">
            Max Premium (excess refunded)
          </span>
          <input
            type="number"
            min="1"
            value={maxPremium}
            onChange={(e) => setMaxPremium(e.target.value)}
            className="mt-1 w-full border border-[var(--color-border-default)] bg-transparent px-3 py-1.5 text-sm text-stone-900 dark:text-stone-100"
          />
        </label>
      </div>
      {message && (
        <div
          className={`mt-4 font-mono text-xs ${
            message.kind === "ok" ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
          }`}
        >
          {message.text}
        </div>
      )}
      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="border border-amber-600 px-6 py-2 font-mono text-[0.6875rem] uppercase tracking-[0.15em] text-amber-700 transition-colors hover:bg-amber-600 hover:text-white disabled:opacity-50 dark:text-amber-500"
        >
          {submitting ? "Submitting..." : "Purchase Coverage"}
        </button>
      </div>
    </form>
  );
}
