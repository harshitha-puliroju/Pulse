import { Badge } from "@/components/ui/badge";
import { freshnessLabel } from "@/lib/pulse/format";
import type { Freshness } from "@/lib/pulse/types";

export function FreshnessBadge({ value }: { value: Freshness }) {
  return <Badge>{freshnessLabel(value)}</Badge>;
}
