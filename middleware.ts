import { NextResponse, type NextRequest } from "next/server";

/**
 * Redirects from the calendar's old flat URLs to its prefixed ones.
 *
 * This is middleware rather than fifteen redirect pages, for one reason that matters: pages had to
 * read `searchParams` to forward the query, and Next.js refuses to prerender a page that does that
 * without a Suspense boundary. Middleware sees the whole URL, so it can forward the query without
 * making the routes dynamic.
 *
 * Forwarding the query is the point. The backend emails two of these paths, and both tokens are
 * query parameters:
 *
 *   /verify-email?token=...     confirmation
 *   /reset-password?token=...   password reset
 *
 * A redirect that drops the query sends people to a page that cannot tell what they clicked. The
 * symptom is a confirmation screen asking the reader to confirm an address they just confirmed —
 * which is exactly the bug this replaces. A `next` parameter and a bookmarked set of filters are
 * lost the same way.
 *
 * 308 rather than 307: these are permanent, and the destination is stable. The alternative would
 * re-ask the browser on every request forever.
 */
const OLD_URLS: Record<string, string> = {
  today: "/calendar/today",
  schedule: "/calendar/schedule",
  kiosk: "/calendar/kiosk",
  appointments: "/calendar/appointments",
  resources: "/calendar/resources",
  people: "/calendar/people",
  settings: "/calendar/settings",
  users: "/calendar/users",
  login: "/calendar/login",
  register: "/calendar/register",
  welcome: "/calendar/welcome",
  "verify-email": "/calendar/verify-email",
  "reset-password": "/calendar/reset-password",
  "forgot-password": "/calendar/forgot-password",
  "resend-verification": "/calendar/resend-verification",
};

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  // Exact match only: the calendar's own routes already live under /calendar, and a prefix match
  // would catch them and redirect them to themselves.
  const target = OLD_URLS[pathname.replace(/^\//, "")];
  if (!target) return NextResponse.next();

  return NextResponse.redirect(new URL(target + search, request.url), 308);
}

export const config = {
  /**
   * Only the paths in OLD_URLS, so the middleware does not run on the portfolio, the calendar, the
   * static export of the game, or the API. Listing them explicitly is more work than a catch-all
   * and much easier to reason about.
   */
  matcher: [
    "/today", "/schedule", "/kiosk", "/appointments", "/resources", "/people", "/settings",
    "/users", "/login", "/register", "/welcome", "/verify-email", "/reset-password",
    "/forgot-password", "/resend-verification",
  ],
};
