import { HealthState, LabValue } from "@/types/health";

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const days = Math.round((now.getTime() - d.getTime()) / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.round(days / 30)}mo ago`;
  return `${(days / 365).toFixed(1)}y ago`;
}

function latestPerLab(labs: LabValue[]): LabValue[] {
  const map = new Map<string, LabValue>();
  const sorted = [...labs].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  for (const l of sorted) {
    if (!map.has(l.name)) map.set(l.name, l);
  }
  return Array.from(map.values());
}

function trendOf(labs: LabValue[], name: string): string | null {
  const same = labs
    .filter((l) => l.name === name)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  if (same.length < 2) return null;
  const first = same[0];
  const last = same[same.length - 1];
  if (!first || !last) return null;
  const arrow = last.value > first.value ? "↑" : last.value < first.value ? "↓" : "→";
  return `${arrow} ${first.value}→${last.value} ${last.unit} over ${fmtDate(first.date)}`;
}

export function buildHealthSummary(state: HealthState): string {
  const lines: string[] = [];

  lines.push(
    `Patient: ${state.patientName}. ABHA linked: ${state.abhaLinked ? "yes" : "no"}.`,
  );
  lines.push(
    `Health score: ${state.healthScore}/100. Care continuity: ${state.continuityScore}%.`,
  );

  if (state.diagnoses.length) {
    lines.push(
      `Diagnoses: ${state.diagnoses.map((d) => `${d.name} (${fmtDate(d.date)})`).join("; ")}.`,
    );
  }

  const activeMeds = state.medications.filter((m) => m.active);
  if (activeMeds.length) {
    lines.push(
      `Active meds: ${activeMeds
        .map((m) => `${m.name} ${m.dose} ${m.frequency.toLowerCase()}`)
        .join("; ")}.`,
    );
  }

  const labs = latestPerLab(state.labs);
  if (labs.length) {
    const labLines = labs.map((l) => {
      const t = trendOf(state.labs, l.name);
      const range =
        l.referenceLow != null && l.referenceHigh != null
          ? ` [normal ${l.referenceLow}–${l.referenceHigh}]`
          : "";
      return `- ${l.name}: ${l.value} ${l.unit} (${l.status}, ${fmtDate(l.date)})${range}${t ? `; trend ${t}` : ""}`;
    });
    lines.push("Latest labs:");
    lines.push(...labLines);
  }

  if (state.risks.length) {
    lines.push(
      `Risk scores: ${state.risks.map((r) => `${r.category} ${r.score}/100 (${r.trend})`).join("; ")}.`,
    );
  }

  const openAlerts = state.alerts.filter((a) => !a.acknowledged);
  if (openAlerts.length) {
    lines.push("Open alerts:");
    lines.push(...openAlerts.map((a) => `- ${a.severity.toUpperCase()}: ${a.title} — ${a.description}`));
  }

  const pendingTasks = state.tasks.filter((t) => t.status !== "completed");
  if (pendingTasks.length) {
    lines.push(
      `Pending care tasks: ${pendingTasks
        .map((t) => `${t.title} (${t.priority})`)
        .join("; ")}.`,
    );
  }

  if (state.visits.length) {
    const recent = [...state.visits]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3);
    lines.push(
      `Recent visits: ${recent
        .map((v) => `${v.doctor} at ${v.hospital} (${fmtDate(v.date)})${v.notes ? ` — ${v.notes}` : ""}`)
        .join("; ")}.`,
    );
  }

  if (state.family.length) {
    lines.push(
      `Family on plan: ${state.family.map((f) => `${f.name} (${f.relation}, ${f.age})`).join(", ")}.`,
    );
  }

  return lines.join("\n");
}
