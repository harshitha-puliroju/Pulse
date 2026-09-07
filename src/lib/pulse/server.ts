import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { getMarketClock } from "./clock";
import { assignBuckets, scoreItem, sectorHeadline } from "./engine";
import { quotesFor } from "./quotes";
import { legsForMark, type SnapshotLeg } from "./snapshot";
import { DEFAULT_LIST, searchSymbols, SYMBOL_MAP } from "./symbols";
import type { InboxItem, InboxPayload, TapeFrame, WatchlistSummary } from "./types";

const MAX_ITEMS = 40;

function num(v: unknown, fallback = 0) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function id() {
  return crypto.randomUUID();
}

async function demoState(sql: Awaited<ReturnType<typeof getSql>>, userId: string) {
  const rows = await sql<{
    tape_frame: string;
    vendor_broken: boolean;
    seeded: boolean;
  }>`select tape_frame, vendor_broken, seeded from user_demo where user_id = ${userId}`;
  if (rows[0]) {
    return {
      tapeFrame: (rows[0].tape_frame as TapeFrame) || "t1",
      vendorBroken: Boolean(rows[0].vendor_broken),
      seeded: Boolean(rows[0].seeded),
    };
  }
  await sql`insert into user_demo (user_id) values (${userId}) on conflict (user_id) do nothing`;
  return { tapeFrame: "t1" as TapeFrame, vendorBroken: false, seeded: false };
}

async function ensureSeeded(
  sql: Awaited<ReturnType<typeof getSql>>,
  userId: string,
) {
  const demo = await demoState(sql, userId);
  const existing = await sql<{ id: string }>`
    select id from watchlists where user_id = ${userId} order by created_at asc limit 1
  `;
  if (existing[0]) return existing[0].id;

  const listId = id();
  await sql`insert into watchlists (id, user_id, name) values (${listId}, ${userId}, ${"Core"})`;

  for (const row of DEFAULT_LIST) {
    const note = row.notePrice ?? null;
    await sql`
      insert into watchlist_items (id, watchlist_id, user_id, symbol, note_price)
      values (${id()}, ${listId}, ${userId}, ${row.symbol}, ${note})
    `;
  }

  await sql`update user_demo set seeded = true where user_id = ${userId}`;
  return listId;
}

export const listWatchlists = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await ensureSeeded(sql, context.userId);
    const rows = await sql<{ id: string; name: string; n: string | number }>`
      select w.id, w.name, count(i.id) as n
      from watchlists w
      left join watchlist_items i on i.watchlist_id = w.id
      where w.user_id = ${context.userId}
      group by w.id, w.name, w.created_at
      order by w.created_at asc
    `;
    return rows.map(
      (r): WatchlistSummary => ({
        id: r.id,
        name: r.name,
        itemCount: num(r.n),
      }),
    );
  });

