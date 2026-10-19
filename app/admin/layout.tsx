"use client";

import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin-shell";
import { RouteGuard } from "@/components/route-guard";

/**
 * Site administration, guarded as a whole.
 *
 * The guard is here rather than in each page so a new administrative page cannot forget it: a layout
 * wraps everything below it, and the alternative is a rule that has to be remembered at every call
 * site.
 *
 * The server enforces this too — every write behind these pages is refused for a non-admin — so the
 * guard is what stops an admin page rendering for someone who cannot use it, not what protects the
 * data.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <RouteGuard requireAdmin>
      <AdminShell>{children}</AdminShell>
    </RouteGuard>
  );
}
