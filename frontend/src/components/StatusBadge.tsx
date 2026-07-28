const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  ACTIVE: {
    bg: "bg-emerald-600/10",
    text: "text-emerald-700 dark:text-emerald-400",
    dot: "bg-emerald-600",
  },
  INCIDENT_OPEN: {
    bg: "bg-amber-600/10",
    text: "text-amber-700 dark:text-amber-400",
    dot: "bg-amber-600",
  },
  GRACE_PERIOD: {
    bg: "bg-amber-600/10",
    text: "text-amber-700 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  BREACH: {
    bg: "bg-red-600/10",
    text: "text-red-700 dark:text-red-400",
    dot: "bg-red-600",
  },
  RESOLVED: {
    bg: "bg-stone-200/50 dark:bg-stone-800/50",
    text: "text-stone-600 dark:text-stone-400",
    dot: "bg-stone-500",
  },
  SETTLED: {
    bg: "bg-stone-200/50 dark:bg-stone-800/50",
    text: "text-stone-600 dark:text-stone-400",
    dot: "bg-stone-400",
  },
  CHALLENGED: {
    bg: "bg-amber-600/10",
    text: "text-amber-700 dark:text-amber-400",
    dot: "bg-amber-600",
  },
  FINALIZED: {
    bg: "bg-emerald-600/10",
    text: "text-emerald-700 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  OBSERVING: {
    bg: "bg-sky-600/10",
    text: "text-sky-700 dark:text-sky-400",
    dot: "bg-sky-500",
  },
  PAUSED: {
    bg: "bg-stone-200/50 dark:bg-stone-800/50",
    text: "text-stone-500 dark:text-stone-400",
    dot: "bg-stone-400",
  },
  CLOSED: {
    bg: "bg-stone-200/50 dark:bg-stone-800/50",
    text: "text-stone-500 dark:text-stone-400",
    dot: "bg-stone-400",
  },
};

const DEFAULT_STYLE = {
  bg: "bg-stone-200/50 dark:bg-stone-800/50",
  text: "text-stone-600 dark:text-stone-400",
  dot: "bg-stone-500",
};

export default function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] || DEFAULT_STYLE;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 font-mono text-[0.625rem] uppercase tracking-wider ${style.bg} ${style.text}`}
    >
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {status.replace(/_/g, " ")}
    </span>
  );
}
