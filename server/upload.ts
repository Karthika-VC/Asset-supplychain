import fs from "fs";
import path from "path";
import multer from "multer";

const uploadDirectoryPath = path.resolve(process.cwd(), "uploads");
const allowedMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function sanitizeBaseName(fileName: string): string {
  const parsed = path.parse(fileName);
  return parsed.name.replace(/[^a-zA-Z0-9-_]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "document";
}

export function ensureUploadsDirectory(): string {
  fs.mkdirSync(uploadDirectoryPath, { recursive: true });
  return uploadDirectoryPath;
}

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, ensureUploadsDirectory());
  },
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const safeBaseName = sanitizeBaseName(file.originalname);
    callback(null, `${Date.now()}-${safeBaseName}${extension}`);
  },
});

export const registrationUpload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(new multer.MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname));
      return;
    }
    callback(null, true);
  },
});

export { uploadDirectoryPath };
