# SwasthAI

AI-powered longitudinal health memory for Indian patients. Patient mobile app + Doctor web console + shared API.

## Architecture (multi-artifact monorepo)
- **`artifacts/swasthai/`** — Expo React Native patient app (mounted at `/`).
- **`artifacts/doctor/`** — React + Vite doctor console (mounted at `/doctor/`).
- **`artifacts/api-server/`** — Express 5 API at `/api/*`. Talks to Postgres via `@workspace/db` (Drizzle).
- **`lib/db/`** — Drizzle schema + pool. Tables: `users`, `otp_codes`, `sessions`, `documents`.
- Replit Postgres + Replit Object Storage are provisioned and used directly (no R2 stub).

## Phase 1 (real backend) — DONE
- **Real auth**: phone + SMS OTP. `lib/sms.ts` uses Twilio when `TWILIO_*` envs are set, otherwise logs the code and returns it as `demoCode` from `/api/auth/start` so the demo works without Twilio. SHA-256 hashed OTPs, 30-day session tokens.
- **Real file storage**: Replit Object Storage via signed PUT URLs (`/api/storage/uploads/request-url`) and `/api/storage/objects/...` GET. ACL stub via `objectAcl.ts`.
- **Real AI extraction**: `/api/extract` accepts JSON `{text}` or `{imageBase64}` or `multipart/form-data` file. Tries Anthropic Claude (`claude-haiku-4-5`) vision first, falls back to Google Gemini (`gemini-2.5-flash`). Uses Replit AI Integrations proxy — no user keys needed.
- **Documents API**: CRUD at `/api/documents`, scoped to the authed user.
- **Doctor API**: `/api/doctor/patients` and `/api/doctor/patients/:id` — passcode-gated via `X-Doctor-Passcode` header (defaults to `doctor2026`, override with `DOCTOR_PASSCODE` env).

## Patient app (Expo)
- Auth gate in `app/_layout.tsx` redirects to `app/auth.tsx` when no token. Phone+OTP flow with demo-code shortcut.
- Upload screen (`app/(tabs)/upload.tsx`) uses `expo-image-picker` (camera + gallery). Image is uploaded to private object storage, then sent to `/api/extract` for real AI parsing. Result is also POSTed to `/api/documents` so the doctor console sees it.
- Local AsyncStorage `HealthContext` is preserved as a cache + offline fallback.
- Lib: `lib/api.ts` (typed REST client + AsyncStorage token), `contexts/AuthContext.tsx`.

## Doctor console (React + Vite + Tailwind 4)
- Single-passcode unlock screen, then patient list and detail pages.
- Detail page aggregates labs across all uploaded reports per patient and renders Recharts line charts for any marker with 2+ readings.
- Same forest-green / cream / DM Serif identity as the mobile app.
- Default passcode: `doctor2026` (override with `DOCTOR_PASSCODE` env).

## Open / next
- Twilio connector not yet linked — SMS falls back to demo code. Connect Twilio in the Integrations pane to send real SMS.
- WhatsApp inbound channel, Solana devnet payments, and per-patient share tokens for the doctor console are next.
