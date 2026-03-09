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
import { eq } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUserStatus(
    id: number,
    isApproved: boolean,
    walletAddress?: string,
    txMeta?: {
      txHash?: string;
      chainId?: number;
      blockNumber?: number;
      contractAddress?: string;
    },
  ): Promise<User | undefined>;
  
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
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async updateUserStatus(
    id: number,
    isApproved: boolean,
    walletAddress?: string,
    txMeta?: {
      txHash?: string;
      chainId?: number;
      blockNumber?: number;
      contractAddress?: string;
    },
  ): Promise<User | undefined> {
    const [user] = await db.update(users)
      .set({
        isApproved,
        ...(walletAddress ? { walletAddress } : {}),
        ...(txMeta?.txHash ? { approvalTxHash: txMeta.txHash } : {}),
        ...(typeof txMeta?.chainId === "number" ? { approvalChainId: txMeta.chainId } : {}),
        ...(typeof txMeta?.blockNumber === "number" ? { approvalBlockNumber: txMeta.blockNumber } : {}),
        ...(txMeta?.contractAddress ? { approvalContractAddress: txMeta.contractAddress } : {}),
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Materials
  async getMaterials(): Promise<Material[]> {
    return await db.select().from(materials);
  }

  async createMaterial(insertMaterial: InsertMaterial): Promise<Material> {
    const [material] = await db.insert(materials).values(insertMaterial).returning();
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
    const [batch] = await db.insert(medicineBatches).values(insertBatch).returning();
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
    const [batch] = await db.update(medicineBatches)
      .set({
        status,
        ...(txMeta?.txHash ? { txHash: txMeta.txHash, blockchainHash: txMeta.txHash } : {}),
        ...(typeof txMeta?.chainId === "number" ? { chainId: txMeta.chainId } : {}),
        ...(typeof txMeta?.blockNumber === "number" ? { blockNumber: txMeta.blockNumber } : {}),
        ...(txMeta?.contractAddress ? { contractAddress: txMeta.contractAddress } : {}),
      })
      .where(eq(medicineBatches.batchId, batchId))
      .returning();
    return batch;
  }

  // Transfers
  async getTransfers(): Promise<Transfer[]> {
    return await db.select().from(transfers);
  }

  async createTransfer(insertTransfer: InsertTransfer): Promise<Transfer> {
    const [transfer] = await db.insert(transfers).values(insertTransfer).returning();
    return transfer;
  }

  // Authenticity
  async getAuthenticityReports(): Promise<AuthenticityReport[]> {
    return await db.select().from(authenticityReports);
  }

  async createAuthenticityReport(insertReport: InsertAuthenticityReport): Promise<AuthenticityReport> {
    const [report] = await db.insert(authenticityReports).values(insertReport).returning();
    return report;
  }

  // Feedback
  async getFeedback(): Promise<Feedback[]> {
    return await db.select().from(feedback);
  }

  async createFeedback(insertFb: InsertFeedback): Promise<Feedback> {
    const [fb] = await db.insert(feedback).values(insertFb).returning();
    return fb;
  }

  async createManufacturerProfile(profile: InsertManufacturer): Promise<Manufacturer> {
    const [created] = await db.insert(manufacturers).values(profile).returning();
    return created;
  }

  async createDistributorProfile(profile: InsertDistributor): Promise<Distributor> {
    const [created] = await db.insert(distributors).values(profile).returning();
    return created;
  }

  async createPharmacyProfile(profile: InsertPharmacy): Promise<Pharmacy> {
    const [created] = await db.insert(pharmacies).values(profile).returning();
    return created;
  }

  async createCustomerProfile(profile: InsertCustomer): Promise<Customer> {
    const [created] = await db.insert(customers).values(profile).returning();
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

  async createUploadedDocument(doc: InsertUploadedDocument): Promise<UploadedDocument> {
    const [created] = await db.insert(uploadedDocuments).values(doc).returning();
    return created;
  }
}

export const storage = new DatabaseStorage();
