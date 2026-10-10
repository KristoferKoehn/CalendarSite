"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session/session-context";

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
    } else if (requireAdmin && status === "authenticated" && user?.role !== "admin") {
      router.replace("/appointments");
    }
  }, [status, user, requireAdmin, router]);

  return <>{children}</>;
}
