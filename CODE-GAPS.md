# SwasthAI - Specific Code Gaps & Fixes Needed

## 🔴 BLOCKING ISSUE #1: App Uses LocalContext Instead of API

### Current Code (WRONG ❌)
```typescript
// artifacts/swasthai/contexts/HealthContext.tsx
// Everything is IN-MEMORY ONLY

const [documents, setDocuments] = useState(SEED_DATA); // ← NEVER PERSISTED!
const [user, setUser] = useState(MOCK_USER);          // ← NEVER PERSISTED!
const [tasks, setTasks] = useState(SEED_TASKS);       // ← NEVER PERSISTED!

// When app closes, all of this is lost.
// When user reopens app, SEED_DATA is loaded again.
```

### What Needs to Happen (CORRECT ✅)

#### Step 1: Create API hooks in `lib/api.ts`
```typescript
// artifacts/swasthai/lib/api.ts

export const documentsApi = {
  async list(): Promise<Document[]> {
    const res = await fetch(`${API_URL}/api/documents`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    if (!res.ok) throw new Error('Failed to load documents');
    return res.json();
  },

  async save(document: Partial<Document>): Promise<Document> {
    const res = await fetch(`${API_URL}/api/documents`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(document)
    });
    if (!res.ok) throw new Error('Failed to save document');
    return res.json();
  },

  async delete(id: string): Promise<void> {
    const res = await fetch(`${API_URL}/api/documents/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    if (!res.ok) throw new Error('Failed to delete document');
  }
};
```

#### Step 2: Update HealthContext to fetch from API
```typescript
// artifacts/swasthai/contexts/HealthContext.tsx

export const HealthProvider = ({ children }: { children: React.ReactNode }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ← LOAD FROM API ON MOUNT
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const docs = await documentsApi.list();
        setDocuments(docs);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
        setDocuments([]); // ← Fallback to empty, not fake data
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // ← SAVE WHEN USER ADDS DOCUMENT
  const addDocument = async (doc: Partial<Document>) => {
    try {
      const saved = await documentsApi.save(doc);
      setDocuments([...documents, saved]); // ← ADD TO STATE
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    }
  };

  return (
    <HealthContext.Provider value={{
      documents,
      loading,
      error,
      addDocument,
      // ... other methods
    }}>
      {children}
    </HealthContext.Provider>
  );
};
```

#### Step 3: Update Timeline to show loading state
```typescript
// artifacts/swasthai/app/(tabs)/timeline.tsx

export default function TimelineScreen() {
  const { documents, loading, error } = useHealth();

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text>Loading your records...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={{ color: colors.destructive }}>{error}</Text>
        <Button title="Retry" onPress={() => refetch()} />
      </View>
    );
  }

  if (documents.length === 0) {
    return (
      <View style={styles.container}>
        <EmptyState 
          icon="inbox"
          title="No records yet"
          description="Add your first health record to get started"
        />
      </View>
    );
  }

  return (
    <ScrollView>
      {documents.map(doc => (
        <TimelineEntry key={doc.id} document={doc} />
      ))}
    </ScrollView>
  );
}
```

**Expected Result**:
```
Before fix:
- Sign in → See fake timeline → Close app → Reopen → Same fake data ✗

After fix:
- Sign in → Timeline empty (nothing uploaded) ✓
- Add report → Save to API → Appears in timeline ✓
- Close app → Reopen → Report still there ✓
```

---

## 🔴 BLOCKING ISSUE #2: Extraction Data Not Saved to DB

### Current Code (WRONG ❌)
```typescript
// artifacts/swasthai/app/(tabs)/upload.tsx

const handleExtract = async () => {
  const result = await authApi.extract(imageData);
  // ← Data is shown in UI but NEVER SAVED
  setExtractedData(result); // Local state only
  
  // If user navigates away, data is lost!
  // Never POSTs to /api/documents
};
```

### What Needs to Happen (CORRECT ✅)

```typescript
// artifacts/swasthai/app/(tabs)/upload.tsx

const handleExtract = async () => {
  setLoading(true);
  try {
    // 1. Send to extraction API
    const extracted = await authApi.extract(imageData);
    
    // 2. SAVE TO DATABASE immediately
    const document = await documentsApi.save({
      title: `Report ${new Date().toLocaleDateString()}`,
      source: 'upload',
      rawText: extracted.summary,
      extractedLabs: extracted.labs,
      extractedMeds: extracted.medications,
      extractedDiagnoses: extracted.diagnoses,
      confidence: extracted.confidence,
      provider: extracted.provider, // 'anthropic' | 'gemini' | 'local'
      language: extracted.language,
      status: 'processed'
    });
    
    // 3. Show user the result
    navigation.navigate('timeline');
    showToast(`Saved! ${document.extractedLabs.length} labs found.`);
  } catch (err) {
    showToast(`Failed: ${err.message}`);
  } finally {
    setLoading(false);
  }
};
```

**Expected Result**:
```
Before fix:
- Click extract → See results → Navigate away → Results gone ✗

