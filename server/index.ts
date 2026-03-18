import express, { type Request, Response, NextFunction } from "express";
import multer from "multer";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import crypto from "crypto";
import path from "path";
import { ensureUploadsDirectory } from "./upload";
import "dotenv/config";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// ✅ Body parsers
app.use(
  express.json({
    limit: "10mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(
  express.urlencoded({
    limit: "10mb",
    extended: true,
  }),
);

// ✅ Uploads folder
const uploadsDirectory = ensureUploadsDirectory();
app.use("/uploads", express.static(path.resolve(uploadsDirectory)));

// ✅ Request ID
app.use((_req, res, next) => {
  res.locals.requestId = crypto.randomUUID();
  next();
});

// ✅ Logger
export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

// ✅ Request logging
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // ✅ Register API routes
  await registerRoutes(httpServer, app);

  // ✅ Frontend (Vite or production build)
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite, serveViteApp } = await import("./vite");
    const vite = await setupVite(httpServer, app);

    app.use(async (req, res, next) => {
      if (req.method !== "GET") return next();
      if (req.path.startsWith("/api")) return next();
      if (req.path.startsWith("/uploads")) return next();

      return serveViteApp(req, res, next, vite);
    });
   
  }

  // ✅ Error handler
  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status =
      err.status ||
      err.statusCode ||
      (err.type === "entity.too.large"
        ? 413
        : err instanceof multer.MulterError
        ? 400
        : 500);

    const syntaxErr = err as SyntaxError & { status?: number; body?: unknown };

    const isBodyParseError =
      err instanceof SyntaxError &&
      typeof syntaxErr.status === "number" &&
      "body" in syntaxErr;

    const isMulterError = err instanceof multer.MulterError;
    const isPayloadTooLarge = err.type === "entity.too.large";

    const message = isBodyParseError
      ? "Malformed JSON request body"
      : isMulterError && err.code === "LIMIT_FILE_SIZE"
      ? "Uploaded file exceeds the 10MB limit"
      : isMulterError
      ? err.code === "LIMIT_UNEXPECTED_FILE"
        ? "Unsupported file type. Allowed types: PDF, JPG, PNG, WEBP"
        : "Unsupported upload payload"
      : isPayloadTooLarge
      ? "Request payload too large"
      : err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({
      error: {
        code: isBodyParseError
          ? "INVALID_JSON"
          : isMulterError || isPayloadTooLarge
          ? "UPLOAD_ERROR"
          : "INTERNAL_ERROR",
        message,
        requestId: res.locals.requestId ?? null,
        timestamp: new Date().toISOString(),
      },
    });
  });

  // ✅ Start server
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(port, "127.0.0.1", () => {
    log(`serving on port ${port}`);
  });
})();