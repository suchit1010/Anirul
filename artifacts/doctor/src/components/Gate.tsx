import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Activity, KeyRound, Loader2, ShieldCheck } from "lucide-react";

import { setPasscode } from "@/lib/api";

interface GateProps {
  onUnlocked: () => void;
  errorMessage?: string;
}

export function Gate({ onUnlocked, errorMessage }: GateProps) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(errorMessage ?? null);
  const qc = useQueryClient();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/doctor/patients", {
        headers: { "X-Doctor-Passcode": code.trim() },
      });
      if (res.status === 401 || res.status === 403) {
        setErr("That passcode didn't work. Try again.");
        return;
      }
      if (!res.ok) {
        setErr(`Server error (${res.status}).`);
        return;
      }
      setPasscode(code.trim());
      qc.invalidateQueries();
      onUnlocked();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <form
        onSubmit={submit}
        className="w-full max-w-md bg-card border rounded-2xl p-8 shadow-sm"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              SwasthAI
            </div>
            <h1 className="text-xl font-serif leading-tight">Doctor Console</h1>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          Patient health memory at your fingertips. Enter your access passcode to view shared
          patient records.
        </p>

        <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
          Access passcode
        </label>
        <div className="relative">
          <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="password"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="••••••••"
            autoFocus
            className="w-full pl-10 pr-3 py-3 rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
          />
        </div>

        {err ? (
          <div className="mt-3 text-sm text-destructive">{err}</div>
        ) : null}

        <button
          type="submit"
          disabled={busy || !code.trim()}
          className="mt-5 w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-lg py-3 font-medium text-sm disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
          Unlock console
        </button>

        <p className="mt-6 text-xs text-muted-foreground leading-relaxed">
          Only doctors invited by the patient can see records. Every view is logged and patients
          can revoke access at any time.
        </p>
      </form>
    </div>
  );
}
