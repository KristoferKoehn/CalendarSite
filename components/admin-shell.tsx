"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { userLabel } from "@/contract";
import { ThemeToggle } from "@/components/theme-toggle";
import { adminPath } from "@/lib/paths";
import { PORTFOLIO } from "@/lib/paths";
import { useSession } from "@/lib/session/session-context";

/**
 * The frame around site administration.
 *
 * Deliberately not the calendar's shell. These pages edit the portfolio, the file shelf and the
 * downloads inventory — nothing here is about rooms or bookings — so the nav offers the three
 * administrative surfaces and a way out, rather than a calendar toolbar with one of them buried in it.
 *
 * Accounts stay in the calendar app, because an account there *is* a calendar account: it is what
 * decides who can book a room. So the link leaves this area rather than pretending otherwise.
 */
export function AdminShell({ children }: { children: ReactNode }) {
  const { user, logout } = useSession();
  const router = useRouter();

  function handleLogout() {
    logout();
    router.replace("/calendar/login");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-zinc-200 px-4 py-2.5 sm:px-6 dark:border-zinc-800">
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <div className="flex flex-col leading-tight">
            <Link href={adminPath("/projects")} className="font-semibold">
              Admin
            </Link>
            <Link
              href={PORTFOLIO}
              className="text-[11px] text-zinc-500 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              ← back to portfolio
            </Link>
          </div>

          <Link href={adminPath("/projects")} className="hover:underline">
            Projects
          </Link>
          <Link href={adminPath("/files")} className="hover:underline">
            Files
          </Link>
          <Link href={adminPath("/downloads")} className="hover:underline">
            Downloads
          </Link>
          {/* Out of this area, and labelled as what it is: accounts belong to the calendar app. */}
          <Link href="/calendar/users" className="hover:underline">
            Accounts ↗
          </Link>

          <div className="ml-auto flex items-center gap-3">
            <Link
              href="/calendar/settings"
              className="text-zinc-600 hover:underline dark:text-zinc-400"
            >
              {user ? userLabel(user) : ""}
            </Link>
            <ThemeToggle />
            <button
              type="button"
              onClick={handleLogout}
              className="rounded border border-zinc-300 px-3 py-1 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Logout
            </button>
          </div>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
