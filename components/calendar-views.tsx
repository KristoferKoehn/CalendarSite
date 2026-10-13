"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DayAgenda } from "@/components/day-agenda";
import { MonthBody } from "@/components/schedule-month";
import { useNow } from "@/lib/use-now";
import { seattleToday } from "@/lib/time";

/**
 * Day and Month are the same tab, so switching between them is a navigation rather than
 * local state. That makes the month a real, shareable address and keeps the browser's
 * back button behaving the way a reader expects.
 */
const VIEWS = [
  { key: "day", label: "Day", href: "/today" },
  { key: "month", label: "Month", href: "/schedule" },
] as const;

function ViewTabs({ active }: { active: string }) {
  return (
    <nav
      className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 p-0.5 dark:border-zinc-800"
      aria-label="Calendar view"
    >
      {VIEWS.map((view) => {
        const isActive = view.key === active;
        return (
          <Link
            key={view.key}
            href={view.href}
            aria-current={isActive ? "page" : undefined}
            className={`rounded-md px-3 py-1 text-sm transition-colors ${
              isActive
                ? "bg-zinc-900 font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            }`}
          >
            {view.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** The day view: the week strip, the live summary, and today's bookings. */
export function DayView() {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ViewTabs active="day" />
        <Link
          href="/appointments"
          className="text-sm text-zinc-500 underline-offset-2 hover:underline dark:text-zinc-400"
        >
          All appointments →
        </Link>
      </div>
      <DayAgenda />
    </div>
  );
}

/**
 * The month view. Reads the query string, so it must sit inside a Suspense boundary —
 * Next.js refuses to prerender a route whose client component reads URL state without
 * one.
 */
export function MonthView() {
  const now = useNow();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  if (!now) return <p className="text-sm text-zinc-500">Loading…</p>;

  const today = seattleToday(now);
  // The month is addressed, so it survives a refresh and can be linked to: ?m=2026-11
  const anchor = searchParams.get("m") ?? today;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <ViewTabs active="month" />
      <MonthBody
        anchor={anchor}
        today={today}
        onAnchorChange={(next) => {
          const params = new URLSearchParams(searchParams.toString());
          // The current month needs no parameter: the default is today's month.
          if (next.slice(0, 7) === today.slice(0, 7)) params.delete("m");
          else params.set("m", next);
          const query = params.toString();
          router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
        }}
      />
    </div>
  );
}

export function MonthViewSuspended() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
      <MonthView />
    </Suspense>
  );
}
