import { useState } from "react";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function Landing({ pending }: { pending?: boolean }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function emailAuth(mode: "in" | "up") {
    setBusy(true);
    setErr(null);
    try {
      const name = email.split("@")[0] || "Pulse";
      const res =
        mode === "up"
          ? await authClient.signUp.email({ email, password, name })
          : await authClient.signIn.email({ email, password });
      if (res.error) {
        setErr(res.error.message || "Could not sign in");
        return;
      }
      window.location.assign("/");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not sign in");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <p className="text-xs font-medium tracking-[0.2em] text-muted uppercase">
        Smart watchlist
      </p>
      <h1 className="mt-4 font-display text-[3.4rem] leading-[1.05] font-medium tracking-tight">
        Pulse
      </h1>
      <p className="mt-5 max-w-sm text-pretty text-[1.45rem] leading-snug text-fg">
        Since you left.
      </p>
      {pending ? (
        <p className="mt-10 text-sm text-muted">Checking your session…</p>
      ) : (
        <div className="mt-10 space-y-3">
          {authEnabled ? (
            <>
              {GROK_PROVIDERS.filter((p) => p.idp !== "twitter").map((p) => (
                <button
                  key={p.providerId}
                  type="button"
                  onClick={() => signIn(p.providerId, { callbackURL: "/" })}
                  className="h-12 w-full rounded-xl border border-border bg-surface text-sm font-medium hover:bg-bg"
                >
                  Continue with {p.label}
                </button>
              ))}
              <p className="pt-3 text-center text-xs text-subtle">Email</p>
              <Input
                type="email"
                autoComplete="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Input
                type="password"
                autoComplete="current-password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {err && <p className="text-sm text-down">{err}</p>}
              <Button className="w-full" disabled={busy || !email || password.length < 8} onClick={() => void emailAuth("in")}>
                Sign in
              </Button>
              <Button variant="outline" className="w-full" disabled={busy || !email || password.length < 8} onClick={() => void emailAuth("up")}>
                Create account
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted">Sign-in is disabled.</p>
          )}
        </div>
      )}
      <p className="mt-12 text-[11px] text-subtle">Delayed / EOD quotes · Not investment advice</p>
    </main>
  );
}
