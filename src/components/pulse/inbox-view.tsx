import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  getInbox,
  listWatchlists,
  markSeen,
  setTapeFrame,
  setVendorBroken,
} from "@/lib/pulse/server";
import type { InboxItem, InboxPayload, TapeFrame, WatchlistSummary } from "@/lib/pulse/types";
import { AttentionCard } from "./attention-card";
import { ScoreDrawer } from "./score-drawer";
import { StockRow } from "./stock-row";
import { HowRanking } from "./meaning";
import { FreshnessBadge } from "./freshness-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, SlidersHorizontal } from "lucide-react";
import { formatIst } from "@/lib/pulse/clock";

export function InboxView({ listId, demo }: { listId?: string; demo?: boolean }) {
  const { user, isPending } = useCurrentUserState();
  const [inbox, setInbox] = useState<InboxPayload | null>(null);
  const [lists, setLists] = useState<WatchlistSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<InboxItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [how, setHow] = useState(false);

  async function reload(id?: string) {
    try {
      const [box, wl] = await Promise.all([
        getInbox({ data: { listId: id ?? listId, live: !demo } }),
        listWatchlists(),
      ]);
      setInbox(box);
      setLists(wl);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load inbox");
    }
  }

  useEffect(() => {
    if (isPending || !user) return;
    void reload();
  }, [isPending, user, listId]);

  if (isPending || (!inbox && !error)) {
    return (
      <div className="mx-auto max-w-xl px-4 py-8">
        <Skeleton className="mb-6 h-8 w-28" />
        <Skeleton className="mb-3 h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (error || !inbox) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <p className="text-muted">{error ?? "Inbox unavailable"}</p>
        <Button className="mt-4" onClick={() => void reload()}>
          Try again
        </Button>
      </div>
    );
  }

  const box = inbox;

  const worstFresh = box.attention.concat(box.watch, box.quiet).find((i) =>
    ["stale", "unavailable", "conflict"].includes(i.freshness),
  );

  async function onSeen() {
    setBusy(true);
    try {
      await markSeen({ data: { listId: box.listId, live: !demo } });
      await reload(box.listId);
    } finally {
      setBusy(false);
    }
  }

  async function onTape(frame: TapeFrame) {
    setBusy(true);
    try {
      await setTapeFrame({ data: { frame } });
      await reload(box.listId);
    } finally {
      setBusy(false);
    }
  }

  async function onBreak() {
    setBusy(true);
    try {
      await setVendorBroken({ data: { broken: !box.vendorBroken } });
      await reload(box.listId);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-border/80 bg-bg/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Activity className="size-4" />
            <span className="font-display text-lg font-medium tracking-tight">Pulse</span>
          </div>
          <div className="flex items-center gap-3">
            <p className="hidden text-xs text-muted sm:block">{inbox.market.label}</p>
            <div className="size-8 overflow-hidden rounded-full">
              {isPending ? <Skeleton className="size-8" /> : <UserButton />}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 pb-28 pt-6">
        <div className="mb-1 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs tracking-wide text-muted uppercase">{inbox.listName}</p>
            <h1 className="font-display text-3xl font-medium tracking-tight">Watchlist</h1>
            <p className="mt-1 text-sm text-muted">
              {inbox.lastSeenAt
                ? `Last look ${formatIst(inbox.lastSeenAt, true)}`
                : "No look yet"}
            </p>
          </div>
          <Link
            to="/manage"
            search={{ listId: inbox.listId }}
            className="inline-flex size-11 items-center justify-center rounded-xl border border-border bg-surface"
            aria-label="Manage list"
          >
            <SlidersHorizontal className="size-4" />
          </Link>
        </div>

        <p className="mt-5 text-pretty text-[17px] leading-snug">{inbox.headline}</p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {worstFresh ? <FreshnessBadge value={worstFresh.freshness} /> : null}
          {inbox.dataWarnings.map((w) => (
            <p key={w} className="text-xs text-muted">
              {w}
            </p>
          ))}
          <button
            type="button"
            className="text-xs text-muted underline-offset-2 hover:underline"
            onClick={() => setHow(true)}
          >
            Methodology
          </button>
        </div>

        <Section title="Attention" count={inbox.attention.length}>
          {inbox.attention.length === 0 ? (
            <p className="px-1 py-4 text-sm text-muted">Nothing needs you.</p>
          ) : (
            <div className="space-y-3">
              {inbox.attention.map((item) => (
                <AttentionCard key={item.symbol} item={item} onOpen={() => setOpen(item)} />
              ))}
            </div>
          )}
        </Section>

        <Section title="Watch" count={inbox.watch.length}>
          {inbox.watch.map((item) => (
            <StockRow key={item.symbol} item={item} onOpen={() => setOpen(item)} />
          ))}
        </Section>

        <Section title="Quiet" count={inbox.quiet.length}>
          {inbox.quiet.map((item) => (
            <StockRow key={item.symbol} item={item} muted onOpen={() => setOpen(item)} />
          ))}
        </Section>

        {lists.length > 1 && (
          <p className="mt-6 text-xs text-subtle">
            Lists: {lists.map((l) => l.name).join(" · ")}
          </p>
        )}

        {demo && (
        <div className="mt-12 flex flex-wrap items-center gap-2">
          {(
            [
              ["t0", "11:02 IST"],
              ["t1", "14:10 IST"],
              ["t2", "Ex-bonus"],
            ] as const
          ).map(([frame, label]) => (
            <Button
              key={frame}
              size="sm"
              variant={inbox.tapeFrame === frame ? "default" : "outline"}
              disabled={busy}
              onClick={() => void onTape(frame)}
            >
              {label}
            </Button>
          ))}
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => void onBreak()}>
            {inbox.vendorBroken ? "Resume feed" : "Pause feed"}
          </Button>
        </div>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-bg/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-xl">
          <Button className="w-full" disabled={busy} onClick={() => void onSeen()}>
            Confirm observation
          </Button>
        </div>
      </div>

      {open && <ScoreDrawer item={open} onClose={() => setOpen(null)} />}
      <HowRanking open={how} onClose={() => setHow(false)} />
    </div>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <section className="mt-8">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-xs tracking-[0.14em] text-muted uppercase">{title}</h2>
        <span className="tabular-nums text-xs text-subtle">{count}</span>
      </div>
      {children}
    </section>
  );
}
