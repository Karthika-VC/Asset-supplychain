import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === SHARED ENUM CONSTANTS ===
export const roleValues = [
  "admin",
  "material_distributor",
  "manufacturer",
  "distributor",
  "pharmacy",
  "customer",
] as const;

export const manufacturerStatusValues = ["pending", "approved", "suspended"] as const;
export const distributorStatusValues = ["pending", "approved", "suspended"] as const;
export const pharmacyStatusValues = ["pending", "approved", "suspended"] as const;
export const customerStatusValues = ["active", "disabled"] as const;

export const materialStatusValues = ["registered", "transferred"] as const;
export const batchStatusValues = [
  "Requested",
  "Processing",
  "Preparing",
  "Packed",
  "Ready To Ship",
  "Shipped",
  "Received",
] as const;
export const transferStatusValues = ["initiated", "completed"] as const;
export const authenticityStatusValues = ["flagged", "verified", "suspicious"] as const;

export const productCategoryValues = ["otc", "prescription", "vaccine", "controlled", "other"] as const;
export const inventoryOwnerTypeValues = ["manufacturer", "distributor", "pharmacy"] as const;
export const requestStatusValues = ["pending", "approved", "rejected", "fulfilled", "cancelled"] as const;
export const documentEntityTypeValues = [
  "user",
  "manufacturer",
  "distributor",
  "pharmacy",
  "customer",
  "product",
  "batch",
  "request",
] as const;
export const documentTypeValues = [
  "business_license",
  "gmp_certificate",
  "invoice",
  "coa",
  "shipping_manifest",
  "prescription",
  "other",
] as const;
export const documentStatusValues = ["uploaded", "verified", "rejected"] as const;
export const auditActionTypeValues = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "STATUS_CHANGE",
  "LOGIN",
  "LOGOUT",
  "APPROVAL",
] as const;

// === TABLE DEFINITIONS (CORE AUTH/LEGACY DOMAIN) ===
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  phone: varchar("phone", { length: 64 }).notNull(),
  organization: varchar("organization", { length: 255 }).notNull(),
  role: mysqlEnum("role", roleValues).notNull(),
  proofUrl: text("proof_url"),
  password: varchar("password", { length: 255 }).notNull(),
  walletAddress: varchar("wallet_address", { length: 255 }),
  approvalTxHash: varchar("approval_tx_hash", { length: 255 }),
  approvalChainId: int("approval_chain_id"),
  approvalBlockNumber: int("approval_block_number"),
  approvalContractAddress: varchar("approval_contract_address", { length: 255 }),
  isApproved: boolean("is_approved").default(false),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
}, (table) => ({
  emailUniqueIdx: uniqueIndex("users_email_unique_idx").on(table.email),
  roleIdx: index("users_role_idx").on(table.role),
}));

