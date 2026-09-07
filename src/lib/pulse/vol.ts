export function dailyReturns(closes: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    const a = closes[i - 1];
    const b = closes[i];
    if (a > 0 && b > 0) out.push((b - a) / a);
  }
  return out.slice(-20);
}

/** Sample standard deviation of daily returns. Floor 0.5%. */
export function realizedVol(returns: number[]): number {
  if (returns.length < 2) return 0.015;
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  let ss = 0;
  for (const r of returns) ss += (r - mean) ** 2;
  const stdev = Math.sqrt(ss / (returns.length - 1));
  return Math.max(stdev, 0.005);
}

function hashSymbol(symbol: string): number {
  let h = 2166136261;
  for (let i = 0; i < symbol.length; i++) {
    h ^= symbol.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic 20-session return path with typical daily vol `sigma`. */
export function sessionReturns(symbol: string, sigma: number, n = 20): number[] {
  const rng = mulberry32(hashSymbol(symbol) ^ Math.round(sigma * 1e6));
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const u = Math.max(rng(), 1e-9);
    const v = rng();
    const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    out.push(z * Math.max(sigma, 0.005));
  }
  return out;
}
