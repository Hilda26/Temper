"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import ValueDisplay from "@/components/ValueDisplay";
import { useWallet } from "@/lib/wallet/WalletProvider";
import { useContractData } from "@/lib/useContractData";
import {
  getOperatorPositions,
  getCommitment,
  createCommitment,
  depositOperatorBond,
  addOperatorBond,
  activateCommitment,
  commitmentStatusLabel,
  toBadgeStatus,
  extractErrorMessage,
} from "@/lib/genlayer";

const C_DRAFT = 0;
const C_BONDING = 1;
const C_CAPITALISING = 2;

function useActionState() {
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  return { pending, setPending, message, setMessage };
}

export default function OperatorPage() {
  const { address, provider, connect } = useWallet();

  const fetcher = useCallback(async () => {
    if (!address) return [];
    const ids = await getOperatorPositions(address);
    return Promise.all(ids.map((id) => getCommitment(BigInt(id))));
  }, [address]);

  const { data: commitments, loading, error } = useContractData(fetcher, [address], 15000);

  const [showCreate, setShowCreate] = useState(false);
  const action = useActionState();

  const list = commitments ?? [];
  const totalBonded = list.reduce((sum, c) => sum + Number(c.bond ?? 0), 0);
  const totalSlashed = list.reduce((sum, c) => sum + Number(c.bond_slashed ?? 0), 0);
  const atRisk = list
    .filter((c) => Number(c.active_incident ?? 0) > 0)
    .reduce((sum, c) => sum + Number(c.bond ?? 0), 0);

  async function runAction(key: string, fn: () => Promise<string>) {
    action.setPending(key);
    action.setMessage(null);
    try {
      const tx = await fn();
      action.setMessage({ kind: "ok", text: `Confirmed: ${tx.slice(0, 14)}...` });
      window.location.reload();
    } catch (e) {
      action.setMessage({ kind: "err", text: extractErrorMessage(e) });
    } finally {
      action.setPending(null);
    }
  }

  if (!address) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center">
        <div className="font-mono text-xs uppercase tracking-wider text-stone-400 dark:text-stone-500">
          Connect a wallet to manage commitments
        </div>
        <button
          onClick={connect}
          className="mt-4 border border-amber-600 px-6 py-2 font-mono text-[0.6875rem] uppercase tracking-[0.15em] text-amber-700 transition-colors hover:bg-amber-600 hover:text-white dark:text-amber-500 dark:hover:bg-amber-600 dark:hover:text-white"
        >
          Connect Wallet
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="font-mono text-xs uppercase tracking-[0.15em] text-stone-900 dark:text-stone-100">
          Operator Console
        </h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Manage commitments, bonds, and incident responses
        </p>
      </div>

      {/* Bond Summary */}
      <div className="mb-8 grid grid-cols-3 gap-px border border-[var(--color-border-default)] bg-[var(--color-border-default)]">
        <div className="bg-[var(--color-surface)] p-4">
          <div className="font-mono text-[0.5625rem] uppercase tracking-[0.15em] text-stone-400 dark:text-stone-500">
            Total Bonded
          </div>
          <div className="mt-1">
            <ValueDisplay value={totalBonded.toLocaleString()} size="lg" />
          </div>
        </div>
        <div className="bg-[var(--color-surface)] p-4">
          <div className="font-mono text-[0.5625rem] uppercase tracking-[0.15em] text-stone-400 dark:text-stone-500">
            Total Slashed
          </div>
          <div className="mt-1">
            <ValueDisplay value={totalSlashed.toLocaleString()} size="lg" />
          </div>
        </div>
        <div className="bg-[var(--color-surface)] p-4">
          <div className="font-mono text-[0.5625rem] uppercase tracking-[0.15em] text-red-500 dark:text-red-400">
            At Risk
          </div>
          <div className="mt-1">
            <ValueDisplay value={atRisk.toLocaleString()} size="lg" />
          </div>
        </div>
      </div>

      {/* My Commitments */}
      <section className="mb-8 border border-[var(--color-border-default)] bg-[var(--color-surface)]">
        <div className="border-b border-[var(--color-border-default)] px-4 py-2">
          <span className="font-mono text-[0.5625rem] uppercase tracking-[0.15em] text-stone-400 dark:text-stone-500">
            My Commitments
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
        {!loading && !error && list.length === 0 && (
          <div className="px-4 py-8 text-center font-mono text-xs uppercase tracking-wider text-stone-400 dark:text-stone-500">
            No commitments yet. Create one below.
          </div>
        )}
        <div className="divide-y divide-[var(--color-border-default)]">
          {list.map((c) => {
            const status = Number(c.status ?? 0);
            const bond = Number(c.bond ?? 0);
            const minBond = Number(c.min_bond ?? 0);
            const canActivate =
              (status === C_BONDING || status === C_CAPITALISING) && bond >= minBond;
            return (
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
                  <span className="text-sm text-stone-900 dark:text-stone-100">
                    {c.service_name as string}
                  </span>
                </Link>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="text-right">
                    <div className="font-mono text-[0.5rem] uppercase tracking-wider text-stone-400 dark:text-stone-500">
                      Bond
                    </div>
                    <ValueDisplay value={bond.toLocaleString()} size="sm" />
                  </div>
                  <StatusBadge status={toBadgeStatus(commitmentStatusLabel(status))} />
                  <BondForm
                    pending={action.pending === `bond-${c.id}`}
                    onSubmit={(amount) =>
                      runAction(`bond-${c.id}`, () =>
                        status === C_DRAFT
                          ? depositOperatorBond({ provider }, Number(c.id), BigInt(amount))
                          : addOperatorBond({ provider }, Number(c.id), BigInt(amount)),
                      )
                    }
                  />
                  {canActivate && (
                    <button
                      disabled={action.pending === `activate-${c.id}`}
                      onClick={() =>
                        runAction(`activate-${c.id}`, () => activateCommitment({ provider }, Number(c.id)))
                      }
                      className="shrink-0 border border-emerald-600 px-3 py-1 font-mono text-[0.625rem] uppercase tracking-wider text-emerald-700 transition-colors hover:bg-emerald-600 hover:text-white disabled:opacity-50 dark:text-emerald-400"
                    >
                      {action.pending === `activate-${c.id}` ? "..." : "Activate"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {action.message && (
        <div
          className={`mb-6 border px-4 py-2 font-mono text-xs ${
            action.message.kind === "ok"
              ? "border-emerald-600/40 text-emerald-700 dark:text-emerald-400"
              : "border-red-600/40 text-red-700 dark:text-red-400"
          }`}
        >
          {action.message.text}
        </div>
      )}

      {/* Actions */}
      {!showCreate ? (
        <button
          onClick={() => setShowCreate(true)}
          className="border border-amber-600 px-6 py-2 font-mono text-[0.6875rem] uppercase tracking-[0.15em] text-amber-700 transition-colors hover:bg-amber-600 hover:text-white dark:text-amber-500 dark:hover:bg-amber-600 dark:hover:text-white"
        >
          Create Commitment
        </button>
      ) : (
        <CreateCommitmentForm
          provider={provider}
          onClose={() => setShowCreate(false)}
          onSuccess={() => window.location.reload()}
        />
      )}
    </div>
  );
}

function BondForm({
  pending,
  onSubmit,
}: {
  pending: boolean;
  onSubmit: (amount: number) => void;
}) {
  const [value, setValue] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const n = Number(value);
        if (n > 0) onSubmit(n);
      }}
      className="flex items-center gap-1"
    >
      <input
        type="number"
        min="1"
        placeholder="Amount"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-20 border border-[var(--color-border-default)] bg-transparent px-2 py-1 font-mono text-xs text-stone-900 dark:text-stone-100"
      />
      <button
        type="submit"
        disabled={pending}
        className="shrink-0 border border-[var(--color-border-default)] px-3 py-1 font-mono text-[0.625rem] uppercase tracking-wider text-stone-700 transition-colors hover:border-amber-600 hover:text-amber-700 disabled:opacity-50 dark:text-stone-300 dark:hover:border-amber-500 dark:hover:text-amber-500"
      >
        {pending ? "..." : "Bond"}
      </button>
    </form>
  );
}

function CreateCommitmentForm({
  provider,
  onClose,
  onSuccess,
}: {
  provider: unknown;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [serviceName, setServiceName] = useState("");
  const [description, setDescription] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [backupUrl, setBackupUrl] = useState("");
  const [minBond, setMinBond] = useState("100");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await createCommitment(
        { provider },
        {
          serviceName,
          description,
          template: 0,
          targetUrl,
          backupUrl: backupUrl || targetUrl,
          observationInterval: 60,
          gracePeriod: 120,
          failureThreshold: 3,
          minBond: Number(minBond),
          slashLadder: '{"1":0,"2":500,"3":2500,"4":10000}',
          payoutTiers: '{"0":0,"1":1000,"2":3500,"3":10000}',
          maxPolicyLimit: 1000000,
          minPolicyLimit: 100,
          maxPolicyDuration: 2592000,
          minPolicyDuration: 86400,
          basePremiumBps: 500,
          deductibleBps: 100,
          waitingPeriod: 0,
          challengeWindow: 300,
          maxCumulativeSlashBps: 10000,
        },
      );
      onSuccess();
    } catch (e2) {
      setError(extractErrorMessage(e2));
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-xl border border-[var(--color-border-default)] bg-[var(--color-surface)] p-6 space-y-4"
    >
      <div className="font-mono text-[0.625rem] uppercase tracking-[0.15em] text-stone-400 dark:text-stone-500">
        New Commitment
      </div>
      <label className="block">
        <span className="font-mono text-[0.5625rem] uppercase tracking-wider text-stone-400 dark:text-stone-500">
          Service Name
        </span>
        <input
          required
          value={serviceName}
          onChange={(e) => setServiceName(e.target.value)}
          className="mt-1 w-full border border-[var(--color-border-default)] bg-transparent px-3 py-1.5 text-sm text-stone-900 dark:text-stone-100"
        />
      </label>
      <label className="block">
        <span className="font-mono text-[0.5625rem] uppercase tracking-wider text-stone-400 dark:text-stone-500">
          Description
        </span>
        <textarea
          required
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1 w-full border border-[var(--color-border-default)] bg-transparent px-3 py-1.5 text-sm text-stone-900 dark:text-stone-100"
        />
      </label>
      <label className="block">
        <span className="font-mono text-[0.5625rem] uppercase tracking-wider text-stone-400 dark:text-stone-500">
          Target URL
        </span>
        <input
          required
          type="url"
          value={targetUrl}
          onChange={(e) => setTargetUrl(e.target.value)}
          placeholder="https://example.com/health"
          className="mt-1 w-full border border-[var(--color-border-default)] bg-transparent px-3 py-1.5 text-sm text-stone-900 dark:text-stone-100"
        />
      </label>
      <label className="block">
        <span className="font-mono text-[0.5625rem] uppercase tracking-wider text-stone-400 dark:text-stone-500">
          Backup URL (optional)
        </span>
        <input
          type="url"
          value={backupUrl}
          onChange={(e) => setBackupUrl(e.target.value)}
          className="mt-1 w-full border border-[var(--color-border-default)] bg-transparent px-3 py-1.5 text-sm text-stone-900 dark:text-stone-100"
        />
      </label>
      <label className="block">
        <span className="font-mono text-[0.5625rem] uppercase tracking-wider text-stone-400 dark:text-stone-500">
          Minimum Bond
        </span>
        <input
          required
          type="number"
          min="1"
          value={minBond}
          onChange={(e) => setMinBond(e.target.value)}
          className="mt-1 w-full border border-[var(--color-border-default)] bg-transparent px-3 py-1.5 text-sm text-stone-900 dark:text-stone-100"
        />
      </label>

      {error && <div className="text-sm text-red-600 dark:text-red-400">{error}</div>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="border border-amber-600 px-6 py-2 font-mono text-[0.6875rem] uppercase tracking-[0.15em] text-amber-700 transition-colors hover:bg-amber-600 hover:text-white disabled:opacity-50 dark:text-amber-500"
        >
          {submitting ? "Submitting..." : "Create"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="border border-[var(--color-border-default)] px-6 py-2 font-mono text-[0.6875rem] uppercase tracking-[0.15em] text-stone-600 dark:text-stone-400"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
