import type { InboxItem, Level, ScoreTerms } from "./types";

export function clip(x: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, x));
}

export type ScoreInput = {
  price: number;
  baseline: number;
  prevClose: number;
  open: number;
  volume: number;
  avgVolume20d?: number;
  sigma?: number;
  notePrice?: number | null;
  splitOrBonus?: boolean;
};

export type ScoreResult = {
  score: number;
  level: Level;
  reasons: string[];
  pctSeen: number;
  pctDay: number;
  terms: ScoreTerms;
};

export function scoreItem(input: ScoreInput): ScoreResult {
  const {
    price,
    baseline,
    prevClose,
    open,
    volume,
    avgVolume20d,
    sigma,
    notePrice,
    splitOrBonus,
  } = input;

  const pctSeen = baseline > 0 ? (price - baseline) / baseline : 0;
  const pctDay = prevClose > 0 ? (price - prevClose) / prevClose : 0;
  const sig = Math.max(sigma ?? 0.015, 0.005);

  let zPrice = Math.abs(pctSeen) / sig;
  const reasons: string[] = [];

  if (splitOrBonus) {
    zPrice = 0;
    reasons.push("Bonus or split — print adjusted, not a crash");
  }

  const volRatio =
    avgVolume20d && avgVolume20d > 0 ? volume / avgVolume20d : 1;
  const zVol = clip(Math.log(Math.max(volRatio, 1e-9)), 0, 2) / 2;
  const gap = prevClose > 0 ? (open - prevClose) / prevClose : 0;
  const nearNote =
    notePrice != null && notePrice > 0 && Math.abs(price - notePrice) / notePrice < 0.01
      ? 1
      : 0;

  const zTerm = clip(zPrice / 3, 0, 1);
  const gapTerm = clip(Math.abs(gap) / sig / 3, 0, 1);

  const score = 0.5 * zTerm + 0.2 * zVol + 0.15 * gapTerm + 0.15 * nearNote;

  if (!splitOrBonus && zPrice >= 1.5) {
    reasons.push(`${zPrice.toFixed(1)}× its usual 20-day range`);
  }
  if (volRatio >= 1.8) reasons.push(`Volume ${volRatio.toFixed(1)}× typical`);
  if (nearNote && notePrice != null) {
    reasons.push(`Near your ₹${Math.round(notePrice)} note`);
  }
  if (!splitOrBonus && Math.abs(gap) / sig >= 1.2) {
    reasons.push("Opened outside its usual range");
  }

  const level: Level = score > 0.6 ? "attention" : score >= 0.35 ? "watch" : "quiet";

  return {
    score,
    level,
    reasons: reasons.slice(0, 2),
    pctSeen,
    pctDay,
    terms: { zPrice, zVol, zTerm, gapTerm, gap, nearNote, volRatio, sigma: sig },
  };
}

export function assignBuckets(items: InboxItem[]) {
  const sorted = [...items].sort((a, b) => b.score - a.score);
  const attention: InboxItem[] = [];
  const watch: InboxItem[] = [];
  const quiet: InboxItem[] = [];

  for (const item of sorted) {
    if (item.unavailable) {
      quiet.push({ ...item, level: "quiet" });
      continue;
    }
    if (item.score > 0.6 && attention.length < 5) {
      attention.push({ ...item, level: "attention" });
    } else if (item.score > 0.6) {
      watch.push({ ...item, level: "watch" });
    } else if (item.score >= 0.35) {
      watch.push({ ...item, level: "watch" });
    } else {
      quiet.push({ ...item, level: "quiet" });
    }
  }

  return { attention, watch, quiet };
}

export function sectorHeadline(
  items: Array<{
    sector: string;
    pctSeen: number;
    sigma: number;
    unavailable?: boolean;
  }>,
) {
  const bySector = new Map<string, typeof items>();
  for (const it of items) {
    if (it.unavailable) continue;
    const list = bySector.get(it.sector) ?? [];
    list.push(it);
    bySector.set(it.sector, list);
  }

  let best: { sector: string; n: number; total: number; dir: string } | null = null;
  for (const [sector, list] of bySector) {
    const up = list.filter((i) => i.pctSeen > 0.8 * i.sigma);
    const down = list.filter((i) => i.pctSeen < -0.8 * i.sigma);
    const pack = up.length >= down.length ? up : down;
    if (pack.length >= 3 && (!best || pack.length > best.n)) {
      best = {
        sector,
        n: pack.length,
        total: list.length,
        dir: pack === down ? "dragged" : "lifted",
      };
    }
  }

  if (!best) return "No sector is moving as a pack.";
  return `${best.sector}: ${best.n} of ${best.total} names moved together.`;
}
