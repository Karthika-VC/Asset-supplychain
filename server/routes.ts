import type { Express, Response } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { hashPassword, signAuthToken, verifyPassword } from "./security";
import { requireApprovedBusiness, requireAuth, requireRole } from "./auth-middleware";

function sendError(
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: Record<string, unknown>,
) {
  return res.status(status).json({
    error: {
      code,
      message,
      details,
      requestId: res.locals.requestId ?? null,
      timestamp: new Date().toISOString(),
    },
  });
}

function parseInput<T extends z.ZodTypeAny>(schema: T, data: unknown):
  | { success: true; data: z.infer<T> }
  | { success: false; error: z.ZodError } {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error };
  }
  return { success: true, data: parsed.data };
}

function toPublicUser<T extends { password: string }>(user: T) {
  const { password: _password, ...safeUser } = user;
  return safeUser;
}

function isBusinessRole(role: string): boolean {
  return role !== "customer";
}

function mapDocumentEntityType(role: string): "manufacturer" | "distributor" | "pharmacy" | "user" {
  if (role === "manufacturer") return "manufacturer";
  if (role === "pharmacy") return "pharmacy";
  if (role === "distributor" || role === "material_distributor") return "distributor";
  return "user";
}

function readParam(value: string | string[] | undefined): string | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.post(api.auth.register.path, async (req, res) => {
    const parsed = parseInput(api.auth.register.input, req.body);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0];
      return sendError(res, 400, "VALIDATION_ERROR", "Invalid request body", {
        field: firstError?.path.join("."),
        issue: firstError?.message,
      });
    }

    const existing = await storage.getUserByEmail(parsed.data.email);
    if (existing) {
      return sendError(res, 409, "EMAIL_EXISTS", "Email already registered");
    }

    const role = parsed.data.role;
    const businessRole = isBusinessRole(role);
    const organizationName = parsed.data.organization?.trim() || (role === "customer" ? "Individual Customer" : "");

    if (businessRole) {
      if (!organizationName) {
        return sendError(res, 400, "VALIDATION_ERROR", "Organization is required for business roles");
      }
      if (!parsed.data.walletAddress || !parsed.data.registrationTx) {
        return sendError(res, 400, "VALIDATION_ERROR", "Wallet address and on-chain registration are required for business roles");
      }
      if (!parsed.data.approvalDocument) {
        return sendError(res, 400, "VALIDATION_ERROR", "Approval document upload is required for business roles");
      }
    }

    const hashedPassword = await hashPassword(parsed.data.password);
    const user = await storage.createUser({
      name: parsed.data.name,
      email: parsed.data.email,
      password: hashedPassword,
      phone: parsed.data.phone,
      organization: organizationName,
      role: parsed.data.role,
      proofUrl: parsed.data.approvalDocument?.dataUrl || parsed.data.proofUrl,
      walletAddress: parsed.data.walletAddress,
      isApproved: businessRole ? false : true,
      ...(parsed.data.registrationTx
        ? {
            approvalTxHash: parsed.data.registrationTx.txHash,
            approvalChainId: parsed.data.registrationTx.chainId,
            approvalBlockNumber: parsed.data.registrationTx.blockNumber,
            approvalContractAddress: parsed.data.registrationTx.contractAddress,
          }
        : {}),
    });

    if (role === "manufacturer") {
      await storage.createManufacturerProfile({
        userId: user.id,
        facilityName: parsed.data.profile?.facilityName || organizationName,
        licenseNumber: parsed.data.profile?.licenseNumber || "PENDING",
        status: "pending",
        registrationTxHash: parsed.data.registrationTx?.txHash,
        registrationChainId: parsed.data.registrationTx?.chainId,
        registrationBlockNumber: parsed.data.registrationTx?.blockNumber,
        registrationContractAddress: parsed.data.registrationTx?.contractAddress,
      });
    } else if (role === "distributor" || role === "material_distributor") {
      await storage.createDistributorProfile({
        userId: user.id,
        distributionCenterName: parsed.data.profile?.distributionCenterName || organizationName,
        licenseNumber: parsed.data.profile?.licenseNumber || "PENDING",
        status: "pending",
        registrationTxHash: parsed.data.registrationTx?.txHash,
        registrationChainId: parsed.data.registrationTx?.chainId,
        registrationBlockNumber: parsed.data.registrationTx?.blockNumber,
        registrationContractAddress: parsed.data.registrationTx?.contractAddress,
      });
    } else if (role === "pharmacy") {
      await storage.createPharmacyProfile({
        userId: user.id,
        pharmacyName: parsed.data.profile?.pharmacyName || organizationName,
        permitNumber: parsed.data.profile?.permitNumber || "PENDING",
        status: "pending",
        registrationTxHash: parsed.data.registrationTx?.txHash,
        registrationChainId: parsed.data.registrationTx?.chainId,
        registrationBlockNumber: parsed.data.registrationTx?.blockNumber,
        registrationContractAddress: parsed.data.registrationTx?.contractAddress,
      });
    } else if (role === "customer") {
      await storage.createCustomerProfile({
        userId: user.id,
        status: "active",
      });
    }

    if (businessRole && parsed.data.approvalDocument) {
      await storage.createUploadedDocument({
        uploaderUserId: user.id,
        entityType: mapDocumentEntityType(role),
        entityId: user.id,
        documentType: "business_license",
        fileUrl: parsed.data.approvalDocument.dataUrl,
        mimeType: parsed.data.approvalDocument.mimeType,
        status: "uploaded",
      });
    }

    const token = signAuthToken({ userId: user.id, role: user.role });
    res.status(201).json({ token, user: toPublicUser(user) });
  });

  app.post(api.auth.login.path, async (req, res) => {
    const parsed = parseInput(api.auth.login.input, req.body);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0];
      return sendError(res, 400, "VALIDATION_ERROR", "Invalid request body", {
        field: firstError?.path.join("."),
        issue: firstError?.message,
      });
    }

    const user = await storage.getUserByEmail(parsed.data.email);
    if (!user) {
      return sendError(res, 401, "INVALID_CREDENTIALS", "Invalid email or password");
    }

    const passwordOk = await verifyPassword(parsed.data.password, user.password);
    if (!passwordOk) {
      return sendError(res, 401, "INVALID_CREDENTIALS", "Invalid email or password");
    }

    const token = signAuthToken({ userId: user.id, role: user.role });
    res.status(200).json({ token, user: toPublicUser(user) });
  });

  app.get(api.auth.me.path, requireAuth, async (req, res) => {
    const user = await storage.getUser(req.user!.id);
    if (!user) {
      return sendError(res, 401, "UNAUTHORIZED", "Not authenticated");
    }
    res.json(toPublicUser(user));
  });

  // Admin Routes
  app.get(api.admin.users.path, requireAuth, requireRole("admin"), async (req, res) => {
    const users = await storage.getAllUsers();
    res.json(users.map(toPublicUser));
  });

  app.patch(api.admin.approveUser.path, requireAuth, requireRole("admin"), async (req, res) => {
    const parsed = parseInput(api.admin.approveUser.input, req.body);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0];
      return sendError(res, 400, "VALIDATION_ERROR", "Invalid request body", {
        field: firstError?.path.join("."),
        issue: firstError?.message,
      });
    }

    const idParam = readParam(req.params.id);
    const id = Number(idParam);
    if (!Number.isInteger(id) || id <= 0) {
      return sendError(res, 400, "VALIDATION_ERROR", "Invalid user id", {
        field: "id",
      });
    }

    const user = await storage.updateUserStatus(id, parsed.data.isApproved, parsed.data.walletAddress, {
      txHash: parsed.data.txHash,
      chainId: parsed.data.chainId,
      blockNumber: parsed.data.blockNumber,
      contractAddress: parsed.data.contractAddress,
    });
    if (!user) {
      return sendError(res, 404, "NOT_FOUND", "User not found");
    }

    await storage.updateBusinessProfileStatusByUser(user.role, user.id, parsed.data.isApproved);

    res.json(toPublicUser(user));
  });

  // Materials
  app.get(
    api.materials.list.path,
    requireAuth,
    requireApprovedBusiness,
    requireRole("admin", "material_distributor", "manufacturer"),
    async (req, res) => {
    const items = await storage.getMaterials();
    res.json(items);
    },
  );

  app.post(
    api.materials.create.path,
    requireAuth,
    requireApprovedBusiness,
    requireRole("admin", "material_distributor", "manufacturer"),
    async (req, res) => {
      const parsed = parseInput(api.materials.create.input, req.body);
      if (!parsed.success) {
        const firstError = parsed.error.errors[0];
        return sendError(res, 400, "VALIDATION_ERROR", "Invalid request body", {
          field: firstError?.path.join("."),
          issue: firstError?.message,
        });
      }

      const item = await storage.createMaterial({
        ...parsed.data,
        supplierId: req.user!.id,
      });
      res.status(201).json(item);
    },
  );

  // Batches
  app.get(
    api.batches.list.path,
    requireAuth,
    requireRole("admin", "manufacturer", "distributor", "pharmacy", "customer"),
    async (req, res) => {
    const items = await storage.getBatches();
    res.json(items);
    },
  );

  app.get(
    api.batches.get.path,
    requireAuth,
    requireRole("admin", "manufacturer", "distributor", "pharmacy", "customer"),
    async (req, res) => {
    const batchId = readParam(req.params.batchId);
    if (!batchId) return sendError(res, 400, "VALIDATION_ERROR", "Invalid batch id");
    const item = await storage.getBatch(batchId);
    if (!item) return sendError(res, 404, "NOT_FOUND", "Batch not found");
    res.json(item);
    },
  );

  app.post(
    api.batches.create.path,
    requireAuth,
    requireApprovedBusiness,
    requireRole("admin", "manufacturer"),
    async (req, res) => {
      const parsed = parseInput(api.batches.create.input, req.body);
      if (!parsed.success) {
        const firstError = parsed.error.errors[0];
        return sendError(res, 400, "VALIDATION_ERROR", "Invalid request body", {
          field: firstError?.path.join("."),
          issue: firstError?.message,
        });
      }

      const item = await storage.createBatch(parsed.data);
      res.status(201).json(item);
    },
  );

  app.patch(
    api.batches.updateStatus.path,
    requireAuth,
    requireApprovedBusiness,
    requireRole("admin", "manufacturer", "distributor", "pharmacy"),
    async (req, res) => {
      const parsed = parseInput(api.batches.updateStatus.input, req.body);
      if (!parsed.success) {
        const firstError = parsed.error.errors[0];
        return sendError(res, 400, "VALIDATION_ERROR", "Invalid request body", {
          field: firstError?.path.join("."),
          issue: firstError?.message,
        });
      }

      const batchId = readParam(req.params.batchId);
      if (!batchId) return sendError(res, 400, "VALIDATION_ERROR", "Invalid batch id");

      const item = await storage.updateBatchStatus(batchId, parsed.data.status, {
        txHash: parsed.data.txHash,
        chainId: parsed.data.chainId,
        blockNumber: parsed.data.blockNumber,
        contractAddress: parsed.data.contractAddress,
      });
      if (!item) return sendError(res, 404, "NOT_FOUND", "Batch not found");
      res.json(item);
    },
  );

  // Transfers
  app.get(
    api.transfers.list.path,
    requireAuth,
    requireApprovedBusiness,
    requireRole("admin", "manufacturer", "distributor", "pharmacy"),
    async (req, res) => {
    const items = await storage.getTransfers();
    res.json(items);
    },
  );

  app.post(
    api.transfers.create.path,
    requireAuth,
    requireApprovedBusiness,
    requireRole("admin", "manufacturer", "distributor", "pharmacy"),
    async (req, res) => {
      const parsed = parseInput(api.transfers.create.input, req.body);
      if (!parsed.success) {
        const firstError = parsed.error.errors[0];
        return sendError(res, 400, "VALIDATION_ERROR", "Invalid request body", {
          field: firstError?.path.join("."),
          issue: firstError?.message,
        });
      }
      const item = await storage.createTransfer({
        ...parsed.data,
        fromId: req.user!.id,
      });
      res.status(201).json(item);
    },
  );

  app.patch(
    api.transfers.updateStatus.path,
    requireAuth,
    requireApprovedBusiness,
    requireRole("admin", "manufacturer", "distributor", "pharmacy"),
    async (req, res) => {
      const parsed = parseInput(api.transfers.updateStatus.input, req.body);
      if (!parsed.success) {
        const firstError = parsed.error.errors[0];
        return sendError(res, 400, "VALIDATION_ERROR", "Invalid request body", {
          field: firstError?.path.join("."),
          issue: firstError?.message,
        });
      }

      const transferIdParam = readParam(req.params.id);
      const transferId = Number(transferIdParam);
      if (!Number.isInteger(transferId) || transferId <= 0) {
        return sendError(res, 400, "VALIDATION_ERROR", "Invalid transfer id", {
          field: "id",
        });
      }

      const item = await storage.updateTransferStatus(transferId, parsed.data.status, {
        txHash: parsed.data.txHash,
        chainId: parsed.data.chainId,
        blockNumber: parsed.data.blockNumber,
        contractAddress: parsed.data.contractAddress,
      });
      if (!item) return sendError(res, 404, "NOT_FOUND", "Transfer not found");
      res.json(item);
    },
  );

  // Authenticity
  app.get(
    api.authenticity.list.path,
    requireAuth,
    requireRole("admin", "pharmacy", "customer"),
    async (req, res) => {
    const items = await storage.getAuthenticityReports();
    res.json(items);
    },
  );

  app.post(
    api.authenticity.create.path,
    requireAuth,
    requireRole("admin", "customer", "pharmacy"),
    async (req, res) => {
      const parsed = parseInput(api.authenticity.create.input, req.body);
      if (!parsed.success) {
        const firstError = parsed.error.errors[0];
        return sendError(res, 400, "VALIDATION_ERROR", "Invalid request body", {
          field: firstError?.path.join("."),
          issue: firstError?.message,
        });
      }
      const item = await storage.createAuthenticityReport({
        ...parsed.data,
        reportedBy: req.user!.id,
      });
      res.status(201).json(item);
    },
  );

  // Feedback
  app.get(api.feedback.list.path, requireAuth, requireRole("admin", "pharmacy"), async (req, res) => {
    const items = await storage.getFeedback();
    res.json(items);
  });

  app.post(api.feedback.create.path, requireAuth, requireRole("customer"), async (req, res) => {
    const parsed = parseInput(api.feedback.create.input, req.body);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0];
      return sendError(res, 400, "VALIDATION_ERROR", "Invalid request body", {
        field: firstError?.path.join("."),
        issue: firstError?.message,
      });
    }

    const item = await storage.createFeedback({
      ...parsed.data,
      customerId: req.user!.id,
    });
    res.status(201).json(item);
  });

  // Seed DB with an admin user if none exists
  try {
    const existing = await storage.getAllUsers();
    if (existing.length === 0) {
      const hashedPassword = await hashPassword("admin");
      await storage.createUser({
        name: "System Admin",
        email: "admin@pharmachain.local",
        password: hashedPassword,
        phone: "555-0000",
        organization: "PharmaChain Org",
        role: "admin",
        isApproved: true,
      });
      console.log("Seeded default admin user");
    }
  } catch (e) {
    console.error("Error seeding:", e);
  }

  return httpServer;
}
