# Pulse

**Since you left.**

A watchlist that only paints ±% versus yesterday is a ticker. Everyone sees the same board. The question that actually matters when you open the app after lunch is different:

> What moved *for me*, since I last looked — and was that move large *for this scrip*?

Pulse ranks every name against **its own 20-session realized volatility**, from **your last look**, not previous close. Volume is scored on its own. Stale and missing prints are kept apart from market events. The book then tells you **why** a name was flagged — useful, without pretending certainty.

A 1% print in a low-vol large cap can outrank a 4% spike in a noisy name. Quiet lists stay quiet.

Built for [Code by Groww / CODE 2026](https://groww.in).

---

## Run it on your computer

**You need:** Node.js 20+ (22 is fine) and a network connection (quotes come from Yahoo Finance). **No API key. No `.env` required.**

```bash
git clone <your-repo-url> pulse
cd pulse
npm install
npm run dev
```

Open **http://localhost:8080**

1. **Create account** with email + password (do not use Google on a local clone — that path is only on the hosted deploy).
2. A **Core** NSE book is seeded.
3. First open ranks versus previous close. Tap **Confirm observation** — that LTP becomes your last look.
4. Refresh does **not** reset the digest. Only Confirm does.
5. Add names from **Manage**. Cap 40.

Cash market shut? You will see **Yahoo Finance · delayed / last trade**. That is honest, not broken.

**Jury tape** (does not move the watermark): [http://localhost:8080/?demo=1](http://localhost:8080/?demo=1)

```bash
npm test
npm run typecheck
```

### Optional Postgres

Leave `DATABASE_URL` unset and Pulse uses an embedded Postgres (PGLite) on disk in the process. Fine for trying it.

To persist across machines / many users, set a Postgres URL (Neon, local Docker, etc.) and run:

```bash
export DATABASE_URL=postgres://user:pass@host/db
npm run db:migrate
npm run dev
```

Do **not** commit `.env` files or secrets.

---

## What “meaningful change” means

```
r      = (P − P_last) / P_last
z      = |r| / σ_20
score  = 0.50·clip(z/3) + 0.20·volume + 0.15·gap + 0.15·note
```

| Bucket | Rule |
|---|---|
| **Attention** | score > 0.60 · at most 5 |
| **Watch** | 0.35 – 0.60 |
| **Quiet** | inside that scrip’s usual range |

- `P_last` = LTP at **Confirm observation**. First visit → previous close.
- `σ_20` = sample stdev of the last 20 **Yahoo** daily returns for `SYMBOL.NS`.
- Bonus / split → price z is zero (ex-date is not a crash).
- Inbox GET **never writes**. Confirm is append-only (10s idempotent).
- Confirm while the feed is down **carries** the last good leg.

---

## Architecture

```
Browser (signed in)
    → server functions
        → Postgres   lists · snapshots · last look     (per user)
        → Yahoo *.NS chart → LTP, σ, ADV, freshness    (shared, ~45s cache)
              → score → Attention / Watch / Quiet
```

Quotes are keyed by **symbol**. Your book is keyed by **user**. Ten thousand people on RELIANCE still need one fetch.

**Stack:** TanStack Start · Postgres · Better Auth (email; Google on hosted Grok deploy only).

**Vendor:** [Yahoo Finance chart API](https://query1.finance.yahoo.com/v8/finance/chart/RELIANCE.NS?range=1mo&interval=1d) — delayed, unofficial, no key. Down → last cache → unavailable. Fixtures exist only behind `/?demo=1`.

Indicative / delayed quotes. Not investment advice. Not a Groww product.

## Deploying authentication to Vercel

The deployed app needs a persistent Postgres database and its own Google OAuth
credentials. In Vercel's Production environment, set these variables:

```
DATABASE_URL=postgres://...
BETTER_AUTH_SECRET=<a long random secret>
BETTER_AUTH_URL=https://your-production-domain.example
GOOGLE_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=...
VITE_AUTH_ENABLED=true
```

In Google Cloud Console, add this exact authorized redirect URI (substitute the
same production domain used in `BETTER_AUTH_URL`):

```
https://your-production-domain.example/api/auth/callback/google
```

Also add `https://your-production-domain.example` as an authorized JavaScript
origin. Do not use the Grok preview credentials on Vercel; they only authorize
preview domains. Redeploy after adding the variables so the browser bundle
receives `VITE_AUTH_ENABLED=true` and the migration creates the auth tables.
