import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
  organization: text("organization").notNull(),
  role: text("role").notNull(), // admin, material_distributor, manufacturer, distributor, pharmacy, customer
  proofUrl: text("proof_url"),
  password: text("password").notNull(),
  walletAddress: text("wallet_address"),
  isApproved: boolean("is_approved").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const materials = pgTable("materials", {
  id: serial("id").primaryKey(),
  batchId: text("batch_id").notNull().unique(),
  name: text("name").notNull(),
  supplierId: integer("supplier_id").notNull(),
  status: text("status").notNull(), // registered, transferred
  blockchainHash: text("blockchain_hash"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const medicineBatches = pgTable("medicine_batches", {
  id: serial("id").primaryKey(),
  batchId: text("batch_id").notNull().unique(),
  name: text("name").notNull(),
  manufacturerId: integer("manufacturer_id").notNull(),
  materialBatchId: text("material_batch_id"),
  status: text("status").notNull(), // Requested, Processing, Preparing, Packed, Ready To Ship, Shipped, Received
  blockchainHash: text("blockchain_hash"),
  expiryDate: timestamp("expiry_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const transfers = pgTable("transfers", {
  id: serial("id").primaryKey(),
  fromId: integer("from_id").notNull(),
  toId: integer("to_id").notNull(),
  entityType: text("entity_type").notNull(), // material, medicine
  entityBatchId: text("entity_batch_id").notNull(),
  status: text("status").notNull(), // initiated, completed
  blockchainHash: text("blockchain_hash"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const authenticityReports = pgTable("authenticity_reports", {
  id: serial("id").primaryKey(),
  batchId: text("batch_id").notNull(),
  reportedBy: integer("reported_by").notNull(),
  status: text("status").notNull(), // flagged, verified, suspicious
  comments: text("comments"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const feedback = pgTable("feedback", {
  id: serial("id").primaryKey(),
  batchId: text("batch_id").notNull(),
  customerId: integer("customer_id").notNull(),
  rating: integer("rating").notNull(),
  comments: text("comments"),
  createdAt: timestamp("created_at").defaultNow(),
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
