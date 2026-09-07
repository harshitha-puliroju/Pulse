import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { assignBuckets, scoreItem } from "./engine.ts";
import type { InboxItem } from "./types.ts";

const YES_T0 = 21.4;
const YES_T1 = {
  price: 22.15,
  prevClose: 21.32,
  open: 21.48,
  volume: 1.44e8,
  avgVolume20d: 3.8e7,
  sigma: 0.011,
};
const ITC_T1 = 430;
const ITC_T2 = {
  price: 215,
  prevClose: 215,
  open: 215,
  volume: 7.4e6,
  avgVolume20d: 8.0e6,
  sigma: 0.009,
};

function itemFrom(
  symbol: string,
  q: { price: number; prevClose: number; open: number; volume: number; avgVolume20d: number; sigma: number },
  baseline: number,
  split = false,
): InboxItem {
  const result = scoreItem({
    price: q.price,
    baseline,
    prevClose: q.prevClose,
    open: q.open,
    volume: q.volume,
    avgVolume20d: q.avgVolume20d,
    sigma: q.sigma,
    splitOrBonus: split,
  });
  return {
    symbol,
    name: symbol,
    sector: "Test",
    price: q.price,
    notePrice: null,
    changeSinceSeenPct: result.pctSeen,
    dayChangePct: result.pctDay,
    score: result.score,
    level: result.level,
    reasons: result.reasons,
    freshness: "delayed",
    asOf: "",
    source: "fixture",
    terms: result.terms,
    unavailable: false,
    lastLookPrice: baseline,
  };
}

describe("scoreItem tape", () => {
  it("YESBANK t0→t1 is Attention: own-vol move with volume", () => {
    const item = itemFrom("YESBANK", YES_T1, YES_T0);
    assert.ok(item.score > 0.6, `score ${item.score}`);
    assert.equal(item.level, "attention");
    assert.ok(item.terms.zPrice > 3);
    assert.match(item.reasons.join(" "), /usual 20-day range/);
  });

  it("ITC ex-bonus is not Attention even if the print halves", () => {
    const item = itemFrom("ITC", ITC_T2, ITC_T1, true);
    assert.equal(item.terms.zPrice, 0);
    assert.ok(item.score < 0.35, `score ${item.score}`);
    assert.equal(item.level, "quiet");
    assert.match(item.reasons.join(" "), /Bonus or split/);
  });

  it("assignBuckets caps Attention at 5", () => {
    const items = Array.from({ length: 8 }, (_, i) =>
      itemFrom("YESBANK", YES_T1, YES_T0),
    ).map((it, i) => ({ ...it, symbol: `N${i}` }));
    const { attention, watch } = assignBuckets(items);
    assert.equal(attention.length, 5);
    assert.ok(watch.length >= 3);
  });
});
