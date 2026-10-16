"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CALENDAR_LANDING } from "@/lib/landing";
import { useSession } from "@/lib/session/session-context";

/**
 * The calendar's own front door.
 *
 * Signed-in users go to the kiosk, everyone else to sign-in. The kiosk rather than the day view
 * because the question this product answers most often is what is happening now and what is next.
 *
 * The page it replaces used to be the site root, sending people to `/today`. Now that the root is
 * the portfolio, arriving here means asking for the calendar specifically — so this is a redirect
 * and nothing more, and the dismissal it shows is a frame rather than a page.
 */
export default function CalendarEntryPage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") router.replace(CALENDAR_LANDING);
    else if (status === "anonymous") router.replace("/calendar/login");
  }, [status, router]);

  return <div className="p-8 text-sm text-zinc-500 dark:text-zinc-400">Loading…</div>;
}
