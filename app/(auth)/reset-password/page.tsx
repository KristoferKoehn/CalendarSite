import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/reset-password-form";

/**
 * The form reads the token from the query string, which makes it client-rendered.
 * Next.js requires URL-reading client components to sit inside a Suspense boundary,
 * otherwise the whole route is refused at build time rather than prerendered.
 */
export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={<p className="text-sm text-zinc-500">Loading your reset link…</p>}
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
