# SwasthAI - Intelligent Health Memory Platform

**AI-powered longitudinal health memory for Indian patients.** A complete health data ecosystem with patient mobile app, doctor web console, and intelligent extraction system.

## 🎯 What We're Building

**SwasthAI** is a comprehensive health information management system designed specifically for Indian healthcare workflows:

### Patient App (Anirul)
- **Private health memory**: Patients capture lab reports, prescriptions, and medical notes
- **AI-powered extraction**: Automatically extracts labs, medications, diagnoses from reports
- **Timeline view**: Chronological health history with alerts and trends
- **Care planning**: Medication tracking, health tasks, preventive care reminders
- **Doctor sharing**: Secure passcode-protected sharing with authorized doctors

### Doctor Console
- **Patient dashboard**: View patients who shared their records
- **Health visualization**: Labs with trend charts, medications, alerts
- **Doctor brief**: AI-generated clinical summaries for quick review
- **Audit trails**: Every access is logged, patients can revoke anytime
- **ABHA-aligned**: Supports Indian health ID system

### Shared Infrastructure
- **Production-ready API**: Express.js with authentication, document storage, AI integration
- **Real AI extraction**: Anthropic Claude + Google Gemini vision models
- **Secure auth**: Phone + SMS OTP (SMS configured via Twilio)
- **Document storage**: Replit Object Storage for reports and documents
- **Database**: PostgreSQL with Drizzle ORM

---

## 🏗️ System Architecture

### Technology Stack

```
┌─────────────────────────────────────────────────────────────┐
│                     SwasthAI Platform                        │
├──────────────┬──────────────────┬──────────────────────────┤
│              │                  │                          │
│   PATIENT    │   DOCTOR         │     INFRASTRUCTURE       │
│   APP        │   CONSOLE        │                          │
│ (Expo/RN)    │ (React/Vite)     │  (Backend/Database)      │
│              │                  │                          │
└──────┬───────┴────────┬─────────┴──────────────┬───────────┘
       │                │                        │
       └────────────────┼────────────────────────┘
                        │
                   HTTP/REST API
                   (Express 5.0)
                        │
        ┌───────────────┼───────────────┐
        │               │               │
    ┌───▼────┐   ┌─────▼──────┐  ┌────▼────────┐
    │         │   │            │  │             │
    │   DB    │   │   Storage  │  │   AI APIs   │
    │(Postgres)  │ (Replit S3) │  │ (Anthropic) │
    │         │   │            │  │ (Gemini)    │
    └─────────┘   └────────────┘  └─────────────┘
```

### Core Services

| Service | Technology | Purpose | Port |
|---------|-----------|---------|------|
| **Patient App** | Expo + React Native | Mobile/web health app | 19002 |
| **Doctor Console** | React + Vite + Tailwind | Doctor web UI | 5173 |
| **API Server** | Express 5 + Node.js | REST backend | 8080 |
| **Database** | PostgreSQL 15 + Drizzle | User & document data | 5432 |
| **Storage** | Replit Object Storage | Document & image storage | HTTP(S) |

### Data Flow Architecture

```
┌──────────────┐
│  Patient     │
│  Device      │
│  (Mobile/Web)│
└──────┬───────┘
       │
       │ 1. Upload report (photo/PDF/text)
       │
       ▼
┌──────────────────┐
│  API Server      │
│  /api/extract    │
│                  │
│ • Parse document │
│ • AI extraction  │
│ • Store document │
└──────┬───────────┘
       │
       ├──────────┐
       │          │
       ▼          ▼
   ┌──────┐   ┌──────────┐
   │  DB  │   │ Storage  │
   │      │   │ (reports)│
   └──────┘   └──────────┘
       │
       │ 2. Doctor requests view
       │
       ▼
┌──────────────┐
│  Doctor      │
│  Console     │
│  (Web UI)    │
└──────────────┘
```

---

## 👥 User Flows

### Patient Sign-In & Setup Flow

```
┌─────────────────────┐
│   Patient Opens     │
│     App             │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Step 1: Enter      │
│  Phone Number       │
│  (+91 XXXXX XXXXX)  │
└──────────┬──────────┘
           │
    ┌──────▼──────┐
    │             │
    ▼             ▼
┌────────┐   ┌────────────┐
│  Real  │   │   Demo     │
│  SMS   │   │   Mode     │
└────┬───┘   └─────┬──────┘
     │             │
     └──────┬──────┘
            │
            ▼
┌─────────────────────┐
│  Step 2: Enter      │
│  6-Digit Code       │
│  (from SMS or       │
│   demo: 123456)     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  ✓ Signed In        │
│  Dashboard Loaded   │
│  (Health Score,     │
│   Alerts, Labs)     │
└─────────────────────┘
```

