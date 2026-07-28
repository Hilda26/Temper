export default function ValueDisplay({
  value,
  symbol = "GEN",
  size = "default",
}: {
  value: string | number;
  symbol?: string;
  size?: "sm" | "default" | "lg";
}) {
  const sizeClasses = {
    sm: "text-xs",
    default: "text-sm",
    lg: "text-lg",
  };

  return (
    <span
      className={`inline-flex items-baseline gap-1 font-mono ${sizeClasses[size]} text-stone-900 dark:text-stone-100`}
    >
      <span>{typeof value === "number" ? value.toLocaleString() : value}</span>
      <span className="text-[0.625rem] text-stone-500 dark:text-stone-400 uppercase tracking-wider">
        {symbol}
      </span>
    </span>
  );
}
