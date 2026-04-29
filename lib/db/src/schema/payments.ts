// lib/db/src/schema/payments.ts
// Payment records schema - Add this file to database

import { pgTable, text, timestamp, uuid, numeric, jsonb, index } from 'drizzle-orm/pg-core';
import { usersTable } from './users';

export const paymentsTable = pgTable(
  'payments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    transactionId: text('transaction_id').notNull().unique(),
    doctorId: uuid('doctor_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
    patientId: uuid('patient_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(), // e.g., 50.00
    currency: text('currency').notNull().default('USDC'),
    status: text('status').notNull().default('pending'), // pending, completed, failed, refunded
    solanaSignature: text('solana_signature'), // On-chain transaction signature (once confirmed)
    solanaNetwork: text('solana_network').default('devnet'), // devnet, mainnet-beta, testnet
    consultationDate: timestamp('consultation_date', { withTimezone: true }), // When consultation is scheduled
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}), // Store DODO metadata
    notes: text('notes'), // Internal notes (e.g., "Refund requested")
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('payments_doctor_id_idx').on(table.doctorId),
    index('payments_patient_id_idx').on(table.patientId),
    index('payments_transaction_id_idx').on(table.transactionId),
    index('payments_status_idx').on(table.status),
    index('payments_created_at_idx').on(table.createdAt),
  ]
);

export type Payment = typeof paymentsTable.$inferSelect;
export type InsertPayment = typeof paymentsTable.$inferInsert;
