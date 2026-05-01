import { useQuery } from "@tanstack/react-query";
import { ChevronRight, FileText, Loader2, Search, Users } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState } from "react";

import { doctorApi, type PatientSummary } from "@/lib/api";
import { formatPhone, formatRelative } from "@/lib/format";

export function PatientsPage() {
  const [q, setQ] = useState("");
  const [shareToken, setShareToken] = useState("");
  const [shareBusy, setShareBusy] = useState(false);
  const { data, isLoading, error } = useQuery({
    queryKey: ["patients"],
    queryFn: () => doctorApi.listPatients(),
  });
  const [, setLocation] = useLocation();

  const openSharedPatient = async () => {
    if (!shareToken.trim()) return;
    setShareBusy(true);
    try {
      const result = await doctorApi.verifyShareToken(shareToken.trim());
      setLocation(`/patients/${result.patientId}`);
    } catch (err) {
      window.alert((err as Error).message || "Could not open shared record");
    } finally {
      setShareBusy(false);
    }
  };

  const patients = (data?.patients ?? []).filter((p) => {
    if (!q.trim()) return true;
    const needle = q.trim().toLowerCase();
    return (
      p.phone.toLowerCase().includes(needle) ||
      (p.name || "").toLowerCase().includes(needle)
    );
  });

  return (
    <div className="space-y-8">
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1">
          Shared with you
        </div>
        <h1 className="text-3xl font-serif">Patients</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tap a patient to see their full health memory — labs, meds, diagnoses, and timeline.
        </p>
      </div>

      <div className="rounded-xl border bg-card p-4 space-y-3">
        <div>
          <div className="text-sm font-medium">Open by share token</div>
          <p className="text-xs text-muted-foreground mt-1">
            Paste the token the patient sent you to open their shared record directly.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            value={shareToken}
            onChange={(e) => setShareToken(e.target.value)}
            placeholder="Paste share token"
            className="flex-1 px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="button"
            onClick={openSharedPatient}
            disabled={shareBusy || !shareToken.trim()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
          >
            {shareBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Open record
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by phone or name"
            className="w-full pl-9 pr-3 py-2 rounded-lg border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="text-xs text-muted-foreground inline-flex items-center gap-1.5 ml-auto">
          <Users className="w-3.5 h-3.5" />
          {data?.patients?.length ?? 0} total
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {(error as Error).message}
        </div>
      ) : patients.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          {patients.map((p, i) => (
            <PatientRow key={p.id} patient={p} divider={i > 0} />
          ))}
        </div>
      )}
    </div>
  );
}

function PatientRow({ patient, divider }: { patient: PatientSummary; divider: boolean }) {
  return (
    <Link href={`/patients/${patient.id}`}>
      <a className={`flex items-center gap-4 px-5 py-4 hover:bg-muted/40 transition-colors ${divider ? "border-t" : ""}`}>
        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium text-sm">
          {(patient.name?.[0] || patient.phone.slice(-2) || "?").toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">
            {patient.name || formatPhone(patient.phone)}
          </div>
          <div className="text-xs text-muted-foreground">
            {patient.name ? formatPhone(patient.phone) : `Joined ${formatRelative(patient.createdAt)}`}
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
          <FileText className="w-3.5 h-3.5" />
          {patient.documentCount} {patient.documentCount === 1 ? "doc" : "docs"}
        </div>
        <div className="text-xs text-muted-foreground tabular-nums w-24 text-right">
          {formatRelative(patient.lastUploadAt)}
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </a>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border-2 border-dashed bg-card/50 px-6 py-16 text-center">
      <div className="w-12 h-12 rounded-full bg-muted mx-auto flex items-center justify-center mb-4">
        <Users className="w-5 h-5 text-muted-foreground" />
      </div>
      <h3 className="font-serif text-lg">No patients yet</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
        Patients show up here as they sign up and upload reports through the SwasthAI mobile app.
      </p>
    </div>
  );
}
