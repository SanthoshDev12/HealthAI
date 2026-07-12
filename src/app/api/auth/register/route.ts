import { NextResponse } from "next/server";
import { PrismaUserRepository } from "@/infrastructure/auth/prismaUserRepository";
import {
  RegisterSchema,
  hashPassword,
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
    data = parseBody(RegisterSchema, input);
  } catch (err) {
    if (err instanceof ValidationError) {
      const ve = err as ValidationError;
      return NextResponse.json(
        { error: ve.message, details: ve.details },
        { status: 400 }
      );
    }
    throw err;
  }

  const existing = await users.findByEmail(data.email);
  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const passwordHash = await hashPassword(data.password);
  const user = await users.create({ email: data.email, passwordHash });

  // Create an empty profile so downstream features have a FK to rely on.
  await users.upsertProfile(user.id, {
    firstName: data.firstName ?? null,
    lastName: data.lastName ?? null,
  });

  const payload: JwtPayload = { sub: user.id, email: user.email };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  const res = NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
  setAuthCookies(res, accessToken, refreshToken);
  return res;
}
