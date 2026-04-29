import pg from "pg";
import fs from "fs";
import path from "path";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/swasthai",
});

async function setupDatabase() {
  const client = await pool.connect();
  
  try {
    console.log("Setting up database schema...");
    
    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        phone TEXT NOT NULL UNIQUE,
        name TEXT,
        role TEXT NOT NULL DEFAULT 'patient',
        language TEXT NOT NULL DEFAULT 'en',
        profile JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      )
    `);
    console.log("✓ Created users table");

    // Create otp table
    await client.query(`
      CREATE TABLE IF NOT EXISTS otp (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        code_hash TEXT NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      )
    `);
    console.log("✓ Created otp table");

    // Create sessions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      )
    `);
    console.log("✓ Created sessions table");

    // Create documents table
    await client.query(`
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
      )
    `);
    console.log("✓ Created documents table");

    // Seed mock data
    console.log("\nSeeding mock data...");
    
    // Insert users
    const patientResult = await client.query(
      `INSERT INTO users (phone, name, role, language, profile) 
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      ['+919876543210', 'Arjun Sharma', 'patient', 'en', JSON.stringify({ abhaLinked: true, healthScore: 72, continuityScore: 84 })]
    );
    console.log("✓ Created patient user: Arjun Sharma");

    const doctorResult = await client.query(
      `INSERT INTO users (phone, name, role, language, profile) 
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      ['+918765432109', 'Dr. Priya Verma', 'doctor', 'en', JSON.stringify({ specialization: 'General Medicine', verified: true })]
    );
    console.log("✓ Created doctor user: Dr. Priya Verma");

    const patientId = patientResult.rows[0].id;

    // Insert mock documents
    await client.query(
      `INSERT INTO documents (user_id, title, source, status, language, confidence, extracted_diagnoses, uploaded_at, extracted_labs)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        patientId,
        'Dr Lal PathLabs — Diabetes Panel',
        'upload',
        'completed',
        'english',
        0.97,
        JSON.stringify(['Type 2 Diabetes']),
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        JSON.stringify([{ name: 'HbA1c', value: 7.8, unit: '%', status: 'high' }])
      ]
    );

    await client.query(
      `INSERT INTO documents (user_id, title, source, status, language, confidence, uploaded_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        patientId,
        'Apollo Clinic — Consultation Note',
        'whatsapp',
        'completed',
        'english',
        0.92,
        new Date(Date.now() - 21 * 24 * 60 * 60 * 1000)
      ]
    );

    await client.query(
      `INSERT INTO documents (user_id, title, source, status, language, confidence, uploaded_at, extracted_labs)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        patientId,
        'Thyrocare — Lipid Profile',
        'upload',
        'completed',
        'english',
        0.95,
        new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
        JSON.stringify([{ name: 'Cholesterol', value: 240, unit: 'mg/dL', status: 'high' }])
      ]
    );

    console.log("✓ Created 3 mock health documents");

    console.log("\n✅ Database setup complete!");
    
  } catch (error) {
    console.error("❌ Error setting up database:", error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

setupDatabase().catch(err => {
  console.error(err);
  process.exit(1);
});
