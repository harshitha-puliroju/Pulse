import type { MarketState } from "./types";

const TZ = "Asia/Kolkata";
const HOLIDAYS_2026 = new Set(["2026-01-26", "2026-08-15", "2026-10-02"]);

export function istParts(now = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const bag: Record<string, string> = {};
  for (const p of fmt.formatToParts(now)) {
    if (p.type !== "literal") bag[p.type] = p.value;
  }
  const date = `${bag.year}-${bag.month}-${bag.day}`;
  const minutes = Number(bag.hour) * 60 + Number(bag.minute);
  return { date, minutes, weekday: bag.weekday, hour: bag.hour, minute: bag.minute };
}

export function formatIst(iso: string | Date, withDate = false) {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: TZ,
    ...(withDate ? { day: "numeric", month: "short" } : {}),
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

export function getMarketClock(now = new Date()) {
  const { date, minutes, weekday } = istParts(now);
  const weekend = weekday === "Sat" || weekday === "Sun";
  const holiday = HOLIDAYS_2026.has(date);
  let state: MarketState = "closed";
  if (!weekend && !holiday) {
    if (minutes >= 9 * 60 && minutes < 9 * 60 + 8) state = "pre";
    else if (minutes >= 9 * 60 + 15 && minutes <= 15 * 60 + 30) state = "open";
    else if (minutes > 15 * 60 + 30) state = "post";
  }
  const label =
    state === "open"
      ? "Market open"
      : state === "pre"
        ? "Pre-open"
        : state === "post"
          ? "After close"
          : weekend
            ? `Market closed · ${weekday}`
            : holiday
              ? "Market holiday"
              : "Market closed";
  return { state, asOf: now.toISOString(), label, date };
}

/** Last NSE cash close used by fixtures: Fri 4 Sep 2026 15:29 IST. */
export const LAST_SESSION_CLOSE_ISO = "2026-09-04T09:59:00.000Z";
/** Demo "last seen": Sat 5 Sep 2026 11:02 IST. */
export const LAST_SEEN_ISO = "2026-09-05T05:32:00.000Z";
