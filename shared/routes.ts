import { z } from 'zod';
import { 
  roleValues,
  insertMaterialSchema, materials,
  insertMedicineBatchSchema, medicineBatches,
  insertTransferSchema, transfers,
  insertAuthenticityReportSchema, authenticityReports,
  insertFeedbackSchema, feedback,
  loginSchema,
  publicUserSchema,
  approveUserRequestSchema,
  rejectUserResponseSchema,
} from './schema';

export const errorSchemas = {
  base: z.object({
    error: z.object({
      code: z.string(),
      message: z.string(),
      details: z.record(z.unknown()).optional(),
      requestId: z.string().nullable().optional(),
      timestamp: z.string().optional(),
    }),
  }),
  validation: z.object({
    error: z.object({
      code: z.string(),
      message: z.string(),
      details: z
        .object({
          field: z.string().optional(),
          issue: z.string().optional(),
        })
        .optional(),
      requestId: z.string().nullable().optional(),
      timestamp: z.string().optional(),
    }),
  }),
  unauthorized: z.object({
    error: z.object({
      code: z.string(),
      message: z.string(),
      requestId: z.string().nullable().optional(),
      timestamp: z.string().optional(),
    }),
  }),
  forbidden: z.object({
    error: z.object({
      code: z.string(),
      message: z.string(),
      requestId: z.string().nullable().optional(),
      timestamp: z.string().optional(),
    }),
  }),
  notFound: z.object({
    error: z.object({
      code: z.string(),
      message: z.string(),
      requestId: z.string().nullable().optional(),
      timestamp: z.string().optional(),
    }),
  }),
  internal: z.object({
    error: z.object({
      code: z.string(),
      message: z.string(),
      requestId: z.string().nullable().optional(),
      timestamp: z.string().optional(),
    }),
  }),
};

export const blockchainTxMetaSchema = z.object({
  txHash: z.string().min(1),
  chainId: z.number().int().positive(),
  blockNumber: z.number().int().positive(),
  contractAddress: z.string().min(1),
});

const optionalTrimmedString = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}, z.string().min(1).optional());

const optionalPositiveInt = z.preprocess((value) => {
  if (value === "" || value === null || typeof value === "undefined") {
    return undefined;
  }
  return value;
}, z.coerce.number().int().positive().optional());

export const registerRequestSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().trim().min(1),
  organization: optionalTrimmedString,
  role: z.enum(roleValues),
  proofUrl: optionalTrimmedString,
  walletAddress: optionalTrimmedString,
  approvalTxHash: optionalTrimmedString,
  approvalChainId: optionalPositiveInt,
  approvalBlockNumber: optionalPositiveInt,
  approvalContractAddress: optionalTrimmedString,
  licenseNumber: optionalTrimmedString,
  permitNumber: optionalTrimmedString,
  facilityName: optionalTrimmedString,
  distributionCenterName: optionalTrimmedString,
  pharmacyName: optionalTrimmedString,
});

