# SwasthAI Deployment Guide

This document explains what the platform is, how the pieces fit together, and how to run or deploy it.

---

## What We Are Building

SwasthAI is a health memory platform with three primary parts:

- **Patient app**: capture medical reports, extract labs/medications/diagnoses, and maintain a personal health timeline.
- **Doctor console**: unlock shared records and review patient health history, trends, and alerts.
- **API and data layer**: authentication, document storage, AI extraction, and doctor access control.

The experience is intentionally simple:
- sign in with phone number and OTP,
- add reports with a few taps,
- review structured health information,
- share with doctors through a passcode gate.

---

## Architecture

### Services
- `artifacts/swasthai/` - Expo patient app
- `artifacts/doctor/` - React + Vite doctor console
- `artifacts/api-server/` - Express API
- `lib/db/` - shared database schema and pool

### Main Dependencies
- **Auth**: phone OTP with Twilio fallback to demo code in development
- **Storage**: object storage for uploaded files
- **Extraction**: Anthropic Claude, Google Gemini, and local regex fallback
- **Database**: PostgreSQL with Drizzle ORM

### System Diagram

```text
Patient App  ─┐
Doctor Console ├──> API Server ───> PostgreSQL
Web/Expo      ─┘         │
                          ├──> Object Storage
                          └──> AI Providers
                               ├── Anthropic
                               ├── Gemini
                               └── Local fallback
```

---

## User Flow Summary

### Patient
1. Open app.
2. Enter phone number.
3. Receive OTP or demo code.
4. Verify code.
5. Land on dashboard.
6. Add memory from report or text.
7. Review extracted labs, meds, and diagnoses.
8. Save to timeline.

### Doctor
1. Open doctor console.
2. Enter passcode.
3. View patient list.
4. Open a patient record.
5. Review labs, medications, alerts, and trends.

---

## How It Works

### Authentication
- `POST /api/auth/start` creates and stores a hashed OTP.
- `POST /api/auth/verify` checks the OTP and creates a session.
- The patient app stores the returned token in AsyncStorage.
- `GET /api/auth/me` restores the session on app launch.

### Extraction
- `POST /api/extract` receives text or image data.
- The API tries Anthropic first.
- If that fails, it tries Gemini.
- If both fail, it uses a local regex parser so the app still works offline or in demo mode.

### Doctor Access
- Doctor console sends `X-Doctor-Passcode` to `/api/doctor/patients`.
- A valid passcode unlocks the console.
- Access is kept simple but auditable.

---

## Local Development

### Prerequisites
- Node.js
- pnpm
- PostgreSQL

### Start the stack

```bash
docker compose -f docker-compose.dev.yml up --build
```

### Run database migrations

```bash
pnpm --filter @workspace/db run push
```

### Run apps manually
- Patient app: `pnpm --filter @workspace/swasthai run dev`
- Doctor console: `pnpm --filter @workspace/doctor run dev`
- API server: `pnpm --filter @workspace/api-server run start`

---

## Production Deployment

### Recommended order
1. Build the API and web apps.
2. Provision PostgreSQL and object storage.
3. Set production environment variables.
4. Run migrations.
5. Start services behind HTTPS.

### Important environment variables
- `DATABASE_URL`
- `DOCTOR_PASSCODE`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER`
- `AI_INTEGRATIONS_ANTHROPIC_API_KEY`
- `AI_INTEGRATIONS_GEMINI_API_KEY`
- `CORS_ORIGINS`

---

## Design Notes
- Keep the patient app calm, readable, and low-friction.
- Keep the doctor console secure and fast to scan.
- Use clear hierarchy, status indicators, and minimal clutter.
- Prefer helpful empty states over dead ends.

---

## Current Status
- Patient app: working
- Auth flow: working
- Add Memory extraction: working with AI fallback chain
- Doctor console: working with passcode unlock
- API health: working

---

## Next Documentation Items
- Add screenshots for each major screen.
- Add endpoint examples for each API route.
- Add a troubleshooting guide for missing SMS/AI keys.
