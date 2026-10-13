"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session/session-context";
import { LANDING } from "@/lib/landing";
import { isVerified } from "@/lib/profile-complete";

export function RouteGuard({
  requireAdmin = false,
  children,
}: {
  requireAdmin?: boolean;
  children: ReactNode;
}) {
  const { status, user } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "anonymous") {
      router.replace("/login");
      return;
    }
    if (status !== "authenticated" || !user) return;

    // Not confirmed: the site is not open yet, and the only thing that opens it is the link
    // in the email. Checked before the admin check so an unconfirmed account cannot get in by
    // being an admin.
    if (!isVerified(user)) {
      router.replace("/verify-email");
      return;
    }

    if (requireAdmin && user.role !== "admin") {
      router.replace(LANDING);
    }
  }, [status, user, requireAdmin, router]);

  return <>{children}</>;
}