export const api = {
  auth: {
    register: {
      method: 'POST' as const,
      path: '/api/auth/register' as const,
      input: registerRequestSchema,
      responses: {
        201: z.object({ token: z.string(), user: publicUserSchema }),
        400: errorSchemas.validation,
      }
    },
    login: {
      method: 'POST' as const,
      path: '/api/auth/login' as const,
      input: loginSchema,
      responses: {
        200: z.object({ token: z.string(), user: publicUserSchema }),
        401: errorSchemas.unauthorized,
      }
    },
    me: {
      method: 'GET' as const,
      path: '/api/auth/me' as const,
      responses: {
        200: publicUserSchema,
        401: errorSchemas.unauthorized,
      }
    }
  },
  admin: {
    users: {
      method: 'GET' as const,
      path: '/api/admin/users' as const,
      responses: {
        200: z.array(publicUserSchema),
        403: errorSchemas.forbidden,
      }
    },
    pendingUsers: {
      method: 'GET' as const,
      path: '/api/admin/pending-users' as const,
      responses: {
        200: z.array(publicUserSchema),
        403: errorSchemas.forbidden,
      }
    },
    approveUser: {
      method: 'PATCH' as const,
      path: '/api/admin/users/:id/approve' as const,
      input: approveUserRequestSchema,
      responses: {
        200: publicUserSchema,
        403: errorSchemas.forbidden,
        404: errorSchemas.notFound,
      }
    },
    rejectUser: {
      method: 'PATCH' as const,
      path: '/api/admin/users/:id/reject' as const,
      responses: {
        200: rejectUserResponseSchema,
        403: errorSchemas.forbidden,
        404: errorSchemas.notFound,
      }
    }
  },
  materials: {
    list: {
      method: 'GET' as const,
      path: '/api/materials' as const,
      responses: {
        200: z.array(z.custom<typeof materials.$inferSelect>()),
      }
    },
    create: {
      method: 'POST' as const,
      path: '/api/materials' as const,
      input: insertMaterialSchema,
      responses: {
        201: z.custom<typeof materials.$inferSelect>(),
        400: errorSchemas.validation,
      }
    }
  },
  batches: {
    list: {
      method: 'GET' as const,
      path: '/api/batches' as const,
      responses: {
        200: z.array(z.custom<typeof medicineBatches.$inferSelect>()),
      }
    },
    get: {
      method: 'GET' as const,
      path: '/api/batches/:batchId' as const,
      responses: {
        200: z.custom<typeof medicineBatches.$inferSelect>(),
        404: errorSchemas.notFound,
      }
    },
    create: {
      method: 'POST' as const,
      path: '/api/batches' as const,
      input: insertMedicineBatchSchema,
      responses: {
        201: z.custom<typeof medicineBatches.$inferSelect>(),
        400: errorSchemas.validation,
      }
    },
    updateStatus: {
      method: 'PATCH' as const,
      path: '/api/batches/:batchId/status' as const,
      input: z.object({
        status: z.string(),
        txHash: z.string().optional(),
        chainId: z.number().int().positive().optional(),
        blockNumber: z.number().int().positive().optional(),
        contractAddress: z.string().optional(),
      }),
      responses: {
        200: z.custom<typeof medicineBatches.$inferSelect>(),
        404: errorSchemas.notFound,
      }
    }
  },
  transfers: {
    list: {
      method: 'GET' as const,
      path: '/api/transfers' as const,
      responses: {
        200: z.array(z.custom<typeof transfers.$inferSelect>()),
      }
    },
    create: {
      method: 'POST' as const,
      path: '/api/transfers' as const,
      input: insertTransferSchema,
      responses: {
        201: z.custom<typeof transfers.$inferSelect>(),
        400: errorSchemas.validation,
      }
    },
    updateStatus: {
      method: 'PATCH' as const,
      path: '/api/transfers/:id/status' as const,
      input: z.object({
        status: z.string(),
        txHash: z.string().optional(),
        chainId: z.number().int().positive().optional(),
        blockNumber: z.number().int().positive().optional(),
        contractAddress: z.string().optional(),
      }),
      responses: {
        200: z.custom<typeof transfers.$inferSelect>(),
        404: errorSchemas.notFound,
      }
    }
  },
  authenticity: {
    list: {
      method: 'GET' as const,
      path: '/api/authenticity' as const,
      responses: {
        200: z.array(z.custom<typeof authenticityReports.$inferSelect>()),
      }
    },
    create: {
      method: 'POST' as const,
      path: '/api/authenticity' as const,
      input: insertAuthenticityReportSchema,
      responses: {
        201: z.custom<typeof authenticityReports.$inferSelect>(),
        400: errorSchemas.validation,
      }
    }
  },
  feedback: {
    list: {
      method: 'GET' as const,
      path: '/api/feedback' as const,
      responses: {
        200: z.array(z.custom<typeof feedback.$inferSelect>()),
      }
    },
    create: {
      method: 'POST' as const,
      path: '/api/feedback' as const,
      input: insertFeedbackSchema,
      responses: {
        201: z.custom<typeof feedback.$inferSelect>(),
        400: errorSchemas.validation,
      }
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type RegisterRequest = z.infer<typeof registerRequestSchema>;
