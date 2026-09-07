import { getMarketClock } from "./clock";
import { SYMBOL_MAP } from "./symbols";
import { realizedVol, dailyReturns } from "./vol";
import type { Freshness, QuoteDTO } from "./types";

const UA =
  "Mozilla/5.0 (compatible; PulseWatchlist/1.0; +https://github.com/)";

type ChartJson = {
  chart?: {
    result?: Array<{
      meta?: Record<string, unknown>;
      timestamp?: number[];
      indicators?: { quote?: Array<Record<string, Array<number | null>>> };
    }>;
    error?: unknown;
  };
};

export function vendorSymbol(symbol: string) {
  return `${symbol.replace(/\.NS$/i, "")}.NS`;
}


export function chartToQuote(symbol: string, json: ChartJson, now = new Date()): QuoteDTO | null {
  const result = json.chart?.result?.[0];
  const meta = result?.meta;
  const quote = result?.indicators?.quote?.[0];
  if (!meta || !quote) return null;

  const closes = (quote.close ?? []).filter((n): n is number => typeof n === "number" && n > 0);
  const opens = (quote.open ?? []).filter((n): n is number => typeof n === "number" && n > 0);
  const highs = (quote.high ?? []).filter((n): n is number => typeof n === "number" && n > 0);
  const lows = (quote.low ?? []).filter((n): n is number => typeof n === "number" && n > 0);
  const volumes = (quote.volume ?? []).filter((n): n is number => typeof n === "number" && n >= 0);

  const price = Number(meta.regularMarketPrice ?? closes.at(-1) ?? 0);
  const prevClose = Number(meta.chartPreviousClose ?? meta.previousClose ?? closes.at(-2) ?? price);
  if (!(price > 0)) return null;

  const info = SYMBOL_MAP.get(symbol);
  const clock = getMarketClock(now);
  const tradeSec = Number(meta.regularMarketTime ?? 0);
  const asOf = tradeSec > 0 ? new Date(tradeSec * 1000).toISOString() : now.toISOString();
  const ageMin = (now.getTime() - new Date(asOf).getTime()) / 60000;

  let freshness: Freshness = "delayed";
  if (clock.state === "open") freshness = ageMin > 15 ? "stale" : "live";
  else freshness = "delayed";

  const last20Vol = volumes.slice(-20);
  const avgVolume20d =
    last20Vol.length > 0 ? last20Vol.reduce((a, b) => a + b, 0) / last20Vol.length : 0;

  return {
    symbol,
    exchange: "NSE",
    vendorSymbol: vendorSymbol(symbol),
    name: info?.name ?? String(meta.shortName ?? symbol),
    sector: info?.sector ?? "Other",
    price,
    prevClose,
    open: Number(meta.regularMarketOpen ?? opens.at(-1) ?? price),
    high: Number(meta.regularMarketDayHigh ?? highs.at(-1) ?? price),
    low: Number(meta.regularMarketDayLow ?? lows.at(-1) ?? price),
    volume: Number(meta.regularMarketVolume ?? volumes.at(-1) ?? 0),
    avgVolume20d,
    volatility20d: realizedVol(dailyReturns(closes)),
    asOf,
    fetchedAt: now.toISOString(),
    source: "yahoo",
    freshness,
    marketState: clock.state,
  };
}

export async function fetchYahooChart(symbol: string, now = new Date()): Promise<QuoteDTO> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${vendorSymbol(symbol)}?range=1mo&interval=1d`;
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 7000);
  try {
    const res = await fetch(url, {
      signal: ac.signal,
      headers: { "User-Agent": UA, Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`yahoo ${res.status}`);
    const json = (await res.json()) as ChartJson;
    const q = chartToQuote(symbol, json, now);
    if (!q) throw new Error("yahoo empty");
    return q;
  } finally {
    clearTimeout(t);
  }
}
