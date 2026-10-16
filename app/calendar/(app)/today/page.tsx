"use client";

import { DayViewSuspended } from "@/components/calendar-views";

export default function TodayPage() {
  // Suspended because the day view reads ?d= from the query string.
  return <DayViewSuspended />;
}
