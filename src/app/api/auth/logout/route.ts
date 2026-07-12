import { NextResponse } from "next/server";
import { clearAuthCookies } from "@/lib/auth";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await getSession();
  if (session) {
    // Best‑effort revocation of any stored refresh tokens for this user.
    await prisma.refreshToken
      .deleteMany({ where: { userId: session.sub } })
      .catch(() => undefined);
  }

  const res = NextResponse.json({ ok: true });
  clearAuthCookies(res);
  return res;
}
