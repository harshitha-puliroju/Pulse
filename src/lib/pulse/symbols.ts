import type { SymbolInfo } from "./types";

export const SYMBOLS: SymbolInfo[] = [
  { symbol: "YESBANK", name: "Yes Bank", sector: "Banks" },
  { symbol: "HDFCBANK", name: "HDFC Bank", sector: "Banks" },
  { symbol: "ICICIBANK", name: "ICICI Bank", sector: "Banks" },
  { symbol: "SBIN", name: "State Bank of India", sector: "Banks" },
  { symbol: "AXISBANK", name: "Axis Bank", sector: "Banks" },
  { symbol: "KOTAKBANK", name: "Kotak Mahindra Bank", sector: "Banks" },
  { symbol: "RELIANCE", name: "Reliance Industries", sector: "Energy" },
  { symbol: "ONGC", name: "ONGC", sector: "Energy" },
  { symbol: "TCS", name: "Tata Consultancy Services", sector: "IT" },
  { symbol: "INFY", name: "Infosys", sector: "IT" },
  { symbol: "HCLTECH", name: "HCL Technologies", sector: "IT" },
  { symbol: "WIPRO", name: "Wipro", sector: "IT" },
  { symbol: "IRCTC", name: "IRCTC", sector: "Travel" },
  { symbol: "ITC", name: "ITC", sector: "FMCG" },
  { symbol: "HINDUNILVR", name: "Hindustan Unilever", sector: "FMCG" },
  { symbol: "MARUTI", name: "Maruti Suzuki", sector: "Auto" },
  { symbol: "TATAMOTORS", name: "Tata Motors", sector: "Auto" },
  { symbol: "TITAN", name: "Titan", sector: "Consumer" },
  { symbol: "ASIANPAINT", name: "Asian Paints", sector: "Consumer" },
  { symbol: "SUNPHARMA", name: "Sun Pharma", sector: "Pharma" },
  { symbol: "BHARTIARTL", name: "Bharti Airtel", sector: "Telecom" },
  { symbol: "LT", name: "Larsen & Toubro", sector: "Infra" },
  { symbol: "ADANIENT", name: "Adani Enterprises", sector: "Energy" },
  { symbol: "BAJFINANCE", name: "Bajaj Finance", sector: "Finance" },
];

export const SYMBOL_MAP = new Map(SYMBOLS.map((s) => [s.symbol, s]));

export const DEFAULT_LIST: { symbol: string; notePrice?: number }[] = [
  { symbol: "YESBANK" },
  { symbol: "HDFCBANK" },
  { symbol: "ICICIBANK" },
  { symbol: "SBIN" },
  { symbol: "AXISBANK" },
  { symbol: "IRCTC", notePrice: 820 },
  { symbol: "RELIANCE" },
  { symbol: "TCS" },
  { symbol: "INFY" },
  { symbol: "ITC" },
  { symbol: "MARUTI" },
  { symbol: "TITAN" },
];

export function searchSymbols(q: string): SymbolInfo[] {
  const n = q.trim().toUpperCase();
  if (!n) return SYMBOLS.slice(0, 8);
  return SYMBOLS.filter(
    (s) => s.symbol.includes(n) || s.name.toUpperCase().includes(n),
  ).slice(0, 10);
}
