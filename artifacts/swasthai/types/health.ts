export type LabStatus = "NORMAL" | "LOW" | "HIGH" | "CRITICAL";
export type AlertSeverity = "info" | "warning" | "critical";
export type TaskStatus = "pending" | "completed" | "skipped";
export type TaskPriority = "low" | "moderate" | "high";
export type DocSource = "upload" | "whatsapp" | "audio" | "camera";
export type DocStatus = "processing" | "completed" | "failed";

export interface LabValue {
  id: string;
  name: string;
  value: number;
  unit: string;
  status: LabStatus;
  date: string;
  referenceLow?: number;
  referenceHigh?: number;
  documentId?: string;
}

export interface Medication {
  id: string;
  name: string;
  dose: string;
  frequency: string;
  prescribedBy?: string;
  startDate: string;
  active: boolean;
}

export interface Diagnosis {
  id: string;
  name: string;
  date: string;
  doctor?: string;
}

export interface Visit {
  id: string;
  date: string;
  doctor: string;
  hospital: string;
  notes?: string;
  documentId?: string;
}

export interface HealthAlert {
  id: string;
  title: string;
  description: string;
  severity: AlertSeverity;
  createdAt: string;
  acknowledged: boolean;
}

export interface CareTask {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
}

export interface FamilyMember {
  id: string;
  name: string;
  relation: string;
  age: number;
  initials: string;
}

export interface HealthDocument {
  id: string;
  title: string;
  source: DocSource;
  status: DocStatus;
  uploadedAt: string;
  rawText?: string;
  extractedLabs?: LabValue[];
  extractedMeds?: Medication[];
  extractedDiagnoses?: string[];
  language?: string;
  confidence?: number;
}

export interface RiskScore {
  category: string;
  score: number;
  trend: "improving" | "stable" | "worsening";
  factors: string[];
}

export interface HealthState {
  patientName: string;
  abhaLinked: boolean;
  healthScore: number;
  continuityScore: number;
  documents: HealthDocument[];
  labs: LabValue[];
  medications: Medication[];
  diagnoses: Diagnosis[];
  visits: Visit[];
  alerts: HealthAlert[];
  tasks: CareTask[];
  family: FamilyMember[];
  risks: RiskScore[];
}
