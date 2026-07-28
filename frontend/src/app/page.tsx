"use client";

import Link from "next/link";
import { getSystemCounts } from "@/lib/genlayer";
import { useContractData } from "@/lib/useContractData";

const FLOW_STEPS = [
  {
    step: "01",
    title: "Define Commitment",
    description:
      "Operators publish immutable promises about service behavior, observation parameters, and breach thresholds.",
  },
  {
    step: "02",
    title: "Bond Capital",
    description:
      "Operators deposit capital as a bond against their commitment. This capital is slashable upon verified breach.",
  },
  {
    step: "03",
    title: "Observe",
    description:
      "Autonomous observers monitor service behavior against committed thresholds. Evidence is recorded on-chain.",
  },
  {
    step: "04",
    title: "Adjudicate",
    description:
      "When a breach is detected, an intelligent contract evaluates evidence, applies grace periods, and renders a verdict.",
  },
  {
    step: "05",
    title: "Settle",
    description:
      "Verified breaches trigger deterministic capital flows: operator bonds are slashed, coverage holders receive payouts.",
  },
];

const ENTRY_POINTS = [
  {
    role: "Operator",
    action: "Create Commitment",
    href: "/operator",
    description: "Define service promises and bond capital against them.",
  },
  {
    role: "Underwriter",
    action: "Provide Coverage",
    href: "/capital",
    description: "Deposit capital to underwrite coverage vaults.",
  },
  {
    role: "User",
    action: "Get Covered",
    href: "/coverage",
    description: "Purchase coverage policies against operational failures.",
  },
];

export default function Home() {
  const { data: counts, loading, error } = useContractData(getSystemCounts, [], 15000);

  const stats = [
    { label: "Active Commitments", value: counts?.commitments ?? "--" },
    { label: "Total Policies", value: counts?.policies ?? "--" },
    { label: "Open Incidents", value: counts?.incidents ?? "--" },
    { label: "Capital Treasury", value: counts?.protocol_treasury ?? "--" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-16">
      {/* Hero */}
      <section className="mb-20">
        <h1 className="max-w-2xl text-3xl font-light leading-tight text-stone-900 dark:text-stone-100">
          Operational promises with capital behind them.
        </h1>
        <p className="mt-4 max-w-lg text-sm leading-relaxed text-stone-500 dark:text-stone-400">
          TEMPER is an operational observatory where service commitments are
          defined, bonded, observed, adjudicated, and settled on-chain.
        </p>
      </section>

      {/* Live Stats */}
      <section className="mb-20">
        <div className="mb-4 font-mono text-[0.625rem] uppercase tracking-[0.15em] text-stone-400 dark:text-stone-500">
          System Status
        </div>
        <div className="grid grid-cols-2 gap-px border border-[var(--color-border-default)] bg-[var(--color-border-default)] md:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-[var(--color-surface)] p-4"
            >
              <div className="font-mono text-[0.5625rem] uppercase tracking-[0.15em] text-stone-400 dark:text-stone-500">
                {stat.label}
              </div>
              <div className="mt-1 font-mono text-lg text-stone-900 dark:text-stone-100">
                {stat.value}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${
              error ? "bg-red-500" : loading ? "bg-stone-400 animate-signal" : "bg-emerald-500"
            }`}
          />
          <span className="font-mono text-[0.5625rem] uppercase tracking-wider text-stone-400 dark:text-stone-500">
            {error ? `Connection failed: ${error}` : loading ? "Connecting to StudioNet..." : "Live on StudioNet"}
          </span>
        </div>
      </section>

      {/* Flow */}
      <section className="mb-20">
        <div className="mb-6 font-mono text-[0.625rem] uppercase tracking-[0.15em] text-stone-400 dark:text-stone-500">
          Protocol Flow
        </div>
        <div className="space-y-0">
          {FLOW_STEPS.map((step) => (
            <div
              key={step.step}
              className="flex gap-6 border-b border-[var(--color-border-default)] py-5 first:border-t"
            >
              <div className="font-mono text-[0.625rem] tracking-wider text-stone-400 dark:text-stone-500 pt-0.5">
                {step.step}
              </div>
              <div>
                <h3 className="text-sm font-medium text-stone-900 dark:text-stone-100">
                  {step.title}
                </h3>
                <p className="mt-1 max-w-lg text-sm leading-relaxed text-stone-500 dark:text-stone-400">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Entry Points */}
      <section>
        <div className="mb-6 font-mono text-[0.625rem] uppercase tracking-[0.15em] text-stone-400 dark:text-stone-500">
          Participate
        </div>
        <div className="grid gap-px border border-[var(--color-border-default)] bg-[var(--color-border-default)] md:grid-cols-3">
          {ENTRY_POINTS.map((entry) => (
            <Link
              key={entry.role}
              href={entry.href}
              className="group bg-[var(--color-surface)] p-6 transition-colors hover:bg-[var(--color-surface-alt)]"
            >
              <div className="font-mono text-[0.5625rem] uppercase tracking-[0.15em] text-stone-400 dark:text-stone-500">
                {entry.role}
              </div>
              <h3 className="mt-2 text-sm font-medium text-stone-900 group-hover:text-amber-700 dark:text-stone-100 dark:group-hover:text-amber-500 transition-colors">
                {entry.action}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
                {entry.description}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
