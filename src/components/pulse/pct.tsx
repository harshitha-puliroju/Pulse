import { formatPct } from "@/lib/pulse/format";
import { cn } from "@/lib/utils";

export function Pct({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const up = value > 0.0005;
  const down = value < -0.0005;
  return (
    <span
      className={cn(
        "tabular-nums font-medium",
        up && "text-up",
        down && "text-down",
        !up && !down && "text-muted",
        className,
      )}
    >
      {formatPct(value)}
    </span>
  );
}
