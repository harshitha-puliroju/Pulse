import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  addItem,
  bulkAdd,
  listItems,
  listWatchlists,
  removeItem,
  searchInstrument,
  setNotePrice,
} from "@/lib/pulse/server";
import { SYMBOL_MAP } from "@/lib/pulse/symbols";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Trash2 } from "lucide-react";

type Row = { symbol: string; note_price: string | number | null };

export function ManageView({ listId }: { listId?: string }) {
  const { user, isPending } = useCurrentUserState();
  const [id, setId] = useState(listId ?? "");
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<{ symbol: string; name: string }[]>([]);
  const [paste, setPaste] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function load(target?: string) {
    const lists = await listWatchlists();
    const useId = target || id || lists[0]?.id;
    if (!useId) return;
    setId(useId);
    const items = await listItems({ data: { listId: useId } });
    setRows(items);
  }

  useEffect(() => {
    if (isPending || !user) return;
    void load(listId);
  }, [isPending, user, listId]);

  useEffect(() => {
    if (!q.trim()) {
      setHits([]);
      return;
    }
    void searchInstrument({ data: { q } }).then(setHits);
  }, [q]);

  async function add(symbol: string) {
    if (!id) return;
    const res = await addItem({ data: { listId: id, symbol } });
    setMsg(res.ok ? `Added ${symbol}` : res.error ?? "Could not add");
    setQ("");
    setHits([]);
    await load(id);
  }

  async function bulk() {
    if (!id) return;
    const res = await bulkAdd({ data: { listId: id, text: paste } });
    setMsg(`Added ${res.added}${res.skipped.length ? `, skipped ${res.skipped.join(", ")}` : ""}`);
    setPaste("");
    await load(id);
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-bg">
        <div className="mx-auto flex max-w-xl items-center justify-between px-4 py-3">
          <Link to="/" className="inline-flex size-11 items-center justify-center rounded-xl">
            <ArrowLeft className="size-4" />
          </Link>
          <span className="font-display text-lg font-medium">Scrips</span>
          <UserButton />
        </div>
      </header>
      <main className="mx-auto max-w-xl px-4 py-6">
        <label className="text-xs text-muted">Search NSE cash</label>
        <Input
          className="mt-1"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="RELIANCE, HDFC Bank…"
        />
        {hits.length > 0 && (
          <ul className="mt-2 overflow-hidden rounded-2xl border border-border bg-surface">
            {hits.map((h) => (
              <li key={h.symbol}>
                <button
                  type="button"
                  className="flex w-full justify-between px-4 py-3 text-left text-sm hover:bg-bg"
                  onClick={() => void add(h.symbol)}
                >
                  <span>{h.symbol}</span>
                  <span className="text-muted">{h.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <label className="mt-6 block text-xs text-muted">Paste symbols (comma or space)</label>
        <Input
          className="mt-1"
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          placeholder="SBIN, TITAN, ONGC"
        />
        <Button className="mt-2" variant="outline" onClick={() => void bulk()}>
          Add to watchlist
        </Button>

        {msg && <p className="mt-3 text-sm text-muted">{msg}</p>}

        <ul className="mt-8 space-y-2">
          {rows.map((row) => {
            const meta = SYMBOL_MAP.get(row.symbol);
            const note = row.note_price == null ? "" : String(row.note_price);
            return (
              <li
                key={row.symbol}
                className="flex items-center gap-2 rounded-2xl border border-border bg-surface p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{row.symbol}</p>
                  <p className="truncate text-xs text-muted">{meta?.name}</p>
                </div>
                <Input
                  className="h-10 w-24"
                  inputMode="decimal"
                  placeholder="Ref ₹"
                  defaultValue={note}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    void setNotePrice({
                      data: {
                        listId: id,
                        symbol: row.symbol,
                        notePrice: v ? Number(v) : null,
                      },
                    });
                  }}
                />
                <button
                  type="button"
                  className="size-11 text-muted"
                  aria-label={`Remove ${row.symbol}`}
                  onClick={() => void removeItem({ data: { listId: id, symbol: row.symbol } }).then(() => load(id))}
                >
                  <Trash2 className="mx-auto size-4" />
                </button>
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}
