import type { NextFunction, Request, Response } from "express";
import { storage } from "./storage";
import { verifyAuthToken } from "./security";

export type AuthenticatedUser = {
  id: number;
  role: string;
  email: string;
  isApproved: boolean | null;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

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

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return sendError(res, 401, "UNAUTHORIZED", "Authentication required");
  }

  const token = authHeader.slice("Bearer ".length).trim();
  const payload = verifyAuthToken(token);
  if (!payload) {
    return sendError(res, 401, "INVALID_TOKEN", "Invalid or expired authentication token");
  }

  const user = await storage.getUser(payload.userId);
  if (!user) {
    return sendError(res, 401, "UNAUTHORIZED", "User not found");
  }

  req.user = {
    id: user.id,
    role: user.role,
    email: user.email,
    isApproved: user.isApproved ?? null,
  };

  next();
}

export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, 401, "UNAUTHORIZED", "Authentication required");
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendError(res, 403, "FORBIDDEN", "Insufficient permissions");
    }

    next();
  };
}

export function requireApprovedBusiness(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return sendError(res, 401, "UNAUTHORIZED", "Authentication required");
  }

  if (req.user.role !== "customer" && req.user.role !== "admin" && !req.user.isApproved) {
    return sendError(res, 403, "APPROVAL_REQUIRED", "Business account approval is required");
  }

  next();
}
