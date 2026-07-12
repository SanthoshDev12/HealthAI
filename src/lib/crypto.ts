// src/lib/crypto.ts
// AES‑256‑CBC encryption for sensitive data at rest (e.g., the 2FA TOTP secret).
// Key is supplied via TWOFA_ENCRYPTION_KEY as a 32‑byte base64 string.

import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";
const IV_LENGTH = 16;

const ENCRYPTION_KEY = Buffer.from(
  process.env.TWOFA_ENCRYPTION_KEY as string,
  "base64"
);

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 32) {
  throw new Error(
    "TWOFA_ENCRYPTION_KEY must be a 32‑byte (44‑char base64) string in environment variables"
  );
}

/** Encrypts plaintext, returning `ivHex:cipherHex`. */
export function encrypt(plainText: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}

/** Decrypts a payload produced by {@link encrypt}. */
export function decrypt(cipherText: string): string {
  const [ivHex, encryptedHex] = cipherText.split(":");
  if (!ivHex || !encryptedHex) throw new Error("Invalid encrypted payload format");
  const iv = Buffer.from(ivHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}