export const getInbox = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((data: { listId?: string; live?: boolean }) => data)
  .handler(async ({ context, data }): Promise<InboxPayload> => {
    const sql = await getSql();
    const fallbackId = await ensureSeeded(sql, context.userId);
    const listId = data.listId || fallbackId;
    const live = data.live !== false;
    const demo = await demoState(sql, context.userId);

    const lists = await sql<{ id: string; name: string }>`
      select id, name from watchlists where id = ${listId} and user_id = ${context.userId}
    `;
    const list = lists[0];
    if (!list) {
      throw new Error("Watchlist not found");
    }

    const items = await sql<{ symbol: string; note_price: string | number | null }>`
      select symbol, note_price from watchlist_items
      where watchlist_id = ${listId} and user_id = ${context.userId}
      order by added_at asc
    `;

    const snaps = await sql<{ id: string; captured_at: string }>`
      select id, captured_at from visit_snapshots
      where user_id = ${context.userId} and watchlist_id = ${listId}
      order by captured_at desc limit 1
    `;
    const snap = snaps[0];
    const legs = snap
      ? await sql<{ symbol: string; price: string | number; source: string | null }>`
          select symbol, price, source from snapshot_legs where snapshot_id = ${snap.id}
        `
      : [];
    const fixtureMark =
      live &&
      legs.length > 0 &&
      legs.every((l) => l.source === "fixture" || l.source === "carry" || !l.source);
    const lastPrice = new Map(
      fixtureMark ? [] : legs.map((l) => [l.symbol, num(l.price)]),
    );

    const symbols = items.map((i) => i.symbol);
    const quotes = await quotesFor(symbols, demo.tapeFrame, demo.vendorBroken, live);
    const noteOf = new Map(
      items.map((i) => {
        if (i.note_price == null || i.note_price === "") return [i.symbol, null] as const;
        const n = num(i.note_price);
        return [i.symbol, n > 0 ? n : null] as const;
      }),
    );

    const scored: InboxItem[] = quotes.map((q) => {
      const unavailable = q.freshness === "unavailable" || q.price <= 0;
      const baseline = lastPrice.get(q.symbol) ?? q.prevClose;
      const result = scoreItem({
        price: q.price,
        baseline,
        prevClose: q.prevClose,
        open: q.open,
        volume: q.volume,
        avgVolume20d: q.avgVolume20d,
        sigma: q.volatility20d,
        notePrice: noteOf.get(q.symbol),
        splitOrBonus: Boolean(q.corporateAction),
      });
      return {
        symbol: q.symbol,
        name: q.name,
        sector: q.sector,
        price: q.price,
        notePrice: noteOf.get(q.symbol) ?? null,
        changeSinceSeenPct: result.pctSeen,
        dayChangePct: result.pctDay,
        score: result.score,
        level: result.level,
        reasons: [
          ...result.reasons,
          ...(q.freshness === "conflict" ? (["Two prints · kept the later"] as const) : []),
        ].slice(0, 2),
        freshness: q.freshness,
        asOf: q.asOf,
        source: q.source,
        terms: result.terms,
        unavailable,
        lastLookPrice: lastPrice.has(q.symbol) ? lastPrice.get(q.symbol)! : null,
      };
    });

    const buckets = assignBuckets(scored);
    const warnings: string[] = [];
    const stale = scored.filter((s) => s.freshness === "stale");
    const unav = scored.filter((s) => s.unavailable);
    const delayed = scored.filter((s) => s.freshness === "delayed");
    const conflicted = scored.filter((s) => s.freshness === "conflict");
    if (demo.vendorBroken) warnings.push("Quote feed paused · last good cache.");
    if (unav.length) warnings.push(`${unav.length} quote${unav.length === 1 ? "" : "s"} missing; remaining names still scored.`);
    if (stale.length) warnings.push(`${stale.length} stale quotes.`);
    else if (delayed.length && live) warnings.push("Yahoo Finance · last trade (delayed when the cash market is shut).");
    else if (delayed.length) warnings.push("Delayed · previous session close (EOD).");
    if (conflicted.length) {
      warnings.push(
        `${conflicted.map((c) => c.symbol).join(", ")} had two prints · kept the later.`,
      );
    }

    const clock = getMarketClock();
    const headlineBits = [sectorHeadline(
      scored.map((s) => ({
        sector: s.sector,
        pctSeen: s.changeSinceSeenPct,
        sigma: s.terms.sigma,
        unavailable: s.unavailable,
      })),
    )];
    if (buckets.attention.length) {
      headlineBits.push(`${buckets.attention.length} need a second look.`);
    }

    return {
      listId: list.id,
      listName: list.name,
      lastSeenAt: snap?.captured_at ?? null,
      generatedAt: new Date().toISOString(),
      market: clock,
      headline: headlineBits.join("  "),
      attentionCount: buckets.attention.length,
      dataWarnings: warnings,
      tapeFrame: demo.tapeFrame,
      vendorBroken: demo.vendorBroken,
      attention: buckets.attention,
      watch: buckets.watch,
      quiet: buckets.quiet,
    };
  });

export const markSeen = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { listId: string; live?: boolean }) => data)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const listId = data.listId;
    const owned = await sql<{ id: string }>`
      select id from watchlists where id = ${listId} and user_id = ${context.userId}
    `;
    if (!owned[0]) throw new Error("Watchlist not found");

    const recent = await sql<{ id: string; captured_at: string }>`
      select id, captured_at from visit_snapshots
      where user_id = ${context.userId} and watchlist_id = ${listId}
      order by captured_at desc limit 1
    `;
    if (recent[0]) {
      const age = Date.now() - new Date(recent[0].captured_at).getTime();
      if (age >= 0 && age < 10_000) {
        return { snapshotId: recent[0].id, reused: true };
      }
    }

    const prevLegs = new Map<string, SnapshotLeg>();
    if (recent[0]) {
      const old = await sql<{
        symbol: string;
        price: string | number;
        volume: string | number | null;
        as_of: string | null;
        source: string | null;
      }>`
        select symbol, price, volume, as_of, source
        from snapshot_legs where snapshot_id = ${recent[0].id}
      `;
      for (const row of old) {
        prevLegs.set(row.symbol, {
          symbol: row.symbol,
          price: num(row.price),
          volume: row.volume == null ? null : num(row.volume),
          asOf: row.as_of,
          source: row.source ?? "fixture",
        });
      }
    }

    const demo = await demoState(sql, context.userId);
    const items = await sql<{ symbol: string }>`
      select symbol from watchlist_items where watchlist_id = ${listId} and user_id = ${context.userId}
    `;
    const quotes = await quotesFor(
      items.map((i) => i.symbol),
      demo.tapeFrame,
      demo.vendorBroken,
      data.live !== false,
    );
    const legs = legsForMark(
      items.map((i) => i.symbol),
      quotes,
      prevLegs,
    );

    const snapId = id();
    await sql`
      insert into visit_snapshots (id, user_id, watchlist_id, captured_at)
      values (${snapId}, ${context.userId}, ${listId}, ${new Date().toISOString()})
    `;
    for (const leg of legs) {
      await sql`
        insert into snapshot_legs (snapshot_id, symbol, price, volume, as_of, source)
        values (${snapId}, ${leg.symbol}, ${leg.price}, ${leg.volume}, ${leg.asOf}, ${leg.source})
      `;
    }
    return { snapshotId: snapId, reused: false };
  });

