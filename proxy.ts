import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

// Optimistic check only: it looks for a session cookie and redirects, without touching the database.
// The real check is requireUser() in every protected page and action.
// The manifest, the service worker and the offline page are fetched by the browser without cookies, so they are public,
// and /b/<token> is a biodata the ghotok chose to share with a family (the token is the key; see lib/services/share.ts).
const PUBLIC = ["/login", "/register", "/api/health", "/manifest.webmanifest", "/sw.js", "/offline"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC.includes(pathname) || pathname.startsWith("/b/")) return NextResponse.next();
  // A cookie may be stale, so this never redirects a cookie-holder away from /login:
  // that would loop with requireUser(). The login page does that check against the database.
  if (!getSessionCookie(request)) return NextResponse.redirect(new URL("/login", request.url));
  return NextResponse.next();
}

export const config = {
  // everything except Next internals and static files
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|ico|webp)$).*)"],
};
