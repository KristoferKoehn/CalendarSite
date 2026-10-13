"use client";

import { Redirect } from "@/components/redirect";

/**
 * Superseded by `/verify-email`, which asks for a new link when it has no token.
 *
 * Kept as a redirect rather than deleted so the link in any email already sent, and any
 * bookmark, still works. The two screens did the same job and only one of them is on the path
 * the guard sends people to, so having both would mean two places to keep saying the same
 * thing.
 */
export function ResendVerification() {
  return <Redirect to="/verify-email" />;
}
