# SwasthAI

AI-powered longitudinal health memory for Indian patients. The product combines a patient app, a doctor console, and a shared API/data layer.

## What We Are Building
- A patient-first health memory app that captures reports, extracts structured medical data, and turns it into a timeline.
- A doctor console that securely unlocks shared records for fast clinical review.
- A unified backend that handles auth, extraction, storage, and access control.

## Architecture (multi-artifact monorepo)
- **`artifacts/swasthai/`** — Expo React Native patient app (mounted at `/`).
- **`artifacts/doctor/`** — React + Vite doctor console (mounted at `/doctor/`).
- **`artifacts/api-server/`** — Express 5 API at `/api/*`. Talks to Postgres via `@workspace/db` (Drizzle).
- **`lib/db/`** — Drizzle schema + pool. Tables include `users`, `otp_codes`, `sessions`, and `documents`.
- Replit Postgres + Replit Object Storage are used directly in this workspace.

## Core Behavior
- **Auth**: phone + SMS OTP. `lib/sms.ts` uses Twilio when `TWILIO_*` envs are set, otherwise it logs the OTP and returns `demoCode` from `/api/auth/start` so the demo still works.
- **Storage**: signed upload URLs for private document storage, plus object GET endpoints for retrieval.
- **Extraction**: `/api/extract` accepts text or image payloads, tries Anthropic Claude first, then Google Gemini, then a local regex fallback if the AI providers fail.
- **Documents**: `/api/documents` stores extracted memories and feeds the patient timeline and doctor console.
- **Doctor access**: `/api/doctor/patients` and `/api/doctor/patients/:id` are passcode-gated via `X-Doctor-Passcode` (default `doctor2026`, override with `DOCTOR_PASSCODE`).

## Patient App
- Auth gate in `app/_layout.tsx` redirects to `app/auth.tsx` when no token is available.
- The auth screen uses a 2-step phone + OTP flow with a demo-code shortcut for development.
- The add-memory screen supports camera, gallery, text, and sample content, then sends the content to `/api/extract`.
- The app keeps a local health cache in `HealthContext` so the UI still feels responsive when backend calls fail.

## Doctor Console
- Passcode unlock screen, then patient list and detail pages.
- Patient detail aggregates labs across uploaded reports and renders trend charts for markers with repeat readings.
- Visual identity stays aligned with the patient app: calm colors, clear hierarchy, and readable clinical data.

## How It Works End to End
1. Patient signs in with phone and OTP.
2. Patient adds a report or pasted text.
3. API extracts labs, medications, and diagnoses.
4. Result is saved to the timeline and document store.
5. Doctor unlocks the console with a passcode.
6. Doctor reviews shared records, trends, and alerts.

## Current Status
- Patient app auth: working.
- AI extraction: working with Anthropic → Gemini → local fallback chain.
- Doctor console unlock: working.
- Dashboard, timeline, care plan, and profile pages: working.

## Open / Next
- Connect Twilio for real SMS delivery instead of demo codes.
- Add more screenshots and endpoint examples to the docs.
- Extend the doctor console with share tokens and richer audit views.
