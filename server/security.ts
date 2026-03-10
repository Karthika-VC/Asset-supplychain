import crypto from "crypto";

const HASH_KEY_LENGTH = 64;
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;

const JWT_ALG = "HS256";
const JWT_TTL_SECONDS = 60 * 60 * 12; // 12 hours

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be set and at least 32 characters long");
  }
  return secret;
}

function base64UrlEncode(input: Buffer | string): string {
  const raw = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return raw
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(input: string): Buffer {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + padding, "base64");
}

type JwtPayload = {
  sub: string;
  role: string;
  iat: number;
  exp: number;
};

export type AuthTokenPayload = {
  userId: number;
  role: string;
};

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(password, salt, HASH_KEY_LENGTH);

  return [
    "scrypt",
    SCRYPT_N.toString(),
    SCRYPT_R.toString(),
    SCRYPT_P.toString(),
    salt.toString("hex"),
    derived.toString("hex"),
  ].join("$");
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const parts = storedHash.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") {
    return false;
  }

  const [, nRaw, rRaw, pRaw, saltRaw, hashRaw] = parts;
  const N = Number(nRaw);
  const r = Number(rRaw);
  const p = Number(pRaw);
  if (!Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p)) {
    return false;
  }

  const salt = Buffer.from(saltRaw, "hex");
  const expected = Buffer.from(hashRaw, "hex");
  const derived = crypto.scryptSync(password, salt, expected.length);

  if (derived.length !== expected.length) {
    return false;
  }

  return crypto.timingSafeEqual(derived, expected);
}

export function signAuthToken(payload: AuthTokenPayload): string {
  const secret = getJwtSecret();
  const now = Math.floor(Date.now() / 1000);
  const tokenPayload: JwtPayload = {
    sub: String(payload.userId),
    role: payload.role,
    iat: now,
    exp: now + JWT_TTL_SECONDS,
  };

  const headerEncoded = base64UrlEncode(JSON.stringify({ alg: JWT_ALG, typ: "JWT" }));
  const payloadEncoded = base64UrlEncode(JSON.stringify(tokenPayload));
  const signingInput = `${headerEncoded}.${payloadEncoded}`;
  const signature = crypto.createHmac("sha256", secret).update(signingInput).digest();
  const signatureEncoded = base64UrlEncode(signature);

  return `${signingInput}.${signatureEncoded}`;
}

export function verifyAuthToken(token: string): AuthTokenPayload | null {
  try {
    const secret = getJwtSecret();
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }

    const [headerEncoded, payloadEncoded, signatureEncoded] = parts;
    const signingInput = `${headerEncoded}.${payloadEncoded}`;
    const expectedSignature = crypto.createHmac("sha256", secret).update(signingInput).digest();
    const receivedSignature = base64UrlDecode(signatureEncoded);

    if (expectedSignature.length !== receivedSignature.length) {
      return null;
    }

    if (!crypto.timingSafeEqual(expectedSignature, receivedSignature)) {
      return null;
    }

    const header = JSON.parse(base64UrlDecode(headerEncoded).toString("utf8")) as { alg?: string; typ?: string };
    if (header.alg !== JWT_ALG || header.typ !== "JWT") {
      return null;
    }

    const payload = JSON.parse(base64UrlDecode(payloadEncoded).toString("utf8")) as JwtPayload;
    if (!payload.sub || !payload.role || !payload.exp) {
      return null;
    }

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp <= now) {
      return null;
    }

    const userId = Number(payload.sub);
    if (!Number.isInteger(userId) || userId <= 0) {
      return null;
    }

    return { userId, role: payload.role };
  } catch {
    return null;
  }
}
