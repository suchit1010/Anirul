-- Create tables for SwasthAI

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL UNIQUE,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'patient',
  language TEXT NOT NULL DEFAULT 'en',
  profile JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS otp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'upload',
  status TEXT NOT NULL DEFAULT 'processing',
  object_path TEXT,
  mime_type TEXT,
  raw_text TEXT,
  extracted_labs JSONB DEFAULT '[]',
  extracted_meds JSONB DEFAULT '[]',
  extracted_diagnoses JSONB DEFAULT '[]',
  language TEXT DEFAULT 'english',
  confidence REAL DEFAULT 0,
  provider TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Seed mock data
INSERT INTO users (phone, name, role, language, profile) VALUES
  ('+919876543210', 'Arjun Sharma', 'patient', 'en', '{"abhaLinked": true, "healthScore": 72, "continuityScore": 84}'),
  ('+918765432109', 'Dr. Priya Verma', 'doctor', 'en', '{"specialization": "General Medicine", "verified": true}')
ON CONFLICT (phone) DO NOTHING;

-- Get the patient user ID for seeding documents
DO $$
DECLARE
  patient_id UUID;
BEGIN
  SELECT id INTO patient_id FROM users WHERE phone = '+919876543210' LIMIT 1;
  
  IF patient_id IS NOT NULL THEN
    INSERT INTO documents (user_id, title, source, status, language, confidence, extracted_diagnoses, uploaded_at, extracted_labs)
    VALUES
      (
        patient_id,
        'Dr Lal PathLabs — Diabetes Panel',
        'upload',
        'completed',
        'english',
        0.97,
        '["Type 2 Diabetes"]',
        NOW() - INTERVAL '7 days',
        '[{"name": "HbA1c", "value": 7.8, "unit": "%", "status": "high"}]'
      ),
      (
        patient_id,
        'Apollo Clinic — Consultation Note',
        'whatsapp',
        'completed',
        'english',
        0.92,
        '[]',
        NOW() - INTERVAL '21 days',
        '[]'
      ),
      (
        patient_id,
        'Thyrocare — Lipid Profile',
        'upload',
        'completed',
        'english',
        0.95,
        '[]',
        NOW() - INTERVAL '45 days',
        '[{"name": "Cholesterol", "value": 240, "unit": "mg/dL", "status": "high"}]'
      );
  END IF;
END $$;
