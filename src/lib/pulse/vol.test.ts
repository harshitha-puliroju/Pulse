import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { realizedVol, sessionReturns, dailyReturns } from "./vol.ts";

describe("realizedVol", () => {
  it("is the sample stdev of the return path, floored at 0.5%", () => {
    const v = realizedVol([0.01, -0.01, 0.01, -0.01]);
    assert.ok(v > 0.01 && v < 0.012);
    assert.equal(realizedVol([0, 0, 0]), 0.005);
  });

  it("sessionReturns is deterministic per symbol", () => {
    const a = sessionReturns("YESBANK", 0.011);
    const b = sessionReturns("YESBANK", 0.011);
    assert.deepEqual(a, b);
    assert.equal(a.length, 20);
    assert.notDeepEqual(a, sessionReturns("HDFCBANK", 0.011));
  });

  it("dailyReturns uses last 20 steps", () => {
    const r = dailyReturns([100, 110, 121]);
    assert.equal(r.length, 2);
    assert.ok(Math.abs(r[0] - 0.1) < 1e-9);
  });
});
