# SwasthAI User Flows

This document describes how users move through the product and how the main screens work together.

---

## 1. Patient Onboarding Flow

### Goal
Get a patient signed in quickly and safely using phone number + OTP.

### Flow
1. User opens the app.
2. Auth gate checks for an existing token.
3. If no token exists, the app redirects to `/auth`.
4. User enters phone number.
5. App calls `POST /api/auth/start`.
6. Backend creates OTP and sends SMS.
7. If SMS is not configured, backend returns a `demoCode` for development.
8. User enters the OTP.
9. App calls `POST /api/auth/verify`.
10. Backend validates OTP and returns a session token.
11. App stores token in AsyncStorage.
12. App redirects to the home dashboard.

### UX Notes
- Show step indicators so the user knows where they are.
- Show inline validation for invalid phone numbers and codes.
- Show a demo code only when SMS is unavailable.

---

## 2. Add Memory Flow

### Goal
Let a patient capture a report and turn it into structured medical memory.

### Flow
1. User opens Add Memory tab.
2. User chooses a source:
   - Camera
   - Gallery
   - PDF/Text
   - WhatsApp text
   - Voice note
3. User adds optional title.
4. User pastes text or captures a report image.
5. App calls `POST /api/extract`.
6. API tries extraction in this order:
   - Anthropic Claude
   - Google Gemini
   - Local regex fallback
7. App shows extracted labs, medications, and diagnoses.
8. User reviews results.
9. User saves to timeline.
10. App updates dashboard and timeline.

### UX Notes
- Keep source options visible and simple.
- Show confidence score so the user can judge result quality.
- Present extracted data in clean blocks.

---

## 3. Home Dashboard Flow

### Goal
Give the patient a fast overview of their health.

### Flow
1. After sign-in, user lands on the dashboard.
2. App loads seeded or stored health data.
3. Dashboard shows:
   - Health score
   - Continuity
   - Alerts
   - Care tasks
   - Latest lab results
   - Medication summary
   - HbA1c trend
4. User taps any card to drill into detail.

### UX Notes
- Keep the hero section calm and clear.
- Use status colors carefully for lab values.
- Prioritize actions over raw data.

---

## 4. Timeline Flow

### Goal
Show a chronological record of the patient's care history.

### Flow
1. User opens Timeline tab.
2. App combines visits, labs, medications, and alerts.
3. Items are grouped and sorted by date.
4. User filters by type:
   - All
   - Visits
   - Labs
   - Meds
   - Alerts
5. User opens an item for detail.

### UX Notes
- Keep filters visible at the top.
- Use compact summaries with enough detail to scan quickly.

---

## 5. Care Plan Flow

### Goal
Help the patient stay on track with medications and follow-ups.

### Flow
1. User opens Care tab.
2. App shows pending tasks and completed tasks.
3. App shows active medications.
4. User can toggle task completion.
5. User can view what is due today vs upcoming.

### UX Notes
- Use clear priority labels.
- Keep tasks actionable and brief.

---

## 6. Profile Flow

### Goal
Let the patient manage identity, access, and trust.

### Flow
1. User opens You/Profile tab.
2. App shows patient avatar and ABHA status.
3. User views family members with delegated access.
4. User can invite a family member.
5. User can generate a doctor brief.
6. User can reset demo data in development.

### UX Notes
- Make access-sharing feel secure and understandable.
- Keep family and risk information readable.

---

## 7. Doctor Console Flow

### Goal
Allow a doctor to unlock shared patient data safely.

### Flow
1. Doctor opens `/doctor/`.
2. Gate screen asks for passcode.
3. App sends `X-Doctor-Passcode` header to `GET /api/doctor/patients`.
4. If passcode is valid, console unlocks.
5. Doctor sees patient list.
6. Doctor opens a patient record.
7. Patient detail shows labs, meds, trends, alerts, and document history.
8. Doctor uses data for quick review and follow-up.

### UX Notes
- The unlock screen should feel secure and easy.
- Keep patient list scannable.
- Show trend charts only when they add real value.

---

## 8. Fallback / Offline Behavior

### Patient App
- If auth API is unavailable, demo auth still works.
- If extraction AI keys fail, local regex extraction is used.
- If storage upload fails, the user still sees a safe error message.

### Doctor Console
- If passcode is wrong, show a clear retry message.
- If the API is temporarily unavailable, keep the gate from unlocking.

---

## 9. Success Criteria

The product is considered working when:
- A patient can sign in with phone + OTP.
- A patient can extract memory from a report.
- The dashboard shows meaningful health data.
- The timeline records events.
- The care plan shows tasks and medications.
- A doctor can unlock and view shared patient data.
- Every major flow has a graceful fallback.
