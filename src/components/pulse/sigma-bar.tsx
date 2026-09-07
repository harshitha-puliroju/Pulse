export function SigmaBar({ z }: { z: number }) {
  const pct = Math.min(100, (z / 3) * 100);
  return (
    <span className="inline-block h-1.5 w-24 overflow-hidden rounded-full bg-border">
      <span
        className="block h-full rounded-full bg-fg/70"
        style={{ width: `${pct}%` }}
      />
    </span>
  );
}
