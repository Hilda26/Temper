"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import StatusBadge from "@/components/StatusBadge";
import ValueDisplay from "@/components/ValueDisplay";
import {
  getIncident,
  getIncidentEvidenceSummary,
  getCommitment,
  getHolderPolicies,
  getPolicy,
  incidentStatusLabel,
  severityLabel,
  responsibilityLabel,
  toBadgeStatus,
  requestIncidentUpdate,
  requestRecoveryCheck,
  challengeIncident,
  requestReadjudication,
  finalizeProvisionalVerdict,
  finalizeIncident,
  claimPayout,
  extractErrorMessage,
} from "@/lib/genlayer";
import { useContractData } from "@/lib/useContractData";
import { useWallet } from "@/lib/wallet/WalletProvider";

const INC_SUSPECTED = 0;
const INC_EVIDENCE_GATHERING = 1;
const INC_PROVISIONAL_VERDICT = 2;
const INC_CHALLENGE_WINDOW = 3;
const INC_READJUDICATION_PENDING = 4;
const INC_FINAL = 6;

const DECISION_STEPS = [
  { code: 0, step: "Suspected", detail: "Anomaly observed, evidence gathering not yet started" },
  { code: 1, step: "Evidence Gathering", detail: "Collecting web evidence from primary and backup sources" },
  { code: 2, step: "Provisional Verdict", detail: "Intelligent contract has rendered a provisional verdict" },
  { code: 3, step: "Challenge Window", detail: "Operator may challenge the verdict before it finalizes" },
  { code: 4, step: "Readjudication Pending", detail: "Verdict is being reconsidered after a challenge" },
  { code: 5, step: "Resolver Pending", detail: "Awaiting external resolver decision" },
  { code: 6, step: "Final", detail: "Verdict is final and immutable" },
  { code: 7, step: "Settlement Ready", detail: "Capital flows are ready to execute" },
  { code: 8, step: "Settled", detail: "Slash and payouts have been executed" },
  { code: 9, step: "Recovered", detail: "Underlying service recovered before settlement" },
];

