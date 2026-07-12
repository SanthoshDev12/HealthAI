// src/lib/totp.ts
// Self‑contained RFC 6238 TOTP implementation (no external plugin required).
// Uses Node's built‑in crypto (HMAC‑SHA1) and a standard Base32 codec.

import { createHmac, randomBytes, timingSafeEqual } from "crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const STEP_SECONDS = 30;
const DIGITS = 6;

function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

function base32Decode(input: string): Buffer {
  const cleaned = input.replace(/=+$/, "").toUpperCase().replace(/\s/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of cleaned) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) throw new Error("Invalid Base32 character");
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/** Generate a new random Base32 secret (160 bits, 32 chars). */
export function generateSecret(): string {
  return base32Encode(randomBytes(20));
}

/** Build an otpauth:// URI for QR‑code provisioning. */
export function keyuri(label: string, issuer: string, secret: string): string {
  const u = encodeURIComponent;
  return `otpauth://totp/${u(issuer)}:${u(label)}?secret=${secret}&issuer=${u(
    issuer
  )}&algorithm=SHA1&digits=${DIGITS}&period=${STEP_SECONDS}`;
}

function hotp(secret: string, counter: number): string {
  const key = base32Decode(secret);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac("sha1", key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return (binary % 10 ** DIGITS).toString().padStart(DIGITS, "0");
}

/** Generate the current TOTP for a secret. */
export function generate(secret: string): string {
  return hotp(secret, Math.floor(Date.now() / 1000 / STEP_SECONDS));
}

/** Verify a TOTP, allowing ±1 step drift (±30s). Constant‑time compare. */
export function check(token: string, secret: string, window = 1): boolean {
  const counter = Math.floor(Date.now() / 1000 / STEP_SECONDS);
  const provided = Buffer.from(token.padStart(DIGITS, "0"));
  for (let i = -window; i <= window; i++) {
    const candidate = Buffer.from(hotp(secret, counter + i));
    if (candidate.length === provided.length && timingSafeEqual(candidate, provided)) {
      return true;
    }
  }
  return false;
}
