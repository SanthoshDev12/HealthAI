import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge middleware:
 *  - Adds security headers (CSP, HSTS, X‑Frame‑Options, etc.) to every response.
 *  - Rejects requests to protected API routes when the access cookie is missing.
 * Full JWT verification happens inside the route handlers (Node runtime).
 */

const PUBLIC_API = new Set([
  "/api/auth/register",
  "/api/auth/login",
  "/api/auth/refresh",
  "/api/auth/oauth",
]);

function isPublicApi(pathname: string): boolean {
  return [...PUBLIC_API].some((p) => pathname.startsWith(p));
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // API protection: require the access cookie on non‑public auth routes.
  if (pathname.startsWith("/api/") && !isPublicApi(pathname)) {
    const hasSession = req.cookies.has("healthai_at");
    if (!hasSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const res = NextResponse.next();

  // Security headers
  res.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://*.supabase.co;"
  );
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );
  if (process.env.NODE_ENV === "production") {
    res.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload"
    );
  }

  return res;
}

export const config = {
  matcher: ["/api/:path*", "/((?!_next/static|_next/image|favicon.ico).*)"],
};