### Patient Add Memory Flow

```
┌──────────────────────────┐
│  Patient: Add Memory     │
│  (New Report/Document)   │
└───────────┬──────────────┘
            │
            ▼
┌──────────────────────────┐
│  Choose Source:          │
│  • Camera (snap photo)   │
│  • Gallery (pick file)   │
│  • PDF/Text (paste)      │
│  • WhatsApp (forward)    │
│  • Voice (audio note)    │
└───────────┬──────────────┘
            │
            ▼
┌──────────────────────────┐
│  2. Add Title (optional) │
│  "Apollo Lab - March"    │
└───────────┬──────────────┘
            │
            ▼
┌──────────────────────────┐
│  3. Click "Extract"      │
│  (Upload to /api/extract)│
└───────────┬──────────────┘
            │
   ┌────────┴────────┐
   │                 │
   ▼                 ▼
┌─────────────┐ ┌──────────────┐
│ Anthropic   │ │ Google       │
│ Claude      │ │ Gemini       │
│ (Vision)    │ │ (Vision)     │
└──────┬──────┘ └──────┬───────┘
       │                │
       └────────┬───────┘
                │
       (Fallback if both fail)
       (Local regex parser)
                │
                ▼
┌──────────────────────────┐
│  Result: 96% Confidence  │
│  ┌────────────────────┐  │
│  │ Labs (8):          │  │
│  │ HbA1c 8.2% (HIGH) │  │
│  │ Glucose 156 (CRIT)│  │
│  │ ...                │  │
│  ├────────────────────┤  │
│  │ Meds (2):          │  │
│  │ Metformin 500mg    │  │
│  │ Atorvastatin 20mg  │  │
│  ├────────────────────┤  │
│  │ Diagnoses (1):     │  │
│  │ Diabetes           │  │
│  └────────────────────┘  │
│  [Save to Timeline]      │
└──────────────────────────┘
```

### Doctor Access Flow

```
┌──────────────────────┐
│  Doctor Opens URL:   │
│  /doctor/            │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Unlock Screen       │
│  Enter Passcode:     │
│  ••••••••            │
└──────────┬───────────┘
           │
    ┌──────▼──────┐
    │             │
    ▼             ▼
┌─────────┐  ┌──────────┐
│ Correct │  │ Incorrect│
│ ✓       │  │ ✗ Retry  │
└────┬────┘  └──────────┘
     │
     ▼
┌──────────────────────┐
│  Patients List:      │
│  Who shared access   │
│  • Arjun Sharma      │
│  • Priya Verma       │
│  • Raj Patel         │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Select Patient      │
│  View:               │
│  • Labs with Trends  │
│  • Medications       │
│  • Alerts            │
│  • Timeline          │
│  • Doctor Brief      │
└──────────────────────┘

(Every access logged & audited)
```

---

## ⚙️ How It Works - Technical Flow

### 1. Authentication System

```
PHONE NUMBER INPUT
        │
        ├─▶ Validate: 8+ digits
        │
        ▼
CALL: POST /api/auth/start
        │
        ├─▶ Generate OTP (6 digits)
        ├─▶ Hash OTP (SHA-256)
        ├─▶ Store in DB (10 min TTL)
        │
        └─▶ Send SMS via Twilio
                OR
            Return demoCode (dev mode)
        │
        ▼
USER ENTERS CODE
        │
        ├─▶ Validate: 4-6 digits
        │
        ▼
CALL: POST /api/auth/verify
        │
        ├─▶ Fetch OTP from DB
        ├─▶ Compare hash (constant-time)
        ├─▶ Check attempts (max 6)
        ├─▶ Check TTL (10 min)
        │
        ├─▶ If valid:
        │   ├─▶ Mark OTP consumed
        │   ├─▶ Find or create user
        │   ├─▶ Generate session token (crypto.randomBytes(32))
        │   ├─▶ Store session (60 day TTL)
        │   └─▶ Return token + user
        │
        ▼
STORE TOKEN IN ASYNCSTORAGE (mobile)
        │
        └─▶ All future requests: Authorization: Bearer <token>
```

### 2. Document Extraction Pipeline

