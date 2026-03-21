import { db } from "./db";
import {
  users, materials, medicineBatches, transfers, authenticityReports, feedback,
  manufacturers, distributors, pharmacies, customers, uploadedDocuments,
  type User, type InsertUser,
  type Material, type InsertMaterial,
  type MedicineBatch, type InsertMedicineBatch,
  type Transfer, type InsertTransfer,
  type AuthenticityReport, type InsertAuthenticityReport,
  type Feedback, type InsertFeedback,
  type Manufacturer, type InsertManufacturer,
  type Distributor, type InsertDistributor,
  type Pharmacy, type InsertPharmacy,
  type Customer, type InsertCustomer,
  type UploadedDocument, type InsertUploadedDocument,
} from "@shared/schema";
import { and, desc, eq, ne } from "drizzle-orm";

export type RegistrationProfileInput = {
  facilityName?: string;
  distributionCenterName?: string;
  pharmacyName?: string;
  licenseNumber?: string;
  permitNumber?: string;
  registrationTxHash?: string;
  registrationChainId?: number;
  registrationBlockNumber?: number;
  registrationContractAddress?: string;
};

export type RegistrationDocumentInput = {
  entityType: "manufacturer" | "distributor" | "pharmacy" | "user";
  documentType: "business_license";
  originalFilename?: string | null;
  storedFilename?: string | null;
  fileUrl: string;
  mimeType?: string | null;
  size?: number | null;
};

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  getPendingBusinessUsers(): Promise<User[]>;
  approveUser(
    id: number,
    approval?: {
      walletAddress?: string;
      txHash?: string;
      chainId?: number;
      blockNumber?: number;
      contractAddress?: string;
    },
  ): Promise<User | undefined>;
  rejectPendingUser(id: number): Promise<User | undefined>;
  createRegistration(
    user: InsertUser,
    profile?: RegistrationProfileInput,
    document?: RegistrationDocumentInput,
  ): Promise<User>;
  getBusinessStatusByUser(role: string, userId: number): Promise<string | null>;
  
  // Materials
  getMaterials(): Promise<Material[]>;
  createMaterial(material: InsertMaterial): Promise<Material>;

  // Batches
  getBatches(): Promise<MedicineBatch[]>;
  getBatch(batchId: string): Promise<MedicineBatch | undefined>;
  createBatch(batch: InsertMedicineBatch): Promise<MedicineBatch>;
  updateBatchStatus(
    batchId: string,
    status: string,
    txMeta?: {
      txHash?: string;
      chainId?: number;
      blockNumber?: number;
      contractAddress?: string;
    },
  ): Promise<MedicineBatch | undefined>;

  // Transfers
  getTransfers(): Promise<Transfer[]>;
  createTransfer(transfer: InsertTransfer): Promise<Transfer>;
  updateTransferStatus(
    id: number,
    status: string,
    txMeta?: {
      txHash?: string;
      chainId?: number;
      blockNumber?: number;
      contractAddress?: string;
    },
  ): Promise<Transfer | undefined>;

  // Authenticity
  getAuthenticityReports(): Promise<AuthenticityReport[]>;
  createAuthenticityReport(report: InsertAuthenticityReport): Promise<AuthenticityReport>;

  // Feedback
  getFeedback(): Promise<Feedback[]>;
  createFeedback(fb: InsertFeedback): Promise<Feedback>;

  // Role profiles
  createManufacturerProfile(profile: InsertManufacturer): Promise<Manufacturer>;
  createDistributorProfile(profile: InsertDistributor): Promise<Distributor>;
  createPharmacyProfile(profile: InsertPharmacy): Promise<Pharmacy>;
  createCustomerProfile(profile: InsertCustomer): Promise<Customer>;
  updateBusinessProfileStatusByUser(
    role: string,
    userId: number,
    approved: boolean,
  ): Promise<void>;

  // Documents
  createUploadedDocument(doc: InsertUploadedDocument): Promise<UploadedDocument>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [{ id: insertedId }] = await db.insert(users).values(insertUser).$returningId();
    const [user] = await db.select().from(users).where(eq(users.id, insertedId));
    if (!user) {
      throw new Error("Failed to create user");
    }
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getPendingBusinessUsers(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(and(
        eq(users.isApproved, false),
        eq(users.accountStatus, "pending"),
        ne(users.role, "customer"),
        ne(users.role, "admin"),
      ))
      .orderBy(desc(users.createdAt), desc(users.id));
  }

  async createRegistration(
    user: InsertUser,
    profile?: RegistrationProfileInput,
    document?: RegistrationDocumentInput,
  ): Promise<User> {
    return db.transaction(async (tx) => {
      const [{ id: userId }] = await tx.insert(users).values(user).$returningId();

      if (user.role === "manufacturer") {
        await tx.insert(manufacturers).values({
          userId,
          facilityName: profile?.facilityName ?? user.organization,
          licenseNumber: profile?.licenseNumber ?? "PENDING",
          registrationTxHash: profile?.registrationTxHash,
          registrationChainId: profile?.registrationChainId,
          registrationBlockNumber: profile?.registrationBlockNumber,
          registrationContractAddress: profile?.registrationContractAddress,
          status: user.isApproved ? "approved" : "pending",
        });
      } else if (user.role === "distributor" || user.role === "material_distributor") {
        await tx.insert(distributors).values({
          userId,
          distributionCenterName: profile?.distributionCenterName ?? user.organization,
          licenseNumber: profile?.licenseNumber ?? "PENDING",
          registrationTxHash: profile?.registrationTxHash,
          registrationChainId: profile?.registrationChainId,
          registrationBlockNumber: profile?.registrationBlockNumber,
          registrationContractAddress: profile?.registrationContractAddress,
          status: user.isApproved ? "approved" : "pending",
        });
      } else if (user.role === "pharmacy") {
        await tx.insert(pharmacies).values({
          userId,
          pharmacyName: profile?.pharmacyName ?? user.organization,
          permitNumber: profile?.permitNumber ?? "PENDING",
          registrationTxHash: profile?.registrationTxHash,
          registrationChainId: profile?.registrationChainId,
          registrationBlockNumber: profile?.registrationBlockNumber,
          registrationContractAddress: profile?.registrationContractAddress,
          status: user.isApproved ? "approved" : "pending",
        });
      } else if (user.role === "customer") {
        await tx.insert(customers).values({
          userId,
          status: "active",
        });
      }

      if (document) {
        await tx.insert(uploadedDocuments).values({
          uploaderUserId: userId,
          entityType: document.entityType,
          entityId: userId,
          documentType: document.documentType,
          originalFilename: document.originalFilename ?? null,
          storedFilename: document.storedFilename ?? null,
          fileUrl: document.fileUrl,
          mimeType: document.mimeType ?? null,
          size: document.size ?? null,
          status: "uploaded",
        });
      }

      const [createdUser] = await tx.select().from(users).where(eq(users.id, userId));
      if (!createdUser) {
        throw new Error("Failed to create user");
      }

      return createdUser;
    });
  }

  async approveUser(
    id: number,
    approval?: {
      walletAddress?: string;
      txHash?: string;
      chainId?: number;
      blockNumber?: number;
      contractAddress?: string;
    },
  ): Promise<User | undefined> {
    return db.transaction(async (tx) => {
      const [existingUser] = await tx
        .select()
        .from(users)
        .where(and(
          eq(users.id, id),
          eq(users.isApproved, false),
          eq(users.accountStatus, "pending"),
          ne(users.role, "customer"),
          ne(users.role, "admin"),
        ));

      if (!existingUser) {
        return undefined;
      }

      await tx
        .update(users)
        .set({
          isApproved: true,
          accountStatus: "approved",
          ...(approval?.walletAddress ? { walletAddress: approval.walletAddress } : {}),
          ...(approval?.txHash ? { approvalTxHash: approval.txHash } : {}),
          ...(typeof approval?.chainId === "number" ? { approvalChainId: approval.chainId } : {}),
          ...(typeof approval?.blockNumber === "number" ? { approvalBlockNumber: approval.blockNumber } : {}),
          ...(approval?.contractAddress ? { approvalContractAddress: approval.contractAddress } : {}),
        })
        .where(eq(users.id, id));

      if (existingUser.role === "manufacturer") {
        await tx.update(manufacturers).set({ status: "approved" }).where(eq(manufacturers.userId, existingUser.id));
      } else if (existingUser.role === "distributor" || existingUser.role === "material_distributor") {
        await tx.update(distributors).set({ status: "approved" }).where(eq(distributors.userId, existingUser.id));
      } else if (existingUser.role === "pharmacy") {
        await tx.update(pharmacies).set({ status: "approved" }).where(eq(pharmacies.userId, existingUser.id));
      }

      await tx
        .update(uploadedDocuments)
        .set({
          status: "verified",
          verifiedAt: new Date(),
        })
        .where(eq(uploadedDocuments.uploaderUserId, id));

      const [user] = await tx.select().from(users).where(eq(users.id, id));
      return user;
    });
  }

  async rejectPendingUser(id: number): Promise<User | undefined> {
    return db.transaction(async (tx) => {
      const [user] = await tx
        .select()
        .from(users)
        .where(and(
          eq(users.id, id),
          eq(users.isApproved, false),
          eq(users.accountStatus, "pending"),
          ne(users.role, "customer"),
          ne(users.role, "admin"),
        ));

      if (!user) {
        return undefined;
      }

      await tx
        .update(users)
        .set({
          accountStatus: "rejected",
          isApproved: false,
        })
        .where(eq(users.id, id));

      if (user.role === "manufacturer") {
        await tx.update(manufacturers).set({ status: "suspended" }).where(eq(manufacturers.userId, id));
      } else if (user.role === "distributor" || user.role === "material_distributor") {
        await tx.update(distributors).set({ status: "suspended" }).where(eq(distributors.userId, id));
      } else if (user.role === "pharmacy") {
        await tx.update(pharmacies).set({ status: "suspended" }).where(eq(pharmacies.userId, id));
      }

      await tx
        .update(uploadedDocuments)
        .set({
          status: "rejected",
        })
        .where(eq(uploadedDocuments.uploaderUserId, id));

      const [updatedUser] = await tx.select().from(users).where(eq(users.id, id));
      return updatedUser;
    });
  }

  // Materials
  async getMaterials(): Promise<Material[]> {
    return await db.select().from(materials);
  }

  async createMaterial(insertMaterial: InsertMaterial): Promise<Material> {
    const [{ id: insertedId }] = await db.insert(materials).values(insertMaterial).$returningId();
    const [material] = await db.select().from(materials).where(eq(materials.id, insertedId));
    if (!material) {
      throw new Error("Failed to create material");
    }
    return material;
  }

  // Batches
  async getBatches(): Promise<MedicineBatch[]> {
    return await db.select().from(medicineBatches);
  }

  async getBatch(batchId: string): Promise<MedicineBatch | undefined> {
    const [batch] = await db.select().from(medicineBatches).where(eq(medicineBatches.batchId, batchId));
    return batch;
  }

  async createBatch(insertBatch: InsertMedicineBatch): Promise<MedicineBatch> {
    const [{ id: insertedId }] = await db.insert(medicineBatches).values(insertBatch).$returningId();
    const [batch] = await db.select().from(medicineBatches).where(eq(medicineBatches.id, insertedId));
    if (!batch) {
      throw new Error("Failed to create batch");
    }
    return batch;
  }

  async updateBatchStatus(
    batchId: string,
    status: string,
    txMeta?: {
      txHash?: string;
      chainId?: number;
      blockNumber?: number;
      contractAddress?: string;
    },
  ): Promise<MedicineBatch | undefined> {
    await db
      .update(medicineBatches)
      .set({
        status: status as any,
        ...(txMeta?.txHash ? { txHash: txMeta.txHash, blockchainHash: txMeta.txHash } : {}),
        ...(typeof txMeta?.chainId === "number" ? { chainId: txMeta.chainId } : {}),
        ...(typeof txMeta?.blockNumber === "number" ? { blockNumber: txMeta.blockNumber } : {}),
        ...(txMeta?.contractAddress ? { contractAddress: txMeta.contractAddress } : {}),
      })
      .where(eq(medicineBatches.batchId, batchId));

    const [batch] = await db.select().from(medicineBatches).where(eq(medicineBatches.batchId, batchId));
    return batch;
  }

  // Transfers
  async getTransfers(): Promise<Transfer[]> {
    return await db.select().from(transfers);
  }

  async createTransfer(insertTransfer: InsertTransfer): Promise<Transfer> {
    const [{ id: insertedId }] = await db.insert(transfers).values(insertTransfer).$returningId();
    const [transfer] = await db.select().from(transfers).where(eq(transfers.id, insertedId));
    if (!transfer) {
      throw new Error("Failed to create transfer");
    }
    return transfer;
  }

  async updateTransferStatus(
    id: number,
    status: string,
    txMeta?: {
      txHash?: string;
      chainId?: number;
      blockNumber?: number;
      contractAddress?: string;
    },
  ): Promise<Transfer | undefined> {
    await db
      .update(transfers)
      .set({
        status: status as any,
        ...(txMeta?.txHash ? { txHash: txMeta.txHash, blockchainHash: txMeta.txHash } : {}),
        ...(typeof txMeta?.chainId === "number" ? { chainId: txMeta.chainId } : {}),
        ...(typeof txMeta?.blockNumber === "number" ? { blockNumber: txMeta.blockNumber } : {}),
        ...(txMeta?.contractAddress ? { contractAddress: txMeta.contractAddress } : {}),
      })
      .where(eq(transfers.id, id));
    const [transfer] = await db.select().from(transfers).where(eq(transfers.id, id));
    return transfer;
  }

  // Authenticity
  async getAuthenticityReports(): Promise<AuthenticityReport[]> {
    return await db.select().from(authenticityReports);
  }

  async createAuthenticityReport(insertReport: InsertAuthenticityReport): Promise<AuthenticityReport> {
    const [{ id: insertedId }] = await db.insert(authenticityReports).values(insertReport).$returningId();
    const [report] = await db.select().from(authenticityReports).where(eq(authenticityReports.id, insertedId));
    if (!report) {
      throw new Error("Failed to create authenticity report");
    }
    return report;
  }

  // Feedback
  async getFeedback(): Promise<Feedback[]> {
    return await db.select().from(feedback);
  }

  async createFeedback(insertFb: InsertFeedback): Promise<Feedback> {
    const [{ id: insertedId }] = await db.insert(feedback).values(insertFb).$returningId();
    const [fb] = await db.select().from(feedback).where(eq(feedback.id, insertedId));
    if (!fb) {
      throw new Error("Failed to create feedback");
    }
    return fb;
  }

  async createManufacturerProfile(profile: InsertManufacturer): Promise<Manufacturer> {
    const [{ id: insertedId }] = await db.insert(manufacturers).values(profile).$returningId();
    const [created] = await db.select().from(manufacturers).where(eq(manufacturers.id, insertedId));
    if (!created) {
      throw new Error("Failed to create manufacturer profile");
    }
    return created;
  }

  async createDistributorProfile(profile: InsertDistributor): Promise<Distributor> {
    const [{ id: insertedId }] = await db.insert(distributors).values(profile).$returningId();
    const [created] = await db.select().from(distributors).where(eq(distributors.id, insertedId));
    if (!created) {
      throw new Error("Failed to create distributor profile");
    }
    return created;
  }

  async createPharmacyProfile(profile: InsertPharmacy): Promise<Pharmacy> {
    const [{ id: insertedId }] = await db.insert(pharmacies).values(profile).$returningId();
    const [created] = await db.select().from(pharmacies).where(eq(pharmacies.id, insertedId));
    if (!created) {
      throw new Error("Failed to create pharmacy profile");
    }
    return created;
  }

  async createCustomerProfile(profile: InsertCustomer): Promise<Customer> {
    const [{ id: insertedId }] = await db.insert(customers).values(profile).$returningId();
    const [created] = await db.select().from(customers).where(eq(customers.id, insertedId));
    if (!created) {
      throw new Error("Failed to create customer profile");
    }
    return created;
  }

  async updateBusinessProfileStatusByUser(role: string, userId: number, approved: boolean): Promise<void> {
    if (role === "manufacturer") {
      await db
        .update(manufacturers)
        .set({ status: approved ? "approved" : "suspended" })
        .where(eq(manufacturers.userId, userId));
      return;
    }

    if (role === "distributor" || role === "material_distributor") {
      await db
        .update(distributors)
        .set({ status: approved ? "approved" : "suspended" })
        .where(eq(distributors.userId, userId));
      return;
    }

    if (role === "pharmacy") {
      await db
        .update(pharmacies)
        .set({ status: approved ? "approved" : "suspended" })
        .where(eq(pharmacies.userId, userId));
    }
  }

  async getBusinessStatusByUser(role: string, userId: number): Promise<string | null> {
    if (role === "manufacturer") {
      const [profile] = await db
        .select({ status: manufacturers.status })
        .from(manufacturers)
        .where(eq(manufacturers.userId, userId));
      return profile?.status ?? null;
    }

    if (role === "distributor" || role === "material_distributor") {
      const [profile] = await db
        .select({ status: distributors.status })
        .from(distributors)
        .where(eq(distributors.userId, userId));
      return profile?.status ?? null;
    }

    if (role === "pharmacy") {
      const [profile] = await db
        .select({ status: pharmacies.status })
        .from(pharmacies)
        .where(eq(pharmacies.userId, userId));
      return profile?.status ?? null;
    }

    if (role === "customer") {
      const [profile] = await db
        .select({ status: customers.status })
        .from(customers)
        .where(eq(customers.userId, userId));
      return profile?.status ?? null;
    }

    return null;
  }

  async createUploadedDocument(doc: InsertUploadedDocument): Promise<UploadedDocument> {
    const [{ id: insertedId }] = await db.insert(uploadedDocuments).values(doc).$returningId();
    const [created] = await db.select().from(uploadedDocuments).where(eq(uploadedDocuments.id, insertedId));
    if (!created) {
      throw new Error("Failed to create uploaded document");
    }
    return created;
  }
}

export const storage = new DatabaseStorage();
