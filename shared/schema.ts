import { mysqlTable, varchar, text, int, boolean, timestamp } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  phone: varchar("phone", { length: 64 }).notNull(),
  organization: varchar("organization", { length: 255 }).notNull(),
  role: varchar("role", { length: 64 }).notNull(), // admin, material_distributor, manufacturer, distributor, pharmacy, customer
  proofUrl: text("proof_url"),
  password: varchar("password", { length: 255 }).notNull(),
  walletAddress: varchar("wallet_address", { length: 255 }),
  isApproved: boolean("is_approved").default(false),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
});

export const materials = mysqlTable("materials", {
  id: int("id").autoincrement().primaryKey(),
  batchId: varchar("batch_id", { length: 128 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  supplierId: int("supplier_id").notNull(),
  status: varchar("status", { length: 64 }).notNull(), // registered, transferred
  blockchainHash: varchar("blockchain_hash", { length: 255 }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
});

export const medicineBatches = mysqlTable("medicine_batches", {
  id: int("id").autoincrement().primaryKey(),
  batchId: varchar("batch_id", { length: 128 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  manufacturerId: int("manufacturer_id").notNull(),
  materialBatchId: varchar("material_batch_id", { length: 128 }),
  status: varchar("status", { length: 64 }).notNull(), // Requested, Processing, Preparing, Packed, Ready To Ship, Shipped, Received
  blockchainHash: varchar("blockchain_hash", { length: 255 }),
  expiryDate: timestamp("expiry_date", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
});

export const transfers = mysqlTable("transfers", {
  id: int("id").autoincrement().primaryKey(),
  fromId: int("from_id").notNull(),
  toId: int("to_id").notNull(),
  entityType: varchar("entity_type", { length: 64 }).notNull(), // material, medicine
  entityBatchId: varchar("entity_batch_id", { length: 128 }).notNull(),
  status: varchar("status", { length: 64 }).notNull(), // initiated, completed
  blockchainHash: varchar("blockchain_hash", { length: 255 }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
});

export const authenticityReports = mysqlTable("authenticity_reports", {
  id: int("id").autoincrement().primaryKey(),
  batchId: varchar("batch_id", { length: 128 }).notNull(),
  reportedBy: int("reported_by").notNull(),
  status: varchar("status", { length: 64 }).notNull(), // flagged, verified, suspicious
  comments: text("comments"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
});

export const feedback = mysqlTable("feedback", {
  id: int("id").autoincrement().primaryKey(),
  batchId: varchar("batch_id", { length: 128 }).notNull(),
  customerId: int("customer_id").notNull(),
  rating: int("rating").notNull(),
  comments: text("comments"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
});

// === BASE SCHEMAS ===
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertMaterialSchema = createInsertSchema(materials).omit({ id: true, createdAt: true });
export const insertMedicineBatchSchema = createInsertSchema(medicineBatches).omit({ id: true, createdAt: true });
export const insertTransferSchema = createInsertSchema(transfers).omit({ id: true, createdAt: true });
export const insertAuthenticityReportSchema = createInsertSchema(authenticityReports).omit({ id: true, createdAt: true });
export const insertFeedbackSchema = createInsertSchema(feedback).omit({ id: true, createdAt: true });

// === EXPLICIT API CONTRACT TYPES ===

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Material = typeof materials.$inferSelect;
export type InsertMaterial = z.infer<typeof insertMaterialSchema>;
export type MedicineBatch = typeof medicineBatches.$inferSelect;
export type InsertMedicineBatch = z.infer<typeof insertMedicineBatchSchema>;
export type Transfer = typeof transfers.$inferSelect;
export type InsertTransfer = z.infer<typeof insertTransferSchema>;
export type AuthenticityReport = typeof authenticityReports.$inferSelect;
export type InsertAuthenticityReport = z.infer<typeof insertAuthenticityReportSchema>;
export type Feedback = typeof feedback.$inferSelect;
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;

export type LoginRequest = z.infer<typeof loginSchema>;
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export type AuthResponse = {
  token: string;
  user: User;
};

export type ApproveUserRequest = {
  walletAddress?: string;
  isApproved: boolean;
};
