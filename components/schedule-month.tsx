"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MonthGrid, type CalendarEntry } from "@/components/month-grid";
import { ErrorBanner } from "@/components/error-banner";
import { getApiClient, type ApiError } from "@/lib/api";
import { useNow } from "@/lib/use-now";
import { buildMonthGrid, gridRange, groupByDate } from "@/lib/calendar";
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
  onLoadingChange,
  header = true,
}: {
  anchor: string;
  onAnchorChange: (next: string) => void;
  today: string;
  onLoadingChange?: (loading: boolean) => void;
  /** The parent may render its own header instead. */
  header?: boolean;
}) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [error, setError] = useState<ApiError | null>(null);
  // Which range the current data belongs to, rather than a loading flag: paging changes
  // the range, so "loaded" falls out of the comparison and nothing is set synchronously
  // inside the effect.
  const [loadedRange, setLoadedRange] = useState<string | null>(null);

  const days = useMemo(() => buildMonthGrid(anchor, today), [anchor, today]);
  const { from, toExclusive } = useMemo(() => gridRange(days), [days]);
  const rangeKey = `${from}..${toExclusive}`;
  const loading = loadedRange !== rangeKey;

  useEffect(() => {
    onLoadingChange?.(loading);
  }, [loading, onLoadingChange]);

  useEffect(() => {
    let cancelled = false;
    // The API's `to` is exclusive, so the range runs one day past the last visible cell.
    api.listAppointments({ from, to: toExclusive }).then((result) => {
      if (cancelled) return;
      setLoadedRange(rangeKey);
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
  }, [from, toExclusive, rangeKey]);

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
