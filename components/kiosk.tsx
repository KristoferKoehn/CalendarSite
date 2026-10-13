"use client";

import { AgendaBody, useDayAgenda } from "@/components/day-agenda";
import { useNow } from "@/lib/use-now";
import { useTimeFormat } from "@/lib/time-format";
import { formatFullDate, seattleClockParts, seattleToday } from "@/lib/time";

/**
 * A display for a screen propped up in the office, not a console.
 *
 * Deliberately different from the day view: no week strip, no day picker, and the time
 * is the loudest thing on the page, because the question a kiosk answers at a glance is
 * "what time is it and what is happening now". It reads the same `AgendaBody` as the day
 * view, so the two cannot describe the same bookings differently.
 */
export function Kiosk() {
  // The day's bookings only need the coarse clock; the seconds indicator needs its own, and it
  // is requested here so the interval runs only while a kiosk is on screen.
  const now = useNow();
  if (!now) return <p className="text-sm text-zinc-500">Loading…</p>;
  return <KioskView now={now} />;
}

function KioskView({ now }: { now: Date }) {
  const today = seattleToday(now);
  // The pressing interval, because this screen is read to decide where to go next.
  const timeFormat = useTimeFormat();
  // Null before hydration, where 24-hour is the shape the markup already has.
  const resolved = timeFormat ?? "24h";
  const { appointments, resources, error, loaded } = useDayAgenda(today, {
    refreshMs: 15_000,
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <KioskClock now={now} />
        <div className="mt-1 text-lg text-zinc-600 dark:text-zinc-300">
          {formatFullDate(today)}
        </div>
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
          timeFormat={resolved}
        />
      )}
    </div>
  );
}

/**
 * The clock, with a seconds indicator that cannot drift.
 *
 * The blink is pure CSS driven by the wall clock rather than a JavaScript toggle: `steps(1)`
 * flips it at each whole second, and a stylesheet animation is not subject to the scheduling
 * jitter a `setInterval` accumulates over a day on a screen nobody restarts. That also means no
 * per-second re-render — the digits only change once a minute, so the thirty-second clock
 * already subscribed above is fast enough for them. Nothing here ticks.
 *
 * The colon blinks, which is the convention a digital clock established, and it is only
 * rendered for 24-hour time. A 12-hour clock has a space there, and a blinking space is
 * nothing at all, so the dot beside the clock carries the indicator in both formats instead.
 */
function KioskClock({ now }: { now: Date }) {
  const format = useTimeFormat();
  // Null before hydration, where 24-hour is the shape the markup already has.
  const clock = seattleClockParts(now, format ?? "24h");

  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      {/* tabular-nums keeps the digits from shifting as the minutes change. */}
      <div className="text-5xl font-semibold tracking-tight sm:text-6xl">
        <span className="tabular-nums">{clock.hours}</span>
        <span
          className="kiosk-blink tabular-nums"
          aria-hidden="true"
          data-testid="clock-separator"
        >
          {clock.hour12 ? " " : ":"}
        </span>
        <span className="tabular-nums">{clock.minutes}</span>
        {clock.suffix && (
          <span className="ml-2 text-xl font-medium text-zinc-500 sm:text-2xl dark:text-zinc-400">
            {clock.suffix}
          </span>
        )}
      </div>
      {/* One pulse per second. Purely decorative: the time is already readable to the minute
          without it, and a screen reader announcing a beat every second would be intolerable. */}
      <span
        aria-hidden="true"
        className="kiosk-pulse h-2.5 w-2.5 rounded-full bg-emerald-500"
        data-testid="clock-pulse"
      />
    </div>
  );
}
