import { useEffect } from "react";
import { Pct } from "./pct";
import { SigmaBar } from "./sigma-bar";
import { formatInr, freshnessLabel } from "@/lib/pulse/format";
import type { InboxItem } from "@/lib/pulse/types";
import { X } from "lucide-react";

export function ScoreDrawer({
  item,
  onClose,
}: {
  item: InboxItem;
  onClose: () => void;
}) {
  const rows = [
    { label: "Vs usual 20-day range", value: `${item.terms.zPrice.toFixed(1)}×`, bar: item.terms.zTerm },
    { label: "Volume vs typical", value: `${item.terms.volRatio.toFixed(1)}×`, bar: item.terms.zVol },
    { label: "Open vs usual range", value: `${(Math.abs(item.terms.gap) / item.terms.sigma).toFixed(1)}×`, bar: item.terms.gapTerm },
    {
      label: "Near your note",
      value: item.terms.nearNote >= 0.5 ? "Yes" : "No",
      bar: item.terms.nearNote,
    },
  ];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-fg/30"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative z-10 max-h-[90vh] w-full max-w-md overflow-auto rounded-t-3xl border border-border bg-surface p-6 shadow-xl sm:rounded-3xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs tracking-wide text-muted uppercase">{item.sector}</p>
            <h2 className="font-display text-2xl font-medium tracking-tight">{item.name}</h2>
            <p className="tabular-nums text-muted">
              {item.symbol}
              {item.lastLookPrice != null
                ? ` · last look ₹${formatInr(item.lastLookPrice)} → ₹${formatInr(item.price)}`
                : ` · ₹${formatInr(item.price)}`}
            </p>
          </div>
          <button type="button" className="size-11 text-muted" onClick={onClose}>
            <X className="mx-auto size-5" />
          </button>
        </div>
        <div className="mb-5 grid grid-cols-2 gap-3 rounded-2xl bg-bg p-4">
          <div>
            <p className="text-xs text-muted">Since you left</p>
            <Pct value={item.changeSinceSeenPct} className="text-lg" />
          </div>
          <div>
            <p className="text-xs text-muted">Vs previous close</p>
            <Pct value={item.dayChangePct} className="text-lg" />
          </div>
        </div>
        <p className="mb-3 text-sm font-medium">Why this rank</p>
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.label} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted">{r.label}</span>
              <span className="flex items-center gap-2 tabular-nums">
                <SigmaBar z={r.bar * 3} />
                {r.value}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-subtle">
          {freshnessLabel(item.freshness)}
        </p>
        {item.reasons.length > 0 && (
          <p className="mt-2 text-sm text-muted">{item.reasons.join(" · ")}</p>
        )}
      </div>
    </div>
  );
}
