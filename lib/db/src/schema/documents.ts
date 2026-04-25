import { pgTable, text, timestamp, uuid, jsonb, real } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const documentsTable = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  source: text("source").notNull().default("upload"),
  status: text("status").notNull().default("processing"),
  objectPath: text("object_path"),
  mimeType: text("mime_type"),
  rawText: text("raw_text"),
  extractedLabs: jsonb("extracted_labs").$type<unknown[]>().default([]),
  extractedMeds: jsonb("extracted_meds").$type<unknown[]>().default([]),
  extractedDiagnoses: jsonb("extracted_diagnoses").$type<string[]>().default([]),
  language: text("language").default("english"),
  confidence: real("confidence").default(0),
  provider: text("provider"),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Document = typeof documentsTable.$inferSelect;
export type InsertDocument = typeof documentsTable.$inferInsert;
