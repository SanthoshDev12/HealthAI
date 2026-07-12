import { NextResponse } from "next/server";
import { PrismaUserRepository } from "@/infrastructure/auth/prismaUserRepository";
import {
  LoginSchema,
  verifyPassword,
  verifyTOTP,
  signAccessToken,
  signRefreshToken,
  setAuthCookies,
  type JwtPayload,
} from "@/lib/auth";
import { parseBody } from "@/utils/validation";
import { ValidationError } from "@/utils/errors";

const users = new PrismaUserRepository();

export async function POST(req: Request) {
  let input: unknown;
  try {
    input = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  let data;
  try {
    data = parseBody(LoginSchema, input);
  } catch (err) {
    if (err instanceof ValidationError) {
      const ve = err as ValidationError;
      return NextResponse.json({ error: ve.message, details: ve.details }, { status: 400 });
    }
    throw err;
  }

  const user = await users.findByEmail(data.email);
  if (!user || !user.passwordHash) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const ok = await verifyPassword(data.password, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // 2FA challenge
  if (user.twoFAEnabled) {
    if (!data.totp) {
      return NextResponse.json(
        { error: "2FA token required", twoFARequired: true },
        { status: 401 }
      );
    }
    const totpOk = await verifyTOTP(user.id, data.totp);
    if (!totpOk) {
      return NextResponse.json({ error: "Invalid 2FA token" }, { status: 401 });
    }
  }

  const payload: JwtPayload = { sub: user.id, email: user.email, twoFA: user.twoFAEnabled };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  const res = NextResponse.json({ id: user.id, email: user.email });
  setAuthCookies(res, accessToken, refreshToken);
  return res;
}
