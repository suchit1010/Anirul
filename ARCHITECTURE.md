# SwasthAI Architecture

Comprehensive architecture documentation for the SwasthAI health platform.

## Table of Contents
1. [System Overview](#system-overview)
2. [Component Architecture](#component-architecture)
3. [Data Flow](#data-flow)
4. [Technology Stack](#technology-stack)
5. [API Design](#api-design)
6. [Security Architecture](#security-architecture)
7. [Deployment Architecture](#deployment-architecture)

---

## System Overview

SwasthAI is a distributed health information system with three main clients (patient app, doctor console, health AI) and shared backend infrastructure.

### High-Level Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    SwasthAI Platform (v1.0)                      │
├──────────────────────┬──────────────────┬──────────────────────┤
│                      │                  │                      │
│   PATIENT APP        │  DOCTOR CONSOLE  │   WEB CLIENT         │
│  (Expo Web/RN)       │  (React + Vite)  │   (React)            │
│                      │                  │                      │
│  • Auth              │  • Unlock        │  • API Health        │
│  • Add Memory        │  • Patient List  │  • Data Sync         │
│  • Dashboard         │  • Health View   │  • File Upload       │
│  • Timeline          │  • Audit Log     │                      │
│  • Care Plan         │                  │                      │
│  • Profile           │                  │                      │
│                      │                  │                      │
└──────────┬───────────┴────────┬─────────┴────────────┬──────────┘
           │                    │                      │
           │ HTTP/REST API      │                      │
           │ JSON over HTTPS    │                      │
           │                    │                      │
           └────────────────────┼──────────────────────┘
                                │
                                ▼
                   ┌────────────────────────┐
                   │   API Server           │
                   │  (Express 5.0 + Node)  │
                   │                        │
                   │ • Auth endpoints       │
                   │ • Document API         │
                   │ • Extraction service   │
                   │ • Doctor API           │
                   │ • Storage API          │
                   │ • Health check         │
                   └────────┬───────────────┘
                            │
                ┌───────────┼───────────┐
                │           │           │
                ▼           ▼           ▼
            ┌────────┐ ┌─────────┐ ┌──────────┐
            │Postgres│ │Replit S3│ │AI APIs   │
            │ 15.x   │ │Storage  │ │          │
            │        │ │         │ │•Anthropic│
            │• Users │ │• Docs   │ │•Gemini   │
            │• OTPs  │ │• Images │ │•Fallback │
            │• Sess  │ │         │ │(local)   │
            │• Docs  │ └─────────┘ └──────────┘
            └────────┘
```

---

## Component Architecture

### 1. Patient App (artifacts/swasthai/)

**Technology**: Expo + React Native (runs on iOS, Android, Web)

**Directory Structure**:
```
artifacts/swasthai/
├── app/
│   ├── auth.tsx              # Auth screen (phone + OTP)
│   ├── _layout.tsx           # Root layout, auth gate
│   ├── (tabs)/
│   │   ├── index.tsx         # Home/dashboard
│   │   ├── timeline.tsx      # Timeline view
│   │   ├── upload.tsx        # Add memory screen
│   │   ├── care.tsx          # Care plan
│   │   ├── profile.tsx       # User profile
│   │   └── _layout.tsx       # Tab navigation
│   ├── doctor-brief.tsx      # Doctor brief modal
│   ├── memory.tsx            # AI memory/chat
│   └── ...
├── components/
│   ├── HealthScoreRing.tsx
│   ├── TimelineEntry.tsx
│   ├── TaskRow.tsx
│   ├── AlertCard.tsx
│   └── ...
├── contexts/
│   ├── AuthContext.tsx       # Global auth state
│   └── HealthContext.tsx     # Local health cache
├── hooks/
│   ├── useColors.ts          # Theme colors
│   └── useResponsive.ts      # Responsive breakpoints
├── lib/
│   └── api.ts                # API client + token mgmt
├── constants/
│   ├── colors.ts             # Color scheme
│   ├── brand.ts              # Brand config
│   └── languages.ts          # i18n
└── assets/
    └── images/               # Logo, icons
```

**Key Features**:
- ✅ Phone + SMS OTP auth
- ✅ Document capture (camera, gallery, text)
- ✅ AI extraction display
- ✅ Lab trends & alerts
- ✅ Medication tracking
- ✅ Responsive design (phone/tablet/web)

**State Management**:
```
AuthContext (global)
  ├── user: AuthUser | null
  ├── loading: boolean
  ├── signIn(token, user)
  ├── signOut()
  └── refresh()

HealthContext (local AsyncStorage)
  ├── state.labs[]
  ├── state.medications[]
  ├── state.alerts[]
  ├── state.tasks[]
  └── state.visits[]
```

---

### 2. Doctor Console (artifacts/doctor/)

**Technology**: React 19 + Vite + Tailwind CSS 4

**Directory Structure**:
```
artifacts/doctor/
├── src/
│   ├── App.tsx                 # Root router
│   ├── components/
│   │   ├── Gate.tsx           # Passcode unlock
│   │   ├── AppShell.tsx       # Layout wrapper
│   │   ├── PatientCard.tsx    # Patient list item
│   │   └── ...
│   ├── pages/
│   │   ├── Patients.tsx       # Patient list page
│   │   ├── PatientDetail.tsx  # Patient detail view
│   │   └── NotFound.tsx       # 404 page
│   └── lib/
│       └── api.ts             # API client
├── index.html
├── vite.config.ts
└── tailwind.config.ts
```

**Key Features**:
- ✅ Passcode unlock (X-Doctor-Passcode header)
- ✅ Patient list with health summary
- ✅ Lab trend charts (Recharts)
- ✅ Medication list
- ✅ Alert history
- ✅ Audit log viewer

---

### 3. API Server (artifacts/api-server/)

**Technology**: Express 5 + Node.js + TypeScript + Drizzle ORM

**Directory Structure**:
```
artifacts/api-server/
├── src/
│   ├── app.ts                 # Express app setup
│   ├── index.ts               # Server entry point
│   ├── routes/
│   │   ├── auth.ts            # POST /auth/start, /verify, etc
│   │   ├── extract.ts         # POST /api/extract
│   │   ├── documents.ts       # CRUD documents
│   │   ├── storage.ts         # Storage upload/download
│   │   ├── doctor.ts          # Doctor API
│   │   └── health.ts          # Health checks
│   ├── lib/
│   │   ├── auth.ts            # Token, session mgmt
│   │   ├── sms.ts             # Twilio SMS client
│   │   ├── logger.ts          # Pino logger
│   │   └── db-client.ts       # DB pool setup
│   └── middleware/
│       ├── auth.ts            # Auth validation
│       ├── cors.ts            # CORS headers
│       └── errors.ts          # Error handler
├── Dockerfile
├── build.mjs                  # Esbuild config
└── tsconfig.json
```

**Key Endpoints**:
```
POST   /api/auth/start          → Generate OTP
POST   /api/auth/verify         → Validate OTP, get token
GET    /api/auth/me             → Get current user
POST   /api/auth/logout         → Clear session

POST   /api/extract             → Extract labs/meds from doc
GET    /api/documents           → List user documents
POST   /api/documents           → Create document
DELETE /api/documents/:id       → Delete document

GET    /api/doctor/patients     → List patients (passcode required)
GET    /api/doctor/patients/:id → Patient detail (passcode required)

POST   /api/storage/uploads/request-url  → Get signed upload URL
GET    /api/storage/objects/*            → Download object

GET    /api/healthz             → Health check
GET    /api/ready               → Ready check (after migrations)
```

---

### 4. Database (lib/db/)

**Technology**: PostgreSQL 15 + Drizzle ORM

**Schema**:
```sql
-- Core tables

users (patients & doctors)
  ├── id: UUID PRIMARY KEY
  ├── phone: VARCHAR UNIQUE
  ├── name: VARCHAR
  ├── role: ENUM('patient', 'doctor', 'admin')
  ├── language: VARCHAR DEFAULT 'en'
  ├── created_at: TIMESTAMP
  └── updated_at: TIMESTAMP

otp_codes (temporary OTP storage)
  ├── id: UUID PRIMARY KEY
  ├── phone: VARCHAR
  ├── code_hash: VARCHAR (SHA-256)
  ├── attempts: INT DEFAULT 0
  ├── expires_at: TIMESTAMP
  ├── consumed_at: TIMESTAMP
  └── created_at: TIMESTAMP

sessions (auth sessions)
  ├── id: UUID PRIMARY KEY
  ├── user_id: UUID FK users
  ├── token: VARCHAR UNIQUE
  ├── expires_at: TIMESTAMP
  └── created_at: TIMESTAMP

documents (uploaded reports)
  ├── id: UUID PRIMARY KEY
  ├── user_id: UUID FK users
  ├── title: VARCHAR
  ├── object_path: VARCHAR (path in storage)
  ├── extracted_data: JSONB (labs, meds, diagnoses)
  ├── confidence: DECIMAL
  ├── language: VARCHAR
  ├── provider: ENUM('anthropic', 'gemini', 'local')
  ├── created_at: TIMESTAMP
  └── updated_at: TIMESTAMP

-- Audit tables

audit_logs (doctor access)
  ├── id: UUID PRIMARY KEY
  ├── doctor_id: UUID FK users
  ├── patient_id: UUID FK users
  ├── action: VARCHAR
  ├── resource_type: VARCHAR
  ├── created_at: TIMESTAMP
  └── metadata: JSONB
```

---

## Data Flow

### Authentication Flow (Detailed)

```
┌─────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION FLOW                       │
└─────────────────────────────────────────────────────────────┘

PHASE 1: OTP REQUEST
─────────────────────

Client                          Server                    Database
  │                               │                          │
  ├─ Input: "+91 9876543210"     │                          │
  │                               │                          │
  ├─ POST /api/auth/start ────────▶ Validate phone          │
  │                               ├─ Generate OTP (6 digits)│
  │                               │                          │
  │                               ├─ Hash OTP (SHA-256) ───▶ INSERT otp_codes
  │                               │    ├─ phone            │ • code_hash
  │                               │    ├─ code_hash        │ • expires_at (+10m)
  │                               │    ├─ attempts: 0      │ • attempts: 0
  │                               │    └─ expires_at       │
  │                               │                          │
  │                               ├─ Send SMS via Twilio    │
  │                               │ (or return demoCode)    │
  │                               │                          │
  │                               ├─ { phone, smsConfigured}│
  │◀────────────────────────────── demoCode (if dev) ────────
  │ Response:                                                │
  │ {                                                        │
  │   "phone": "+91 9876543210",                            │
  │   "smsConfigured": true/false,                          │
  │   "demoCode": "123456"  // only if !smsConfigured      │
  │ }                                                        │
  │

PHASE 2: OTP VERIFICATION
──────────────────────────

Client                          Server                    Database
  │                               │                          │
  ├─ Input: "123456"             │                          │
  │                               │                          │
  ├─ POST /api/auth/verify ──────▶ Validate code            │
  │   { phone, code }              ├─ Query OTP ──────────▶ SELECT FROM otp_codes
  │                               │  WHERE phone = ...     │
  │                               │                          │
  │                               ├─ Hash submitted code    │
  │                               ├─ Compare hashes        │
  │                               │  (constant-time)       │
  │                               │                          │
  │                               ├─ Check:                │
  │                               │  • Attempt count < 6   │
  │                               │  • Not expired         │
  │                               │  • Not already used    │
  │                               │                          │
  │                               ├─ Mark consumed ──────▶ UPDATE otp_codes
  │                               │                    SET consumed_at = NOW()
  │                               │                          │
  │                               ├─ Find/create user ──▶ INSERT/SELECT users
  │                               │                          │
  │                               ├─ Generate session token │
  │                               │  (crypto.randomBytes(32))
  │                               │                          │
  │                               ├─ Store session ──────▶ INSERT sessions
  │                               │  • token (unique)      │
  │                               │  • user_id             │
  │                               │  • expires_at (+60d)   │
  │                               │                          │
  │                               ├─ { token, user }       │
  │◀─────────────────────────────  Response ─────────────────
  │ {                                                        │
  │   "ok": true,                                           │
  │   "token": "abc123...",        // 64-char hex           │
  │   "expiresAt": "2026-06-28",                            │
  │   "user": {                                             │
  │     "id": "user-id",                                    │
  │     "phone": "+91 9876543210",                          │
  │     "name": "Arjun",                                    │
  │     "role": "patient"                                   │
  │   }                                                     │
  │ }                                                        │
  │                                                         │
  ├─ Store token in AsyncStorage                          │
  ├─ Update AuthContext                                   │
  └─ Redirect to /                                        │

PHASE 3: TOKEN USAGE
─────────────────────

Client                          Server
  │                               │
  ├─ GET /api/auth/me          │
  │   Header: Authorization:   │
  │   Bearer abc123...         │
  │                               │
  │                               ├─ Extract token from header
  │                               ├─ Query sessions table
  │                               ├─ Verify not expired
  │                               ├─ Fetch user
  │                               │
  │◀─────────────────────────────  { user }
  │
  └─ Attach user to all requests
```

### Document Extraction Flow (Detailed)

```
┌──────────────────────────────────────────────────────┐
│         DOCUMENT EXTRACTION & STORAGE FLOW             │
└──────────────────────────────────────────────────────┘

CLIENT SIDE: UPLOAD
───────────────────

1. User selects document (camera, gallery, or text)
   Document → Base64 encode (if image)

2. POST /api/extract
   {
     "text": "Lab report text..." OR
     "imageBase64": "data:image/jpeg;base64,..."
   }

SERVER SIDE: EXTRACTION PIPELINE
─────────────────────────────────

3. Receive & validate
   ├─ Check size (<50MB)
   ├─ Check format (image, PDF, text)
   ├─ Sanitize input

4. AI Extraction Chain
   │
   ├─ ATTEMPT 1: Anthropic Claude (claude-haiku-4-5 vision model)
   │  │
   │  ├─ Send to https://api.anthropic.com/v1/messages
   │  │  {
   │  │    "model": "claude-haiku-4-5",
   │  │    "messages": [{
   │  │      "role": "user",
   │  │      "content": [
   │  │        { "type": "image", "source": ... },
   │  │        { "type": "text", "text": "Extract labs, meds, diagnoses. Return JSON..." }
   │  │      ]
   │  │    }]
   │  │  }
   │  │
   │  ├─ Parse response JSON
   │  │  {
   │  │    "labs": [{ "name": "HbA1c", "value": 8.2, ... }],
   │  │    "medications": [{ "name": "Metformin", ... }],
   │  │    "diagnoses": ["Diabetes"]
   │  │  }
   │  │
   │  └─ If success → RETURN ✓
   │
   ├─ ATTEMPT 2: Google Gemini (gemini-2.5-flash vision)
   │  │
   │  ├─ If Anthropic failed or timeout
   │  ├─ Send to https://generativelanguage.googleapis.com
   │  ├─ Same extraction prompt
   │  │
   │  └─ If success → RETURN ✓
   │
   └─ ATTEMPT 3: Local Regex Fallback
      │
      ├─ If both AI models failed
      │
      ├─ Match lab patterns:
      │  HbA1c: 8.2%, Glucose: 156, Cholesterol: 224, etc.
      │
      ├─ Match medications:
      │  Metformin, Atorvastatin, Aspirin, etc.
      │
      ├─ Match diagnoses:
      │  Diabetes, Hypertension, Thyroid, etc.
      │
      ├─ Assign confidence = 0.55 + (detected_count * 0.06)
      │  capped at 0.99
      │
      └─ RETURN ✓

5. Format response
   {
     "labs": [...],
     "medications": [...],
     "diagnoses": [...],
     "confidence": 0.96,
     "language": "english",
     "provider": "anthropic" | "gemini" | "local"
   }

CLIENT SIDE: SAVE RESULT
────────────────────────

6. Display extraction result
   User reviews labs, meds, diagnoses
   [Save to Timeline] button

7. POST /api/documents
   {
     "title": "Apollo Lab Report - April 2026",
     "extractedData": { ... },
     "objectPath": "/documents/doc-id"
   }

SERVER SIDE: STORE
──────────────────

8. Store in database
   │
   ├─ INSERT documents
   │  ├─ user_id (authenticated user)
   │  ├─ extracted_data (JSONB)
   │  ├─ confidence
   │  ├─ provider
   │  └─ created_at
   │
   └─ Return { id, ... }

CLIENT SIDE: DISPLAY
───────────────────

9. Add to HealthContext.state.documents
   Timeline refreshes
   Dashboard shows new labs/alerts
   Doctor console sees new document
```

---

## Technology Stack

### Frontend
- **Mobile**: Expo 54 + React Native 0.76 + TypeScript
- **Web**: React 19 + Vite 7 + Tailwind CSS 4
- **State**: React Context + AsyncStorage (mobile), TanStack Query (web)
- **Icons**: Feather (mobile), Lucide (web)

### Backend
- **Runtime**: Node.js 22 LTS
- **Framework**: Express 5.0
- **Language**: TypeScript 5.9
- **Database**: PostgreSQL 15 + Drizzle ORM
- **Storage**: Replit Object Storage (S3-compatible)

### AI/ML
- **Vision**: Anthropic Claude 4.5 (vision) + Google Gemini 2.5 (vision)
- **Fallback**: Local regex-based extraction
- **Integration**: Replit AI Integrations proxy (no user keys)

### DevOps
- **Containers**: Docker multi-stage builds
- **Orchestration**: Docker Compose
- **CI/CD**: GitHub Actions (ready)
- **Monitoring**: Pino logger
- **Package Manager**: pnpm (workspaces)

---

## API Design

### Authentication Strategy

```
Token-based (Bearer tokens)

1. POST /api/auth/start
   │
   ├─ No auth required
   ├─ Generate 6-digit OTP
   └─ Send via SMS or return as demoCode

2. POST /api/auth/verify
   │
   ├─ No auth required
   ├─ Validate OTP
   └─ Return { token, user }

3. All subsequent requests
   │
   ├─ Authorization: Bearer <token>
   ├─ Middleware: attachUser()
   ├─ Verify token in sessions table
   └─ Check expiry (60 days)
```

### Response Format

```json
{
  "ok": true,
  "data": { ... },
  "error": null
}

OR

{
  "ok": false,
  "data": null,
  "error": "Human-readable error message"
}
```

### Error Codes

```
200 OK                - Success
201 Created          - Document created
400 Bad Request      - Invalid input
401 Unauthorized     - Missing/invalid token
403 Forbidden        - Insufficient permissions
404 Not Found        - Resource not found
429 Too Many Requests - Rate limit exceeded
500 Internal Error   - Server error
```

---

## Security Architecture

### Authentication Security
✅ Phone + SMS OTP (Twilio integration)  
✅ SHA-256 OTP hashing  
✅ 6 max attempts per OTP  
✅ 10 minute TTL on OTP  
✅ 60-day session tokens  
✅ Crypto.randomBytes(32) for entropy  

### Data Security
✅ HTTPS-only in production  
✅ Helmet.js security headers  
✅ CORS whitelist by origin  
✅ Rate limiting (express-rate-limit)  
✅ Input validation & sanitization  
✅ SQL injection prevention (Drizzle ORM)  
✅ XSS protection (React auto-escaping)  

### Storage Security
✅ Object storage ACL (patients own their docs)  
✅ Signed PUT URLs (time-limited uploads)  
✅ Encryption at rest (Replit storage)  
✅ Audit logging (all doctor accesses)  

### Privacy
✅ No sensitive data in logs  
✅ Passcode-gated doctor access  
✅ Patient can revoke access  
✅ PII encrypted in transit  

---

## Deployment Architecture

### Development Stack
```bash
docker compose -f docker-compose.dev.yml up --build

Services:
├── postgres:5432       (database)
├── api:8080           (express)
├── expo:19002         (patient app web)
├── doctor:5173        (doctor ui)
└── nginx:80/443       (reverse proxy)
```

### Production Stack
```bash
docker compose -f docker-compose.prod.yml up -d

Services:
├── api:8080           (express + gunicorn)
├── doctor:5173        (react production build)
├── postgres:5432      (managed DB)
└── s3:https           (object storage)

Reverse Proxy:
├── nginx (TLS termination)
├── CORS headers
├── Rate limiting
└── Gzip compression
```

### Environment Variables

**Required**:
```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# AI Integration
AI_INTEGRATIONS_ANTHROPIC_API_KEY=...
AI_INTEGRATIONS_GEMINI_API_KEY=...

# SMS (optional)
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=...

# Doctor Passcode
DOCTOR_PASSCODE=your_secure_passcode

# CORS
CORS_ORIGINS=https://yourdomain.com
```

### Scaling Considerations
- **Database**: Connection pooling (Drizzle pool)
- **Cache**: Redis for session storage (future)
- **Load Balancer**: AWS ELB, GCP LB, or nginx
- **CDN**: CloudFront/CloudFlare for static assets
- **Monitoring**: Datadog, New Relic, or self-hosted Prometheus

---

## Integration Points

### External Services
- **SMS**: Twilio API
- **AI Vision**: Anthropic (Claude), Google (Gemini)
- **Storage**: Replit Object Storage (S3-compatible)
- **Database**: PostgreSQL 15

### Future Integrations
- [ ] WhatsApp Business API
- [ ] Solana payments
- [ ] ABHA integration
- [ ] FHIR endpoints
- [ ] HL7 messages

---

**Last Updated**: April 2026  
**Version**: 1.0  
**Status**: Production Ready
