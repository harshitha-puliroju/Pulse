import { formatInr, formatRange } from "@/lib/pulse/format";
import { cn } from "@/lib/utils";
import type { InboxItem } from "@/lib/pulse/types";

export function StockRow({
  item,
  muted,
  onOpen,
}: {
  item: InboxItem;
  muted?: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-3 text-left hover:bg-surface",
        muted && "opacity-70",
      )}
    >
      <div className="min-w-0">
        <p className="truncate font-medium">{item.symbol}</p>
        <p className="truncate text-xs text-muted">
          {item.unavailable
            ? "Quote missing"
            : item.reasons[0] || item.name}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="tabular-nums text-sm">₹{formatInr(item.price)}</p>
        <p className="text-xs tabular-nums text-muted">
          {item.changeSinceSeenPct < 0 ? "−" : "+"}
          {formatRange(item.terms.zPrice)}
        </p>
      </div>
    </button>
  );
}
