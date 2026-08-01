"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import ValueDisplay from "@/components/ValueDisplay";
import TransactionLink from "@/components/TransactionLink";
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
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string; txHash?: string } | null>(
    null,
  );
  return { pending, setPending, message, setMessage };
}

export default function OperatorPage() {
  const { address, provider, connect, connecting, error: walletError } = useWallet();

  const fetcher = useCallback(async () => {
    if (!address) return [];
    const ids = await getOperatorPositions(address);
    const settled = await Promise.allSettled(ids.map((id) => getCommitment(BigInt(id))));
    return settled
      .filter((result): result is PromiseFulfilledResult<Record<string, unknown>> => result.status === "fulfilled")
      .map((result) => result.value)
      .filter((commitment) => Object.keys(commitment).length > 0);
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
      action.setMessage({ kind: "ok", text: "Confirmed", txHash: tx });
      setTimeout(() => window.location.reload(), 2500);
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
          disabled={connecting}
          className="mt-4 border border-amber-600 px-6 py-2 font-mono text-[0.6875rem] uppercase tracking-[0.15em] text-amber-700 transition-colors hover:bg-amber-600 hover:text-white disabled:opacity-50 dark:text-amber-500 dark:hover:bg-amber-600 dark:hover:text-white"
        >
          {connecting ? "Connecting..." : "Connect Wallet"}
        </button>
        {walletError && (
          <div className="mt-4 border border-red-600/40 bg-red-600/5 px-4 py-2 text-sm text-red-700 dark:text-red-400">
            {walletError}
          </div>
        )}
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
                          ? depositOperatorBond({ provider, account: address }, Number(c.id), BigInt(amount))
                          : addOperatorBond({ provider, account: address }, Number(c.id), BigInt(amount)),
                      )
                    }
                  />
                  {canActivate && (
                    <button
                      disabled={action.pending === `activate-${c.id}`}
                      onClick={() =>
                        runAction(`activate-${c.id}`, () => activateCommitment({ provider, account: address }, Number(c.id)))
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
          className={`mb-6 flex items-center gap-2 border px-4 py-2 font-mono text-xs ${
            action.message.kind === "ok"
              ? "border-emerald-600/40 text-emerald-700 dark:text-emerald-400"
              : "border-red-600/40 text-red-700 dark:text-red-400"
          }`}
        >
          <span>{action.message.text}</span>
          {action.message.txHash && <TransactionLink hash={action.message.txHash} />}
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
          address={address}
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

const COMMITMENT_REGISTRY_RETRIES = 60;
const COMMITMENT_REGISTRY_INTERVAL_MS = 3000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForNewOperatorCommitmentId(operator: string, existingIds: Set<number>) {
  for (let attempt = 0; attempt < COMMITMENT_REGISTRY_RETRIES; attempt += 1) {
    const ids = await getOperatorPositions(operator);
    const newest = ids
      .map(Number)
      .filter((id) => !existingIds.has(id))
      .sort((a, b) => b - a)[0];
    if (newest) return newest;
    await sleep(COMMITMENT_REGISTRY_INTERVAL_MS);
  }
  throw new Error("Commitment was created, but StudioNet reads are still catching up. Refresh and finish bonding from My Commitments.");
}

function CreateCommitmentForm({
  provider,
  address,
  onClose,
  onSuccess,
}: {
  provider: unknown;
  address: `0x${string}`;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [serviceName, setServiceName] = useState("");
  const [description, setDescription] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [backupUrl, setBackupUrl] = useState("");
  const [minBond, setMinBond] = useState("100");
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [txHashes, setTxHashes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const minBondNumber = Number(minBond);
    if (!Number.isInteger(minBondNumber) || minBondNumber <= 0) {
      setError("Minimum bond must be a whole number greater than zero.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setProgress("Creating commitment...");
    setTxHashes([]);

    try {
      const beforeIds = new Set((await getOperatorPositions(address)).map(Number));
      const writeOptions = { provider, account: address };
      const createTx = await createCommitment(writeOptions, {
        serviceName,
        description,
        template: 0,
        targetUrl,
        backupUrl: backupUrl || targetUrl,
        observationInterval: 60,
        gracePeriod: 120,
        failureThreshold: 3,
        minBond: minBondNumber,
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
      });
      setTxHashes([createTx]);
      setProgress("Finding new commitment...");

      const commitmentId = await waitForNewOperatorCommitmentId(address, beforeIds);
      setProgress("Depositing operator bond...");
      const bondTx = await depositOperatorBond(writeOptions, commitmentId, BigInt(minBondNumber));
      setTxHashes([createTx, bondTx]);

      setProgress("Activating commitment...");
      const activateTx = await activateCommitment(writeOptions, commitmentId);
      setTxHashes([createTx, bondTx, activateTx]);
      setProgress("Commitment active");
      setTimeout(onSuccess, 1200);
    } catch (e2) {
      setError(extractErrorMessage(e2));
      setProgress(null);
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
          disabled={submitting}
          value={serviceName}
          onChange={(e) => setServiceName(e.target.value)}
          className="mt-1 w-full border border-[var(--color-border-default)] bg-transparent px-3 py-1.5 text-sm text-stone-900 disabled:opacity-60 dark:text-stone-100"
        />
      </label>
      <label className="block">
        <span className="font-mono text-[0.5625rem] uppercase tracking-wider text-stone-400 dark:text-stone-500">
          Description
        </span>
        <textarea
          required
          disabled={submitting}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1 w-full border border-[var(--color-border-default)] bg-transparent px-3 py-1.5 text-sm text-stone-900 disabled:opacity-60 dark:text-stone-100"
        />
      </label>
      <label className="block">
        <span className="font-mono text-[0.5625rem] uppercase tracking-wider text-stone-400 dark:text-stone-500">
          Target URL
        </span>
        <input
          required
          disabled={submitting}
          type="url"
          value={targetUrl}
          onChange={(e) => setTargetUrl(e.target.value)}
          placeholder="https://example.com/health"
          className="mt-1 w-full border border-[var(--color-border-default)] bg-transparent px-3 py-1.5 text-sm text-stone-900 disabled:opacity-60 dark:text-stone-100"
        />
      </label>
      <label className="block">
        <span className="font-mono text-[0.5625rem] uppercase tracking-wider text-stone-400 dark:text-stone-500">
          Backup URL (optional)
        </span>
        <input
          disabled={submitting}
          type="url"
          value={backupUrl}
          onChange={(e) => setBackupUrl(e.target.value)}
          className="mt-1 w-full border border-[var(--color-border-default)] bg-transparent px-3 py-1.5 text-sm text-stone-900 disabled:opacity-60 dark:text-stone-100"
        />
      </label>
      <label className="block">
        <span className="font-mono text-[0.5625rem] uppercase tracking-wider text-stone-400 dark:text-stone-500">
          Minimum Bond
        </span>
        <input
          required
          disabled={submitting}
          type="number"
          min="1"
          step="1"
          value={minBond}
          onChange={(e) => setMinBond(e.target.value)}
          className="mt-1 w-full border border-[var(--color-border-default)] bg-transparent px-3 py-1.5 text-sm text-stone-900 disabled:opacity-60 dark:text-stone-100"
        />
      </label>

      {progress && (
        <div className="border border-amber-600/30 bg-amber-600/5 px-3 py-2 font-mono text-[0.625rem] uppercase tracking-wider text-amber-700 dark:text-amber-400">
          {progress}
        </div>
      )}
      {txHashes.length > 0 && (
        <div className="flex flex-wrap gap-2 font-mono text-[0.625rem] uppercase tracking-wider text-stone-500 dark:text-stone-400">
          {txHashes.map((hash, index) => (
            <TransactionLink key={hash} hash={hash} label={`Tx ${index + 1}`} />
          ))}
        </div>
      )}
      {error && <div className="text-sm text-red-600 dark:text-red-400">{error}</div>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="border border-amber-600 px-6 py-2 font-mono text-[0.6875rem] uppercase tracking-[0.15em] text-amber-700 transition-colors hover:bg-amber-600 hover:text-white disabled:opacity-50 dark:text-amber-500"
        >
          {submitting ? "Working..." : "Create & Activate"}
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={onClose}
          className="border border-[var(--color-border-default)] px-6 py-2 font-mono text-[0.6875rem] uppercase tracking-[0.15em] text-stone-600 disabled:opacity-50 dark:text-stone-400"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
