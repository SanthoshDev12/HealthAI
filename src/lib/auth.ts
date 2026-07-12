// src/lib/auth.ts
// Authentication core for Next.js (App Router). Framework‑agnostic token logic
// plus cookie/session helpers built on `next/headers` and `NextResponse`.

import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import prisma from "./prisma";
import { encrypt, decrypt } from "./crypto";
import { generateSecret, keyuri, check } from "./totp";

const scryptAsync = promisify(scrypt);

// ---------------------------------------------------------------------------
// Configuration (fail fast if misconfigured)
// ---------------------------------------------------------------------------
const ACCESS_SECRET = process.env.JWT_SECRET as string;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET as string;
const ACCESS_TTL = Number(process.env.JWT_ACCESS_TTL_SECONDS ?? "900"); // 15 min
const REFRESH_TTL = Number(process.env.JWT_REFRESH_TTL_SECONDS ?? "1209600"); // 14 days

if (!ACCESS_SECRET || !REFRESH_SECRET) {
  throw new Error("JWT_SECRET and JWT_REFRESH_SECRET must be set");
}

// ---------------------------------------------------------------------------
// Zod validation schemas
// ---------------------------------------------------------------------------
export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  firstName: z.string().max(80).optional(),
  lastName: z.string().max(80).optional(),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  totp: z.string().length(6).optional(), // required when 2FA is enabled
});

export const TOTPVerifySchema = z.object({
  token: z.string().length(6),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;

// ---------------------------------------------------------------------------
// JWT
// ---------------------------------------------------------------------------
export interface JwtPayload {
  sub: string;
  email: string;
  twoFA?: boolean;
}

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, { algorithm: "HS256", expiresIn: ACCESS_TTL });
}

export function signRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, REFRESH_SECRET, { algorithm: "HS256", expiresIn: REFRESH_TTL });
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, ACCESS_SECRET, { algorithms: ["HS256"] }) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, REFRESH_SECRET, { algorithms: ["HS256"] }) as JwtPayload;
}

// ---------------------------------------------------------------------------
// Password hashing (scrypt — constant‑time, no native deps)
// ---------------------------------------------------------------------------
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, key] = stored.split(":");
  if (!salt || !key) return false;
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  const keyBuf = Buffer.from(key, "hex");
  return derived.length === keyBuf.length && timingSafeEqual(derived, keyBuf);
}

// ---------------------------------------------------------------------------
// 2FA (TOTP / RFC 6238) — secret encrypted at rest
// ---------------------------------------------------------------------------
export async function setupTOTP(
  userId: string
): Promise<{ secret: string; otpauthUrl: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, twoFASecret: true },
  });
  if (!user) throw new Error("User not found");

  const secret = generateSecret();
  const encrypted = encrypt(secret);
  const otpauthUrl = keyuri(user.email, "HealthAI", secret);

  await prisma.user.update({
    where: { id: userId },
    data: { twoFASecret: encrypted, twoFAEnabled: false },
  });

  return { secret, otpauthUrl };
}

export async function enableTOTP(userId: string, token: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFASecret: true },
  });
  if (!user?.twoFASecret) throw new Error("2FA not initialised");
  const secret = decrypt(user.twoFASecret);
  const valid = check(token, secret);
  if (valid) {
    await prisma.user.update({ where: { id: userId }, data: { twoFAEnabled: true } });
  }
  return valid;
}

export async function verifyTOTP(userId: string, token: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFASecret: true },
  });
  if (!user?.twoFASecret) return false;
  return check(token, decrypt(user.twoFASecret));
}

// ---------------------------------------------------------------------------
// Cookies / session
// ---------------------------------------------------------------------------
export const ACCESS_COOKIE = "healthai_at";
export const REFRESH_COOKIE = "healthai_rt";

export function setAuthCookies(
  res: NextResponse,
  accessToken: string,
  refreshToken: string
) {
  res.cookies.set(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: ACCESS_TTL * 1000,
  });
  res.cookies.set(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: REFRESH_TTL * 1000,
  });
}

export function clearAuthCookies(res: NextResponse) {
  res.cookies.set(ACCESS_COOKIE, "", { path: "/", maxAge: 0 });
  res.cookies.set(REFRESH_COOKIE, "", { path: "/", maxAge: 0 });
}

/** Read & verify the access token from the request cookies (server side). */
export async function getSession(): Promise<JwtPayload | null> {
  const store = await cookies();
  const token = store.get(ACCESS_COOKIE)?.value;
  if (!token) return null;
  try {
    return verifyAccessToken(token);
  } catch {
    return null;
  }
}
