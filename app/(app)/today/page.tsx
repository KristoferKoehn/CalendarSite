"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { DayAgenda } from "@/components/day-agenda";

/**
 * `?date=YYYY-MM-DD` opens the agenda on a specific day, which is how links from the
 * month view and elsewhere can point at a day. Reading search params makes this a
 * client-rendered part of the route, so it sits inside a Suspense boundary — Next.js
 * refuses to prerender a route whose client component reads URL state without one.
 */
function TodayAgenda() {
  const searchParams = useSearchParams();
  const date = searchParams.get("date") ?? undefined;
  return <DayAgenda initialDate={date} />;
}

export default function TodayPage() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
      <TodayAgenda />
    </Suspense>
  );
}
