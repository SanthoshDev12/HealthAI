import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { PrismaUserRepository } from "@/infrastructure/auth/prismaUserRepository";

const users = new PrismaUserRepository();

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await users.findById(session.sub);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await users.upsertProfile(user.id, {});

  return NextResponse.json({
    id: user.id,
    email: user.email,
    twoFAEnabled: user.twoFAEnabled,
    profile: {
      firstName: profile.firstName,
      lastName: profile.lastName,
      avatarUrl: profile.avatarUrl,
    },
  });
}
