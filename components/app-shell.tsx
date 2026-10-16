"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { userLabel } from "@/contract";
import { ThemeToggle } from "@/components/theme-toggle";
import { UnverifiedEmailNudge } from "@/components/unverified-email-nudge";
import { CALENDAR_LANDING } from "@/lib/landing";
import { PORTFOLIO } from "@/lib/paths";
import { useSession } from "@/lib/session/session-context";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useSession();
  const router = useRouter();

  function handleLogout() {
    logout();
    router.replace("/calendar/login");
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* The nav must be allowed to wrap. As a single-line flex row it held eight links
          plus the user block, roughly 760px of content, which pushed the whole page
          into horizontal scroll on every phone width — the shell, not any one page.
          Wrapping keeps the header inside the viewport, and the user block drops to its
          own line rather than fighting the links for space. */}
      <header className="border-b border-zinc-200 px-4 py-2.5 sm:px-6">
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          {/* The wordmark and the way out of the product, stacked and tight against each other.
              The wordmark still goes to the kiosk — it is what signing in lands on, so the name
              should not be the one route that skips it. The link beneath is the way back up to the
              portfolio, kept deliberately small: it is a door out of the product, not a peer of
              the navigation beside it. */}
          <div className="flex flex-col leading-tight">
            <Link href={CALENDAR_LANDING} className="font-semibold">
              CalendarSite
            </Link>
            <Link
              href={PORTFOLIO}
              className="text-[11px] text-zinc-500 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              ← back to portfolio
            </Link>
          </div>
          <Link href="/calendar/today" className="hover:underline">
            Calendar
          </Link>
          <Link href="/calendar/kiosk" className="hover:underline">
            Kiosk
          </Link>
          <Link href="/calendar/appointments" className="hover:underline">
            Appointments
          </Link>
          <Link href="/calendar/resources" className="hover:underline">
            Resources
          </Link>
          <Link href="/calendar/people" className="hover:underline">
            People
          </Link>
          {user?.role === "admin" && (
            <Link href="/calendar/users" className="hover:underline">
              Admin
            </Link>
          )}
          <div className="ml-auto flex items-center gap-3">
            <Link href="/calendar/settings" className="text-zinc-600 hover:underline dark:text-zinc-400">
              {user ? userLabel(user) : ""}
            </Link>
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className="rounded border px-2 py-1"
            >
              Logout
            </button>
          </div>
        </nav>
      </header>
      {/* Above the page rather than inside it, so an unconfirmed address is visible from
          wherever the reader happens to be. */}
      <UnverifiedEmailNudge />
      <main className="flex-1 px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