```
DOCUMENT UPLOAD
   (photo, PDF, text, or base64)
        │
        ├─▶ Validate size & format
        ├─▶ Upload to object storage
        │   /api/storage/uploads/request-url
        │   ├─▶ Generate signed PUT URL
        │   └─▶ Return objectPath
        │
        ▼
CALL: POST /api/extract
        │
        ├─▶ AI Option 1: Anthropic Claude
        │   ├─▶ Send image/text to vision model
        │   ├─▶ Prompt: Extract labs, meds, diagnoses
        │   ├─▶ Parse JSON response
        │   └─▶ If success → DONE
        │
        ├─▶ If Anthropic fails → AI Option 2: Google Gemini
        │   ├─▶ Send to Gemini 2.5 Flash
        │   ├─▶ Same extraction prompt
        │   ├─▶ Parse JSON response
        │   └─▶ If success → DONE
        │
        ├─▶ If both fail → Local Regex Fallback
        │   ├─▶ Match lab patterns (HbA1c, glucose, etc.)
        │   ├─▶ Match medication keywords
        │   ├─▶ Match diagnosis keywords
        │   ├─▶ Assign confidence = 0.55 + (detected * 0.06)
        │   └─▶ Return structured data
        │
        ▼
RESPONSE:
{
  "labs": [
    {
      "name": "HbA1c",
      "value": 8.2,
      "unit": "%",
      "status": "HIGH",
      "date": "2026-04-29"
    }
  ],
  "medications": [
    {
      "name": "Metformin",
      "dose": "500mg",
      "frequency": "twice daily"
    }
  ],
  "diagnoses": ["Diabetes"],
  "confidence": 0.96,
  "provider": "local",
  "language": "english"
}
        │
        ▼
SAVE DOCUMENT
   POST /api/documents
        │
        ├─▶ Store extraction result
        ├─▶ Store document metadata
        ├─▶ Link to patient user
        │
        ▼
UPDATE PATIENT TIMELINE
   (HealthContext in app)
        │
        └─▶ Display in Dashboard & Timeline
```

### 3. Doctor Console Data Flow

```
DOCTOR PASSCODE UNLOCK
        │
        ├─▶ Validate: X-Doctor-Passcode header
        ├─▶ Compare with DOCTOR_PASSCODE env (default: "doctor2026")
        │
        ▼
CALL: GET /api/doctor/patients
        │
        ├─▶ Fetch all documents shared by patients
        ├─▶ Group by patient user_id
        │
        ▼
DISPLAY PATIENT LIST
        │
        ▼
DOCTOR SELECTS PATIENT
        │
        ├─▶ CALL: GET /api/doctor/patients/:id
        │
        ├─▶ Fetch:
        │   ├─▶ Patient metadata
        │   ├─▶ All documents/labs
        │   ├─▶ All medications
        │   ├─▶ Alert history
        │
        ▼
RENDER DASHBOARD
   ├─▶ Patient info (name, ABHA, age)
   ├─▶ Health score & alerts
   ├─▶ Labs table with last values
   ├─▶ Trend charts (Recharts)
   │   • HbA1c over 8 months
   │   • Glucose trend
   │   • Cholesterol trend
   ├─▶ Medications list
   ├─▶ Timeline of visits/uploads
   │
   └─▶ AUDIT LOG:
       Every view → logged with timestamp
       Patient can see who viewed when
       Patient can revoke access
```

### 4. API Endpoint Reference

```
═══════════════════════════════════════════════════════════════
                    AUTHENTICATION
═══════════════════════════════════════════════════════════════

POST /api/auth/start
  Request:  { phone: "+91 98765 43210" }
  Response: { phone, smsConfigured, demoCode }

POST /api/auth/verify
  Request:  { phone, code }
  Response: { token, expiresAt, user }

GET /api/auth/me
  Auth: Bearer <token>
  Response: { user }

POST /api/auth/logout
  Auth: Bearer <token>
  Response: { ok: true }

═══════════════════════════════════════════════════════════════
                      DOCUMENTS
═══════════════════════════════════════════════════════════════

POST /api/extract
  Request:  { text } or { imageBase64 }
  Response: { labs, medications, diagnoses, confidence, provider }

GET /api/documents
  Auth: Bearer <token>
  Response: [{ id, title, extractedData, createdAt }, ...]

POST /api/documents
  Auth: Bearer <token>
  Request:  { title, extractedData, objectPath }
  Response: { id, ... }

═══════════════════════════════════════════════════════════════
                     DOCTOR CONSOLE
═══════════════════════════════════════════════════════════════

GET /api/doctor/patients
  Header: X-Doctor-Passcode
  Response: [{ id, name, lastUpdate, latestLabs }, ...]

GET /api/doctor/patients/:id
  Header: X-Doctor-Passcode
  Response: { patient, documents, labs, medications, alerts }

═══════════════════════════════════════════════════════════════
                      STORAGE
═══════════════════════════════════════════════════════════════

POST /api/storage/uploads/request-url
  Request:  { name, size, contentType }
  Response: { uploadURL, objectPath }

GET /api/storage/objects/*
  Response: Download file
```

