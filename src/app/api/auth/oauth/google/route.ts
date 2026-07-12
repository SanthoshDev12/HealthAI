import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase";

/**
 * Initiates the Google OAuth flow via Supabase, returning a 302 redirect.
 * The browser completes login on Supabase, then lands on our callback.
 */
export async function GET(req: Request) {
  const { origin } = new URL(req.url);
  const res = NextResponse.redirect(`${origin}/api/auth/oauth/callback`);
  const supabase = createSupabaseRouteClient(req, res);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/api/auth/oauth/callback` },
  });

  if (error || !data.url) {
    return NextResponse.json({ error: error?.message ?? "OAuth failed" }, { status: 400 });
  }

  return NextResponse.redirect(data.url);
}
