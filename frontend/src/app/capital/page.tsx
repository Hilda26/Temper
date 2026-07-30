"use client";

import { useState } from "react";
import Link from "next/link";
import ValueDisplay from "@/components/ValueDisplay";
import StatusBadge from "@/components/StatusBadge";
import {
  listCommitments,
  getCapitalState,
  commitmentStatusLabel,
  toBadgeStatus,
  depositCoverageCapital,
  requestUnderwriterWithdrawal,
  extractErrorMessage,
} from "@/lib/genlayer";
import { useContractData } from "@/lib/useContractData";
import { useWallet } from "@/lib/wallet/WalletProvider";

interface VaultRow {
  commitment: Record<string, unknown>;
  capital: Record<string, unknown>;
}

async function loadVaults(): Promise<VaultRow[]> {
  const commitments = await listCommitments();
  const capitalStates = await Promise.all(
    commitments.map((c) => getCapitalState(BigInt(c.id as number))),
  );
  return commitments.map((commitment, i) => ({ commitment, capital: capitalStates[i] }));
}

export default function CapitalPage() {
  const { data: vaults, loading, error } = useContractData(loadVaults, [], 20000);
  const rows = vaults ?? [];
  const { address, provider, connect } = useWallet();
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function runAction(key: string, fn: () => Promise<string>) {
    setPending(key);
    setMessage(null);
    try {
      const tx = await fn();
      const caveat = key.startsWith("withdraw-")
        ? " Note: on StudioNet, GEN sent to a wallet address via emit_transfer does not currently settle -- the withdrawal request is recorded on-chain but the underlying platform limitation means it will not yet arrive in your wallet."
        : "";
      setMessage({ kind: "ok", text: `Confirmed: ${tx.slice(0, 14)}...${caveat}` });
      window.location.reload();
    } catch (e) {
      setMessage({ kind: "err", text: extractErrorMessage(e) });
    } finally {
      setPending(null);
    }
  }

  const totals = rows.reduce(
    (acc, r) => ({
      gross: acc.gross + Number(r.capital.gross_capital ?? 0),
      reserved: acc.reserved + Number(r.capital.reserved_capital ?? 0),
      shares: acc.shares + Number(r.capital.total_shares ?? 0),
      earned: acc.earned + Number(r.capital.earned_premium ?? 0),
    }),
    { gross: 0, reserved: 0, shares: 0, earned: 0 },
  );
  const utilizationRate =
    totals.gross > 0 ? Math.round((totals.reserved / totals.gross) * 100) : 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="font-mono text-xs uppercase tracking-[0.15em] text-stone-900 dark:text-stone-100">
          Capital Overview
        </h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Coverage vaults across all commitments
        </p>
      </div>

      {error && (
        <div className="border border-red-600/30 bg-red-600/5 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          Failed to load capital data: {error}
        </div>
      )}

      {!error && (
        <>
          {/* Aggregate Summary */}
          <div className="mb-8 grid grid-cols-2 gap-px border border-[var(--color-border-default)] bg-[var(--color-border-default)] md:grid-cols-4">
            <div className="bg-[var(--color-surface)] p-4">
              <div className="font-mono text-[0.5625rem] uppercase tracking-[0.15em] text-stone-400 dark:text-stone-500">
                Total Gross Capital
              </div>
              <div className="mt-1">
                <ValueDisplay value={loading ? "--" : totals.gross.toLocaleString()} size="lg" />
              </div>
            </div>
            <div className="bg-[var(--color-surface)] p-4">
              <div className="font-mono text-[0.5625rem] uppercase tracking-[0.15em] text-stone-400 dark:text-stone-500">
                Total Shares
              </div>
              <div className="mt-1 font-mono text-lg text-stone-900 dark:text-stone-100">
                {loading ? "--" : totals.shares.toLocaleString()}
              </div>
            </div>
            <div className="bg-[var(--color-surface)] p-4">
              <div className="font-mono text-[0.5625rem] uppercase tracking-[0.15em] text-stone-400 dark:text-stone-500">
                Earned Premium
              </div>
              <div className="mt-1">
                <ValueDisplay value={loading ? "--" : totals.earned.toLocaleString()} size="lg" />
              </div>
            </div>
            <div className="bg-[var(--color-surface)] p-4">
              <div className="font-mono text-[0.5625rem] uppercase tracking-[0.15em] text-stone-400 dark:text-stone-500">
                Utilization
              </div>
              <div className="mt-1">
                <div className="font-mono text-lg text-stone-900 dark:text-stone-100">
                  {loading ? "--" : `${utilizationRate}%`}
                </div>
                <div className="mt-1 h-1.5 w-full bg-stone-200 dark:bg-stone-700">
                  <div className="h-full bg-amber-600" style={{ width: `${utilizationRate}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Per-commitment vaults */}
          <section className="border border-[var(--color-border-default)] bg-[var(--color-surface)]">
            <div className="border-b border-[var(--color-border-default)] px-4 py-2">
              <span className="font-mono text-[0.5625rem] uppercase tracking-[0.15em] text-stone-400 dark:text-stone-500">
                Vaults by Commitment
              </span>
            </div>
            <div className="divide-y divide-[var(--color-border-default)]">
              {rows.map((r) => {
                const cid = Number(r.commitment.id);
                return (
                  <div
                    key={cid}
                    className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between"
                  >
                    <Link
                      href={`/commitments/${cid}`}
                      className="flex items-center gap-4 hover:text-amber-700 dark:hover:text-amber-500"
                    >
                      <span className="text-sm text-stone-900 dark:text-stone-100">
                        {r.commitment.service_name as string}
                      </span>
                      <StatusBadge
                        status={toBadgeStatus(commitmentStatusLabel(Number(r.commitment.status)))}
                      />
                    </Link>
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="text-right">
                        <div className="font-mono text-[0.5rem] uppercase tracking-wider text-stone-400 dark:text-stone-500">
                          Gross
                        </div>
                        <ValueDisplay value={Number(r.capital.gross_capital ?? 0).toLocaleString()} size="sm" />
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-[0.5rem] uppercase tracking-wider text-stone-400 dark:text-stone-500">
                          Reserved
                        </div>
                        <ValueDisplay value={Number(r.capital.reserved_capital ?? 0).toLocaleString()} size="sm" />
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-[0.5rem] uppercase tracking-wider text-stone-400 dark:text-stone-500">
                          Free
                        </div>
                        <ValueDisplay value={Number(r.capital.free_capital ?? 0).toLocaleString()} size="sm" />
                      </div>
                      {address ? (
                        <VaultActions
                          pendingDeposit={pending === `deposit-${cid}`}
                          pendingWithdraw={pending === `withdraw-${cid}`}
                          onDeposit={(amount) =>
                            runAction(`deposit-${cid}`, () =>
                              depositCoverageCapital({ provider }, cid, BigInt(amount)),
                            )
                          }
                          onWithdraw={(shares) =>
                            runAction(`withdraw-${cid}`, () =>
                              requestUnderwriterWithdrawal({ provider }, cid, shares),
                            )
                          }
                        />
                      ) : (
                        <button
                          onClick={connect}
                          className="shrink-0 border border-[var(--color-border-default)] px-3 py-1 font-mono text-[0.625rem] uppercase tracking-wider text-stone-500 hover:border-amber-600 hover:text-amber-700 dark:text-stone-400"
                        >
                          Connect to Deposit
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {!loading && rows.length === 0 && (
                <div className="px-4 py-16 text-center font-mono text-xs uppercase tracking-wider text-stone-400 dark:text-stone-500">
                  No commitments yet.
                </div>
              )}
            </div>
          </section>

          {message && (
            <div
              className={`mt-6 border px-4 py-2 font-mono text-xs ${
                message.kind === "ok"
                  ? "border-emerald-600/40 text-emerald-700 dark:text-emerald-400"
                  : "border-red-600/40 text-red-700 dark:text-red-400"
              }`}
            >
              {message.text}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function VaultActions({
  pendingDeposit,
  pendingWithdraw,
  onDeposit,
  onWithdraw,
}: {
  pendingDeposit: boolean;
  pendingWithdraw: boolean;
  onDeposit: (amount: number) => void;
  onWithdraw: (shares: number) => void;
}) {
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawShares, setWithdrawShares] = useState("");

  return (
    <div className="flex items-center gap-2">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const n = Number(depositAmount);
          if (n > 0) onDeposit(n);
        }}
        className="flex items-center gap-1"
      >
        <input
          type="number"
          min="1"
          placeholder="Amount"
          value={depositAmount}
          onChange={(e) => setDepositAmount(e.target.value)}
          className="w-20 border border-[var(--color-border-default)] bg-transparent px-2 py-1 font-mono text-xs text-stone-900 dark:text-stone-100"
        />
        <button
          type="submit"
          disabled={pendingDeposit}
          className="shrink-0 border border-amber-600 px-3 py-1 font-mono text-[0.625rem] uppercase tracking-wider text-amber-700 hover:bg-amber-600 hover:text-white disabled:opacity-50 dark:text-amber-500"
        >
          {pendingDeposit ? "..." : "Deposit"}
        </button>
      </form>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const n = Number(withdrawShares);
          if (n > 0) onWithdraw(n);
        }}
        className="flex items-center gap-1"
      >
        <input
          type="number"
          min="1"
          placeholder="Shares"
          value={withdrawShares}
          onChange={(e) => setWithdrawShares(e.target.value)}
          className="w-20 border border-[var(--color-border-default)] bg-transparent px-2 py-1 font-mono text-xs text-stone-900 dark:text-stone-100"
        />
        <button
          type="submit"
          disabled={pendingWithdraw}
          className="shrink-0 border border-[var(--color-border-default)] px-3 py-1 font-mono text-[0.625rem] uppercase tracking-wider text-stone-700 hover:border-stone-400 disabled:opacity-50 dark:text-stone-300"
        >
          {pendingWithdraw ? "..." : "Withdraw"}
        </button>
      </form>
    </div>
  );
}
