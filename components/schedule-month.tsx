"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DayAgenda } from "@/components/day-agenda";
import { MonthGrid, type CalendarEntry } from "@/components/month-grid";
import { ErrorBanner } from "@/components/error-banner";
import { getApiClient, type ApiError } from "@/lib/api";
import { useNow } from "@/lib/use-now";
import { buildMonthGrid, gridRange, groupByDate } from "@/lib/calendar";
import { addMonths, formatMonthYear, seattleToday } from "@/lib/time";
import type { Appointment } from "@/contract";

const api = getApiClient();

/**
 * Month at a glance, with the selected day's agenda underneath.
 *
 * The agenda is rendered inline rather than on a separate page so that opening a day
 * does not cost the reader their place in the month. It is the same component the
 * Today tab uses, which is what keeps the two views describing a day identically.
 */
export function ScheduleMonth() {
  const now = useNow();
  if (!now) {
    return <p className="text-sm text-zinc-500">Loading…</p>;
  }
  return <Month now={now} />;
}

function Month({ now }: { now: Date }) {
  const today = seattleToday(now);
  const [anchor, setAnchor] = useState(today);
  const [selected, setSelected] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [error, setError] = useState<ApiError | null>(null);
  // Which range the current data belongs to, rather than a loading flag. Paging to a
  // new month changes the range, so "loaded" falls out of the comparison and no
  // state has to be set synchronously inside the effect.
  const [loadedRange, setLoadedRange] = useState<string | null>(null);

  const days = useMemo(() => buildMonthGrid(anchor, today), [anchor, today]);
  const { from, toExclusive } = useMemo(() => gridRange(days), [days]);
  const rangeKey = `${from}..${toExclusive}`;
  const loading = loadedRange !== rangeKey;

  useEffect(() => {
    let cancelled = false;
    // The whole visible grid in one request: the API's `to` is exclusive, so the
    // range runs one day past the last visible cell.
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

  const goToMonth = useCallback((next: string) => {
    setAnchor(next);
    setSelected(null);
  }, []);

  const isCurrentMonth = anchor.slice(0, 7) === today.slice(0, 7);

  return (
    // Sized to match the agenda's own max width, so the grid and the day it opens
    // line up instead of the grid running wider than the list beneath it.
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h1 className="text-xl font-semibold">{formatMonthYear(anchor)}</h1>
          {loading && <span className="text-xs text-zinc-400">Loading…</span>}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => goToMonth(addMonths(anchor, -1))}
            aria-label="Previous month"
            className="rounded border border-zinc-200 px-2 py-1 text-sm leading-none text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => goToMonth(today)}
            disabled={isCurrentMonth}
            className="rounded border border-zinc-200 px-2.5 py-1 text-xs text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            This month
          </button>
          <button
            type="button"
            onClick={() => goToMonth(addMonths(anchor, 1))}
            aria-label="Next month"
            className="rounded border border-zinc-200 px-2 py-1 text-sm leading-none text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            ›
          </button>
        </div>
      </header>

      <ErrorBanner error={error} />

      <MonthGrid
        days={days}
        byDate={entriesByDate}
        selected={selected}
        onSelect={setSelected}
      />

      {selected === null ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Pick a day to see what is booked.{" "}
          <Link href="/today" className="underline underline-offset-2">
            Go to today
          </Link>
        </p>
      ) : (
        <div className="space-y-3">
          {/* The same agenda component the Today tab renders, scoped to the chosen
              day, so a day is described the same way in both places.

              Keyed on the date: the agenda reads `initialDate` once, when it mounts,
              so without a key React would keep the instance and pick a different day
              in the grid would leave the agenda showing the previous one. The key
              makes the selection a remount, which is also the honest model — it is a
              different day being described. */}
          <DayAgenda key={selected} initialDate={selected} />
        </div>
      )}
    </div>
  );
}
