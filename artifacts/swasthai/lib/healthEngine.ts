import {
  HealthAlert,
  HealthState,
  LabValue,
  RiskScore,
} from "@/types/health";

function makeId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function latestByName(labs: LabValue[]): Map<string, LabValue> {
  const map = new Map<string, LabValue>();
  const sorted = [...labs].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  for (const l of sorted) {
    if (!map.has(l.name)) map.set(l.name, l);
  }
  return map;
}

export function buildAlertsForLabs(labs: LabValue[]): HealthAlert[] {
  const out: HealthAlert[] = [];
  for (const l of labs) {
    if (l.status === "NORMAL") continue;
    const sev: HealthAlert["severity"] =
      l.status === "CRITICAL" ? "critical" : "warning";
    let title = `${l.name} ${l.status.toLowerCase()}`;
    let desc = `${l.name} is ${l.value} ${l.unit}`;
    if (l.referenceLow != null && l.referenceHigh != null) {
      desc += ` (range ${l.referenceLow}-${l.referenceHigh}). `;
    } else {
      desc += ". ";
    }
    if (l.name === "HbA1c" && l.value >= 7) {
      desc += "Glycemic control is suboptimal — consider meeting your doctor within 2 weeks.";
    } else if (l.name === "LDL" && l.value > 100) {
      desc += "Above target — discuss statin adjustment.";
    } else if (l.name === "Creatinine" && l.value > 1.3) {
      desc += "Possible kidney strain — recheck and review meds.";
    } else {
      desc += "Swastha AI flagged this for follow-up.";
    }
    out.push({
      id: makeId("alert"),
      title,
      description: desc,
      severity: sev,
      createdAt: l.date,
      acknowledged: false,
    });
  }
  return out;
}

export function recomputeRisks(state: HealthState): RiskScore[] {
  const latest = latestByName(state.labs);

  const hba1c = latest.get("HbA1c")?.value;
  const fasting = latest.get("Fasting Glucose")?.value;
  const ldl = latest.get("LDL")?.value;
  const hdl = latest.get("HDL")?.value;
  const trig = latest.get("Triglycerides")?.value;
  const creat = latest.get("Creatinine")?.value;

  let diabetes = 30;
  if (hba1c) diabetes = Math.min(95, Math.round((hba1c - 5) * 25 + 10));
  if (fasting && fasting > 125) diabetes = Math.min(95, diabetes + 10);
  const diabetesPrev = state.risks.find((r) => r.category === "Diabetes")?.score ?? diabetes;

  let cardio = 25;
  if (ldl) cardio = Math.min(95, Math.max(20, Math.round((ldl - 80) * 0.6 + 30)));
  if (hdl && hdl < 40) cardio = Math.min(95, cardio + 8);
  if (trig && trig > 150) cardio = Math.min(95, cardio + 6);
  const cardioPrev = state.risks.find((r) => r.category === "Cardiovascular")?.score ?? cardio;

  let kidney = 18;
  if (creat) kidney = Math.min(95, Math.round((creat - 0.7) * 60 + 15));
  const kidneyPrev = state.risks.find((r) => r.category === "Kidney")?.score ?? kidney;

  const trend = (cur: number, prev: number): RiskScore["trend"] => {
    if (cur > prev + 3) return "worsening";
    if (cur < prev - 3) return "improving";
    return "stable";
  };

  const dxFactors = (vals: (string | undefined)[]) =>
    vals.filter(Boolean) as string[];

  return [
    {
      category: "Diabetes",
      score: diabetes,
      trend: trend(diabetes, diabetesPrev),
      factors: dxFactors([
        hba1c ? `HbA1c ${hba1c}%` : undefined,
        fasting ? `Fasting ${fasting} mg/dL` : undefined,
        "BMI 27.4",
      ]),
    },
    {
      category: "Cardiovascular",
      score: cardio,
      trend: trend(cardio, cardioPrev),
      factors: dxFactors([
        ldl ? `LDL ${ldl}` : undefined,
        hdl ? `HDL ${hdl}` : undefined,
        trig ? `Trig ${trig}` : undefined,
      ]),
    },
    {
      category: "Kidney",
      score: kidney,
      trend: trend(kidney, kidneyPrev),
      factors: dxFactors([
        creat ? `Creatinine ${creat}` : "Creatinine normal",
        "eGFR > 90",
      ]),
    },
  ];
}

export function recomputeHealthScore(state: HealthState): number {
  const risks = state.risks;
  if (risks.length === 0) return 70;
  const avgRisk =
    risks.reduce((s, r) => s + r.score, 0) / risks.length;
  const openCritical = state.alerts.filter(
    (a) => !a.acknowledged && a.severity === "critical",
  ).length;
  const openWarning = state.alerts.filter(
    (a) => !a.acknowledged && a.severity === "warning",
  ).length;
  let score = Math.round(100 - avgRisk * 0.6);
  score -= openCritical * 6;
  score -= openWarning * 2;
  return Math.max(20, Math.min(99, score));
}

export function recomputeContinuity(state: HealthState): number {
  const docs = state.documents.length;
  const visits = state.visits.length;
  const completedTasks = state.tasks.filter((t) => t.status === "completed").length;
  const totalTasks = Math.max(1, state.tasks.length);
  const taskRate = completedTasks / totalTasks;
  const score = Math.min(
    99,
    Math.round(50 + docs * 4 + visits * 6 + taskRate * 20),
  );
  return Math.max(30, score);
}
