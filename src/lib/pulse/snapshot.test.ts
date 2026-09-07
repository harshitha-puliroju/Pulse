import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { legsForMark, pickNewerPrint } from "./snapshot.ts";
import type { QuoteDTO } from "./types.ts";

function quote(partial: Partial<QuoteDTO> & { symbol: string }): QuoteDTO {
  return {
    exchange: "NSE",
    vendorSymbol: `${partial.symbol}.NS`,
    name: partial.symbol,
    sector: "Banks",
    price: 10,
    prevClose: 10,
    open: 10,
    high: 10,
    low: 10,
    volume: 1,
    avgVolume20d: 1,
    volatility20d: 0.01,
    asOf: "2026-09-04T09:59:00.000Z",
    fetchedAt: "2026-09-04T09:59:00.000Z",
    source: "fixture",
    freshness: "delayed",
    marketState: "closed",
    ...partial,
  };
}

describe("pickNewerPrint", () => {
  it("keeps the later asOf and flags conflict", () => {
    const { chosen, conflict } = pickNewerPrint(
      { asOf: "2026-09-04T09:59:00.000Z", price: 1412 },
      { asOf: "2026-09-04T09:44:00.000Z", price: 1410 },
    );
    assert.equal(chosen.price, 1412);
    assert.equal(conflict, true);
  });
});

describe("legsForMark", () => {
  it("carries the previous leg when the vendor hole'd the name", () => {
    const prev = new Map([
      [
        "YESBANK",
        { symbol: "YESBANK", price: 21.4, volume: 1, asOf: "t0", source: "fixture" },
      ],
    ]);
    const quotes = [
      quote({ symbol: "YESBANK", price: 22.15, freshness: "unavailable" }),
      quote({ symbol: "HDFCBANK", price: 1686, freshness: "delayed" }),
    ];
    const legs = legsForMark(["YESBANK", "HDFCBANK"], quotes, prev);
    const yes = legs.find((l) => l.symbol === "YESBANK");
    const hdfc = legs.find((l) => l.symbol === "HDFCBANK");
    assert.equal(yes?.price, 21.4);
    assert.equal(yes?.source, "carry");
    assert.equal(hdfc?.price, 1686);
    assert.equal(hdfc?.source, "fixture");
  });
});
