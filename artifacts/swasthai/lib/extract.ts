import { LabValue, Medication } from "@/types/health";

const LAB_PATTERNS: { name: string; regex: RegExp; unit: string; refLow: number; refHigh: number }[] = [
  { name: "HbA1c", regex: /hba1c[^\d]*([0-9]+\.?[0-9]*)/i, unit: "%", refLow: 4.0, refHigh: 5.7 },
  { name: "Fasting Glucose", regex: /fasting[^\d]*([0-9]+\.?[0-9]*)/i, unit: "mg/dL", refLow: 70, refHigh: 99 },
  { name: "Random Glucose", regex: /random[^\d]*sugar[^\d]*([0-9]+\.?[0-9]*)/i, unit: "mg/dL", refLow: 70, refHigh: 140 },
  { name: "Total Cholesterol", regex: /total\s*cholesterol[^\d]*([0-9]+\.?[0-9]*)/i, unit: "mg/dL", refLow: 0, refHigh: 200 },
  { name: "LDL", regex: /ldl[^\d]*([0-9]+\.?[0-9]*)/i, unit: "mg/dL", refLow: 0, refHigh: 100 },
  { name: "HDL", regex: /hdl[^\d]*([0-9]+\.?[0-9]*)/i, unit: "mg/dL", refLow: 40, refHigh: 60 },
  { name: "Triglycerides", regex: /triglycerides[^\d]*([0-9]+\.?[0-9]*)/i, unit: "mg/dL", refLow: 0, refHigh: 150 },
  { name: "Creatinine", regex: /creatinine[^\d]*([0-9]+\.?[0-9]*)/i, unit: "mg/dL", refLow: 0.7, refHigh: 1.3 },
  { name: "TSH", regex: /tsh[^\d]*([0-9]+\.?[0-9]*)/i, unit: "mIU/L", refLow: 0.4, refHigh: 4.0 },
  { name: "Hemoglobin", regex: /h[ae]moglobin[^\d]*([0-9]+\.?[0-9]*)/i, unit: "g/dL", refLow: 13, refHigh: 17 },
  { name: "Vitamin D", regex: /vitamin\s*d[^\d]*([0-9]+\.?[0-9]*)/i, unit: "ng/mL", refLow: 30, refHigh: 100 },
  { name: "Vitamin B12", regex: /b12[^\d]*([0-9]+\.?[0-9]*)/i, unit: "pg/mL", refLow: 200, refHigh: 900 },
];

const MED_KEYWORDS = [
  "Metformin",
  "Atorvastatin",
  "Telmisartan",
  "Amlodipine",
  "Losartan",
  "Glimepiride",
  "Insulin",
  "Aspirin",
  "Clopidogrel",
  "Levothyroxine",
  "Pantoprazole",
  "Rosuvastatin",
  "Sitagliptin",
  "Empagliflozin",
];

const DEVANAGARI_DIGITS: Record<string, string> = {
  "०": "0", "१": "1", "२": "2", "३": "3", "४": "4",
  "५": "5", "६": "6", "७": "7", "८": "8", "९": "9",
};

export function normalizeText(input: string): string {
  return input.replace(/[०-९]/g, (d) => DEVANAGARI_DIGITS[d] ?? d);
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export interface ExtractionResult {
  labs: LabValue[];
  medications: Medication[];
  diagnoses: string[];
  language: "english" | "hindi" | "mixed";
  confidence: number;
}

export function extractFromText(rawText: string): ExtractionResult {
  const text = normalizeText(rawText);
  const isoDate = new Date().toISOString();
  const labs: LabValue[] = [];

  for (const pattern of LAB_PATTERNS) {
    const m = text.match(pattern.regex);
    if (m && m[1]) {
      const value = parseFloat(m[1]);
      if (!Number.isNaN(value)) {
        let status: LabValue["status"] = "NORMAL";
        if (value < pattern.refLow) status = "LOW";
        else if (value > pattern.refHigh * 1.5) status = "CRITICAL";
        else if (value > pattern.refHigh) status = "HIGH";
        labs.push({
          id: makeId("lab"),
          name: pattern.name,
          value,
          unit: pattern.unit,
          status,
          date: isoDate,
          referenceLow: pattern.refLow,
          referenceHigh: pattern.refHigh,
        });
      }
    }
  }

  const medications: Medication[] = MED_KEYWORDS.filter((kw) =>
    new RegExp(`\\b${kw}\\b`, "i").test(text),
  ).map((name) => {
    const doseMatch = text.match(new RegExp(`${name}[^\\n]{0,40}?(\\d+\\s?(?:mg|mcg|units))`, "i"));
    const freqMatch = /(once|twice|thrice|three times|four times|daily|bd|od|tds)/i.exec(text);
    return {
      id: makeId("med"),
      name,
      dose: doseMatch?.[1] ?? "Unspecified",
      frequency: freqMatch?.[0] ?? "As prescribed",
      startDate: isoDate,
      active: true,
    };
  });

  const dxKeywords = ["diabetes", "hypertension", "thyroid", "asthma", "anemia", "ckd", "dyslipidemia"];
  const diagnoses = dxKeywords
    .filter((k) => new RegExp(k, "i").test(text))
    .map((k) => k.charAt(0).toUpperCase() + k.slice(1));

  const hasHindi = /[\u0900-\u097F]/.test(rawText);
  const hasEnglish = /[a-zA-Z]/.test(rawText);
  const language: ExtractionResult["language"] =
    hasHindi && hasEnglish ? "mixed" : hasHindi ? "hindi" : "english";

  const totalSignals = labs.length + medications.length + diagnoses.length;
  const confidence = Math.min(0.99, 0.55 + totalSignals * 0.06);

  return { labs, medications, diagnoses, language, confidence };
}

export const SAMPLE_REPORT = `Dr Lal PathLabs - Diabetes Panel
Patient: Arjun Sharma, M, 52 yrs
Date: ${new Date().toLocaleDateString()}

HbA1c: 8.2 %  (Ref: 4.0 - 5.7)
Fasting Glucose: 156 mg/dL  (Ref: 70 - 99)
Total Cholesterol: 224 mg/dL
LDL: 138 mg/dL
HDL: 42 mg/dL
Triglycerides: 198 mg/dL
Creatinine: 1.0 mg/dL
TSH: 2.4 mIU/L

Impression: Suboptimal glycemic control.
Continue Metformin 500mg twice daily.
Add Atorvastatin 20mg once at night.
Recheck HbA1c in 3 months.`;