function formatDuration(seconds: number): string {
  if (seconds <= 0) return "--";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatTimestamp(unix: number): string {
  if (!unix) return "--";
  return new Date(unix * 1000).toLocaleString();
}

interface IncidentDetail {
  incident: Record<string, unknown>;
  evidence: Record<string, unknown>;
  commitment: Record<string, unknown>;
}

export default function IncidentRoomPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { address, provider, connect, connecting, error: walletError } = useWallet();
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [counterEvidence, setCounterEvidence] = useState("");

  const fetcher = useCallback(async (): Promise<IncidentDetail> => {
    const iid = BigInt(id);
    const [incident, evidence] = await Promise.all([
      getIncident(iid),
      getIncidentEvidenceSummary(iid),
    ]);
    const commitment = incident.commitment_id
      ? await getCommitment(BigInt(incident.commitment_id as number))
      : {};
    return { incident, evidence, commitment };
  }, [id]);

  const { data, loading, error } = useContractData(fetcher, [id]);

  async function runAction(key: string, fn: () => Promise<string>) {
    setPending(key);
    setMessage(null);
    try {
      const tx = await fn();
      setMessage({ kind: "ok", text: `Confirmed: ${tx.slice(0, 14)}...` });
      window.location.reload();
    } catch (e) {
      setMessage({ kind: "err", text: extractErrorMessage(e) });
    } finally {
      setPending(null);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center font-mono text-xs uppercase tracking-wider text-stone-400 dark:text-stone-500">
        Loading incident...
      </div>
    );
  }

  if (error || !data || Object.keys(data.incident).length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center">
        <div className="font-mono text-xs uppercase tracking-wider text-stone-400 dark:text-stone-500">
          {error ? `Failed to load: ${error}` : `Incident #${id} not found`}
        </div>
        <Link
          href="/incidents"
          className="mt-4 inline-block font-mono text-[0.625rem] uppercase tracking-wider text-amber-700 hover:text-amber-600 dark:text-amber-500 dark:hover:text-amber-400 transition-colors"
        >
          Back to Incidents
        </Link>
      </div>
    );
  }

  const inc = data.incident;
  const evidence = data.evidence;
  const currentStep = Number(inc.status);
  const badgeStatus = toBadgeStatus(incidentStatusLabel(currentStep));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Top Band */}
      <div className="mb-8 border border-[var(--color-border-default)] bg-[var(--color-surface)]">
        <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-6">
            <div>
              <div className="font-mono text-[0.5625rem] uppercase tracking-[0.15em] text-stone-400 dark:text-stone-500">
                Incident
              </div>
              <div className="font-mono text-sm font-medium text-stone-900 dark:text-stone-100">
                #{String(inc.id)}
              </div>
            </div>
            <div>
              <div className="font-mono text-[0.5625rem] uppercase tracking-[0.15em] text-stone-400 dark:text-stone-500">
                Commitment
              </div>
              <Link
                href={`/commitments/${inc.commitment_id}`}
                className="text-sm text-stone-900 hover:text-amber-700 dark:text-stone-100 dark:hover:text-amber-500 transition-colors"
              >
                #{String(inc.commitment_id)}
              </Link>
            </div>
            <div>
              <div className="font-mono text-[0.5625rem] uppercase tracking-[0.15em] text-stone-400 dark:text-stone-500">
                Responsibility
              </div>
              <div className="text-sm text-stone-900 dark:text-stone-100">
                {responsibilityLabel(Number(inc.responsibility))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="font-mono text-[0.5625rem] uppercase tracking-[0.15em] text-stone-400 dark:text-stone-500">
                Severity
              </div>
              <div className="font-mono text-sm text-stone-900 dark:text-stone-100">
                {severityLabel(Number(inc.severity))}
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-[0.5625rem] uppercase tracking-[0.15em] text-stone-400 dark:text-stone-500">
                Duration
              </div>
              <div className="font-mono text-sm text-red-700 dark:text-red-400">
                {formatDuration(Number(inc.duration))}
              </div>
            </div>
            <StatusBadge status={badgeStatus} />
          </div>
        </div>
      </div>

      {/* Evidence */}
      <section className="mb-8">
        <div className="mb-3 font-mono text-[0.5625rem] uppercase tracking-[0.15em] text-stone-400 dark:text-stone-500">
          Evidence
        </div>
        <div className="border border-[var(--color-border-default)] bg-[var(--color-surface)] px-4 py-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="font-mono text-[0.5625rem] uppercase tracking-wider text-stone-400 dark:text-stone-500">
                Evidence Quality
              </div>
              <p className="mt-1 text-sm text-stone-700 dark:text-stone-300">
                {(evidence.evidence_quality as string) || "Not yet recorded"}
              </p>
            </div>
            <div>
              <div className="font-mono text-[0.5625rem] uppercase tracking-wider text-stone-400 dark:text-stone-500">
                Source Hash
              </div>
              <p className="mt-1 break-all font-mono text-xs text-stone-500 dark:text-stone-400">
                {(evidence.source_hash as string) || "--"}
              </p>
            </div>
            {(evidence.counter_evidence as string) && (
              <div className="md:col-span-2">
                <div className="font-mono text-[0.5625rem] uppercase tracking-wider text-stone-400 dark:text-stone-500">
                  Counter Evidence
                </div>
                <p className="mt-1 text-sm text-stone-700 dark:text-stone-300">
                  {evidence.counter_evidence as string}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Capital Consequence */}
      <section className="mb-8">
        <div className="mb-3 font-mono text-[0.5625rem] uppercase tracking-[0.15em] text-stone-400 dark:text-stone-500">
          Capital Consequence
        </div>
        <div className="grid grid-cols-2 gap-px border border-[var(--color-border-default)] bg-[var(--color-border-default)] md:grid-cols-4">
          <div className="bg-[var(--color-surface)] p-4">
            <div className="font-mono text-[0.5625rem] uppercase tracking-[0.15em] text-red-500 dark:text-red-400">
              Slash BPS
            </div>
            <div className="mt-1 font-mono text-lg text-stone-900 dark:text-stone-100">
              {String(inc.slash_bps)}
            </div>
          </div>
          <div className="bg-[var(--color-surface)] p-4">
            <div className="font-mono text-[0.5625rem] uppercase tracking-[0.15em] text-red-500 dark:text-red-400">
              Slash Amount
            </div>
            <div className="mt-1">
              <ValueDisplay value={Number(inc.slash_amount).toLocaleString()} size="lg" />
            </div>
          </div>
          <div className="bg-[var(--color-surface)] p-4">
            <div className="font-mono text-[0.5625rem] uppercase tracking-[0.15em] text-stone-400 dark:text-stone-500">
              Payout Tier
            </div>
            <div className="mt-1 font-mono text-lg text-stone-900 dark:text-stone-100">
              {String(inc.payout_tier)}
            </div>
          </div>
          <div className="bg-[var(--color-surface)] p-4">
            <div className="font-mono text-[0.5625rem] uppercase tracking-[0.15em] text-stone-400 dark:text-stone-500">
              Coverage Trigger
            </div>
            <div className="mt-1 font-mono text-lg text-stone-900 dark:text-stone-100">
              {String(inc.coverage_trigger)}
            </div>
          </div>
        </div>
      </section>

      {/* Decision Sequence */}
      <section className="mb-8">
        <div className="mb-3 font-mono text-[0.5625rem] uppercase tracking-[0.15em] text-stone-400 dark:text-stone-500">
          Decision Sequence
        </div>
        <div className="border border-[var(--color-border-default)] bg-[var(--color-surface)]">
          {DECISION_STEPS.map((step, i) => {
            const isPast = step.code < currentStep;
            const isCurrent = step.code === currentStep;
            return (
              <div
                key={step.step}
                className={`flex items-center gap-4 px-4 py-3 ${
                  i > 0 ? "border-t border-[var(--color-border-default)]" : ""
                }`}
              >
                <div className="flex items-center gap-3 w-52 shrink-0">
                  <div
                    className={`h-2 w-2 ${
                      isPast
                        ? "bg-emerald-600"
                        : isCurrent
                          ? "bg-amber-600 animate-signal"
                          : "bg-stone-300 dark:bg-stone-600"
                    }`}
                  />
                  <span className="font-mono text-[0.625rem] uppercase tracking-wider text-stone-700 dark:text-stone-300">
                    {step.step}
                  </span>
                </div>
                <div className="flex-1 text-sm text-stone-600 dark:text-stone-400">
                  {step.detail}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Timing */}
      <div className="mb-8 flex items-center justify-between border-t border-[var(--color-border-default)] pt-4 font-mono text-[0.5rem] uppercase tracking-wider text-stone-400 dark:text-stone-500">
        <span>Started {formatTimestamp(Number(inc.start_time))}</span>
        <span>{Number(inc.end_time) > 0 ? `Ended ${formatTimestamp(Number(inc.end_time))}` : "Ongoing"}</span>
      </div>

      {/* Actions */}
      <section className="border border-[var(--color-border-default)] bg-[var(--color-surface)] p-6">
        <div className="mb-4 font-mono text-[0.625rem] uppercase tracking-[0.15em] text-stone-400 dark:text-stone-500">
          Actions
        </div>

        {!address ? (
          <div>
            <button
              onClick={connect}
              disabled={connecting}
              className="border border-amber-600 px-6 py-2 font-mono text-[0.6875rem] uppercase tracking-[0.15em] text-amber-700 transition-colors hover:bg-amber-600 hover:text-white disabled:opacity-50 dark:text-amber-500"
            >
              {connecting ? "Connecting..." : "Connect Wallet to Act on This Incident"}
            </button>
            {walletError && (
              <div className="mt-4 border border-red-600/40 bg-red-600/5 px-4 py-2 text-sm text-red-700 dark:text-red-400">
                {walletError}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {(currentStep === INC_SUSPECTED || currentStep === INC_EVIDENCE_GATHERING) && (
              <div className="flex gap-3">
                <button
                  disabled={pending === "update"}
                  onClick={() =>
                    runAction("update", () => requestIncidentUpdate({ provider }, Number(inc.id)))
                  }
                  className="border border-[var(--color-border-default)] px-4 py-1.5 font-mono text-[0.625rem] uppercase tracking-wider text-stone-700 hover:border-amber-600 hover:text-amber-700 disabled:opacity-50 dark:text-stone-300"
                >
                  {pending === "update" ? "..." : "Request Update"}
                </button>
                <button
                  disabled={pending === "recovery"}
                  onClick={() =>
                    runAction("recovery", () => requestRecoveryCheck({ provider }, Number(inc.id)))
                  }
                  className="border border-[var(--color-border-default)] px-4 py-1.5 font-mono text-[0.625rem] uppercase tracking-wider text-stone-700 hover:border-amber-600 hover:text-amber-700 disabled:opacity-50 dark:text-stone-300"
                >
                  {pending === "recovery" ? "..." : "Request Recovery Check"}
                </button>
              </div>
            )}

            {(currentStep === INC_PROVISIONAL_VERDICT || currentStep === INC_CHALLENGE_WINDOW) && (
              <div className="space-y-4">
                {address.toLowerCase() === (data.commitment.operator as string)?.toLowerCase() && (
                  <div>
                    <label className="block">
                      <span className="font-mono text-[0.5625rem] uppercase tracking-wider text-stone-400 dark:text-stone-500">
                        Counter-Evidence URLs (pipe-separated)
                      </span>
                      <input
                        value={counterEvidence}
                        onChange={(e) => setCounterEvidence(e.target.value)}
                        placeholder="https://status.example.com|https://uptime.example.com"
                        className="mt-1 w-full border border-[var(--color-border-default)] bg-transparent px-3 py-1.5 text-sm text-stone-900 dark:text-stone-100"
                      />
                    </label>
                    <button
                      disabled={pending === "challenge" || !counterEvidence}
                      onClick={() =>
                        runAction("challenge", () =>
                          challengeIncident({ provider }, Number(inc.id), counterEvidence),
                        )
                      }
                      className="mt-2 border border-amber-600 px-4 py-1.5 font-mono text-[0.625rem] uppercase tracking-wider text-amber-700 hover:bg-amber-600 hover:text-white disabled:opacity-50 dark:text-amber-500"
                    >
                      {pending === "challenge" ? "..." : "Challenge Verdict"}
                    </button>
                  </div>
                )}
                <button
                  disabled={pending === "finalize-provisional"}
                  onClick={() =>
                    runAction("finalize-provisional", () =>
                      finalizeProvisionalVerdict({ provider }, Number(inc.id)),
                    )
                  }
                  className="border border-[var(--color-border-default)] px-4 py-1.5 font-mono text-[0.625rem] uppercase tracking-wider text-stone-700 hover:border-emerald-600 hover:text-emerald-700 disabled:opacity-50 dark:text-stone-300"
                >
                  {pending === "finalize-provisional" ? "..." : "Finalize Verdict"}
                </button>
                {currentStep === INC_CHALLENGE_WINDOW && (
                  <p className="text-xs text-stone-400 dark:text-stone-500">
                    Finalize will revert with CHALLENGE_WINDOW_OPEN until the challenge window
                    ({String(data.commitment.challenge_window ?? "?")}s from incident start) elapses.
                  </p>
                )}
              </div>
            )}

            {currentStep === INC_READJUDICATION_PENDING && (
              <button
                disabled={pending === "readjudicate"}
                onClick={() =>
                  runAction("readjudicate", () => requestReadjudication({ provider }, Number(inc.id)))
                }
                className="border border-amber-600 px-4 py-1.5 font-mono text-[0.625rem] uppercase tracking-wider text-amber-700 hover:bg-amber-600 hover:text-white disabled:opacity-50 dark:text-amber-500"
              >
                {pending === "readjudicate" ? "..." : "Run Readjudication"}
              </button>
            )}

            {currentStep === INC_FINAL && (
              <button
                disabled={pending === "finalize"}
                onClick={() => runAction("finalize", () => finalizeIncident({ provider }, Number(inc.id)))}
                className="border border-emerald-600 px-4 py-1.5 font-mono text-[0.625rem] uppercase tracking-wider text-emerald-700 hover:bg-emerald-600 hover:text-white disabled:opacity-50 dark:text-emerald-400"
              >
                {pending === "finalize" ? "..." : "Finalize Incident (Settle)"}
              </button>
            )}

            {currentStep >= 7 && (
              <ClaimSection provider={provider} address={address} incidentId={Number(inc.id)} />
            )}
          </div>
        )}

        {message && (
          <div
            className={`mt-4 font-mono text-xs ${
              message.kind === "ok" ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
            }`}
          >
            {message.text}
          </div>
        )}
      </section>
    </div>
  );
}

function ClaimSection({
  provider,
  address,
  incidentId,
}: {
  provider: unknown;
  address: string;
  incidentId: number;
}) {
  const fetcher = useCallback(async () => {
    const ids = await getHolderPolicies(address);
    const policies = await Promise.all(ids.map((pid) => getPolicy(BigInt(pid))));
    return policies.filter(
      (p) => Number(p.incident_id) === incidentId && Number(p.status) === 4,
    );
  }, [address, incidentId]);

  const { data: claimable, loading } = useContractData(fetcher, [address, incidentId], 10000);
  const [pending, setPending] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleClaim(policyId: number) {
    setPending(policyId);
    setMessage(null);
    try {
      const tx = await claimPayout({ provider }, policyId);
      setMessage(
        `Claimed: ${tx.slice(0, 14)}... Note: the payout is recorded on-chain, but GEN sent via emit_transfer does not currently settle to wallet addresses on StudioNet -- see HANDOFF.md.`,
      );
      window.location.reload();
    } catch (e) {
      setMessage(extractErrorMessage(e));
    } finally {
      setPending(null);
    }
  }

  if (loading) return null;
  const rows = claimable ?? [];
  if (rows.length === 0) {
    return (
      <p className="text-sm text-stone-500 dark:text-stone-400">
        Settlement complete. No claimable policies for this wallet on this incident.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-stone-500 dark:text-stone-400">Claimable payouts for your wallet:</p>
      <p className="border border-amber-600/30 bg-amber-600/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
        Known StudioNet limitation: claims record correctly on-chain, but the underlying GEN
        transfer does not currently settle to wallet addresses. See HANDOFF.md.
      </p>
      {rows.map((p) => (
        <div key={p.id as number} className="flex items-center justify-between border border-[var(--color-border-default)] px-3 py-2">
          <span className="font-mono text-xs text-stone-600 dark:text-stone-400">
            Policy #{String(p.id)} -- <ValueDisplay value={Number(p.claimable ?? 0).toLocaleString()} size="sm" />
          </span>
          <button
            disabled={pending === Number(p.id)}
            onClick={() => handleClaim(Number(p.id))}
            className="border border-emerald-600 px-3 py-1 font-mono text-[0.625rem] uppercase tracking-wider text-emerald-700 hover:bg-emerald-600 hover:text-white disabled:opacity-50 dark:text-emerald-400"
          >
            {pending === Number(p.id) ? "..." : "Claim"}
          </button>
        </div>
      ))}
      {message && <p className="font-mono text-xs text-stone-500 dark:text-stone-400">{message}</p>}
    </div>
  );
}
