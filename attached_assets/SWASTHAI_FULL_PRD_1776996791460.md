# SwasthAI — Full Production PRD & Build Guide
**Codename:** Anirul | **Version:** 2.0 | **Date:** April 2026  
**Hackathon:** Superteam Frontier — [superteam.fun/earn/hackathon/frontier](https://superteam.fun/earn/hackathon/frontier)

---

## Table of Contents
1. [The Problem We're Solving](#1-the-problem)
2. [What We're Building](#2-what-were-building)
3. [What's Already Built](#3-whats-already-built)
4. [What Still Needs to Be Built](#4-what-still-needs-to-be-built)
5. [Full System Architecture](#5-full-system-architecture)
6. [Agentic AI Flows](#6-agentic-ai-flows)
7. [Private Healthcare Payment Gateway](#7-private-healthcare-payment-gateway)
8. [Implementation Roadmap](#8-implementation-roadmap)
9. [Code Implementation Guide](#9-code-implementation-guide)
10. [Hackathon Alignment](#10-hackathon-alignment)
11. [Business Model](#11-business-model)

---

## 1. The Problem

India's healthcare failure is not doctor quality. It's **context fragmentation**.

```
THE LOOP THAT KILLS PEOPLE:
Patient → visits doctor
        → gets test
        → gets report  
        → loses/forgets it
        → visits another doctor
        → repeats same test
        → no one sees full picture
        → complications happen late
        → cost rises
        → repeat
```

**Hard numbers:**
- 63 million Indians pushed into poverty yearly due to medical expenses
- 90 million Indians spend >10% of household income on health (catastrophic threshold)
- Only 0.7 doctors per 1,000 people (rural: 80% specialist shortage)
- 78 crore ABHA digital health IDs created — the rails exist, the intelligence layer doesn't
- Duplicate tests alone waste ₹15,000–40,000 per chronic patient per year

**The real opportunity:**  
You cannot fix the doctor-to-patient ratio. But you can make every consultation 3x more effective by eliminating the information gap. That's SwasthAI.

---

## 2. What We're Building

> **SwasthAI = AI Health Memory + Care Navigator + Private Health Payments**

A patient-held AI health layer that:
- Stores all reports, prescriptions, scans, medicines, doctor conversations
- Converts them to a structured, longitudinal health timeline
- Detects trends and red flags before they become crises
- Reminds patients and families what to do next
- Gives doctors a 1-page AI brief before every consultation
- Reduces unnecessary repeat tests and follow-up loss
- Enables **private healthcare payments** so sensitive medical conditions stay confidential

### The 5 Layers

```
Layer 1: INGEST EVERYTHING
  PDFs · images · discharge summaries · prescriptions
  lab results · voice notes · WhatsApp forwards · audio

Layer 2: CONVERT TO STRUCTURED DATA (AI Extraction)
  diagnoses · medications · dosages · lab values
  dates · hospital names · doctor notes · follow-up instructions

Layer 3: BUILD A TIMELINE
  condition-by-condition history
  medication changes over time
  lab trends across visits
  risk pattern detection

Layer 4: AGENTIC CARE ACTIONS
  what to check next · when to retest · when to revisit
  medication interaction warnings · duplicate test prevention
  critical value alerts · WhatsApp reminders

Layer 5: SHARE WITH CONSENT + PRIVATE PAYMENTS
  ABHA-linked patient-controlled sharing
  on-chain consent receipts (Solana)
  private healthcare payments via Umbra protocol
  redacted payment proofs for insurance
```

---

## 3. What's Already Built

> **Codebase location:** `health-manager-main/` (Next.js 15, TypeScript, Prisma, Supabase, PostgreSQL)

### ✅ DONE — Production Ready

#### A. Auth & Workspace System
```
Files: lib/auth-server.ts, lib/supabase-server.ts, lib/workspace-store.ts
Routes: app/api/auth/, app/api/workspaces/ (13 routes)

What works:
- Supabase JWT authentication
- Session validation + dev bypass mode
- Workspace CRUD (create/read/update)
- Role-based access: OWNER / EDITOR / VIEWER
- Email invite lifecycle: create → accept → revoke → resend
- Secure invite tokens with expiry
```

#### B. Document Ingestion Pipeline (v1)
```
Files: lib/document-ingestion.ts, lib/document-store.ts
Routes: app/api/workspaces/[id]/documents/ (4 routes)

What works:
- Upload PDF / text files (max 10MB)
- WhatsApp forwarded text ingestion
- Audio transcript ingestion
- Channel source metadata (DIRECT_UPLOAD / WHATSAPP_FORWARD / AUDIO_TRANSCRIPT)
- Document status FSM: UPLOADED → PROCESSING → COMPLETED / FAILED
- Extraction job lifecycle with DB persistence
- Multilingual text normalization (Devanagari digits + Hindi medical terms)
```

#### C. Clinical Normalization Engine (v1)
```
Files: lib/clinical-normalization.ts (549 lines), lib/normalization-store.ts
Routes: app/api/workspaces/[id]/labs/

What works:
- 22+ lab test reference ranges (ICMR/WHO adapted for India)
- Age/sex-adjusted ranges (child/adult/elderly tiers)
- Status flagging: NORMAL / LOW / HIGH / CRITICAL
- NormalizedLabValue persistence with all metadata
- LabReferenceRange canonical definitions
```

#### D. Risk Scoring Engine (v1)
```
Files: lib/risk-scoring.ts (365 lines), lib/risk-store.ts (527 lines)
Routes: app/api/workspaces/[id]/clinical-summary/

What works:
- Risk categories: DIABETES, CKD, CVD, LIVER, GENERAL
- 0-100 score with contributing factor explanations
- Risk persistence to ClinicalRiskScore table
- Clinical summary generation with risk dashboard data
```

#### E. Trend Detection Engine (v1)
```
Files: lib/trend-detection.ts (346 lines)

What works:
- Single-lab trend analysis (IMPROVING / STABLE / WORSENING)
- Trend strength: weak / moderate / strong
- Acceleration detection (getting worse faster)
- Multi-test pattern detection (metabolic syndrome, early CKD)
```

#### F. Clinical Alerts System (v1)
```
Files: lib/risk-store.ts
Routes: app/api/workspaces/[id]/clinical-alerts/ (3 routes)

What works:
- Alert types: CRITICAL_LAB_VALUE, ABNORMAL_TREND, MULTI_TEST_ABNORMALITY,
              MEDICATION_CONTRAINDICATION, AGE_RISK_FACTOR
- Alert lifecycle: CREATED → ACKNOWLEDGED → RESOLVED
- Immutable alert event timeline with actor enrichment
- Timeline filters, pagination, CSV/JSON export
```

#### G. Consent Management (v1)
```
Files: lib/consent-store.ts (256 lines)
Routes: app/api/workspaces/[id]/consents/ (2 routes)

What works:
- Consent grant lifecycle: ACTIVE / REVOKED / EXPIRED
- Scoped permissions: DOCTOR_BRIEF, LAB_TRENDS, FULL_TIMELINE, ALERTS, DOCUMENTS
- Immutable consent event log (CREATED / REVOKED / EXPIRED)
- Subject name, contact, purpose, expiry fields
```

#### H. Care Tasks / Reminders (v1)
```
Files: lib/care-plan-store.ts (284 lines)
Routes: app/api/workspaces/[id]/care-tasks/ (2 routes)

What works:
- Task creation: MANUAL / ALERT_FOLLOWUP / RISK_FOLLOWUP
- Priority: LOW / MODERATE / HIGH
- Lifecycle: PENDING → COMPLETED / SKIPPED / REOPENED
- Immutable task event log
```

#### I. Duplicate Test Prevention (v1)
```
Files: lib/duplicate-test-store.ts (205 lines)
Routes: app/api/workspaces/[id]/duplicate-test-check/

What works:
- Lookback-based duplicate detection
- Auditable recommendation storage
- Rationale generation
```

#### J. Family Delegation (v1)
```
Files: lib/family-store.ts (378 lines)
Routes: app/api/workspaces/[id]/family-profiles/ (2 routes)

What works:
- Family profile creation (SELF/SPOUSE/CHILD/PARENT/SIBLING/OTHER)
- Delegated access: MANAGER / VIEWER
- Immutable access event log
```

#### K. Doctor Brief Generator (v1 — rule-based)
```
Files: lib/product-engine.ts (299 lines)

What works:
- Rule-based brief assembly from structured data
- Continuity score calculation
- Risk flag summarization
- Suggested action generation
PROBLEM: String templates, not AI-generated narratives
```

### ⚠️ BUILT BUT BROKEN/INCOMPLETE

| Feature | File | Problem |
|---------|------|---------|
| AI Extraction | `lib/document-ingestion.ts` | Regex only — 3 labs, 7 meds. Need Claude API |
| Image OCR | `lib/document-ingestion.ts:59` | Returns stub: "OCR not yet enabled" |
| Async Job Queue | `extract/route.ts` | Synchronous in API handler. Will timeout |
| File Storage | `lib/document-store.ts` | Local disk `.data/uploads/`. Wipes on redeploy |
| Consent Enforcement | All data routes | Consents stored but NEVER checked |
| Family UI | `components/` | Backend complete, zero frontend |
| MEDICATION_CONTRAINDICATION | `risk-store.ts` | Alert type exists, detection logic missing |

---

## 4. What Still Needs to Be Built

### Priority 1 — Blockers (Nothing works at scale without these)

#### 4.1 Real AI Extraction Engine
**Current state:** Regex matching 3 lab tests + 7 medication keywords  
**Target state:** Claude API extracting 50+ labs, all medications, diagnoses, doctor notes, in any language

**File to modify:** `lib/document-ingestion.ts`

```typescript
// REPLACE THIS ENTIRE FILE with:
import Anthropic from "@anthropic-ai/sdk";
import { PDFParse } from "pdf-parse";
import sharp from "sharp"; // for image preprocessing

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const EXTRACTION_PROMPT = `
You are a clinical data extraction specialist for Indian healthcare records.
Extract ALL clinical information from this document.

Return ONLY valid JSON with this exact structure:
{
  "labValues": [
    { "name": "HbA1c", "value": 7.2, "unit": "%", "date": "2024-01-15", "lab": "Dr Lal PathLabs" }
  ],
  "medications": [
    { "name": "Metformin", "dose": "500mg", "frequency": "twice daily", "prescribedBy": "Dr Sharma" }
  ],
  "diagnoses": ["Type 2 Diabetes Mellitus", "Essential Hypertension"],
  "visits": [
    { "date": "2024-01-15", "doctor": "Dr Sharma", "hospital": "Apollo Clinic", "notes": "..." }
  ],
  "followUpInstructions": ["Repeat HbA1c in 3 months", "Check BP weekly"],
  "vitals": { "bp": "130/85", "weight": "78kg", "height": "170cm" },
  "documentType": "lab_report | prescription | discharge_summary | consultation_note",
  "language": "english | hindi | mixed",
  "confidence": 0.95
}

Rules:
- Extract ALL lab values, not just common ones
- Convert Indic numerals to Arabic (e.g., ७.२ → 7.2)
- Handle Hindi medical terms (शुगर=sugar, रक्तचाप=blood pressure)
- If date unclear, use document context to estimate
- If value ambiguous, include in notes field
- Language may be English, Hindi, Gujarati, Tamil, or mixed
`;

export async function extractWithAI(
  mimeType: string,
  buffer: Buffer,
  channelText?: string
): Promise<DocumentExtractionResult> {
  
  let content: Anthropic.MessageParam["content"];

  if (channelText) {
    // WhatsApp / audio transcript path
    content = [{ type: "text", text: EXTRACTION_PROMPT + "\n\nDocument:\n" + channelText }];
  } else if (mimeType === "application/pdf") {
    const parser = new PDFParse({ data: buffer });
    const parsed = await parser.getText();
    await parser.destroy();
    const text = parsed.text || "";
    content = [{ type: "text", text: EXTRACTION_PROMPT + "\n\nDocument:\n" + text }];
  } else if (mimeType.startsWith("image/")) {
    // Vision path — handles JPG, PNG, photos of reports
    const base64 = buffer.toString("base64");
    content = [
      { type: "image", source: { type: "base64", media_type: mimeType as "image/jpeg", data: base64 } },
      { type: "text", text: EXTRACTION_PROMPT }
    ];
  } else {
    throw new Error(`Unsupported mime type: ${mimeType}`);
  }

  const message = await anthropic.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 2048,
    messages: [{ role: "user", content }]
  });

  const rawText = (message.content[0] as { text: string }).text;
  const cleaned = rawText.replace(/```json\n?|```\n?/g, "").trim();
  const extracted = JSON.parse(cleaned);

  return {
    text: channelText || "",
    data: {
      highlights: buildHighlights(extracted),
      labValues: extracted.labValues || [],
      medications: (extracted.medications || []).map((m: { name: string }) => m.name),
      diagnoses: extracted.diagnoses || [],
      visits: extracted.visits || [],
      followUpInstructions: extracted.followUpInstructions || [],
      documentType: extracted.documentType,
      language: extracted.language,
      confidence: extracted.confidence
    }
  };
}
```

#### 4.2 Cloud File Storage (Cloudflare R2)
**Current state:** Local disk `.data/uploads/` — wipes on deploy  
**File to create:** `lib/storage.ts`

```typescript
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Cloudflare R2 is S3-compatible and cheapest for India egress (zero egress fees)
const R2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME!;

export async function uploadDocument(
  workspaceId: string,
  documentId: string,
  fileName: string,
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  const key = `workspaces/${workspaceId}/documents/${documentId}/${fileName}`;
  
  await R2.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
    // Server-side encryption
    ServerSideEncryption: "AES256",
    // Tags for lifecycle management
    Tagging: `workspaceId=${workspaceId}&documentId=${documentId}`
  }));

  return key;
}

export async function getSignedDownloadUrl(storageKey: string, expiresIn = 3600): Promise<string> {
  return getSignedUrl(
    R2,
    new GetObjectCommand({ Bucket: BUCKET, Key: storageKey }),
    { expiresIn }
  );
}

// Generate presigned upload URL for direct browser → R2 upload (bypasses server memory)
export async function getSignedUploadUrl(
  workspaceId: string,
  documentId: string,
  fileName: string,
  mimeType: string,
  maxSizeBytes = 10 * 1024 * 1024
): Promise<{ uploadUrl: string; storageKey: string }> {
  const key = `workspaces/${workspaceId}/documents/${documentId}/${fileName}`;
  
  const uploadUrl = await getSignedUrl(
    R2,
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: mimeType,
      ContentLength: maxSizeBytes,
    }),
    { expiresIn: 600 } // 10 minutes
  );

  return { uploadUrl, storageKey: key };
}
```

#### 4.3 Async Job Queue (BullMQ + Redis)
**Current state:** Synchronous extraction in API route — timeouts on large files  
**File to create:** `lib/queue.ts`, `workers/extraction-worker.ts`

```typescript
// lib/queue.ts
import { Queue, Worker, Job } from "bullmq";
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL!, { maxRetriesPerRequest: null });

export const extractionQueue = new Queue("document-extraction", { connection: redis });
export const notificationQueue = new Queue("notifications", { connection: redis });
export const briefQueue = new Queue("doctor-brief-generation", { connection: redis });

export type ExtractionJob = {
  workspaceId: string;
  documentId: string;
  jobId: string;
  userId: string;
  storageKey: string;
  mimeType: string;
};

export async function queueExtraction(data: ExtractionJob) {
  await extractionQueue.add("extract", data, {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  });
}

// workers/extraction-worker.ts
import { Worker } from "bullmq";
import { extractWithAI } from "@/lib/document-ingestion";
import { getDocumentBuffer } from "@/lib/storage";
import { prisma } from "@/lib/prisma";
import { normalizeExtractedLabs } from "@/lib/clinical-normalization";
import { notificationQueue } from "@/lib/queue";

const extractionWorker = new Worker("document-extraction", async (job: Job<ExtractionJob>) => {
  const { workspaceId, documentId, jobId, storageKey, mimeType } = job.data;

  // Update job status to PROCESSING
  await prisma.documentExtractionJob.update({
    where: { id: jobId },
    data: { status: "PROCESSING", startedAt: new Date() }
  });

  try {
    // Download from R2
    const buffer = await getDocumentBuffer(storageKey);
    
    // AI Extraction
    const result = await extractWithAI(mimeType, buffer);
    
    // Persist extraction results
    await prisma.workspaceDocument.update({
      where: { id: documentId },
      data: {
        status: "PROCESSED",
        extractedText: result.text,
        extractedData: result.data as object,
      }
    });

    // Trigger normalization pipeline
    if (result.data.labValues.length > 0) {
      await normalizeExtractedLabs(workspaceId, documentId, result.data.labValues);
    }

    // Mark job complete
    await prisma.documentExtractionJob.update({
      where: { id: jobId },
      data: { status: "COMPLETED", finishedAt: new Date() }
    });

    // Notify user via WhatsApp/push
    await notificationQueue.add("extraction-complete", {
      workspaceId,
      documentId,
      labCount: result.data.labValues.length,
      medicationCount: result.data.medications.length,
    });

  } catch (error) {
    await prisma.documentExtractionJob.update({
      where: { id: jobId },
      data: { 
        status: "FAILED", 
        error: error instanceof Error ? error.message : "Unknown error",
        finishedAt: new Date() 
      }
    });
    throw error; // BullMQ will retry
  }
}, { connection: redis, concurrency: 5 });
```

---

### Priority 2 — Revenue (Build before launch)

#### 4.4 Payment Service (Razorpay)
**File to create:** `lib/billing.ts`, `app/api/billing/`

```typescript
// lib/billing.ts
import Razorpay from "razorpay";
import { prisma } from "./prisma";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export const PLANS = {
  FREE: {
    id: "free",
    name: "Free",
    price: 0,
    limits: { workspaces: 1, documents: 10, members: 1 }
  },
  INDIVIDUAL: {
    id: "individual",
    razorpayPlanId: process.env.RAZORPAY_PLAN_INDIVIDUAL!, // ₹99/month
    name: "Individual",
    price: 99,
    limits: { workspaces: 3, documents: 500, members: 5 }
  },
  FAMILY: {
    id: "family",
    razorpayPlanId: process.env.RAZORPAY_PLAN_FAMILY!, // ₹299/month
    name: "Family",
    price: 299,
    limits: { workspaces: 10, documents: 2000, members: 20 }
  },
  CLINIC: {
    id: "clinic",
    razorpayPlanId: process.env.RAZORPAY_PLAN_CLINIC!, // ₹5000/month
    name: "Clinic",
    price: 5000,
    limits: { workspaces: 999, documents: 99999, members: 999 }
  }
};

export async function createSubscription(userId: string, planId: string) {
  const plan = Object.values(PLANS).find(p => p.id === planId);
  if (!plan || !plan.razorpayPlanId) throw new Error("Invalid plan");

  const subscription = await razorpay.subscriptions.create({
    plan_id: plan.razorpayPlanId,
    customer_notify: 1,
    total_count: 12, // 12 months
    notes: { userId, planId }
  });

  await prisma.subscription.create({
    data: {
      userId,
      planId,
      razorpaySubscriptionId: subscription.id,
      status: "CREATED",
    }
  });

  return subscription;
}

// Add to prisma schema:
// model Subscription {
//   id                     String   @id @default(cuid())
//   userId                 String
//   planId                 String
//   razorpaySubscriptionId String   @unique
//   status                 String   @default("CREATED") // CREATED/ACTIVE/HALTED/CANCELLED
//   currentPeriodEnd       DateTime?
//   createdAt              DateTime @default(now())
//   updatedAt              DateTime @updatedAt
// }
```

**API routes to create:**
```
POST /api/billing/subscribe       — create Razorpay subscription
POST /api/billing/webhook         — handle Razorpay payment events
GET  /api/billing/status          — get current plan + usage
POST /api/billing/cancel          — cancel subscription
```

---

### Priority 3 — Core AI Features (The Product)

#### 4.5 Agentic Doctor Brief Generator
**File to modify:** `lib/product-engine.ts`

```typescript
// Replace buildDoctorBrief with:
export async function generateAIDoctorBrief(
  patient: PatientProfile,
  records: TimelineRecord[],
  clinicalSummary: ClinicalSummarySnapshot
): Promise<DoctorBrief> {
  
  const prompt = `
You are a senior physician's clinical assistant at a top Indian hospital.
Generate a concise, clinically accurate pre-consultation brief for the doctor.

Patient: ${patient.fullName}, ${patient.age} years old
Conditions: ${patient.conditions.join(", ")}
Primary Doctor: ${patient.primaryDoctor}

Clinical Summary:
- Overall Risk: ${clinicalSummary.overallRiskLevel}
- Abnormal Labs: ${clinicalSummary.summary.totalAbnormalLabs}
- Worsening Trends: ${clinicalSummary.summary.worseningTrends}
- Critical Values: ${clinicalSummary.summary.criticalValues}

Recent Health Records (chronological):
${records.slice(-20).map(r => 
  `[${r.date}] ${r.type.toUpperCase()}: ${r.title} — ${r.summary}`
).join("\n")}

Risk Scores:
${clinicalSummary.riskScores.map(r => 
  `- ${r.category}: ${r.level} (${r.score}/${r.maxScore}) — ${r.contributingFactors.join(", ")}`
).join("\n")}

Worsening Trends:
${clinicalSummary.trends.worseningTrends.map(t => 
  `- ${t.labName}: ${t.trend} (${t.trendStrength})`
).join("\n")}

Active Alerts:
${clinicalSummary.alerts.map(a => 
  `- [${a.severity}] ${a.title}: ${a.description}`
).join("\n")}

Generate a brief with:
1. One-line patient summary (clinical snapshot)
2. Critical values requiring immediate attention (if any)
3. Top 3 trends the doctor should be aware of
4. Recommended discussion points for today's consultation
5. Suggested tests/referrals based on trends
6. Medication review flags

CRITICAL RULES:
- Be concise — doctors have 5 minutes to read this
- Do NOT diagnose. Flag patterns for doctor judgment
- Cite specific values and dates ("HbA1c was 8.9% on Jan 15, up from 7.2% in Oct")
- Use clinical language appropriate for the doctor's specialty
- Flag anything URGENT in [URGENT] brackets

Respond in JSON:
{
  "patientLine": "54M, T2DM + HTN, poorly controlled (HbA1c 8.9%, trend worsening)",
  "continuityScore": 72,
  "urgentFlags": ["Critical HbA1c elevation", "Missed medication refill suspected"],
  "recentHighlights": ["..."],
  "riskFlags": ["..."],
  "suggestedActions": ["Repeat HbA1c", "Check medication adherence", "ECG given CVD risk"],
  "medicationFlags": ["Metformin dose may need upward titration"],
  "generatedAt": "ISO timestamp"
}
`;

  const message = await anthropic.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 1500,
    system: "You are a clinical documentation specialist. Output only valid JSON.",
    messages: [{ role: "user", content: prompt }]
  });

  const rawText = (message.content[0] as { text: string }).text;
  const brief = JSON.parse(rawText.replace(/```json\n?|```\n?/g, "").trim());
  return { ...brief, generatedAt: new Date().toISOString() };
}
```

#### 4.6 Notification Service (WhatsApp + FCM)
**File to create:** `lib/notifications.ts`

```typescript
// lib/notifications.ts
// India-first: WhatsApp is the primary notification channel

import twilio from "twilio";

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const WHATSAPP_FROM = `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`;

export type NotificationType = 
  | "extraction_complete"
  | "critical_alert"
  | "care_task_due"
  | "lab_ready"
  | "medication_reminder"
  | "report_summary";

const TEMPLATES: Record<NotificationType, (data: Record<string, string>) => string> = {
  critical_alert: (d) => 
    `🚨 *SwasthAI Critical Alert*\n\nPatient: ${d.patientName}\nAlert: ${d.alertTitle}\n\n${d.description}\n\nAction needed: ${d.action}\n\nView details: ${d.link}`,
  
  extraction_complete: (d) => 
    `✅ *Report Processed*\n\nYour document has been analyzed.\n📊 Labs found: ${d.labCount}\n💊 Medications: ${d.medCount}\n\nView your health timeline: ${d.link}`,
  
  care_task_due: (d) => 
    `⏰ *Health Reminder*\n\n${d.taskTitle}\nDue: ${d.dueDate}\nPriority: ${d.priority}\n\nMark complete: ${d.link}`,
  
  medication_reminder: (d) => 
    `💊 *Medication Reminder*\n\n${d.medication} — ${d.dose}\nTime: ${d.time}\n\nStay consistent for best results.`,
  
  lab_ready: (d) => 
    `🔬 *Lab Results Ready*\n\n${d.labName}: ${d.value} ${d.unit}\nStatus: ${d.status}\n\nView full report: ${d.link}`,
    
  report_summary: (d) => 
    `📋 *Health Summary*\n\nHello ${d.name},\n\nYour weekly health summary:\n${d.summary}\n\nFull timeline: ${d.link}`
};

export async function sendWhatsApp(
  phoneNumber: string, // +91XXXXXXXXXX format
  type: NotificationType,
  data: Record<string, string>
) {
  const body = TEMPLATES[type](data);
  
  await client.messages.create({
    from: WHATSAPP_FROM,
    to: `whatsapp:${phoneNumber}`,
    body,
  });
}

export async function sendCriticalAlert(
  workspaceId: string,
  alertId: string
) {
  // Get workspace members with phone numbers
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId },
    include: { user: true }
  });

  const alert = await prisma.clinicalAlertRecord.findUnique({
    where: { id: alertId }
  });

  if (!alert) return;

  for (const member of members) {
    if (member.user.phone) {
      await sendWhatsApp(member.user.phone, "critical_alert", {
        patientName: alert.patientId || "Patient",
        alertTitle: alert.title,
        description: alert.description,
        action: alert.actionItems[0] || "Review immediately",
        link: `${process.env.NEXT_PUBLIC_APP_URL}/product?alertId=${alertId}`
      });
    }
  }
}

// Add phone to prisma schema:
// model UserProfile {
//   ...existing fields...
//   phone String?
// }
```

#### 4.7 ABHA / ABDM Integration
**File to create:** `lib/abha.ts`

```typescript
// lib/abha.ts
// Ayushman Bharat Health Account integration
// Docs: https://sandbox.abdm.gov.in/docs

const ABDM_BASE = process.env.ABDM_BASE_URL || "https://sandbox.abdm.gov.in";

export async function getAbdmAccessToken(): Promise<string> {
  const response = await fetch(`${ABDM_BASE}/gateway/v0.5/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clientId: process.env.ABDM_CLIENT_ID,
      clientSecret: process.env.ABDM_CLIENT_SECRET,
    })
  });
  const data = await response.json();
  return data.accessToken;
}

export async function verifyAbhaId(abhaId: string, token: string) {
  // Verify ABHA ID and get health ID details
  const response = await fetch(`${ABDM_BASE}/v1/registration/aadhaar/checkAndGenerateMobileOTP`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-HIP-ID": process.env.ABDM_HIP_ID!,
    },
    body: JSON.stringify({ abhaId })
  });
  return response.json();
}

export async function fetchHealthLocker(
  abhaId: string,
  consentId: string,
  token: string
) {
  // Fetch patient health records from ABDM health locker
  // This requires patient consent flow first
  const response = await fetch(`${ABDM_BASE}/health-locker/v1/fetch`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "X-HIP-ID": process.env.ABDM_HIP_ID!,
    },
    body: JSON.stringify({ abhaId, consentId })
  });
  return response.json();
}
```

---

## 5. Full System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│  Next.js 15 App Router (TypeScript)                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │ Patient  │ │  Doctor  │ │  Family  │ │  Clinic Admin    │  │
│  │Dashboard │ │  Brief   │ │Dashboard │ │    Dashboard     │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       API LAYER (Next.js Routes)                 │
│  /api/workspaces/  /api/billing/  /api/payments/  /api/abha/   │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌─────────────────┐  ┌──────────────┐  ┌──────────────────┐
│  DATA PLANE      │  │  AI PLANE    │  │  TRUST PLANE     │
│                  │  │              │  │                  │
│  PostgreSQL      │  │  Claude API  │  │  Solana          │
│  (Prisma ORM)    │  │  Extraction  │  │  Consent Txns    │
│                  │  │  Brief Gen   │  │  Access Proofs   │
│  Cloudflare R2   │  │  Risk Scoring│  │  Payment Privacy │
│  (Documents)     │  │              │  │                  │
│                  │  │  BullMQ +    │  │  Umbra Protocol  │
│  Supabase Auth   │  │  Redis Queue │  │  (Private Pay)   │
│                  │  │              │  │                  │
│  Search Index    │  │  OCR/Vision  │  │  DPDP Compliance │
│  (Typesense)     │  │  (Claude V)  │  │                  │
└─────────────────┘  └──────────────┘  └──────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌─────────────────┐  ┌──────────────┐  ┌──────────────────┐
│  NOTIFICATION   │  │ INTEGRATION  │  │   ANALYTICS      │
│  PLANE          │  │ PLANE        │  │   PLANE          │
│                 │  │              │  │                  │
│  WhatsApp       │  │  ABHA/ABDM   │  │  PostHog         │
│  (Twilio)       │  │  Connector   │  │  Product Events  │
│                 │  │              │  │                  │
│  FCM Push       │  │  Lab APIs    │  │  Sentry          │
│                 │  │  (Thyrocare, │  │  Error Tracking  │
│  SMS (Fallback) │  │   Dr Lal)    │  │                  │
│                 │  │              │  │  Metabase        │
│  Email (Resend) │  │  Razorpay    │  │  Business Intel  │
└─────────────────┘  └──────────────┘  └──────────────────┘
```

---

## 6. Agentic AI Flows

> These are multi-step AI agent flows where Claude autonomously reasons and acts across multiple tools. Not simple one-shot prompts.

### Agent 1: Document Intelligence Agent
```
TRIGGER: New document uploaded

STEP 1 — Document Analysis Agent
  Input: Raw file (PDF/image/text)
  Action: Claude vision extracts structured data
  Output: {labs, medications, diagnoses, dates, doctors}

STEP 2 — Deduplication Agent  
  Input: Extracted labs + existing patient history
  Action: Check if any labs are duplicates of recent tests
  Output: Duplicate flags + recommendations

STEP 3 — Normalization Agent
  Input: Raw lab values
  Action: Apply ICMR/WHO reference ranges, age/sex adjust
  Output: Normalized values with NORMAL/LOW/HIGH/CRITICAL status

STEP 4 — Pattern Recognition Agent
  Input: New normalized labs + historical trend data
  Action: Detect worsening trends, new risk patterns, critical values
  Output: Alert candidates with severity classification

STEP 5 — Alert Triage Agent
  Input: Alert candidates
  Action: Deduplicate with existing alerts, prioritize severity
  Output: Final alert set to create/update

STEP 6 — Brief Update Agent
  Input: New alerts + updated patient timeline
  Action: Regenerate doctor brief with latest context
  Output: Updated brief ready for doctor's next visit

STEP 7 — Notification Agent
  Input: Critical alerts
  Action: Send WhatsApp/push to relevant workspace members
  Output: Delivery confirmations
```

**Implementation:** `lib/agents/document-intelligence-agent.ts`

```typescript
import { anthropic } from "@anthropic-ai/sdk";

export async function runDocumentIntelligenceAgent(
  workspaceId: string,
  documentId: string,
  buffer: Buffer,
  mimeType: string
) {
  const agentState = {
    workspaceId,
    documentId,
    extracted: null,
    normalized: [],
    alerts: [],
    brief: null,
    notifications: []
  };

  // Multi-step agentic pipeline with error isolation
  const steps = [
    () => step_extract(agentState, buffer, mimeType),
    () => step_deduplicate(agentState),
    () => step_normalize(agentState),
    () => step_detectPatterns(agentState),
    () => step_triageAlerts(agentState),
    () => step_updateBrief(agentState),
    () => step_notify(agentState),
  ];

  for (const step of steps) {
    try {
      await step();
    } catch (err) {
      console.error(`Agent step failed:`, err);
      // Continue to next step — partial results are better than none
    }
  }

  return agentState;
}
```

### Agent 2: Proactive Care Agent (Cron-triggered)
```
TRIGGER: Daily at 8am for each workspace

STEP 1 — Review all pending care tasks
  → Flag overdue tasks
  → Generate new tasks from risk scores

STEP 2 — Check medication continuity
  → If last prescription >30 days ago, flag refill needed
  → Check for known drug interactions in current med list

STEP 3 — Monitor lab thresholds
  → HbA1c not tested in >90 days for diabetic patient → generate task
  → BP not recorded in >14 days for hypertensive → generate task

STEP 4 — Generate patient health digest
  → Weekly/monthly summary in plain language
  → Send via WhatsApp

STEP 5 — Flag family members for attention
  → If elderly parent has missed 2+ medication reminders → notify caregiver
```

### Agent 3: Doctor Brief Agent (Real-time)
```
TRIGGER: Doctor opens patient workspace (first visit in session)

STEP 1 — Gather context
  → Last 90 days of labs, medications, visits
  → All unresolved clinical alerts
  → Risk scores (current + delta from last visit)
  → Patient-reported symptoms (if any)

STEP 2 — Specialty detection
  → Infer likely reason for visit from context
  → Adapt brief format to specialty (GP vs cardiologist vs endocrinologist)

STEP 3 — Generate narrative brief (Claude)
  → 1-page specialist-aware pre-consult summary
  → Urgent flags with specific values and dates
  → Suggested discussion points

STEP 4 — Medication safety check
  → Check current medication list for interactions
  → Flag any drugs contraindicated with current conditions

STEP 5 — Return brief with confidence markers
  → High-confidence extractions cited with source document
  → Low-confidence values flagged for doctor verification
```

---

## 7. Private Healthcare Payment Gateway

> **This is the Superteam Frontier hackathon differentiator.** Combining SwasthAI's health continuity with private blockchain payments solves a problem nobody else has touched.

### The Problem
When patients pay for healthcare using crypto (or even traditional payment trails), they reveal extremely sensitive information:
- Paying a fertility clinic → reveals fertility treatment
- Paying an HIV testing center → reveals HIV status concern
- Paying a therapist → reveals mental health treatment
- Paying an addiction specialist → reveals addiction

In India, this has serious social consequences — employment discrimination, insurance rejection, family conflict. HIPAA protects this in the US. In Web3, every transaction is public.

### What We Build

```
PRIVATE HEALTH PAYMENT FLOW:

Patient → selects provider in SwasthAI → chooses crypto payment
       → Umbra Protocol creates stealth address for provider
       → Patient sends USDC/SOL to stealth address
       → Transaction shows: "some wallet sent to some address"
       → Provider scans for incoming payments, finds theirs
       → Patient gets encrypted receipt (viewing key)
       → Receipt proves: amount + category (not specific provider)
       → Insurance can verify payment without learning provider identity
```

### Implementation

**File to create:** `lib/payments/private-payment.ts`

```typescript
// Private Healthcare Payment Gateway
// Uses Umbra Protocol for stealth addresses on Ethereum/Polygon
// or Solana's confidential transfer extension

import { 
  Keypair, 
  PublicKey, 
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL
} from "@solana/web3.js";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Connection } from "@solana/web3.js";
import { BN } from "bn.js";

const SOLANA_RPC = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const connection = new Connection(SOLANA_RPC, "confirmed");

export type HealthPaymentCategory = 
  | "general_consultation"
  | "specialist_consultation" 
  | "laboratory_test"
  | "pharmacy"
  | "mental_health"
  | "reproductive_health"
  | "addiction_treatment"
  | "diagnostic_imaging"
  | "surgical_procedure"
  | "emergency_care";

export type PrivatePaymentRequest = {
  providerWalletAddress: string;
  amountUSDC: number;
  category: HealthPaymentCategory;
  workspaceId: string;
  patientPublicKey: string;
};

export type PrivatePaymentReceipt = {
  receiptId: string;
  viewingKey: string; // allows patient to prove payment to insurer
  transactionSignature: string;
  amount: number;
  category: HealthPaymentCategory;
  timestamp: string;
  redactedProof: string; // for insurance: shows amount + category, NOT provider
};

// Generate a stealth address for provider
// Provider's real address is never publicly linked to the payment
export async function generateStealthAddress(
  providerPublicKey: string,
  payerEphemeralKey: Keypair
): Promise<{ stealthAddress: PublicKey; sharedSecret: Buffer }> {
  // Elliptic curve Diffie-Hellman to create shared secret
  // Stealth address = Hash(sharedSecret) * G + providerKey
  // Only provider's private key can scan and claim it
  
  const providerKey = new PublicKey(providerPublicKey);
  
  // Simplified stealth derivation (use umbra-js in production)
  const sharedSecret = Buffer.from(
    payerEphemeralKey.publicKey.toBytes().slice(0, 32)
  );
  
  // Derive stealth address
  const stealthBytes = Buffer.concat([sharedSecret, providerKey.toBytes()]);
  const stealthPubkey = Keypair.fromSeed(
    Buffer.from(await crypto.subtle.digest("SHA-256", stealthBytes))
  ).publicKey;
  
  return { stealthAddress: stealthPubkey, sharedSecret };
}

export async function initiatePrivatePayment(
  request: PrivatePaymentRequest
): Promise<{ stealthAddress: string; ephemeralPublicKey: string; viewingKey: string }> {
  
  // Generate ephemeral keypair — used once, then discarded
  const ephemeralKeypair = Keypair.generate();
  
  // Generate stealth address for provider
  const { stealthAddress, sharedSecret } = await generateStealthAddress(
    request.providerWalletAddress,
    ephemeralKeypair
  );
  
  // Viewing key = allows patient to prove payment without revealing provider
  const viewingKey = Buffer.concat([
    sharedSecret,
    Buffer.from(request.category)
  ]).toString("base64");
  
  // Store pending payment in DB (encrypted)
  await prisma.privatePayment.create({
    data: {
      workspaceId: request.workspaceId,
      stealthAddress: stealthAddress.toBase58(),
      ephemeralPublicKey: ephemeralKeypair.publicKey.toBase58(),
      viewingKeyHash: hashViewingKey(viewingKey), // store only hash
      category: request.category,
      amountUSDC: request.amountUSDC,
      status: "PENDING",
    }
  });

  return {
    stealthAddress: stealthAddress.toBase58(),
    ephemeralPublicKey: ephemeralKeypair.publicKey.toBase58(),
    viewingKey, // returned to patient only, never stored
  };
}

export async function generateInsuranceProof(
  viewingKey: string,
  paymentId: string
): Promise<string> {
  // Generate a redacted proof for insurance reimbursement
  // Reveals: amount, category, date
  // Does NOT reveal: provider name, provider address, specific condition
  
  const payment = await prisma.privatePayment.findUnique({
    where: { id: paymentId }
  });
  
  if (!payment) throw new Error("Payment not found");
  
  // Verify viewing key matches (patient proves ownership)
  if (hashViewingKey(viewingKey) !== payment.viewingKeyHash) {
    throw new Error("Invalid viewing key");
  }
  
  const proof = {
    proofId: `proof_${Date.now()}`,
    paymentVerified: true,
    amount: payment.amountUSDC,
    currency: "USDC",
    category: payment.category,
    date: payment.createdAt.toISOString(),
    providerType: getCategoryProviderType(payment.category),
    // NOT included: providerName, providerAddress, transactionHash
    signature: signProof(proof, viewingKey)
  };
  
  return JSON.stringify(proof);
}

function getCategoryProviderType(category: HealthPaymentCategory): string {
  const types: Record<HealthPaymentCategory, string> = {
    "general_consultation": "Medical Consultation",
    "specialist_consultation": "Specialist Consultation",
    "laboratory_test": "Diagnostic Testing",
    "pharmacy": "Pharmaceutical",
    "mental_health": "Healthcare Service",
    "reproductive_health": "Healthcare Service",
    "addiction_treatment": "Healthcare Service",
    "diagnostic_imaging": "Diagnostic Imaging",
    "surgical_procedure": "Surgical Service",
    "emergency_care": "Emergency Medical Service",
  };
  return types[category];
}

// Add to prisma schema:
// model PrivatePayment {
//   id                String   @id @default(cuid())
//   workspaceId       String
//   stealthAddress    String   @unique
//   ephemeralPublicKey String
//   viewingKeyHash    String
//   category          String
//   amountUSDC        Float
//   status            String   @default("PENDING") // PENDING/CONFIRMED/FAILED
//   transactionSig    String?
//   confirmedAt       DateTime?
//   createdAt         DateTime @default(now())
// }
```

**Solana on-chain consent receipts:**

```typescript
// lib/payments/solana-consent.ts
// Store consent hashes on-chain for tamper-evident audit trail

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  LAMPORTS_PER_SOL
} from "@solana/web3.js";
import { Program, AnchorProvider } from "@coral-xyz/anchor";

// Anchor program for consent receipts
// Stores: consentId hash, grantor, grantee, scope hash, timestamp
export async function writeConsentToChain(
  consentId: string,
  grantorPublicKey: string,
  scope: string[],
  expiresAt: Date
): Promise<string> {
  
  const consentHash = await hashConsent(consentId, grantorPublicKey, scope, expiresAt);
  
  // Write to Solana using memo program (simplest on-chain storage)
  const memoInstruction = new TransactionInstruction({
    keys: [],
    programId: new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"),
    data: Buffer.from(JSON.stringify({
      type: "SWASTHAI_CONSENT_V1",
      hash: consentHash,
      ts: Date.now(),
    }))
  });
  
  const tx = new Transaction().add(memoInstruction);
  // ... sign and send
  
  return consentHash;
}

// This gives you an immutable, tamper-evident audit trail
// Anyone can verify the consent hash matches the off-chain record
// But the actual PHI stays off-chain (encrypted in PostgreSQL)
```

---

## 8. Implementation Roadmap

### Week 1 — The AI Unlock
```bash
# Step 1: Install AI + Queue dependencies
npm install @anthropic-ai/sdk @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
npm install bullmq ioredis
npm install sharp # image preprocessing for OCR

# Step 2: Add env vars to .env.local
ANTHROPIC_API_KEY=sk-ant-...
REDIS_URL=redis://localhost:6379
CLOUDFLARE_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=swasthai-documents

# Step 3: Replace lib/document-ingestion.ts with AI extraction
# Step 4: Create lib/storage.ts (Cloudflare R2)
# Step 5: Create lib/queue.ts + workers/extraction-worker.ts
# Step 6: Update app/api/workspaces/[id]/documents/route.ts
#         - accept images (JPG/PNG) in addition to PDF
#         - generate presigned upload URL
#         - queue extraction instead of running synchronously

# Step 7: Run extraction worker
npx ts-node workers/extraction-worker.ts
```

### Week 2 — The AI Doctor Brief
```bash
# Step 1: Install billing
npm install razorpay

# Step 2: Upgrade lib/product-engine.ts to use Claude API
# Step 3: Create lib/billing.ts + billing API routes
# Step 4: Add Razorpay webhook handler
# Step 5: Add plan gating to workspace creation

# Step 6: Update prisma schema
# - Add Subscription model
# - Add phone field to UserProfile
# - Add PrivatePayment model

npx prisma migrate dev --name add_billing_payments
```

### Week 3 — Notifications + Trust
```bash
# Step 1: Install notification deps
npm install twilio @solana/web3.js @coral-xyz/anchor

# Step 2: Create lib/notifications.ts
# Step 3: Wire notifications to clinical alert creation
# Step 4: Create lib/payments/private-payment.ts
# Step 5: Create lib/payments/solana-consent.ts
# Step 6: Update consent-store.ts to write receipts on-chain

# Step 7: Add missing consent enforcement to data routes
# Every GET /api/workspaces/[id]/labs/* should check ConsentGrant
```

### Month 2 — Production Hardening
```bash
# Observability
npm install @sentry/nextjs
npm install posthog-node

# Search
npm install typesense

# ABHA Integration
# Register at: https://sandbox.abdm.gov.in
# Implement ABHA verification + health locker fetch

# Family Dashboard UI
# Build the frontend for lib/family-store.ts (already built backend)
# Dashboard: family members, shared records, delegated alerts

# Medication Interaction Checker
# Integrate OpenFDA API: https://api.fda.gov/drug/label.json
# Create: lib/medication-interactions.ts
```

### Month 3 — Scale Features
```bash
# ABHA health locker connector (auto-fetch records)
# Multilingual chat interface (Claude-powered, Hindi/Tamil/Gujarati)
# Lab API integrations (Thyrocare, Dr Lal PathLabs webhooks)
# Employer/insurer dashboard (anonymized cohort analytics)
# Mobile app (React Native wrapping the web app)
```

---

## 9. Code Implementation Guide

### Environment Variables (complete .env.local)
```bash
# Core
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/swasthai

# Supabase Auth
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# AI
ANTHROPIC_API_KEY=sk-ant-api03-...

# Storage (Cloudflare R2)
CLOUDFLARE_ACCOUNT_ID=abc123
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET_NAME=swasthai-documents
R2_PUBLIC_URL=https://pub-xxx.r2.dev

# Queue
REDIS_URL=redis://localhost:6379

# Email
RESEND_API_KEY=re_xxx
CONTACT_FROM_EMAIL=noreply@swasthai.in
CONTACT_TO_EMAIL=team@swasthai.in

# Notifications (WhatsApp)
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_WHATSAPP_NUMBER=+14155238886

# Payments (Razorpay)
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=xxx
RAZORPAY_PLAN_INDIVIDUAL=plan_xxx
RAZORPAY_PLAN_FAMILY=plan_xxx
RAZORPAY_PLAN_CLINIC=plan_xxx
RAZORPAY_WEBHOOK_SECRET=xxx

# Solana (for on-chain consent + private payments)
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_PAYER_PRIVATE_KEY=[array of bytes]

# ABHA/ABDM
ABDM_BASE_URL=https://sandbox.abdm.gov.in
ABDM_CLIENT_ID=xxx
ABDM_CLIENT_SECRET=xxx
ABDM_HIP_ID=xxx

# Analytics
NEXT_PUBLIC_POSTHOG_KEY=phc_xxx
SENTRY_DSN=https://xxx.ingest.sentry.io/xxx

# CRM
CRM_WEBHOOK_URL=https://...
```

### Prisma Schema Additions (append to schema.prisma)
```prisma
model Subscription {
  id                     String    @id @default(cuid())
  userId                 String    @unique
  planId                 String    @default("free")
  razorpaySubscriptionId String?   @unique
  status                 String    @default("ACTIVE") // CREATED/ACTIVE/HALTED/CANCELLED/FREE
  currentPeriodEnd       DateTime?
  createdAt              DateTime  @default(now())
  updatedAt              DateTime  @updatedAt

  @@index([userId])
  @@index([status])
}

model PrivatePayment {
  id                 String    @id @default(cuid())
  workspaceId        String
  stealthAddress     String    @unique
  ephemeralPublicKey String
  viewingKeyHash     String
  category           String
  amountUSDC         Float
  providerType       String
  status             String    @default("PENDING")
  transactionSig     String?
  onChainTxHash      String?
  confirmedAt        DateTime?
  createdAt          DateTime  @default(now())

  @@index([workspaceId])
  @@index([status])
}

model ConsentOnChainReceipt {
  id                 String   @id @default(cuid())
  consentId          String   @unique
  onChainHash        String
  solanaSignature    String
  blockTime          DateTime?
  createdAt          DateTime @default(now())

  @@index([consentId])
}
```

### Key File Checklist
```
lib/
  ✅ auth-server.ts          — Done
  ✅ workspace-store.ts      — Done  
  ✅ consent-store.ts        — Done (needs enforcement)
  ✅ care-plan-store.ts      — Done
  ✅ family-store.ts         — Done (needs UI)
  ✅ duplicate-test-store.ts — Done
  ✅ clinical-normalization.ts — Done
  ✅ risk-scoring.ts         — Done (blocked by extraction)
  ✅ trend-detection.ts      — Done (blocked by extraction)
  ✅ risk-store.ts           — Done
  ✅ document-store.ts       — Done (update for R2)
  ⚠️ document-ingestion.ts  — REPLACE with Claude API
  ⚠️ product-engine.ts      — UPGRADE to Claude brief generation
  ❌ storage.ts              — CREATE (Cloudflare R2)
  ❌ queue.ts                — CREATE (BullMQ)
  ❌ notifications.ts        — CREATE (Twilio WhatsApp)
  ❌ billing.ts              — CREATE (Razorpay)
  ❌ abha.ts                 — CREATE (ABDM integration)
  ❌ agents/document-intelligence-agent.ts — CREATE
  ❌ payments/private-payment.ts — CREATE
  ❌ payments/solana-consent.ts  — CREATE

workers/
  ❌ extraction-worker.ts    — CREATE (BullMQ worker)
  ❌ care-agent-worker.ts    — CREATE (daily proactive agent)
  ❌ brief-worker.ts         — CREATE (async brief generation)

app/api/
  ✅ workspaces/             — Done (13 routes)
  ✅ auth/                   — Done
  ✅ me/profile/             — Done
  ❌ billing/subscribe/      — CREATE
  ❌ billing/webhook/        — CREATE  
  ❌ billing/status/         — CREATE
  ❌ payments/initiate/      — CREATE
  ❌ payments/verify/        — CREATE
  ❌ payments/proof/         — CREATE
  ❌ abha/verify/            — CREATE
  ❌ abha/fetch-records/     — CREATE

components/
  ✅ product-workspace.tsx   — Done
  ✅ dashboard-page.tsx      — Done
  ✅ ingestion-wizard.tsx    — Done
  ❌ family-dashboard.tsx    — CREATE (backend exists)
  ❌ billing-settings.tsx    — CREATE
  ❌ payment-widget.tsx      — CREATE (private payments UI)
  ❌ abha-connect.tsx        — CREATE
```

---

## 10. Hackathon Alignment

### Superteam Frontier Judging Criteria

**1. Real-World Impact**
- SwasthAI addresses 63M Indians pushed into poverty by healthcare costs annually
- Private payments protect the 400M+ Indians who face social consequences from health condition disclosure
- ABHA integration uses India's existing 78-crore health ID infrastructure

**2. Technical Innovation**
- Multi-step agentic AI pipeline (document → extraction → normalization → risk → alert → brief)
- Private healthcare payments via stealth addresses (unprecedented in healthcare)
- On-chain consent receipts with off-chain PHI (novel architecture)

**3. Blockchain Necessity**
- Consent receipts MUST be on-chain for tamper-evidence (DB can be altered; blockchain cannot)
- Healthcare payment privacy REQUIRES cryptographic privacy (stealth addresses)
- Cross-provider record portability needs decentralized trust

**4. Hackathon Demo Flow**
```
DEMO SCRIPT (8 minutes):

00:00 — Problem: Show the "doctor with zero context" scenario
00:90 — Upload WhatsApp photo of old HbA1c report
02:00 — Show AI extracting: HbA1c 8.9%, Metformin 500mg, date, lab name
02:30 — Show trend: "HbA1c worsened from 7.2% to 8.9% in 4 months"
03:00 — Show critical alert firing + WhatsApp notification
03:30 — Show AI-generated doctor brief (pre-consult 1-pager)
04:30 — Show family caregiver view (daughter managing mother's diabetes)
05:00 — Show consent-based sharing with on-chain receipt
05:30 — Show private payment to HIV testing clinic
         → Patient pays → No public link to HIV clinic → Insurance proof generated
06:30 — Show Solana transaction: consent hash on-chain, PHI stays off-chain
07:30 — Business model: ₹99/mo individual, ₹5k/mo clinic, enterprise
08:00 — Close: "Every Indian patient deserves a doctor who knows their history"
```

**5. Bounty Alignment**
- **Solana track:** On-chain consent receipts + private payments via stealth addresses
- **AI/Infra track:** Multi-step agentic extraction + clinical intelligence pipeline
- **Healthcare track:** India-native ABHA integration + ICMR reference ranges

---

## 11. Business Model

### Revenue Tiers

| Tier | Price | Target | Features |
|------|-------|--------|---------|
| Free | ₹0 | Individual patients | 1 workspace, 10 docs, basic timeline |
| Individual | ₹99/mo | Patients, families | 3 workspaces, 500 docs, AI extraction, alerts |
| Family | ₹299/mo | Family health managers | 10 workspaces, family dashboard, WhatsApp alerts |
| Clinic | ₹5,000/mo | Small clinics (1-5 doctors) | Unlimited, doctor brief, patient portal |
| Enterprise | ₹25,000+/mo | Hospitals, chains | Custom, ABHA integration, analytics |

### Revenue Projections

```
Month 6:
  100 clinic licenses × ₹5,000 = ₹5,00,000 MRR
  1,000 family plans × ₹299 = ₹2,99,000 MRR
  Total MRR = ₹7,99,000 (~₹96L ARR)

Year 1:
  500 clinics × ₹5,000 = ₹25,00,000 MRR
  5,000 families × ₹299 = ₹14,95,000 MRR
  10 enterprise × ₹25,000 = ₹2,50,000 MRR
  Total MRR = ₹42,45,000 (~₹5.09Cr ARR)

Year 2 (with ABHA + employer):
  2,000 clinics = ₹1Cr MRR
  50,000 B2C = ₹1.5Cr MRR
  20 enterprise = ₹50L MRR
  Total MRR = ₹3Cr+ (~₹36Cr ARR)
```

### The Moat
Three years of longitudinal health data on 5 million Indians with AI-extracted structured values. Nobody else will have this dataset. It's the foundation for:
1. India's most accurate chronic disease risk model
2. Insurance underwriting intelligence
3. Population health programs for government
4. Drug efficacy research for pharma

---

## One-Line Positioning

> *"SwasthAI gives every Indian patient a living health memory and gives every doctor the right context before the consult — with private payments so your health stays your business."*

---

*Document maintained in: `docs/SWASTHAI_FULL_PRD.md`*  
*Last updated: April 2026*  
*For questions: Reference merged-strategy.md + production-build-plan.md in docs/*
