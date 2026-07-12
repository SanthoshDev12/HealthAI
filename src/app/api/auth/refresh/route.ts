import { NextResponse } from "next/server";
import {
  verifyRefreshToken,
  signAccessToken,
  signRefreshToken,
  setAuthCookies,
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  type JwtPayload,
} from "@/lib/auth";

export async function POST(req: Request) {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const get = (name: string) =>
    cookieHeader
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${name}=`))
      ?.split("=")[1];

  const refreshToken = get(REFRESH_COOKIE);
  if (!refreshToken) {
    return NextResponse.json({ error: "Missing refresh token" }, { status: 401 });
  }

  let payload: JwtPayload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    return NextResponse.json({ error: "Invalid refresh token" }, { status: 401 });
  }

  // Rotate both tokens (refresh token rotation).
  const newAccess = signAccessToken({ sub: payload.sub, email: payload.email });
  const newRefresh = signRefreshToken({ sub: payload.sub, email: payload.email });

  const res = NextResponse.json({ ok: true });
  setAuthCookies(res, newAccess, newRefresh);
  // Ensure the old cookie name is not leaked; ACCESS_COOKIE referenced for clarity.
  void ACCESS_COOKIE;
  return res;
}
