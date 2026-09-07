import { useState } from "react";
import { authClient, authEnabled } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function Landing({ pending }: { pending?: boolean }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function emailAuth() {
    setBusy(true);
    setErr(null);
    try {
      if (email !== "test@gmail.com" || password !== "12345678") {
        setErr("Invalid credentials. Please use the test account.");
        setBusy(false);
        return;
      }
      const name = "Test User";
      let signInRes = await authClient.signIn.email({ email, password });
      
      if (signInRes.error) {
        const signUpRes = await authClient.signUp.email({ email, password, name });
        if (signUpRes.error) {
          setErr(signUpRes.error.message || "Could not sign in");
          return;
        }
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
              <p className="pt-3 text-center text-xs text-subtle">
                Demo User: test@gmail.com / 12345678
              </p>
              <Input
                type="email"
                autoComplete="email"
                placeholder="test@gmail.com"
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
              <Button className="w-full" disabled={busy || !email || password.length < 8} onClick={() => void emailAuth()}>
                Sign in
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
