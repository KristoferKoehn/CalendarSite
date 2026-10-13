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
      {/* The nav must be allowed to wrap. As a single-line flex row it held eight links
          plus the user block, roughly 760px of content, which pushed the whole page
          into horizontal scroll on every phone width — the shell, not any one page.
          Wrapping keeps the header inside the viewport, and the user block drops to its
          own line rather than fighting the links for space. */}
      <header className="border-b border-zinc-200 px-4 py-3 sm:px-6">
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <Link href="/today" className="font-semibold">
            CalendarSite
          </Link>
          <Link href="/today" className="hover:underline">
            Today
          </Link>
          <Link href="/schedule" className="hover:underline">
            Schedule
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
      <main className="flex-1 px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
