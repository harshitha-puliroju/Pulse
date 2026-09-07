export type TapeFrame = "t0" | "t1" | "t2";
export type Freshness = "live" | "delayed" | "stale" | "unavailable" | "conflict";
export type MarketState = "open" | "closed" | "pre" | "post" | "unknown";
export type Level = "attention" | "watch" | "quiet";

export type QuoteDTO = {
  symbol: string;
  exchange: "NSE";
  vendorSymbol: string;
  name: string;
  sector: string;
  price: number;
  prevClose: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  avgVolume20d: number;
  volatility20d: number;
  asOf: string;
  fetchedAt: string;
  source: "yahoo" | "fixture" | "cache" | "carry";
  freshness: Freshness;
  marketState: MarketState;
  corporateAction?: "split" | "bonus";
};

export type ScoreTerms = {
  zPrice: number;
  zVol: number;
  zTerm: number;
  gapTerm: number;
  gap: number;
  nearNote: number;
  volRatio: number;
  sigma: number;
};

export type InboxItem = {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  notePrice: number | null;
  changeSinceSeenPct: number;
  dayChangePct: number;
  score: number;
  level: Level;
  reasons: string[];
  freshness: Freshness;
  asOf: string;
  source: string;
  terms: ScoreTerms;
  unavailable: boolean;
  lastLookPrice: number | null;
};

export type InboxPayload = {
  listId: string;
  listName: string;
  lastSeenAt: string | null;
  generatedAt: string;
  market: { state: MarketState; asOf: string; label: string };
  headline: string;
  attentionCount: number;
  dataWarnings: string[];
  tapeFrame: TapeFrame;
  vendorBroken: boolean;
  attention: InboxItem[];
  watch: InboxItem[];
  quiet: InboxItem[];
};

export type WatchlistSummary = {
  id: string;
  name: string;
  itemCount: number;
};

export type SymbolInfo = {
  symbol: string;
  name: string;
  sector: string;
};
