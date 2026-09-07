import { LAST_SESSION_CLOSE_ISO } from "./clock";
import { TAPE, TAPE_AS_OF } from "./fixtures";
import { getMarketClock } from "./clock";
import { pickNewerPrint } from "./snapshot";
import { SYMBOL_MAP } from "./symbols";
import { realizedVol, sessionReturns } from "./vol";
import { fetchYahooChart } from "./yahoo";
import type { Freshness, QuoteDTO, TapeFrame } from "./types";

const OLDER_AS_OF = "2026-09-04T09:44:00.000Z";
const TTL_MS = 45_000;
const cache = new Map<string, { quote: QuoteDTO; at: number }>();

export function emptyQuote(symbol: string, now = new Date()): QuoteDTO {
  const meta = SYMBOL_MAP.get(symbol);
  const clock = getMarketClock(now);
  return {
    symbol,
    exchange: "NSE",
    vendorSymbol: `${symbol}.NS`,
    name: meta?.name ?? symbol,
    sector: meta?.sector ?? "Other",
    price: 0,
    prevClose: 0,
    open: 0,
    high: 0,
    low: 0,
    volume: 0,
    avgVolume20d: 0,
    volatility20d: 0.015,
    asOf: now.toISOString(),
    fetchedAt: now.toISOString(),
    source: "yahoo",
    freshness: "unavailable",
    marketState: clock.state,
  };
}

export function buildQuote(
  symbol: string,
  frame: TapeFrame,
  opts: { vendorBroken?: boolean; now?: Date } = {},
): QuoteDTO {
  const raw = TAPE[frame][symbol] ?? TAPE.t1[symbol];
  const now = opts.now ?? new Date();
  if (!raw) return emptyQuote(symbol, now);

  const meta = SYMBOL_MAP.get(symbol);
  const clock = getMarketClock(now);
  const fetchedAt = now.toISOString();
  const sigma = realizedVol(sessionReturns(symbol, raw.volatility20d));

  let freshness: Freshness = "delayed";
  if (opts.vendorBroken) {
    freshness = symbol === "YESBANK" || symbol === "IRCTC" ? "unavailable" : "stale";
  } else if (clock.state === "open") {
    const lagMin = (now.getTime() - new Date(TAPE_AS_OF).getTime()) / 60000;
    freshness = lagMin > 15 ? "stale" : "live";
  }

  let asOf = LAST_SESSION_CLOSE_ISO;
  let price = raw.price;
  let source: QuoteDTO["source"] = opts.vendorBroken ? "cache" : "fixture";

  if (!opts.vendorBroken && symbol === "RELIANCE") {
    const { chosen, conflict } = pickNewerPrint(
      { asOf, price, source: "fixture" as const },
      { asOf: OLDER_AS_OF, price: raw.price - 2, source: "cache" as const },
    );
    asOf = chosen.asOf;
    price = chosen.price;
    source = chosen.source;
    if (conflict) freshness = "conflict";
  }

  return {
    symbol,
    exchange: "NSE",
    vendorSymbol: `${symbol}.NS`,
    name: meta?.name ?? symbol,
    sector: meta?.sector ?? "Other",
    price,
    prevClose: raw.prevClose,
    open: raw.open,
    high: raw.high,
    low: raw.low,
    volume: raw.volume,
    avgVolume20d: raw.avgVolume20d,
    volatility20d: sigma,
    asOf,
    fetchedAt,
    source,
    freshness,
    marketState: clock.state,
    corporateAction: raw.corporateAction,
  };
}

async function liveOne(symbol: string): Promise<QuoteDTO> {
  const hit = cache.get(symbol);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.quote;
  try {
    const q = await fetchYahooChart(symbol);
    cache.set(symbol, { quote: q, at: Date.now() });
    return q;
  } catch {
    if (hit) return { ...hit.quote, freshness: "stale", source: "cache" };
    return emptyQuote(symbol);
  }
}

async function liveAll(symbols: string[]): Promise<QuoteDTO[]> {
  const out: QuoteDTO[] = [];
  for (let i = 0; i < symbols.length; i += 6) {
    const chunk = symbols.slice(i, i + 6);
    out.push(...(await Promise.all(chunk.map(liveOne))));
  }
  return out;
}

export async function quotesFor(
  symbols: string[],
  frame: TapeFrame,
  vendorBroken: boolean,
  live = true,
): Promise<QuoteDTO[]> {
  if (vendorBroken) {
    return symbols.map((s) => {
      const hit = cache.get(s);
      if (hit) {
        const gone = s === "YESBANK" || s === "IRCTC";
        return {
          ...hit.quote,
          freshness: gone ? "unavailable" : "stale",
          source: "cache",
        };
      }
      return buildQuote(s, frame, { vendorBroken: true });
    });
  }
  if (!live) return symbols.map((s) => buildQuote(s, frame, { vendorBroken: false }));
  return liveAll(symbols);
}
