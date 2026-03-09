import { z } from 'zod';
import { 
  users, roleValues,
  insertMaterialSchema, materials,
  insertMedicineBatchSchema, medicineBatches,
  insertTransferSchema, transfers,
  insertAuthenticityReportSchema, authenticityReports,
  insertFeedbackSchema, feedback,
  loginSchema,
} from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
  forbidden: z.object({
    message: z.string(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const blockchainTxMetaSchema = z.object({
  txHash: z.string().min(1),
  chainId: z.number().int().positive(),
  blockNumber: z.number().int().positive(),
  contractAddress: z.string().min(1),
});

export const registerRequestSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().min(1),
  organization: z.string().optional(),
  role: z.enum(roleValues),
  proofUrl: z.string().optional(),
  walletAddress: z.string().optional(),
  registrationTx: blockchainTxMetaSchema.optional(),
  profile: z
    .object({
      licenseNumber: z.string().optional(),
      permitNumber: z.string().optional(),
      facilityName: z.string().optional(),
      distributionCenterName: z.string().optional(),
      pharmacyName: z.string().optional(),
    })
    .optional(),
  approvalDocument: z
    .object({
      fileName: z.string().min(1),
      mimeType: z.string().min(1),
      dataUrl: z.string().min(1),
    })
    .optional(),
});

export const api = {
  auth: {
    register: {
      method: 'POST' as const,
      path: '/api/auth/register' as const,
      input: registerRequestSchema,
      responses: {
        201: z.object({ token: z.string(), user: z.custom<typeof users.$inferSelect>() }),
        400: errorSchemas.validation,
      }
    },
    login: {
      method: 'POST' as const,
      path: '/api/auth/login' as const,
      input: loginSchema,
      responses: {
        200: z.object({ token: z.string(), user: z.custom<typeof users.$inferSelect>() }),
        401: errorSchemas.unauthorized,
      }
    },
    me: {
      method: 'GET' as const,
      path: '/api/auth/me' as const,
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      }
    }
  },
  admin: {
    users: {
      method: 'GET' as const,
      path: '/api/admin/users' as const,
      responses: {
        200: z.array(z.custom<typeof users.$inferSelect>()),
        403: errorSchemas.forbidden,
      }
    },
    approveUser: {
      method: 'PATCH' as const,
      path: '/api/admin/users/:id/approve' as const,
      input: z.object({
        isApproved: z.boolean(),
        walletAddress: z.string().optional(),
        txHash: z.string().optional(),
        chainId: z.number().int().positive().optional(),
        blockNumber: z.number().int().positive().optional(),
        contractAddress: z.string().optional(),
      }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
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
