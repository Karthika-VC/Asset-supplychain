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

    const hashedPassword = await hashPassword(parsed.data.password);
    const user = await storage.createUser({
      ...parsed.data,
      password: hashedPassword,
    });

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

    const id = Number(req.params.id);
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
    requireRole("admin", "material_distributor"),
    async (req, res) => {
      const parsed = parseInput(api.materials.create.input, req.body);
      if (!parsed.success) {
        const firstError = parsed.error.errors[0];
        return sendError(res, 400, "VALIDATION_ERROR", "Invalid request body", {
          field: firstError?.path.join("."),
          issue: firstError?.message,
        });
      }

      const item = await storage.createMaterial(parsed.data);
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
    const item = await storage.getBatch(req.params.batchId);
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

      const item = await storage.updateBatchStatus(req.params.batchId, parsed.data.status, {
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
      const item = await storage.createTransfer(parsed.data);
      res.status(201).json(item);
    },
  );

  // Authenticity
  app.get(
    api.authenticity.list.path,
    requireAuth,
    requireRole("admin", "pharmacy"),
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
      const item = await storage.createAuthenticityReport(parsed.data);
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

    const item = await storage.createFeedback(parsed.data);
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
