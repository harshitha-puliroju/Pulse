import { Pct } from "./pct";
import { Badge } from "@/components/ui/badge";
import { formatInr, formatRange } from "@/lib/pulse/format";
import type { InboxItem } from "@/lib/pulse/types";

export function AttentionCard({
  item,
  onOpen,
}: {
  item: InboxItem;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-3xl border border-border bg-surface p-5 text-left transition-transform duration-[var(--motion-quick)] active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-xl font-medium tracking-tight">{item.symbol}</p>
          <p className="text-sm text-muted">{item.name}</p>
        </div>
        <div className="text-right">
          <p className="font-display text-2xl tabular-nums tracking-tight">
            {item.changeSinceSeenPct < 0 ? "−" : "+"}
            {formatRange(item.terms.zPrice)}
          </p>
          <p className="text-[11px] text-subtle">usual 20-day range</p>
          <p className="mt-1 tabular-nums text-sm text-muted">₹{formatInr(item.price)}</p>
        </div>
      </div>
      <div className="mt-4 text-sm text-muted">
        Since you left <Pct value={item.changeSinceSeenPct} />
      </div>
      {item.reasons.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {item.reasons.slice(0, 2).map((r) => (
            <Badge key={r}>{r}</Badge>
          ))}
        </div>
      )}
    </button>
  );
}
