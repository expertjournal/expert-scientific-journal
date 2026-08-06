import crypto from "crypto";

const ITERATIONS = 100000;
const KEY_LEN = 64;
const DIGEST = "sha512";

export interface PasswordHashResult {
  salt: string;
  hash: string;
}

/**
 * Derives a secure salt and PBKDF2 key hash for a password
 */
export function hashPassword(password: string): PasswordHashResult {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LEN, DIGEST).toString("hex");
  return { salt, hash };
}

/**
 * Verifies a password against a stored salt and hash using timing-safe comparison
 */
export function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  if (!password || !salt || !expectedHash) return false;
  try {
    const candidateHash = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LEN, DIGEST).toString("hex");
    const candidateBuffer = Buffer.from(candidateHash, "hex");
    const expectedBuffer = Buffer.from(expectedHash, "hex");

    if (candidateBuffer.length !== expectedBuffer.length) return false;
    return crypto.timingSafeEqual(candidateBuffer, expectedBuffer);
  } catch (e) {
    return false;
  }
}
