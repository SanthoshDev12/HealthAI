import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase";

/**
 * Initiates the Apple OAuth flow via Supabase, returning a 302 redirect.
 */
export async function GET(req: Request) {
  const { origin } = new URL(req.url);
  const res = NextResponse.redirect(`${origin}/api/auth/oauth/callback`);
  const supabase = createSupabaseRouteClient(req, res);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "apple",
    options: { redirectTo: `${origin}/api/auth/oauth/callback` },
  });

  if (error || !data.url) {
    return NextResponse.json({ error: error?.message ?? "OAuth failed" }, { status: 400 });
  }

  return NextResponse.redirect(data.url);
}
