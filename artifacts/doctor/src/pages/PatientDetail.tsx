import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowLeft,
  Calendar,
  ChevronRight,
  FileText,
  HeartPulse,
  Languages,
  Loader2,
  Pill,
  Stethoscope,
  TrendingUp,
} from "lucide-react";
import { Link } from "wouter";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  doctorApi,
  type LabTrend,
  type MedicationRow,
  type PatientDocument,
} from "@/lib/api";
import { formatDate, formatPhone, formatRelative, statusColor } from "@/lib/format";

interface Props {
  id: string;
}

export function PatientDetailPage({ id }: Props) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["patient", id],
    queryFn: () => doctorApi.getPatient(id),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        {(error as Error)?.message || "Could not load patient."}
        <div className="mt-2">
          <Link href="/" className="underline">Back to patients</Link>
        </div>
      </div>
    );
  }

  const { patient, stats, documents, labsTrend, medications, diagnoses } = data;
  const initials = (patient.name?.[0] || patient.phone.slice(-2) || "?").toUpperCase();

  return (
    <div className="space-y-8">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" />
        All patients
      </Link>

      <header className="flex items-start gap-5">
        <div className="w-14 h-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-serif text-xl">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-serif leading-tight">
            {patient.name || formatPhone(patient.phone)}
          </h1>
          <div className="text-sm text-muted-foreground mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="inline-flex items-center gap-1.5">
              <HeartPulse className="w-3.5 h-3.5" />
              {formatPhone(patient.phone)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Languages className="w-3.5 h-3.5" />
              {patient.language}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Joined {formatDate(patient.createdAt)}
            </span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Documents" value={stats.documentCount} icon={<FileText className="w-4 h-4" />} />
        <Stat label="Lab markers" value={stats.labCount} icon={<TrendingUp className="w-4 h-4" />} />
        <Stat label="Medications" value={stats.medicationCount} icon={<Pill className="w-4 h-4" />} />
        <Stat label="Diagnoses" value={stats.diagnosisCount} icon={<Stethoscope className="w-4 h-4" />} />
      </div>

      <Section title="Lab trends" subtitle="Latest values across all uploaded reports">
        {labsTrend.length === 0 ? (
          <Empty>No lab values extracted yet.</Empty>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {labsTrend.map((lab) => (
              <LabCard key={lab.name} lab={lab} />
            ))}
          </div>
        )}
      </Section>

      <Section title="Medications" subtitle="Across all extracted prescriptions">
        {medications.length === 0 ? (
          <Empty>No medications recorded.</Empty>
        ) : (
          <div className="rounded-xl border bg-card overflow-hidden">
            {medications.map((m, i) => (
              <MedicationRowItem key={`${m.id || m.name}-${i}`} med={m} divider={i > 0} />
            ))}
          </div>
        )}
      </Section>

      <Section title="Diagnoses" subtitle="Aggregated from all reports">
        {diagnoses.length === 0 ? (
          <Empty>No diagnoses recorded.</Empty>
        ) : (
          <div className="flex flex-wrap gap-2">
            {diagnoses.map((d, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium"
              >
                <Stethoscope className="w-3.5 h-3.5" />
                {d}
              </span>
            ))}
          </div>
        )}
      </Section>

      <Section title="Documents" subtitle="Most recent first">
        {documents.length === 0 ? (
          <Empty>No documents uploaded yet.</Empty>
        ) : (
          <div className="rounded-xl border bg-card overflow-hidden">
            {documents.map((d, i) => (
              <DocumentRow key={d.id} doc={d} divider={i > 0} />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between text-muted-foreground">
        <div className="text-xs uppercase tracking-wider font-medium">{label}</div>
        <div className="text-primary">{icon}</div>
      </div>
      <div className="text-2xl font-serif mt-2 leading-none">{value}</div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-xl font-serif">{title}</h2>
          {subtitle ? (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border-2 border-dashed bg-card/50 px-4 py-10 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

function LabCard({ lab }: { lab: LabTrend }) {
  const status = statusColor(lab.latest?.status || "NORMAL");
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="font-medium text-sm">{lab.name}</div>
          {lab.latest ? (
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-2xl font-serif">{formatNumber(lab.latest.value)}</span>
              <span className="text-xs text-muted-foreground">{lab.unit}</span>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No reading yet</div>
          )}
        </div>
        {lab.latest ? (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.bg} ${status.fg}`}>
            {status.label}
          </span>
        ) : null}
      </div>
      {lab.points.length > 1 ? (
        <div className="h-24 -mx-2 mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lab.points} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={(v) => new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                width={32}
                domain={["auto", "auto"]}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  fontSize: 12,
                  borderRadius: 8,
                }}
                formatter={(v: number) => [`${formatNumber(v)} ${lab.unit}`, lab.name]}
                labelFormatter={(v) => formatDate(String(v))}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ r: 3, fill: "hsl(var(--primary))" }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : lab.latest ? (
        <div className="text-xs text-muted-foreground mt-2">
          1 reading · {formatRelative(lab.latest.date)}
        </div>
      ) : null}
      {lab.latest && (lab.latest.referenceLow !== undefined || lab.latest.referenceHigh !== undefined) ? (
        <div className="text-[11px] text-muted-foreground mt-2">
          Ref: {lab.latest.referenceLow ?? "—"} – {lab.latest.referenceHigh ?? "—"} {lab.unit}
        </div>
      ) : null}
    </div>
  );
}

function MedicationRowItem({ med, divider }: { med: MedicationRow; divider: boolean }) {
  const active = med.active !== false;
  return (
    <div className={`flex items-center gap-4 px-5 py-3 ${divider ? "border-t" : ""}`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
        <Pill className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{med.name || "Unnamed medication"}</div>
        <div className="text-xs text-muted-foreground">
          {[med.dose, med.frequency].filter(Boolean).join(" · ") || "No dosage info"}
        </div>
      </div>
      {!active ? (
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Stopped
        </span>
      ) : null}
    </div>
  );
}

function DocumentRow({ doc, divider }: { doc: PatientDocument; divider: boolean }) {
  return (
    <div className={`flex items-center gap-4 px-5 py-4 ${divider ? "border-t" : ""}`}>
      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
        <FileText className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{doc.title}</div>
        <div className="text-xs text-muted-foreground flex items-center gap-3 mt-0.5">
          <span>{formatRelative(doc.uploadedAt)}</span>
          <span>·</span>
          <span>{doc.labCount} labs · {doc.medCount} meds</span>
          {doc.provider ? (
            <>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <Activity className="w-3 h-3" />
                {doc.provider}
              </span>
            </>
          ) : null}
        </div>
      </div>
      {doc.confidence !== null && doc.confidence !== undefined ? (
        <span className="text-xs text-muted-foreground tabular-nums">
          {Math.round((doc.confidence ?? 0) * 100)}%
        </span>
      ) : null}
      <ChevronRight className="w-4 h-4 text-muted-foreground" />
    </div>
  );
}

function formatNumber(v: number) {
  if (Number.isInteger(v)) return String(v);
  return v.toFixed(2);
}