---

## 🔐 Security Features

### Authentication
✅ Phone + SMS OTP (Twilio or demo)  
✅ SHA-256 OTP hashing  
✅ 6-digit code, 10 min TTL, max 6 attempts  
✅ 60-day session tokens (crypto.randomBytes)  
✅ Bearer token in Authorization header  

### Data Privacy
✅ Document encryption at rest (Replit storage)  
✅ Passcode-gated doctor access  
✅ Audit logging (every doctor view logged)  
✅ Patient can revoke access anytime  

### API Security
✅ CORS configured (whitelist in production)  
✅ Rate limiting (express-rate-limit)  
✅ Helmet.js (security headers)  
✅ Input validation (phone, OTP, documents)  
✅ No sensitive data in logs  

---

## 📊 Database Schema

```sql
-- Users: Patients & Doctors
users
  ├── id: UUID primary key
  ├── phone: unique phone number
  ├── name: optional
  ├── role: 'patient' | 'doctor'
  ├── language: 'en', 'hi', etc
  ├── created_at: timestamp
  └── updated_at: timestamp

-- OTP codes for phone auth
otp_codes
  ├── id: UUID
  ├── phone: normalized phone
  ├── code_hash: SHA-256 hash
  ├── attempts: int (max 6)
  ├── expires_at: timestamp (10 min TTL)
  ├── consumed_at: timestamp
  └── created_at: timestamp

-- Session tokens (60 day TTL)
sessions
  ├── id: UUID
  ├── user_id: FK users
  ├── token: unique session token
  ├── expires_at: timestamp (60 days)
  └── created_at: timestamp

-- Documents: Uploaded reports
documents
  ├── id: UUID
  ├── user_id: FK users (who uploaded)
  ├── title: optional title
  ├── object_path: path in storage
  ├── extracted_data: JSON (labs, meds, diagnoses)
  ├── confidence: float 0-1
  ├── language: detected language
  ├── provider: 'anthropic' | 'gemini' | 'local'
  ├── created_at: timestamp
  └── updated_at: timestamp
```

---

## 🚀 Deployment

### Local Development
```bash
# Start all services with Docker
docker compose -f docker-compose.dev.yml up --build

# Run migrations
DATABASE_URL="postgresql://postgres:password@localhost:5432/swasthai" \
  pnpm --filter @workspace/db run push

# Visit:
# - Patient App: http://localhost:19002
# - Doctor Console: http://localhost:5173/doctor/
# - API: http://localhost:8080/api/healthz
```

### Production
```bash
# Build and deploy with Docker
docker compose -f docker-compose.prod.yml --env-file .env.production up -d

# Migrations run as deployment step (not at build time)
```

**Key Production Configs:**
- Set all env vars in `.env.production` (AI keys, database, SMS, etc.)
- Enable TLS with Let's Encrypt or cloud LB
- Configure CORS whitelist
- Set up log aggregation
- Enable DB backups

---

## 📱 Supported Clients

| Client | Technology | Status |
|--------|-----------|--------|
| **Mobile** | React Native + Expo | ✅ Working |
| **Web** | React + Tailwind | ✅ Working |
| **Doctor Console** | React + Vite + Tailwind | ✅ Working |

---

## 🤝 Contributing

Contributions welcome! Areas we're building:
- [ ] WhatsApp inbound channel
- [ ] Solana devnet payments
- [ ] Per-patient share tokens
- [ ] Advanced filtering in doctor console
- [ ] Prescription management
- [ ] Appointment scheduling
- [ ] Multilingual support (Hindi, Tamil, etc.)

---

## 📄 License

This project is built for healthcare in India. Licensed for educational and research use.

---

## 🆘 Support

- **Docs**: See [ARCHITECTURE.md](ARCHITECTURE.md), [DEPLOYMENT.md](DEPLOYMENT.md)
- **Issues**: File on GitHub
- **Questions**: Open a discussion

---

**Built with ❤️ for Indian healthcare**
