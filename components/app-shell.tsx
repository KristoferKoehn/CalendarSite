"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { userLabel } from "@/contract";
import { useSession } from "@/lib/session/session-context";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useSession();
  const router = useRouter();

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-zinc-200 px-6 py-3">
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/today" className="font-semibold">
            CalendarSite
          </Link>
          <Link href="/today" className="hover:underline">
            Today
          </Link>
          <Link href="/appointments" className="hover:underline">
            Appointments
          </Link>
          <Link href="/resources" className="hover:underline">
            Resources
          </Link>
          <Link href="/people" className="hover:underline">
            People
          </Link>
          {user?.role === "admin" && (
            <Link href="/users" className="hover:underline">
              Admin
            </Link>
          )}
          <div className="ml-auto flex items-center gap-3">
            <Link href="/settings" className="text-zinc-600 hover:underline">
              {user ? userLabel(user) : ""}
            </Link>
            <button
              onClick={handleLogout}
              className="rounded border px-2 py-1"
            >
              Logout
            </button>
          </div>
        </nav>
      </header>
      <main className="flex-1 px-6 py-6">{children}</main>
    </div>
  );
}
