import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AlphaMark } from "@/components/alpha/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSessionUser, signIn, signUp } from "@/lib/alpha/auth";

export const Route = createFileRoute("/sign-in")({
  head: () => ({
    meta: [
      { title: "Sign in — Alpha AI" },
      { name: "description", content: "Sign in to Alpha AI, your friendly tutor for Uganda." },
    ],
  }),
  component: SignInPage,
});

function SignInPage() {
  const navigate = useNavigate();
  const existing = typeof window !== "undefined" ? getSessionUser() : null;
  const [mode, setMode] = useState<"in" | "up">(existing ? "in" : "up");
  const [name, setName] = useState("");
  const [email, setEmail] = useState(existing?.email ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const goApp = () => navigate({ to: "/", replace: true });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "up") await signUp(email, password, name);
      else await signIn(email, password);
      goApp();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-4 py-10">
      {/* Soft cyan glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(34,211,238,0.18),transparent_55%)]"
      />
      <div className="relative w-full max-w-md rounded-2xl border border-border/60 bg-card/90 p-6 shadow-xl backdrop-blur-md sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <AlphaMark className="h-14 w-14" />
          <h1 className="mt-3 font-display text-2xl font-bold tracking-tight text-foreground">Alpha AI</h1>
          <p className="mt-1 text-sm text-muted-foreground">Your Friendly Tutor · Empowering Minds, Shaping The Future</p>
        </div>

        <div className="mb-5 flex rounded-lg bg-muted p-1">
          <button
            type="button"
            className={`flex-1 rounded-md py-2 text-sm font-semibold transition ${mode === "in" ? "bg-background shadow text-foreground" : "text-muted-foreground"}`}
            onClick={() => { setMode("in"); setError(null); }}
          >
            Sign in
          </button>
          <button
            type="button"
            className={`flex-1 rounded-md py-2 text-sm font-semibold transition ${mode === "up" ? "bg-background shadow text-foreground" : "text-muted-foreground"}`}
            onClick={() => { setMode("up"); setError(null); }}
          >
            Create account
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === "up" && (
            <div className="space-y-1.5">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Amina Nalule" required />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" autoComplete={mode === "up" ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" required minLength={6} />
          </div>

          {error && (
            <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" variant="brand" className="w-full" disabled={busy}>
            {busy ? "Please wait…" : mode === "up" ? "Create account" : "Sign in"}
          </Button>
        </form>

        <div className="mt-6 space-y-3 text-center text-sm">
          <button type="button" className="text-primary underline-offset-2 hover:underline" onClick={goApp}>
            Continue as guest
          </button>
          <p className="text-xs text-muted-foreground">
            Accounts on this device are stored securely in your browser. Clearing site data signs you out.
          </p>
          <Link to="/" className="block text-xs text-muted-foreground hover:text-foreground">
            ← Back to Alpha
          </Link>
        </div>
      </div>
    </main>
  );
}