export const setTapeFrame = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { frame: TapeFrame }) => data)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await demoState(sql, context.userId);
    await sql`update user_demo set tape_frame = ${data.frame} where user_id = ${context.userId}`;
    return { frame: data.frame };
  });

export const setVendorBroken = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { broken: boolean }) => data)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await demoState(sql, context.userId);
    await sql`update user_demo set vendor_broken = ${data.broken} where user_id = ${context.userId}`;
    return { broken: data.broken };
  });

export const addItem = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { listId: string; symbol: string; notePrice?: number | null }) => data)
  .handler(async ({ context, data }) => {
    const symbol = data.symbol.trim().toUpperCase();
    if (!SYMBOL_MAP.has(symbol)) return { ok: false as const, error: "Unknown symbol" };
    const sql = await getSql();
    const owned = await sql<{ id: string }>`
      select id from watchlists where id = ${data.listId} and user_id = ${context.userId}
    `;
    if (!owned[0]) return { ok: false as const, error: "Missing list" };
    const count = await sql<{ n: string | number }>`
      select count(*) as n from watchlist_items where watchlist_id = ${data.listId}
    `;
    if (num(count[0]?.n) >= MAX_ITEMS) return { ok: false as const, error: "Cap is 40 names" };
    try {
      await sql`
        insert into watchlist_items (id, watchlist_id, user_id, symbol, note_price)
        values (${id()}, ${data.listId}, ${context.userId}, ${symbol}, ${data.notePrice ?? null})
      `;
    } catch {
      return { ok: false as const, error: "Already on the list" };
    }
    return { ok: true as const };
  });

export const bulkAdd = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { listId: string; text: string }) => data)
  .handler(async ({ context, data }) => {
    const tokens = data.text
      .toUpperCase()
      .split(/[\s,;]+/)
      .map((t) => t.replace(/\.NS$/, ""))
      .filter(Boolean);
    const skipped: string[] = [];
    let added = 0;
    const sql = await getSql();
    const owned = await sql<{ id: string }>`
      select id from watchlists where id = ${data.listId} and user_id = ${context.userId}
    `;
    if (!owned[0]) return { added: 0, skipped: tokens };
    const countRows = await sql<{ n: string | number }>`
      select count(*) as n from watchlist_items where watchlist_id = ${data.listId}
    `;
    let count = num(countRows[0]?.n);
    for (const symbol of tokens) {
      if (!SYMBOL_MAP.has(symbol)) {
        skipped.push(symbol);
        continue;
      }
      if (count >= MAX_ITEMS) {
        skipped.push(symbol);
        continue;
      }
      try {
        await sql`
          insert into watchlist_items (id, watchlist_id, user_id, symbol, note_price)
          values (${id()}, ${data.listId}, ${context.userId}, ${symbol}, ${null})
        `;
        added += 1;
        count += 1;
      } catch {
        skipped.push(symbol);
      }
    }
    return { added, skipped };
  });

export const removeItem = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { listId: string; symbol: string }) => data)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`
      delete from watchlist_items
      where watchlist_id = ${data.listId} and user_id = ${context.userId} and symbol = ${data.symbol}
    `;
    return { ok: true };
  });

export const setNotePrice = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { listId: string; symbol: string; notePrice: number | null }) => data)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`
      update watchlist_items set note_price = ${data.notePrice}
      where watchlist_id = ${data.listId} and user_id = ${context.userId} and symbol = ${data.symbol}
    `;
    return { ok: true };
  });

export const searchInstrument = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((data: { q: string }) => data)
  .handler(async ({ data }) => searchSymbols(data.q));

export const listItems = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((data: { listId: string }) => data)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    return sql<{ symbol: string; note_price: string | number | null }>`
      select symbol, note_price from watchlist_items
      where watchlist_id = ${data.listId} and user_id = ${context.userId}
      order by added_at asc
    `;
  });

export { formatIst } from "./clock";
