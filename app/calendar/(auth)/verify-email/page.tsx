"use client";

import { Suspense } from "react";
import { VerifyEmail } from "@/components/verify-email";

/**
 * The link in a confirmation email lands here. Suspended because the view reads the token
 * from the query string, and Next.js refuses to prerender a route whose client component
 * reads URL state without a boundary.
 */
export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">Confirming your address…</p>}>
      <VerifyEmail />
    </Suspense>
  );
}
