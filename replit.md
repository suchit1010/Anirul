# SwasthAI

AI-powered longitudinal health memory app for Indian patients. Frontend-only Expo (React Native) app with AsyncStorage persistence.

## Architecture
- Single Expo artifact at `artifacts/swasthai/`, mounted at `/`.
- AsyncStorage-backed `HealthContext` holds the patient's full record (documents, labs, meds, diagnoses, visits, alerts, tasks, family, risk scores).
- Regex-based lab/med extractor in `lib/extract.ts` handles English + Devanagari digits, demo "Use sample" button.
- React Native SVG sparklines for trends (`components/TrendSparkline.tsx`).
- Native tabs (iOS 26 liquid glass) with classic Tabs fallback.

## Screens
- **Home** — Greeting, health score ring, ABHA badge, care continuity, alerts, latest labs, HbA1c trend, quick actions.
- **Timeline** — Filterable chronological feed (visits, labs, meds, alerts).
- **Add** — Pick source, paste/upload report, AI extraction with confidence + language detect, save to timeline.
- **Care** — Pending/done tasks, active medications.
- **You** — Profile, family, risk profile, privacy/consent, reset demo data.
- **Doctor brief modal** — Pre-consult AI summary.
- **Lab trend & document detail** stack screens.

## Design
- Forest green (#0D3D2A) primary, cream (#FAFAF7) background.
- Fonts: DM Serif Display for headlines, Inter for UI.
- Feather icons everywhere; no emojis.

## Seed patient
Arjun Sharma, T2DM + HTN + dyslipidemia, HbA1c trending 6.8 → 7.2 → 7.8.
