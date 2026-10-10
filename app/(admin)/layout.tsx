"use client";

import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { RouteGuard } from "@/components/route-guard";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <RouteGuard requireAdmin>
      <AppShell>{children}</AppShell>
    </RouteGuard>
  );
}