After fix:
- Click extract → Results saved to DB → Timeline updated ✓
- Close app → Reopen → Data still there ✓
```

---

## 🔴 BLOCKING ISSUE #3: Sharing Not Implemented

### Step 1: Add Database Tables
```sql
-- lib/db/src/schema/shares.ts (NEW FILE)

import { pgTable, text, uuid, timestamp, boolean } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const sharesTable = pgTable("shares", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: uuid("patient_id").notNull().references(() => usersTable.id),
  doctorId: uuid("doctor_id").references(() => usersTable.id), // null if using token
  token: text("token").unique(), // Share token for doctors without account
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Share = typeof sharesTable.$inferSelect;
export type InsertShare = typeof sharesTable.$inferInsert;
```

### Step 2: Add API Endpoints
```typescript
// artifacts/api-server/src/routes/shares.ts (NEW FILE)

import { Router } from "express";
import { db } from "@workspace/db";
import { sharesTable, usersTable } from "@workspace/db";

const router = Router();

// Patient creates share token for doctor
router.post("/shares/create", async (req, res) => {
  const patientId = req.user?.id;
  const { expiresInDays = 30 } = req.body;

  try {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + expiresInDays * 86400000);

    const share = await db.insert(sharesTable).values({
      patientId,
      token,
      expiresAt
    }).returning();

    res.json({
      token: share[0].token,
      expiresAt: share[0].expiresAt,
      shareUrl: `${process.env.APP_URL}/doctor/access/${token}`
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Doctor verifies access via token
router.post("/doctor/verify-access", async (req, res) => {
  const { token } = req.body;

  try {
    const share = await db.query.sharesTable.findFirst({
      where: (s) => eq(s.token, token)
    });

    if (!share || share.revokedAt || (share.expiresAt && share.expiresAt < new Date())) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }

    // Create/update session
    res.json({ 
      patientId: share.patientId, 
      accessGranted: true 
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Patient revokes share
router.post("/shares/:shareId/revoke", async (req, res) => {
  const patientId = req.user?.id;
  const { shareId } = req.params;

  try {
    await db.update(sharesTable)
      .set({ revokedAt: new Date() })
      .where(and(
        eq(sharesTable.id, shareId),
        eq(sharesTable.patientId, patientId)
      ));

    res.json({ revoked: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
```

### Step 3: Update Doctor Console
```typescript
// artifacts/doctor/src/pages/PatientList.tsx

export default function PatientList() {
  const [patients, setPatients] = useState([]);
  const [shareToken, setShareToken] = useState("");

  useEffect(() => {
    if (shareToken) {
      // Verify token
      fetch('/api/doctor/verify-access', {
        method: 'POST',
        body: JSON.stringify({ token: shareToken })
      })
      .then(r => r.json())
      .then(data => {
        // Load patient's records
        loadPatientRecords(data.patientId);
      });
    }
  }, [shareToken]);

  return (
    <div>
      {!shareToken && (
        <div>
          <h2>Enter Share Token</h2>
          <input 
            value={shareToken}
            onChange={(e) => setShareToken(e.target.value)}
            placeholder="Paste token from patient"
          />
        </div>
      )}
      {patients.map(p => <PatientCard key={p.id} patient={p} />)}
    </div>
  );
}
```

**Expected Result**:
```
Before fix:
- Doctor sees demo patients (not real) ✗
- No way to share records ✗

After fix:
- Patient creates token → Shares with doctor ✓
- Doctor enters token → Sees patient records ✓
- Patient revokes → Doctor loses access ✓
```

---

## 🟡 ISSUE #4: Extraction Results Not Persisted to DB

### Current API (INCOMPLETE ❌)
```typescript
// artifacts/api-server/src/routes/extract.ts

router.post("/extract", upload.single("file"), async (req, res) => {
  try {
    const extracted = await extractFromFile(req.file);
    
    // ← RETURNS DATA but doesn't save!
    res.json(extracted);
    
    // ← Document table row never created
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});
```

### What Needs to Happen (CORRECT ✅)
```typescript
// artifacts/api-server/src/routes/extract.ts

router.post("/extract", upload.single("file"), async (req, res) => {
  const userId = req.user?.id;
  
  try {
    // 1. Extract data
    const extracted = await extractFromFile(req.file);
    
    // 2. Upload file to storage
    const filePath = `documents/${userId}/${Date.now()}-${req.file.originalname}`;
    const fileUrl = await uploadToStorage(req.file.buffer, filePath);
    
    // 3. SAVE TO DATABASE
    const document = await db.insert(documentsTable).values({
      userId,
      title: req.file.originalname,
      source: 'upload',
      status: 'processed',
      objectPath: filePath,
      mimeType: req.file.mimetype,
      rawText: extracted.summary,
      extractedLabs: extracted.labs,
      extractedMeds: extracted.medications,
      extractedDiagnoses: extracted.diagnoses,
      confidence: extracted.confidence,
      provider: extracted.provider,
      language: extracted.language
    }).returning();
    
    res.json({
      ...extracted,
      documentId: document[0].id,
      fileUrl
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});
```

---

## 🟡 ISSUE #5: SMS Not Tested with Real Numbers

### Current Code (WORKS but UNTESTED ❌)
```typescript
// artifacts/api-server/src/lib/sms.ts

export async function sendOTP(phone: string, code: string) {
  if (process.env.TWILIO_ACCOUNT_SID) {
    // Twilio is configured but never tested!
    return twilioClient.messages.create({
      from: process.env.TWILIO_FROM_NUMBER,
      to: phone,
      body: `Your SwasthAI code: ${code}`
    });
  } else {
    // Demo mode - logs code
    logger.info(`Demo OTP for ${phone}: ${code}`);
    return { sid: 'demo-123' };
  }
}
```

### What Needs to Happen (TEST ✅)

```typescript
// Create test script: scripts/test-sms.ts

import { sendOTP } from '../src/lib/sms';

async function testSMS() {
  const testPhone = process.argv[2]; // e.g., +1-555-123-4567
  
  if (!testPhone) {
    console.error('Usage: pnpm tsx scripts/test-sms.ts +1-555-123-4567');
    process.exit(1);
  }

  try {
    console.log(`Sending SMS to ${testPhone}...`);
    const result = await sendOTP(testPhone, '123456');
    console.log(`✓ Sent! SID: ${result.sid}`);
    console.log(`Check your phone for the message...`);
  } catch (err) {
    console.error(`✗ Failed: ${err.message}`);
  }
}

testSMS();
```

**Run it**:
```bash
# Set your Twilio credentials
export TWILIO_ACCOUNT_SID=ACxxxxxxx
export TWILIO_AUTH_TOKEN=xxxxx
export TWILIO_FROM_NUMBER=+1-555-123-4567

# Test on your real phone
pnpm tsx scripts/test-sms.ts +91-98765-43210

# You should receive SMS within 10 seconds
```

---

## 🟡 ISSUE #6: No Error Handling in App

### Current Code (CRASHES on error ❌)
```typescript
// artifacts/swasthai/app/(tabs)/upload.tsx

const handleExtract = async () => {
  const result = await authApi.extract(imageData);
  // ← If API fails, app crashes or shows blank
  // ← No error message to user
  setExtractedData(result);
};
```

### What Needs to Happen (CORRECT ✅)
```typescript
// artifacts/swasthai/app/(tabs)/upload.tsx

const handleExtract = async () => {
  setLoading(true);
  setError(null);
  
  try {
    const result = await authApi.extract(imageData);
    
    // Check if extraction was successful
    if (!result || result.confidence < 0.3) {
      setWarning('Extraction quality low. Please try another image.');
    }
    
    setExtractedData(result);
  } catch (err) {
    // Handle different error types
    if (err instanceof TypeError) {
      setError('Network error. Check your connection.');
    } else if (err.status === 413) {
      setError('Image too large. Try smaller file.');
    } else if (err.status === 429) {
      setError('Too many requests. Try again later.');
    } else {
      setError(err.message || 'Extraction failed. Try again.');
    }
    
    // Retry option
    setRetryable(true);
  } finally {
    setLoading(false);
  }
};

return (
  <View>
    {error && (
      <Alert
        type="error"
        message={error}
        action={retryable ? <Button title="Retry" onPress={handleExtract} /> : null}
      />
    )}
    {warning && <Alert type="warning" message={warning} />}
    {loading && <ActivityIndicator />}
    {extractedData && <ExtractionPreview data={extractedData} />}
  </View>
);
```

---

## 📋 Testing Checklist (DO THIS BEFORE LAUNCH)

```
Data Flow:
  [ ] Sign in with real phone
  [ ] Receive SMS OTP
  [ ] Enter OTP → Sign in works
  [ ] Close app → Reopen → Still signed in
  
Extraction:
  [ ] Upload PDF → Extract works
  [ ] Close app → Reopen → Document still there
  [ ] Extract image → Labs visible
  [ ] Extract text → Diagnoses visible
  
Sharing:
  [ ] Create share token
  [ ] Doctor uses token
  [ ] Doctor sees patient records
  [ ] Revoke token → Doctor loses access
  
Error Handling:
  [ ] Lose internet → Show error
  [ ] API down → Show error
  [ ] Bad image → Show helpful message
  [ ] Retry button works
  
Database:
  [ ] 50 documents → Still loads fast
  [ ] Large extraction → Doesn't crash
  [ ] Concurrent users → No race conditions
```

---

## 🚀 Summary: What to Fix This Week

| File | Issue | Status |
|------|-------|--------|
| `HealthContext.tsx` | Use LocalContext instead of API | 🔴 CRITICAL |
| `upload.tsx` | Extraction not saved | 🔴 CRITICAL |
| `timeline.tsx` | Shows seed data, not real | 🔴 CRITICAL |
| `extract.ts` | API doesn't save to DB | 🔴 CRITICAL |
| `shares.ts` | Doesn't exist | 🟡 MAJOR |
| `auth.ts` | SMS untested | 🟡 MAJOR |
| Error handling | Missing everywhere | 🟡 MAJOR |

**Estimated Fix Time**: 5-7 days for a developer who knows the code  
**Impact**: Makes product actually usable
