export function HowRanking({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center">
      <button type="button" className="absolute inset-0 bg-fg/30" aria-label="Close" onClick={onClose} />
      <div className="relative z-10 max-h-[90vh] w-full max-w-md overflow-auto rounded-t-3xl border border-border bg-surface p-6 sm:rounded-3xl">
        <p className="text-xs tracking-wide text-muted uppercase">Methodology</p>
        <h2 className="mt-1 font-display text-2xl font-medium tracking-tight">
          Unusual for this scrip, from your last look.
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Return is from the last time you confirmed the book. That return is
          divided by this name’s own 20-session range. Volume and the opening
          print can raise the rank. A bonus or split is adjusted so the ex-date
          does not look like a crash. Two prints: we keep the later one.
        </p>
        <dl className="mt-5 space-y-3 text-sm">
          <Row k="Attention" v="Needs a second look · at most five" />
          <Row k="Watch" v="Elevated, not urgent" />
          <Row k="Quiet" v="Inside its usual range" />
        </dl>
        <p className="mt-5 font-mono text-[11px] leading-relaxed text-subtle">
          z = |r| / σ₂₀ · score = 0.50 z̃ + 0.20 volume + 0.15 gap + 0.15 note
        </p>
        <button
          type="button"
          className="mt-6 h-11 w-full rounded-xl bg-fg text-sm font-medium text-bg"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border pb-3">
      <dt className="text-muted">{k}</dt>
      <dd className="text-right">{v}</dd>
    </div>
  );
}
