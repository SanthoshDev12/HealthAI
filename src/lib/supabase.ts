import { createServerClient, createBrowserClient, type CookieMethodsServer, type CookieMethodsBrowser } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { env } from "@/config/env";

/**
 * Supabase clients configured for the App Router via @supabase/ssr.
 * - `createSupabaseRouteClient(req, res)` — for Route Handlers (OAuth flow):
 *   reads cookies from the incoming request and writes them onto the response.
 * - `supabaseBrowser` — safe to use in the browser (anon key only).
 */

export function createSupabaseRouteClient(req: Request, res: NextResponse) {
  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          res.cookies.set(name, value, options)
        );
      },
    } as CookieMethodsServer,
  });
}

export const supabaseBrowser = createBrowserClient(env.supabaseUrl, env.supabaseAnonKey, {
  cookies: {
    getAll() {
      if (typeof document === "undefined") return [];
      return Array.from(document.cookie.split(";")).map((c) => {
        const [name, ...rest] = c.trim().split("=");
        return { name, value: rest.join("=") };
      });
    },
    setAll(cookiesToSet) {
      if (typeof document === "undefined") return;
      cookiesToSet.forEach(({ name, value, options }) => {
        document.cookie = `${name}=${value}; path=${options?.path ?? "/"}; ${
          options?.maxAge ? `max-age=${options.maxAge};` : ""
        }`;
      });
    },
  } as CookieMethodsBrowser,
});
