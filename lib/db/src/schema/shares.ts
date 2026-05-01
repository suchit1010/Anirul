import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const sharesTable = pgTable(
  "shares",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    note: text("note"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("shares_patient_id_idx").on(table.patientId),
    index("shares_token_idx").on(table.token),
    index("shares_revoked_at_idx").on(table.revokedAt),
  ],
);

export type Share = typeof sharesTable.$inferSelect;
export type InsertShare = typeof sharesTable.$inferInsert;
