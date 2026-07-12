import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { env } from "@/config/env";
import { PrismaUserRepository } from "@/infrastructure/auth/prismaUserRepository";
import {
  signAccessToken,
  signRefreshToken,
  setAuthCookies,
  type JwtPayload,
} from "@/lib/auth";

const users = new PrismaUserRepository();

/**
 * OAuth callback (Google/Apple). Exchanges the Supabase code for a session,
 * maps the Supabase user to our own User table, then mints our JWT cookies
 * and redirects to the dashboard.
 */
export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const res = NextResponse.redirect(`${origin}${next}`);
  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          res.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user: sbUser },
    error,
  } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !sbUser?.email) {
    return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
  }

  // Map Supabase user → our User (idempotent).
  let user =
    (sbUser.app_metadata?.provider === "google" && sbUser.id
      ? await users.findByGoogleId(sbUser.id)
      : null) ??
    (await users.findByEmail(sbUser.email));

  if (!user) {
    user = await users.create({
      email: sbUser.email,
      googleId: sbUser.app_metadata?.provider === "google" ? sbUser.id : null,
      appleId: sbUser.app_metadata?.provider === "apple" ? sbUser.id : null,
    });
  }

  await users.upsertProfile(user.id, {
    firstName: (sbUser.user_metadata?.full_name as string)?.split(" ")[0] ?? null,
    avatarUrl: (sbUser.user_metadata?.avatar_url as string) ?? null,
  });

  const payload: JwtPayload = { sub: user.id, email: user.email };
  setAuthCookies(res, signAccessToken(payload), signRefreshToken(payload));
  return res;
}
