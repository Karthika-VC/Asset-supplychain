import type { Express, Response } from "express";
import type { Server } from "http";
import path from "path";
import { unlink } from "fs/promises";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { hashPassword, signAuthToken, verifyPassword } from "./security";
import { requireApprovedBusiness, requireAuth, requireRole } from "./auth-middleware";
import { registrationUpload } from "./upload";

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
  return role !== "customer" && role !== "admin";
}

function mapDocumentEntityType(role: string): "manufacturer" | "distributor" | "pharmacy" | "user" {
  if (role === "manufacturer") return "manufacturer";
  if (role === "pharmacy") return "pharmacy";
  if (role === "distributor" || role === "material_distributor") return "distributor";
  return "user";
}

async function removeUploadedFile(filePath: string | undefined): Promise<void> {
  if (!filePath) return;

  try {
    await unlink(filePath);
  } catch (error: any) {
    if (error?.code !== "ENOENT") {
      console.error("Failed to remove uploaded file:", error);
    }
  }
}

function readParam(value: string | string[] | undefined): string | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.post(api.auth.register.path, registrationUpload.single("proof"), async (req, res, next) => {
    const parsed = parseInput(api.auth.register.input, req.body);
    if (!parsed.success) {
      await removeUploadedFile(req.file?.path);
      const firstError = parsed.error.errors[0];
      return sendError(res, 400, "VALIDATION_ERROR", "Invalid request body", {
        field: firstError?.path.join("."),
        issue: firstError?.message,
      });
    }

    const existing = await storage.getUserByEmail(parsed.data.email);
    if (existing) {
      await removeUploadedFile(req.file?.path);
      return sendError(res, 409, "EMAIL_EXISTS", "Email already registered");
    }

    const role = parsed.data.role;
    const businessRole = isBusinessRole(role);
    const organizationName = parsed.data.organization?.trim() || (role === "customer" ? "Individual Customer" : "");
    const proofUrl = req.file ? `/uploads/${req.file.filename}` : parsed.data.proofUrl;
    const approvalTx = parsed.data.approvalTxHash
      ? {
          txHash: parsed.data.approvalTxHash,
          chainId: parsed.data.approvalChainId,
          blockNumber: parsed.data.approvalBlockNumber,
          contractAddress: parsed.data.approvalContractAddress,
        }
      : undefined;

    if (businessRole) {
      if (!organizationName) {
        await removeUploadedFile(req.file?.path);
        return sendError(res, 400, "VALIDATION_ERROR", "Organization is required for business roles");
      }
      if (!parsed.data.walletAddress) {
        await removeUploadedFile(req.file?.path);
        return sendError(res, 400, "VALIDATION_ERROR", "Wallet address is required for business roles");
      }
      if (!proofUrl) {
        await removeUploadedFile(req.file?.path);
        return sendError(res, 400, "VALIDATION_ERROR", "Approval document upload is required for business roles");
      }
    }

    if (
      parsed.data.approvalTxHash &&
      (!parsed.data.approvalChainId || !parsed.data.approvalBlockNumber || !parsed.data.approvalContractAddress)
    ) {
      await removeUploadedFile(req.file?.path);
      return sendError(res, 400, "VALIDATION_ERROR", "Incomplete blockchain transaction metadata", {
        field: "approvalTxHash",
      });
    }

    if ((role === "manufacturer" || role === "distributor" || role === "material_distributor") && !parsed.data.licenseNumber) {
      await removeUploadedFile(req.file?.path);
      return sendError(res, 400, "VALIDATION_ERROR", "License number is required for this role", {
        field: "licenseNumber",
      });
    }

    if (role === "pharmacy" && !parsed.data.permitNumber) {
      await removeUploadedFile(req.file?.path);
      return sendError(res, 400, "VALIDATION_ERROR", "Permit number is required for pharmacy registration", {
        field: "permitNumber",
      });
    }

    try {
      const hashedPassword = await hashPassword(parsed.data.password);
      const user = await storage.createRegistration({
        name: parsed.data.name,
        email: parsed.data.email,
        password: hashedPassword,
        phone: parsed.data.phone,
        organization: organizationName,
        role: parsed.data.role,
        proofUrl,
        walletAddress: parsed.data.walletAddress,
        isApproved: businessRole ? false : true,
        accountStatus: businessRole ? "pending" : "active",
        ...(approvalTx
          ? {
              approvalTxHash: approvalTx.txHash,
              approvalChainId: approvalTx.chainId,
              approvalBlockNumber: approvalTx.blockNumber,
              approvalContractAddress: approvalTx.contractAddress,
            }
          : {}),
      },
      businessRole
        ? {
            facilityName: parsed.data.facilityName || organizationName,
            distributionCenterName: parsed.data.distributionCenterName || organizationName,
            pharmacyName: parsed.data.pharmacyName || organizationName,
            licenseNumber: parsed.data.licenseNumber,
            permitNumber: parsed.data.permitNumber,
            registrationTxHash: approvalTx?.txHash,
            registrationChainId: approvalTx?.chainId,
            registrationBlockNumber: approvalTx?.blockNumber,
            registrationContractAddress: approvalTx?.contractAddress,
          }
        : undefined,
      businessRole && req.file && proofUrl
        ? {
            entityType: mapDocumentEntityType(role),
            documentType: "business_license",
            originalFilename: req.file.originalname,
            storedFilename: path.basename(req.file.path),
            fileUrl: proofUrl,
            mimeType: req.file.mimetype,
            size: req.file.size,
          }
        : undefined);

      const token = businessRole ? undefined : signAuthToken({ userId: user.id, role: user.role });
      const message = businessRole
        ? "Registration submitted successfully. Your account is pending admin approval."
        : "Registration successful.";

      res.status(201).json({
        success: true,
        message,
        requiresApproval: businessRole,
        ...(token ? { token } : {}),
        user: toPublicUser(user),
      });
    } catch (error) {
      await removeUploadedFile(req.file?.path);
      if ((error as any)?.code === "ER_DUP_ENTRY") {
        return sendError(res, 409, "EMAIL_EXISTS", "Email already registered");
      }
      next(error);
    }
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

    if (isBusinessRole(user.role) && user.accountStatus === "pending") {
      return res.status(403).json({
        error: {
          code: "ACCOUNT_PENDING_APPROVAL",
          message: "Your account is pending admin approval.",
          status: user.accountStatus,
          requestId: res.locals.requestId ?? null,
          timestamp: new Date().toISOString(),
        },
      });
    }

    if (isBusinessRole(user.role) && user.accountStatus === "rejected") {
      return res.status(403).json({
        error: {
          code: "ACCOUNT_REJECTED",
          message: "Your account registration was rejected. Please contact the administrator.",
          status: user.accountStatus,
          requestId: res.locals.requestId ?? null,
          timestamp: new Date().toISOString(),
        },
      });
    }

    if (user.role === "customer" && user.accountStatus === "disabled") {
      return sendError(res, 403, "FORBIDDEN", "Your account is disabled");
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

  app.get(api.admin.pendingUsers.path, requireAuth, requireRole("admin"), async (req, res) => {
    const users = await storage.getPendingBusinessUsers();
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

    const user = await storage.approveUser(id, parsed.data);
    if (!user) {
      return sendError(res, 404, "NOT_FOUND", "Pending business user not found");
    }

    res.json(toPublicUser(user));
  });

  app.patch(api.admin.rejectUser.path, requireAuth, requireRole("admin"), async (req, res) => {
    const idParam = readParam(req.params.id);
    const id = Number(idParam);
    if (!Number.isInteger(id) || id <= 0) {
      return sendError(res, 400, "VALIDATION_ERROR", "Invalid user id", {
        field: "id",
      });
    }

    const user = await storage.rejectPendingUser(id);
    if (!user) {
      return sendError(res, 404, "NOT_FOUND", "Pending business user not found");
    }

    res.json({ success: true, userId: user.id });
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
        accountStatus: "active",
      });
      console.log("Seeded default admin user");
    }
  } catch (e) {
    console.error("Error seeding:", e);
  }

  return httpServer;
}
