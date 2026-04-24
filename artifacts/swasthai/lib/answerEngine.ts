import { HealthState, LabValue } from "@/types/health";

function latestLab(state: HealthState, name: string): LabValue | undefined {
  return [...state.labs]
    .filter((l) => l.name.toLowerCase().includes(name.toLowerCase()))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function describeLab(l: LabValue): string {
  const range =
    l.referenceLow != null && l.referenceHigh != null
      ? ` (range ${l.referenceLow}–${l.referenceHigh} ${l.unit})`
      : "";
  return `${l.value} ${l.unit} on ${fmtDate(l.date)} — ${l.status.toLowerCase()}${range}`;
}

export function answerQuestion(q: string, state: HealthState): string {
  const text = q.toLowerCase().trim();

  // Greeting
  if (/^(hi|hello|hey|namaste|namaskar)\b/.test(text)) {
    return `Namaste ${state.patientName.split(" ")[0]}. Your current health score is ${state.healthScore}/100 with ${state.alerts.filter((a) => !a.acknowledged).length} open alert(s). Ask me about a specific lab, your meds, or your risks.`;
  }

  // Specific labs
  const labKeywords: { keys: string[]; name: string }[] = [
    { keys: ["hba1c", "a1c", "sugar", "diabetes control"], name: "HbA1c" },
    { keys: ["fasting", "fbs"], name: "Fasting Glucose" },
    { keys: ["ldl", "bad cholesterol"], name: "LDL" },
    { keys: ["hdl", "good cholesterol"], name: "HDL" },
    { keys: ["total cholesterol", "cholesterol"], name: "Total Cholesterol" },
    { keys: ["triglyceride"], name: "Triglycerides" },
    { keys: ["creatinine", "kidney"], name: "Creatinine" },
    { keys: ["tsh", "thyroid"], name: "TSH" },
    { keys: ["hemoglobin", "haemoglobin", "hb"], name: "Hemoglobin" },
    { keys: ["vitamin d", "vit d"], name: "Vitamin D" },
    { keys: ["b12", "vitamin b12"], name: "Vitamin B12" },
  ];
  for (const lk of labKeywords) {
    if (lk.keys.some((k) => text.includes(k))) {
      const lab = latestLab(state, lk.name);
      if (lab) {
        const history = state.labs
          .filter((l) => l.name === lk.name)
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        let extra = "";
        if (history.length >= 2) {
          const first = history[0]!.value;
          const last = history[history.length - 1]!.value;
          const delta = last - first;
          extra = ` Trend: ${first} → ${last} (${delta >= 0 ? "+" : ""}${delta.toFixed(1)} ${lab.unit}).`;
        }
        return `Your latest ${lk.name} is ${describeLab(lab)}.${extra}`;
      }
      return `I don't have a ${lk.name} reading yet. Add a report from the Add tab and I'll remember it.`;
    }
  }

  // Meds
  if (/\b(med|medic|drug|tablet|prescription|pill)/.test(text)) {
    const meds = state.medications.filter((m) => m.active);
    if (meds.length === 0) return "You have no active medications on record.";
    return `You're on ${meds.length} active medication(s): ${meds
      .map((m) => `${m.name} ${m.dose} (${m.frequency})`)
      .join("; ")}.`;
  }

  // Alerts
  if (/\b(alert|warning|red flag|issue|problem)/.test(text)) {
    const open = state.alerts.filter((a) => !a.acknowledged);
    if (open.length === 0) return "No active alerts. You're in the clear right now.";
    return `${open.length} open alert(s):\n` + open.map((a) => `• ${a.title} — ${a.description}`).join("\n");
  }

  // Tasks / care
  if (/\b(task|care|todo|to do|do today|pending)/.test(text)) {
    const pend = state.tasks.filter((t) => t.status !== "completed");
    if (pend.length === 0) return "You're all caught up — no pending care tasks.";
    return `${pend.length} pending task(s):\n` + pend.map((t) => `• ${t.title} (${t.priority}, due ${fmtDate(t.dueDate)})`).join("\n");
  }

  // Risk
  if (/\b(risk|chance|likelihood)/.test(text)) {
    return state.risks
      .map((r) => `${r.category}: ${r.score}/100 (${r.trend}) — ${r.factors.join(", ")}`)
      .join("\n");
  }

  // Visits
  if (/\b(visit|doctor|appointment|consult)/.test(text)) {
    if (state.visits.length === 0) return "No visits on record yet.";
    const last = [...state.visits].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    )[0]!;
    return `Last visit: ${last.doctor} at ${last.hospital} on ${fmtDate(last.date)}. ${last.notes ?? ""}`;
  }

  // Documents
  if (/\b(document|report|file|upload)/.test(text)) {
    const n = state.documents.length;
    if (n === 0) return "No documents stored yet. Use the Add tab to upload your first report.";
    const recent = [...state.documents]
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
      .slice(0, 3);
    return `${n} document(s) in memory. Most recent:\n` + recent.map((d) => `• ${d.title} (${fmtDate(d.uploadedAt)})`).join("\n");
  }

  // Score
  if (/\b(score|how am i|overall|health)/.test(text)) {
    return `Your overall health score is ${state.healthScore}/100. Care continuity is ${state.continuityScore}%. Diabetes risk ${state.risks.find((r) => r.category === "Diabetes")?.score}/100.`;
  }

  // Summary
  if (/\b(summar|brief|overview|status|recap|last 3 months|last few months)/.test(text)) {
    const a1c = latestLab(state, "HbA1c");
    const ldl = latestLab(state, "LDL");
    const meds = state.medications.filter((m) => m.active).length;
    const alerts = state.alerts.filter((a) => !a.acknowledged).length;
    return `Quick recap: HbA1c ${a1c ? `${a1c.value}%` : "—"}, LDL ${ldl ? `${ldl.value} mg/dL` : "—"}, ${meds} active meds, ${alerts} open alert(s). Diabetes risk is ${state.risks.find((r) => r.category === "Diabetes")?.trend}. I'd prioritise the HbA1c follow-up before your next visit.`;
  }

  // Family
  if (/\b(family|wife|son|daughter|husband|child)/.test(text)) {
    if (state.family.length === 0) return "No family members linked.";
    return `Linked family: ` + state.family.map((f) => `${f.name} (${f.relation}, ${f.age})`).join(", ") + ".";
  }

  // Diagnoses
  if (/\b(diagnos|condition|disease|chronic)/.test(text)) {
    if (state.diagnoses.length === 0) return "No active diagnoses recorded.";
    return `Active diagnoses: ` + state.diagnoses.map((d) => d.name).join(", ") + ".";
  }

  // Fallback
  return `I can answer about your labs (HbA1c, LDL, etc), medications, alerts, care tasks, risk scores, visits, or give you a summary. What would you like to know?`;
}

export const SUGGESTED_PROMPTS = [
  "What's my latest HbA1c?",
  "Summarise my last 3 months",
  "What meds am I on?",
  "Any red flags right now?",
  "How is my kidney doing?",
];
