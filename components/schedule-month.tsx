"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MonthGrid, type CalendarEntry } from "@/components/month-grid";
import { ErrorBanner } from "@/components/error-banner";
import { getApiClient, type ApiError } from "@/lib/api";
import { useNow } from "@/lib/use-now";
import { buildMonthGrid, gridRange, groupByDate, normaliseAnchor } from "@/lib/calendar";
import { addMonths, formatMonthYear, seattleToday } from "@/lib/time";
import type { Appointment } from "@/contract";

const api = getApiClient();

/**
 * A month at a glance: which days have bookings, and what they are.
 *
 * There is no "open this day" affordance. Clicking a day used to swap an inline agenda
 * to that date, but the day view now only ever shows today, so a day that is not today
 * has nowhere to go — the month is for seeing the shape of the month.
 */
export function ScheduleMonth() {
  const now = useNow();
  if (!now) return <p className="text-sm text-zinc-500">Loading…</p>;
  return <Month now={now} />;
}

/** The month's heading and paging controls, split out so a parent can lay them out. */
export function MonthHeader({
  anchor,
  onAnchorChange,
  today,
}: {
  anchor: string;
  onAnchorChange: (next: string) => void;
  today: string;
}) {
  const isCurrentMonth = anchor.slice(0, 7) === today.slice(0, 7);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-xl font-semibold">{formatMonthYear(anchor)}</h1>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onAnchorChange(addMonths(anchor, -1))}
          aria-label="Previous month"
          className="rounded border border-zinc-200 px-2 py-1 text-sm leading-none text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={() => onAnchorChange(today)}
          disabled={isCurrentMonth}
          className="rounded border border-zinc-200 px-2.5 py-1 text-xs text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          This month
        </button>
        <button
          type="button"
          onClick={() => onAnchorChange(addMonths(anchor, 1))}
          aria-label="Next month"
          className="rounded border border-zinc-200 px-2 py-1 text-sm leading-none text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          ›
        </button>
      </div>
    </div>
  );
}

/**
 * The grid for one month. Fetches the whole visible range in a single request, since a
 * month that loads cell by cell would be a lot of requests for very little.
 */
export function MonthBody({
  anchor,
  onAnchorChange,
  today,
  header = true,
}: {
  anchor: string;
  onAnchorChange: (next: string) => void;
  today: string;
  /** The parent may render its own header instead. */
  header?: boolean;
}) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [error, setError] = useState<ApiError | null>(null);

  // Normalised here rather than trusted from the URL: a bare month is what a shared link
  // looks like, and passing one straight through would produce NaN dates and crash the
  // render rather than simply showing the wrong month.
  const days = useMemo(
    () => buildMonthGrid(normaliseAnchor(anchor, today), today),
    [anchor, today],
  );
  const { from, toExclusive } = useMemo(() => gridRange(days), [days]);

  useEffect(() => {
    let cancelled = false;
    // The API's `to` is exclusive, so the range runs one day past the last visible cell.
    api.listAppointments({ from, to: toExclusive }).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setAppointments(result.value);
        setError(null);
      } else {
        setError(result.error);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [from, toExclusive]);

  const entriesByDate = useMemo(() => {
    const entries: CalendarEntry[] = appointments.map((a) => ({
      id: a.id,
      startAtLocal: a.startAtLocal,
      title: a.title,
      cancelled: a.status === "cancelled",
    }));
    return groupByDate(entries);
  }, [appointments]);

  return (
    <div className="space-y-4">
      {header && (
        <MonthHeader anchor={anchor} onAnchorChange={onAnchorChange} today={today} />
      )}
      <ErrorBanner error={error} />
      <MonthGrid days={days} byDate={entriesByDate} selected={null} onSelect={() => {}} />
    </div>
  );
}

function Month({ now }: { now: Date }) {
  const today = seattleToday(now);
  const [anchor, setAnchor] = useState(today);
  const setAnchorStable = useCallback((next: string) => setAnchor(next), []);

  return (
    <div className="mx-auto max-w-3xl">
      <MonthBody anchor={anchor} onAnchorChange={setAnchorStable} today={today} />
    </div>
  );
}
