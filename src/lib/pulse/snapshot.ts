import type { QuoteDTO } from "./types";

export type SnapshotLeg = {
  symbol: string;
  price: number;
  volume: number | null;
  asOf: string | null;
  source: string;
};

/**
 * Confirm observation: write a good print; if the vendor hole'd this name,
 * carry the previous leg so P_last does not silently fall back to prev close.
 */
export function legsForMark(
  symbols: string[],
  quotes: QuoteDTO[],
  prev: Map<string, SnapshotLeg>,
): SnapshotLeg[] {
  const by = new Map(quotes.map((q) => [q.symbol, q]));
  const out: SnapshotLeg[] = [];
  for (const symbol of symbols) {
    const q = by.get(symbol);
    const good = q && q.freshness !== "unavailable" && q.price > 0;
    if (good && q) {
      out.push({
        symbol,
        price: q.price,
        volume: q.volume,
        asOf: q.asOf,
        source: q.source,
      });
      continue;
    }
    const held = prev.get(symbol);
    if (held) out.push({ ...held, source: "carry" });
  }
  return out;
}

/** Two prints: keep the later asOf. Equal time → keep primary. */
export function pickNewerPrint<T extends { asOf: string; price: number }>(
  primary: T,
  secondary: T,
): { chosen: T; conflict: boolean } {
  const conflict = primary.asOf !== secondary.asOf || primary.price !== secondary.price;
  const t0 = new Date(primary.asOf).getTime();
  const t1 = new Date(secondary.asOf).getTime();
  const chosen = Number.isFinite(t1) && t1 > t0 ? secondary : primary;
  return { chosen, conflict };
}
