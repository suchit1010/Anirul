import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Activity, KeyRound, Loader2, ShieldCheck, AlertCircle } from "lucide-react";

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
    if (!code.trim()) {
      setErr("Enter your access passcode");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/doctor/patients", {
        headers: { "X-Doctor-Passcode": code.trim() },
      });
      if (res.status === 401 || res.status === 403) {
        setErr("That passcode didn't work. Try again.");
        setCode("");
        return;
      }
      if (!res.ok) {
        setErr(`Server error (${res.status}). Try again.`);
        return;
      }
      setPasscode(code.trim());
      qc.invalidateQueries();
      onUnlocked();
    } catch (e) {
      setErr((e as Error).message || "Connection failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gradient-to-br from-background to-muted/20">
      <form
        onSubmit={submit}
        className="w-full max-w-md"
      >
        {/* Card */}
        <div className="bg-card border border-border rounded-2xl p-8 shadow-lg space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                SwasthAI
              </div>
              <h1 className="text-2xl font-serif leading-tight text-foreground">Doctor Access</h1>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground leading-relaxed">
            Patient health records are private. Only doctors with a valid passcode can access shared patient information.
          </p>

          {/* Input */}
          <div className="space-y-2">
            <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Access passcode
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="password"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setErr(null);
                }}
                placeholder="••••••••"
                autoFocus
                disabled={busy}
                className="w-full pl-10 pr-3 py-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm placeholder:text-muted-foreground disabled:opacity-50 transition"
              />
            </div>
          </div>

          {/* Error */}
          {err ? (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
              <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
              <p className="text-sm text-destructive">{err}</p>
            </div>
          ) : null}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={busy || !code.trim()}
            className="w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-lg py-3 font-medium text-sm hover:opacity-90 disabled:opacity-50 transition"
          >
            {busy ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Unlock access</span>
              </>
            )}
          </button>

          {/* Security Note */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
            <ShieldCheck className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="font-medium text-foreground">Secure & Audited.</span> Every view of patient records is logged. Patients can revoke access anytime.
            </p>
          </div>
        </div>

        {/* Footer Help */}
        <div className="mt-8 text-center text-xs text-muted-foreground">
          <p>Doctor invited by patient? You should have received a passcode via email.</p>
        </div>
      </form>
    </div>
  );
}
