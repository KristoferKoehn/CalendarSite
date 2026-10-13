"use client";

import { AgendaBody, useDayAgenda } from "@/components/day-agenda";
import { useNow } from "@/lib/use-now";
import { formatFullDate, seattleClock, seattleToday } from "@/lib/time";

/**
 * A display for a screen propped up in the office, not a console.
 *
 * Deliberately different from the day view: no week strip, no day picker, and the time
 * is the loudest thing on the page, because the question a kiosk answers at a glance is
 * "what time is it and what is happening now". It reads the same `AgendaBody` as the day
 * view, so the two cannot describe the same bookings differently.
 */
export function Kiosk() {
  const now = useNow();
  if (!now) return <p className="text-sm text-zinc-500">Loading…</p>;
  return <KioskView now={now} />;
}

function KioskView({ now }: { now: Date }) {
  const today = seattleToday(now);
  const { appointments, resources, error, loaded } = useDayAgenda(today);

  // Seattle wall-clock time, from the same zone helpers the agenda uses, so the kiosk
  // cannot disagree with the list beside it about what time it is.
  const clock = seattleClock(now);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          {/* tabular-nums keeps the digits from shifting as the minutes change. */}
          <div className="text-5xl font-semibold tabular-nums tracking-tight sm:text-6xl">
            {clock}
          </div>
          <div className="mt-1 text-lg text-zinc-600 dark:text-zinc-300">
            {formatFullDate(today)}
          </div>
        </div>
        <div className="text-sm text-zinc-500 dark:text-zinc-400">Today at a glance</div>
      </header>

      {!loaded ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : (
        <AgendaBody
          now={now}
          // The kiosk is always today, so every phase is live, the summary reads as
          // "happening now" rather than a bare count, and the day is never past.
          isToday
          isPast={false}
          appointments={appointments}
          resources={resources}
          error={error}
          // Cancelled bookings are always listed, with no toggle. A booking that was called
          // off is exactly what somebody standing in front of the screen needs to know: a
          // room that looks free is one they may have been told to use.
          showCancelled
          // No "Book a room" button: nobody books from a wall display.
          showEmptyAction={false}
          // And no finished bookings: a display should be about now and next, not about
          // the meeting that ended two hours ago.
          hideFinished
        />
      )}
    </div>
  );
}