export const materials = mysqlTable("materials", {
  id: int("id").autoincrement().primaryKey(),
  batchId: varchar("batch_id", { length: 128 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  supplierId: int("supplier_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  status: mysqlEnum("status", materialStatusValues).notNull(),
  blockchainHash: varchar("blockchain_hash", { length: 255 }),
  txHash: varchar("tx_hash", { length: 255 }),
  chainId: int("chain_id"),
  blockNumber: int("block_number"),
  contractAddress: varchar("contract_address", { length: 255 }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
}, (table) => ({
  batchUniqueIdx: uniqueIndex("materials_batch_unique_idx").on(table.batchId),
  supplierIdx: index("materials_supplier_idx").on(table.supplierId),
}));

export const medicineBatches = mysqlTable("medicine_batches", {
  id: int("id").autoincrement().primaryKey(),
  batchId: varchar("batch_id", { length: 128 }).notNull().unique(),
  productId: int("product_id").references(() => products.id, { onDelete: "set null" }),
  name: varchar("name", { length: 255 }).notNull(),
  manufacturerId: int("manufacturer_id").notNull().references(() => manufacturers.id, { onDelete: "restrict" }),
  materialBatchId: varchar("material_batch_id", { length: 128 }).references(() => materials.batchId, { onDelete: "set null" }),
  status: mysqlEnum("status", batchStatusValues).notNull(),
  blockchainHash: varchar("blockchain_hash", { length: 255 }),
  txHash: varchar("tx_hash", { length: 255 }),
  chainId: int("chain_id"),
  blockNumber: int("block_number"),
  contractAddress: varchar("contract_address", { length: 255 }),
  expiryDate: timestamp("expiry_date", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
}, (table) => ({
  batchUniqueIdx: uniqueIndex("medicine_batches_batch_unique_idx").on(table.batchId),
  productIdx: index("medicine_batches_product_idx").on(table.productId),
  manufacturerIdx: index("medicine_batches_manufacturer_idx").on(table.manufacturerId),
  statusIdx: index("medicine_batches_status_idx").on(table.status),
}));

export const transfers = mysqlTable("transfers", {
  id: int("id").autoincrement().primaryKey(),
  fromId: int("from_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  toId: int("to_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  entityType: varchar("entity_type", { length: 64 }).notNull(), // material, medicine
  entityBatchId: varchar("entity_batch_id", { length: 128 }).notNull(),
  status: mysqlEnum("status", transferStatusValues).notNull(),
  blockchainHash: varchar("blockchain_hash", { length: 255 }),
  txHash: varchar("tx_hash", { length: 255 }),
  chainId: int("chain_id"),
  blockNumber: int("block_number"),
  contractAddress: varchar("contract_address", { length: 255 }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
}, (table) => ({
  fromIdx: index("transfers_from_idx").on(table.fromId),
  toIdx: index("transfers_to_idx").on(table.toId),
  entityIdx: index("transfers_entity_idx").on(table.entityType, table.entityBatchId),
}));

export const authenticityReports = mysqlTable("authenticity_reports", {
  id: int("id").autoincrement().primaryKey(),
  batchId: varchar("batch_id", { length: 128 }).notNull().references(() => medicineBatches.batchId, { onDelete: "restrict" }),
  reportedBy: int("reported_by").notNull().references(() => users.id, { onDelete: "restrict" }),
  status: mysqlEnum("status", authenticityStatusValues).notNull(),
  comments: text("comments"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
}, (table) => ({
  batchIdx: index("authenticity_reports_batch_idx").on(table.batchId),
  reporterIdx: index("authenticity_reports_reported_by_idx").on(table.reportedBy),
}));

export const feedback = mysqlTable("feedback", {
  id: int("id").autoincrement().primaryKey(),
  batchId: varchar("batch_id", { length: 128 }).notNull().references(() => medicineBatches.batchId, { onDelete: "restrict" }),
  customerId: int("customer_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  rating: int("rating").notNull(),
  comments: text("comments"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
}, (table) => ({
  batchIdx: index("feedback_batch_idx").on(table.batchId),
  customerIdx: index("feedback_customer_idx").on(table.customerId),
}));

// === TABLE DEFINITIONS (PHASE 3 EXPANSION) ===
export const manufacturers = mysqlTable("manufacturers", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  facilityName: varchar("facility_name", { length: 255 }).notNull(),
  licenseNumber: varchar("license_number", { length: 128 }).notNull(),
  facilityAddress: text("facility_address"),
  gmpCertified: boolean("gmp_certified").default(false),
  registrationTxHash: varchar("registration_tx_hash", { length: 255 }),
  registrationChainId: int("registration_chain_id"),
  registrationBlockNumber: int("registration_block_number"),
  registrationContractAddress: varchar("registration_contract_address", { length: 255 }),
  status: mysqlEnum("status", manufacturerStatusValues).notNull().default("pending"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().onUpdateNow(),
}, (table) => ({
  userUniqueIdx: uniqueIndex("manufacturers_user_unique_idx").on(table.userId),
  licenseUniqueIdx: uniqueIndex("manufacturers_license_unique_idx").on(table.licenseNumber),
  statusIdx: index("manufacturers_status_idx").on(table.status),
}));

export const distributors = mysqlTable("distributors", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  licenseNumber: varchar("license_number", { length: 128 }).notNull(),
  distributionCenterName: varchar("distribution_center_name", { length: 255 }).notNull(),
  distributionAddress: text("distribution_address"),
  coldChainCapable: boolean("cold_chain_capable").default(false),
  registrationTxHash: varchar("registration_tx_hash", { length: 255 }),
  registrationChainId: int("registration_chain_id"),
  registrationBlockNumber: int("registration_block_number"),
  registrationContractAddress: varchar("registration_contract_address", { length: 255 }),
  status: mysqlEnum("status", distributorStatusValues).notNull().default("pending"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().onUpdateNow(),
}, (table) => ({
  userUniqueIdx: uniqueIndex("distributors_user_unique_idx").on(table.userId),
  licenseUniqueIdx: uniqueIndex("distributors_license_unique_idx").on(table.licenseNumber),
  statusIdx: index("distributors_status_idx").on(table.status),
}));

export const pharmacies = mysqlTable("pharmacies", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  permitNumber: varchar("permit_number", { length: 128 }).notNull(),
  pharmacyName: varchar("pharmacy_name", { length: 255 }).notNull(),
  address: text("address"),
  registrationTxHash: varchar("registration_tx_hash", { length: 255 }),
  registrationChainId: int("registration_chain_id"),
  registrationBlockNumber: int("registration_block_number"),
  registrationContractAddress: varchar("registration_contract_address", { length: 255 }),
  status: mysqlEnum("status", pharmacyStatusValues).notNull().default("pending"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().onUpdateNow(),
}, (table) => ({
  userUniqueIdx: uniqueIndex("pharmacies_user_unique_idx").on(table.userId),
  permitUniqueIdx: uniqueIndex("pharmacies_permit_unique_idx").on(table.permitNumber),
  statusIdx: index("pharmacies_status_idx").on(table.status),
}));

export const customers = mysqlTable("customers", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  dateOfBirth: timestamp("date_of_birth", { mode: "date" }),
  defaultPharmacyId: int("default_pharmacy_id").references(() => pharmacies.id, { onDelete: "set null" }),
  status: mysqlEnum("status", customerStatusValues).notNull().default("active"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().onUpdateNow(),
}, (table) => ({
  userUniqueIdx: uniqueIndex("customers_user_unique_idx").on(table.userId),
  statusIdx: index("customers_status_idx").on(table.status),
}));

export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  manufacturerId: int("manufacturer_id").notNull().references(() => manufacturers.id, { onDelete: "restrict" }),
  sku: varchar("sku", { length: 128 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  genericName: varchar("generic_name", { length: 255 }),
  category: mysqlEnum("category", productCategoryValues).notNull().default("other"),
  strength: varchar("strength", { length: 128 }),
  dosageForm: varchar("dosage_form", { length: 128 }),
  requiresPrescription: boolean("requires_prescription").default(false),
  storageNotes: text("storage_notes"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().onUpdateNow(),
}, (table) => ({
  skuUniqueIdx: uniqueIndex("products_sku_unique_idx").on(table.sku),
  manufacturerIdx: index("products_manufacturer_idx").on(table.manufacturerId),
}));

export const inventory = mysqlTable("inventory", {
  id: int("id").autoincrement().primaryKey(),
  ownerType: mysqlEnum("owner_type", inventoryOwnerTypeValues).notNull(),
  ownerManufacturerId: int("owner_manufacturer_id").references(() => manufacturers.id, { onDelete: "cascade" }),
  ownerDistributorId: int("owner_distributor_id").references(() => distributors.id, { onDelete: "cascade" }),
  ownerPharmacyId: int("owner_pharmacy_id").references(() => pharmacies.id, { onDelete: "cascade" }),
  productId: int("product_id").notNull().references(() => products.id, { onDelete: "restrict" }),
  medicineBatchId: int("medicine_batch_id").references(() => medicineBatches.id, { onDelete: "set null" }),
  quantity: int("quantity").notNull().default(0),
  unit: varchar("unit", { length: 32 }).notNull().default("units"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().onUpdateNow(),
}, (table) => ({
  ownerTypeIdx: index("inventory_owner_type_idx").on(table.ownerType),
  productIdx: index("inventory_product_idx").on(table.productId),
  batchIdx: index("inventory_batch_idx").on(table.medicineBatchId),
}));

export const medicineRequests = mysqlTable("medicine_requests", {
  id: int("id").autoincrement().primaryKey(),
  requesterPharmacyId: int("requester_pharmacy_id").notNull().references(() => pharmacies.id, { onDelete: "restrict" }),
  supplierDistributorId: int("supplier_distributor_id").references(() => distributors.id, { onDelete: "set null" }),
  productId: int("product_id").notNull().references(() => products.id, { onDelete: "restrict" }),
  requestedQuantity: int("requested_quantity").notNull(),
  status: mysqlEnum("status", requestStatusValues).notNull().default("pending"),
  neededBy: timestamp("needed_by", { mode: "date" }),
  notes: text("notes"),
  createdByUserId: int("created_by_user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().onUpdateNow(),
}, (table) => ({
  requesterIdx: index("medicine_requests_requester_idx").on(table.requesterPharmacyId),
  supplierIdx: index("medicine_requests_supplier_idx").on(table.supplierDistributorId),
  productIdx: index("medicine_requests_product_idx").on(table.productId),
  statusIdx: index("medicine_requests_status_idx").on(table.status),
}));

export const uploadedDocuments = mysqlTable("uploaded_documents", {
  id: int("id").autoincrement().primaryKey(),
  uploaderUserId: int("uploader_user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  entityType: mysqlEnum("entity_type", documentEntityTypeValues).notNull(),
  entityId: int("entity_id").notNull(),
  documentType: mysqlEnum("document_type", documentTypeValues).notNull(),
  originalFilename: varchar("original_filename", { length: 255 }),
  storedFilename: varchar("stored_filename", { length: 255 }),
  fileUrl: text("file_url").notNull(),
  fileHash: varchar("file_hash", { length: 128 }),
  mimeType: varchar("mime_type", { length: 128 }),
  size: int("size"),
  status: mysqlEnum("status", documentStatusValues).notNull().default("uploaded"),
  verifiedByUserId: int("verified_by_user_id").references(() => users.id, { onDelete: "set null" }),
  uploadedAt: timestamp("uploaded_at", { mode: "date" }).defaultNow(),
  verifiedAt: timestamp("verified_at", { mode: "date" }),
}, (table) => ({
  uploaderIdx: index("uploaded_documents_uploader_idx").on(table.uploaderUserId),
  entityIdx: index("uploaded_documents_entity_idx").on(table.entityType, table.entityId),
  documentTypeIdx: index("uploaded_documents_document_type_idx").on(table.documentType),
}));

export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  actorUserId: int("actor_user_id").references(() => users.id, { onDelete: "set null" }),
  actionType: mysqlEnum("action_type", auditActionTypeValues).notNull(),
  entityType: mysqlEnum("entity_type", documentEntityTypeValues).notNull(),
  entityId: int("entity_id").notNull(),
  message: text("message"),
  metadata: json("metadata"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: varchar("user_agent", { length: 255 }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
}, (table) => ({
  actorIdx: index("audit_logs_actor_idx").on(table.actorUserId),
  actionTypeIdx: index("audit_logs_action_type_idx").on(table.actionType),
  entityIdx: index("audit_logs_entity_idx").on(table.entityType, table.entityId),
}));

// === RELATIONS ===
export const usersRelations = relations(users, ({ one, many }) => ({
  manufacturer: one(manufacturers, { fields: [users.id], references: [manufacturers.userId] }),
  distributor: one(distributors, { fields: [users.id], references: [distributors.userId] }),
  pharmacy: one(pharmacies, { fields: [users.id], references: [pharmacies.userId] }),
  customer: one(customers, { fields: [users.id], references: [customers.userId] }),
  suppliedMaterials: many(materials),
  outboundTransfers: many(transfers, { relationName: "transfer_from_user" }),
  inboundTransfers: many(transfers, { relationName: "transfer_to_user" }),
  authenticityReports: many(authenticityReports),
  feedbackEntries: many(feedback),
  uploadedDocs: many(uploadedDocuments, { relationName: "uploaded_by_user" }),
  verifiedDocs: many(uploadedDocuments, { relationName: "verified_by_user" }),
  auditLogs: many(auditLogs),
}));

export const manufacturersRelations = relations(manufacturers, ({ one, many }) => ({
  user: one(users, { fields: [manufacturers.userId], references: [users.id] }),
  products: many(products),
  batches: many(medicineBatches),
  inventory: many(inventory),
}));

export const distributorsRelations = relations(distributors, ({ one, many }) => ({
  user: one(users, { fields: [distributors.userId], references: [users.id] }),
  suppliedRequests: many(medicineRequests),
  inventory: many(inventory),
}));

export const pharmaciesRelations = relations(pharmacies, ({ one, many }) => ({
  user: one(users, { fields: [pharmacies.userId], references: [users.id] }),
  customers: many(customers),
  medicineRequests: many(medicineRequests),
  inventory: many(inventory),
}));

export const customersRelations = relations(customers, ({ one }) => ({
  user: one(users, { fields: [customers.userId], references: [users.id] }),
  defaultPharmacy: one(pharmacies, { fields: [customers.defaultPharmacyId], references: [pharmacies.id] }),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  manufacturer: one(manufacturers, { fields: [products.manufacturerId], references: [manufacturers.id] }),
  batches: many(medicineBatches),
  inventory: many(inventory),
  medicineRequests: many(medicineRequests),
}));

export const materialsRelations = relations(materials, ({ one }) => ({
  supplier: one(users, { fields: [materials.supplierId], references: [users.id] }),
}));

export const medicineBatchesRelations = relations(medicineBatches, ({ one, many }) => ({
  product: one(products, { fields: [medicineBatches.productId], references: [products.id] }),
  manufacturer: one(manufacturers, { fields: [medicineBatches.manufacturerId], references: [manufacturers.id] }),
  material: one(materials, { fields: [medicineBatches.materialBatchId], references: [materials.batchId] }),
  inventoryItems: many(inventory),
}));

export const transfersRelations = relations(transfers, ({ one }) => ({
  fromUser: one(users, { fields: [transfers.fromId], references: [users.id], relationName: "transfer_from_user" }),
  toUser: one(users, { fields: [transfers.toId], references: [users.id], relationName: "transfer_to_user" }),
}));

export const authenticityReportsRelations = relations(authenticityReports, ({ one }) => ({
  batch: one(medicineBatches, { fields: [authenticityReports.batchId], references: [medicineBatches.batchId] }),
  reporter: one(users, { fields: [authenticityReports.reportedBy], references: [users.id] }),
}));

export const feedbackRelations = relations(feedback, ({ one }) => ({
  batch: one(medicineBatches, { fields: [feedback.batchId], references: [medicineBatches.batchId] }),
  customer: one(users, { fields: [feedback.customerId], references: [users.id] }),
}));

export const inventoryRelations = relations(inventory, ({ one }) => ({
  ownerManufacturer: one(manufacturers, { fields: [inventory.ownerManufacturerId], references: [manufacturers.id] }),
  ownerDistributor: one(distributors, { fields: [inventory.ownerDistributorId], references: [distributors.id] }),
  ownerPharmacy: one(pharmacies, { fields: [inventory.ownerPharmacyId], references: [pharmacies.id] }),
  product: one(products, { fields: [inventory.productId], references: [products.id] }),
  medicineBatch: one(medicineBatches, { fields: [inventory.medicineBatchId], references: [medicineBatches.id] }),
}));

export const medicineRequestsRelations = relations(medicineRequests, ({ one }) => ({
  requesterPharmacy: one(pharmacies, { fields: [medicineRequests.requesterPharmacyId], references: [pharmacies.id] }),
  supplierDistributor: one(distributors, { fields: [medicineRequests.supplierDistributorId], references: [distributors.id] }),
  product: one(products, { fields: [medicineRequests.productId], references: [products.id] }),
  createdByUser: one(users, { fields: [medicineRequests.createdByUserId], references: [users.id] }),
}));

export const uploadedDocumentsRelations = relations(uploadedDocuments, ({ one }) => ({
  uploader: one(users, { fields: [uploadedDocuments.uploaderUserId], references: [users.id], relationName: "uploaded_by_user" }),
  verifiedBy: one(users, { fields: [uploadedDocuments.verifiedByUserId], references: [users.id], relationName: "verified_by_user" }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  actorUser: one(users, { fields: [auditLogs.actorUserId], references: [users.id] }),
}));

// === BASE SCHEMAS ===
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertMaterialSchema = createInsertSchema(materials).omit({ id: true, createdAt: true });
export const insertMedicineBatchSchema = createInsertSchema(medicineBatches).omit({ id: true, createdAt: true });
export const insertTransferSchema = createInsertSchema(transfers).omit({ id: true, createdAt: true });
export const insertAuthenticityReportSchema = createInsertSchema(authenticityReports).omit({ id: true, createdAt: true });
export const insertFeedbackSchema = createInsertSchema(feedback).omit({ id: true, createdAt: true });
export const insertManufacturerSchema = createInsertSchema(manufacturers).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDistributorSchema = createInsertSchema(distributors).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPharmacySchema = createInsertSchema(pharmacies).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true, updatedAt: true });
export const insertInventorySchema = createInsertSchema(inventory).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMedicineRequestSchema = createInsertSchema(medicineRequests).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUploadedDocumentSchema = createInsertSchema(uploadedDocuments).omit({ id: true, uploadedAt: true, verifiedAt: true });
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, createdAt: true });

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

export type Manufacturer = typeof manufacturers.$inferSelect;
export type InsertManufacturer = z.infer<typeof insertManufacturerSchema>;

export type Distributor = typeof distributors.$inferSelect;
export type InsertDistributor = z.infer<typeof insertDistributorSchema>;

export type Pharmacy = typeof pharmacies.$inferSelect;
export type InsertPharmacy = z.infer<typeof insertPharmacySchema>;

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type InventoryItem = typeof inventory.$inferSelect;
export type InsertInventoryItem = z.infer<typeof insertInventorySchema>;

export type MedicineRequest = typeof medicineRequests.$inferSelect;
export type InsertMedicineRequest = z.infer<typeof insertMedicineRequestSchema>;

export type UploadedDocument = typeof uploadedDocuments.$inferSelect;
export type InsertUploadedDocument = z.infer<typeof insertUploadedDocumentSchema>;

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const publicUserSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  email: z.string().email(),
  phone: z.string(),
  organization: z.string(),
  role: z.enum(roleValues),
  proofUrl: z.string().nullable(),
  walletAddress: z.string().nullable(),
  approvalTxHash: z.string().nullable(),
  approvalChainId: z.number().int().nullable(),
  approvalBlockNumber: z.number().int().nullable(),
  approvalContractAddress: z.string().nullable(),
  isApproved: z.boolean().nullable(),
  createdAt: z.date().nullable(),
});

export const approveUserRequestSchema = z.object({
  walletAddress: z.string().optional(),
  txHash: z.string().optional(),
  chainId: z.number().int().positive().optional(),
  blockNumber: z.number().int().positive().optional(),
  contractAddress: z.string().optional(),
});

export const rejectUserResponseSchema = z.object({
  success: z.literal(true),
  userId: z.number().int(),
});

export type LoginRequest = z.infer<typeof loginSchema>;
export type PublicUser = z.infer<typeof publicUserSchema>;
export type ApproveUserRequest = z.infer<typeof approveUserRequestSchema>;
export type RejectUserResponse = z.infer<typeof rejectUserResponseSchema>;

export type AuthResponse = {
  token: string;
  user: PublicUser;
};
