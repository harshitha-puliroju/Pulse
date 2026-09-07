export function formatInr(n: number) {
  const digits = n < 100 ? 2 : n < 1000 ? 2 : 0;
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: digits,
    minimumFractionDigits: n < 100 ? 2 : 0,
  }).format(n);
}

export function formatPct(frac: number) {
  const v = frac * 100;
  const body = v.toFixed(1);
  return `${v > 0 ? "+" : ""}${body}%`;
}

export function freshnessLabel(f: string) {
  if (f === "live") return "Live";
  if (f === "delayed") return "Delayed · EOD";
  if (f === "stale") return "Stale";
  if (f === "conflict") return "Two prints · later kept";
  return "Unavailable";
}

export function formatRange(z: number) {
  return `${Math.abs(z).toFixed(1)}×`;
}
