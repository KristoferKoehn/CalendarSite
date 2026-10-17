"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Appointment, Resource } from "@/contract";
import { appointmentOwnerLabel } from "@/contract";
import { getApiClient, type ApiError } from "@/lib/api";
import { ErrorBanner } from "@/components/error-banner";
import { WeekStrip } from "@/components/week-strip";
import { useNow } from "@/lib/use-now";
import { useTimeFormat } from "@/lib/time-format";
import type { TimeFormat } from "@/lib/time-format";
import { weekDays, canBookEmptyDay, hideFinished } from "@/lib/calendar";
import { CARD_ACCENT, CARD_SURFACE_CANCELLED, ROW_PADDING } from "@/lib/card";
import { AGENDA_ROW_MIN_HEIGHT, descriptionClasses } from "@/lib/description-clamp";
import { useTextOverflow } from "@/lib/use-text-overflow";
import {
  addDays,
  describeSlot,
  formatDuration,
  formatLongDate,
  formatRelative,
  formatClock,
  seattleDateOf,
  seattleToday,
  type EventPhase,
} from "@/lib/time";

const api = getApiClient();

/**
 * Visual treatment per phase, in one place so the agenda reads as a single system
 * rather than a set of ad-hoc styles.
 *
 * `accent` is the left rule: solid for something happening now, lighter for something
 * about to start, a hairline for everything else. The background tint is deliberately
 * faint — the accent bar and the badge carry the meaning, so the list stays calm at a
 * glance.
 */
const PHASE_STYLES: Record<
  EventPhase,
  { accent: string; card: string; time: string; title: string }
> = {
  active: {
    accent: "bg-emerald-500",
    card: "border-emerald-300 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/30",
    time: "text-emerald-700 dark:text-emerald-300",
    title: "text-zinc-900 dark:text-zinc-50",
  },
  approaching: {
    accent: "bg-amber-400",
    card: "border-amber-300 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20",
    time: "text-amber-700 dark:text-amber-300",
    title: "text-zinc-900 dark:text-zinc-50",
  },
  upcoming: {
    accent: "bg-zinc-200 dark:bg-zinc-700",
    card: "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900",
    time: "text-zinc-500 dark:text-zinc-400",
    title: "text-zinc-900 dark:text-zinc-50",
  },
  past: {
    accent: "bg-zinc-200 dark:bg-zinc-800",
    card: "border-zinc-200 bg-zinc-50/60 dark:border-zinc-800 dark:bg-zinc-900/40",
    time: "text-zinc-400 dark:text-zinc-500",
    title: "text-zinc-500 dark:text-zinc-400",
  },
};

function StatusBadge({
  phase,
  minutesUntilStart,
}: {
  phase: EventPhase;
  minutesUntilStart: number;
}) {
  if (phase === "active") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-medium text-white">
        {/* A slow ping reads as "live" without being distracting. */}
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
        </span>
        Now
      </span>
    );
  }
  if (phase === "approaching") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400 px-2 py-0.5 text-xs font-medium text-amber-700 dark:border-amber-700 dark:text-amber-300">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
        Starts {formatRelative(minutesUntilStart)}
      </span>
    );
  }
  return null;
}

function AgendaRow({
  appointment,
  roomName,
  now,
  live,
  timeFormat,
}: {
  appointment: Appointment;
  roomName: string;
  now: Date;
  /** False when the row belongs to a day that is not today, so no live phases apply. */
  live: boolean;
  timeFormat: TimeFormat;
}) {
  const cancelled = appointment.status === "cancelled";
  const actual = describeSlot(appointment, now);
  // The description collapses and expands the same way it does in the appointments list; the rule
  // lives in lib/description-clamp so the two cannot disagree about the height.
  const [expanded, setExpanded] = useState(false);
  const hasDescription = Boolean(appointment.description);
  // Measured, not assumed: whether the description is clipped depends on the width it is given.
  const { ref: descriptionRef, overflows: descriptionOverflows } = useTextOverflow(
    appointment.description ?? "",
    expanded,
  );
  // On a day that is not today the phase is still used for the past/future tint, but
  // never for a live badge or a countdown.
  const phase: EventPhase = live
    ? actual.phase
    : actual.phase === "past"
      ? "past"
      : "upcoming";
  const style = PHASE_STYLES[phase];

  // One "why it matters" line, and only when there is something worth saying. A later
  // booking already shows its start time in the gutter, so repeating it as "starts in
  // 3 hours" would be noise. Restraint here is what keeps a full day scannable.
  let note: string | null = null;
  if (!cancelled && live) {
    if (actual.phase === "active") {
      note = `Free in ${formatDuration(actual.minutesUntilEnd)}`;
    } else if (actual.phase === "approaching") {
      note = `Starting in ${formatDuration(actual.minutesUntilStart)}`;
    }
  }

  return (
    <li className={`flex gap-3 ${ROW_PADDING} sm:gap-4`}>
      {/* Time gutter: fixed width, so the cards form a clean column. Sized for the longest
          form either setting produces — "12:59 PM" — so switching to 12-hour time cannot
          reflow every row. */}
      <div className={`w-[4.75rem] shrink-0 pt-0.5 text-right text-sm tabular-nums ${style.time}`}>
        {formatClock(appointment.startAtLocal, timeFormat)}
        <div className="text-xs text-zinc-400 dark:text-zinc-500">
          {formatClock(appointment.endAtLocal, timeFormat)}
        </div>
      </div>

      <div
        className={`relative flex flex-1 flex-wrap items-start gap-x-3 gap-y-1 overflow-hidden py-2.5 pl-4 pr-3 ${AGENDA_ROW_MIN_HEIGHT} ${
          cancelled ? CARD_SURFACE_CANCELLED : style.card
        }`}
      >
        <span
          className={`${CARD_ACCENT} ${
            cancelled ? "bg-zinc-200 dark:bg-zinc-800" : style.accent
          }`}
          aria-hidden="true"
        />

        <div className="min-w-0 flex-1">
          {/* One line, always — `nowrap` rather than `wrap`, with the badge told not to shrink.

              `truncate` on the title alone was not enough. When a long title and the badge together
              exceeded the width, the *row* wrapped and sent the badge to a second line: the title
              measured a correct one line while the row grew 28px, which is what made one card taller
              than the rest. Keeping the row on one line makes the title do the shrinking, which is
              what truncation is for. */}
          <div className="flex flex-nowrap items-center gap-2">
            <span
              className={`min-w-0 truncate font-medium ${
                cancelled ? "text-zinc-400 line-through dark:text-zinc-500" : style.title
              }`}
              title={appointment.title}
            >
              {appointment.title}
            </span>
            <span className="shrink-0">
              {cancelled ? (
                <span className="rounded-full border border-zinc-300 px-2 py-0.5 text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                  Cancelled
                </span>
              ) : (
                <StatusBadge phase={phase} minutesUntilStart={actual.minutesUntilStart} />
              )}
            </span>
          </div>

          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            <span>{roomName}</span>
            <span className="text-zinc-300 dark:text-zinc-600">·</span>
            <span className="truncate">{appointmentOwnerLabel(appointment)}</span>
            <span className="text-zinc-300 dark:text-zinc-600">·</span>
            <span className="tabular-nums">{formatDuration(actual.durationMinutes)}</span>
          </div>

          {/* Same behaviour as the appointments list, through the same rule. The kiosk and the day
              view both render this row, so the wall display gets it too: a description that runs
              long no longer pushes every row below it down, and someone who wants the rest can ask
              for it.

              The control appears only when text is actually clipped. Here it shares a flex line with
              the paragraph, so it narrows it — which cannot cause a flip-flop, because overflow is
              monotonic in width: a box narrow enough to overflow without the control still overflows
              with it. */}
          <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <p
              ref={descriptionRef}
              className={`min-w-0 flex-1 text-sm text-zinc-600 dark:text-zinc-400 ${descriptionClasses(
                expanded,
                hasDescription,
              )}`}
            >
              {appointment.description ?? ""}
            </p>
            {descriptionOverflows && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
                className="text-xs text-zinc-400 underline underline-offset-2 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
              >
                {expanded ? "Show less" : "Show more"}
              </button>
            )}
          </div>
        </div>

        {note && <span className={`self-center text-xs tabular-nums ${style.time}`}>{note}</span>}
      </div>
    </li>
  );
}

/**
 * The list itself: live summary, rows, and the cancelled toggle.
 *
 * Purely presentational, so the same rendering serves the main day view and the kiosk
 * display and the two cannot drift apart.
 */
export function AgendaBody({
  now,
  isToday,
  isPast,
  appointments,
  resources,
  error,
  showCancelled,
  onToggleCancelled,
  showEmptyAction = true,
  hideFinished: dropFinished = false,
  timeFormat = "24h",
}: {
  now: Date;
  /** Whether the day being shown is the viewer's today, which is what makes live phases
   *  and the "happening now" summary meaningful. */
  isToday: boolean;
  /** Whether the day has already finished. */
  isPast: boolean;
  appointments: Appointment[];
  resources: Resource[];
  error: ApiError | null;
  /** The kiosk hides "Book a room": it is a display, not a console. */
  showEmptyAction?: boolean;
  /** The kiosk also hides bookings that are over, keeping the display about now and next. */
  hideFinished?: boolean;
  /**
   * Whether cancelled bookings are listed.
   *
   * The day view starts with them hidden and offers a toggle; the kiosk always shows them,
   * because a booking that was called off is exactly what somebody standing in front of the
   * screen needs to know — a room that looks free but is not.
   */
  showCancelled: boolean;
  /** Omit to render no toggle, which is what the kiosk does. */
  onToggleCancelled?: () => void;
  /** How clock times are written. Resolved by the caller so this stays a pure render. */
  timeFormat?: TimeFormat;
}) {
  const roomNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const room of resources) map.set(room.id, room.name);
    return map;
  }, [resources]);

  const listed = useMemo(() => {
    // Cancelled bookings obey the toggle unless the caller always wants them. Finished ones
    // are dropped outright when the view asks for it, because no toggle should bring back
    // something already over.
    const kept = showCancelled
      ? appointments
      : appointments.filter((a) => a.status !== "cancelled");
    const filtered = dropFinished ? hideFinished(kept, now) : kept;
    return filtered.slice().sort((a, b) => {
      const byStart = a.startAtLocal.localeCompare(b.startAtLocal);
      return byStart !== 0 ? byStart : a.title.localeCompare(b.title);
    });
  }, [appointments, showCancelled, dropFinished, now]);

  const summary = useMemo(() => {
    let active = 0;
    let approaching = 0;
    let upcoming = 0;
    let cancelled = 0;
    for (const a of appointments) {
      if (a.status === "cancelled") {
        cancelled++;
        continue;
      }
      // Live phases only apply to today. On another date the phases would all read as
      // "upcoming" or "past" anyway, but saying so would be noise.
      const phase = isToday ? describeSlot(a, now).phase : "upcoming";
      if (phase === "active") active++;
      else if (phase === "approaching") approaching++;
      else if (phase === "upcoming") upcoming++;
    }
    return { active, approaching, upcoming, cancelled };
  }, [appointments, now, isToday]);

  return (
    <div className="space-y-4">
      <ErrorBanner error={error} />

      {/* Phrased as a sentence rather than a row of tiles, to match the restraint of the
          rest of the site. "Happening now" appears only for today, because it cannot be
          true of another date. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        {isToday ? (
          <>
            {summary.active > 0 && (
              <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {summary.active === 1 ? "1 happening now" : `${summary.active} happening now`}
              </span>
            )}
            {summary.approaching > 0 && (
              <span className="inline-flex items-center gap-1.5 font-medium text-amber-700 dark:text-amber-300">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                {summary.approaching === 1
                  ? "1 starting soon"
                  : `${summary.approaching} starting soon`}
              </span>
            )}
            <span className="text-zinc-500 dark:text-zinc-400">
              {summary.upcoming === 1 ? "1 later today" : `${summary.upcoming} later today`}
            </span>
          </>
        ) : (
          <span className="text-zinc-500 dark:text-zinc-400">
            {summary.upcoming + summary.active + summary.approaching === 1
              ? "1 booking"
              : `${summary.upcoming + summary.active + summary.approaching} bookings`}
          </span>
        )}
      </div>

      {listed.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 px-6 py-10 text-center dark:border-zinc-700">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {/* "Nothing left today" rather than "Nothing booked" when everything has
                already happened. The two are different facts, and on a kiosk the first is
                the one a reader needs. */}
            {appointments.length > 0
              ? isToday
                ? "Nothing left today."
                : "Nothing left on this day."
              : isToday
                ? "Nothing booked for today."
                : "Nothing booked for this day."}
          </p>
          {/* No invitation to book a day that has already gone: it is a dead end, and the
              empty state is the whole message. Today and future days keep it, and the
              kiosk never shows it because nobody books from a wall display. */}
          {canBookEmptyDay({ isPast, actionEnabled: showEmptyAction }) && (
            <Link
              href="/calendar/appointments/new"
              className="mt-3 inline-block rounded bg-zinc-900 px-3 py-1 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              Book a room
            </Link>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white py-1 dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950">
          {listed.map((appointment) => (
            <AgendaRow
              key={appointment.id}
              appointment={appointment}
              roomName={roomNameById.get(appointment.resourceId) ?? "Room"}
              now={now}
              live={isToday}
              timeFormat={timeFormat}
            />
          ))}
        </ul>
      )}

      {summary.cancelled > 0 && onToggleCancelled && (
        <button
          type="button"
          onClick={onToggleCancelled}
          className="text-xs text-zinc-500 underline-offset-2 hover:underline dark:text-zinc-400"
        >
          {showCancelled
            ? `Hide ${summary.cancelled} cancelled`
            : `Show ${summary.cancelled} cancelled`}
        </button>
      )}
    </div>
  );
}

/**
 * Loads one day's bookings and the room list.
 *
 * `date` is passed in rather than assumed, so the same hook serves the main day view
 * (which can be pointed at any date) and the kiosk (which is always today).
 */
/**
 * How often a displayed day is re-fetched, by audience.
 *
 * The kiosk is a shared screen that several people read to decide where to go next, so it is
 * worth keeping current within the minute. A day view being read by one person is not, and
 * re-fetching it every fifteen seconds would be a request nobody asked for. Both are the same
 * request, only at different rates.
 */
const REFRESH_MS = {
  kiosk: 15_000,
  interactive: 5 * 60_000,
} as const;

export function useDayAgenda(
  date: string,
  options: { refreshMs?: number } = {},
): {
  appointments: Appointment[];
  resources: Resource[];
  error: ApiError | null;
  loaded: boolean;
  /** When the last successful refresh landed, for a display that wants to show it. */
  refreshedAt: Date | null;
} {
  const { refreshMs = REFRESH_MS.interactive } = options;

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [error, setError] = useState<ApiError | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);
  // Which date's data has arrived. Recording the date rather than a boolean means moving
  // to another date reports "loading" again on its own, with nothing set in the effect
  // body.
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  /**
   * Fetch the day and settle the result, with no notion of cancellation.
   *
   * Split out of the effects below so the first load, the interval and the wake-up all run
   * exactly the same request. The caller owns the cancelled flag, because only the caller
   * knows whether it is still interested.
   */
  const load = useCallback(
    (isCancelled: () => boolean) =>
      api.listAppointments({ from: date, to: date }).then((result) => {
        if (isCancelled()) return;
        setLoadedFor(date);
        if (result.ok) {
          setAppointments(result.value);
          setError(null);
          setRefreshedAt(new Date());
          return;
        }
        setError(result.error);
      }),
    [date],
  );

  useEffect(() => {
    let cancelled = false;
    void load(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    api.listResources().then((result) => {
      if (!cancelled && result.ok) setResources(result.value);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Keep the day current.
   *
   * A background tab is throttled to roughly one timer per second and stops firing entirely on
   * some platforms, so the interval alone cannot be trusted — a kiosk whose screen was switched
   * away and back could sit on a stale day for the whole interval. Hence the visibility
   * listener: polling stops while nobody can see it, and a refresh happens the moment it comes
   * back, which is exactly when the data is most likely to be old.
   *
   * A failed refresh leaves the last good data and the existing error alone. A display that
   * blanks because one request was lost is worse than one showing a listing that is a minute
   * out of date, and the next tick will correct it.
   */
  useEffect(() => {
    let cancelled = false;
    const isCancelled = () => cancelled;

    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void load(isCancelled);
    }, refreshMs);

    const onVisible = () => {
      if (document.visibilityState === "visible") void load(isCancelled);
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load, refreshMs]);

  return { appointments, resources, error, loaded: loadedFor === date, refreshedAt };
}

/**
 * Gate for the live clock. `useNow` is null until the browser has taken over, so the
 * time-dependent views never contribute anything to the prerendered HTML.
 *
 * `selectedDate` is the day to show. The week strip and the month grid both move it, so
 * a reader can look at any day rather than only today.
 */
export function DayAgenda({
  selectedDate,
  onSelectDate,
}: {
  selectedDate: string;
  onSelectDate: (date: string) => void;
}) {
  const now = useNow();
  if (!now) return <p className="text-sm text-zinc-500">Loading…</p>;
  return <Agenda now={now} selectedDate={selectedDate} onSelectDate={onSelectDate} />;
}

function Agenda({
  now,
  selectedDate,
  onSelectDate,
}: {
  now: Date;
  selectedDate: string;
  onSelectDate: (date: string) => void;
}) {
  const today = seattleToday(now);
  // "Happening now" is only meaningful when the day being shown is the viewer's today.
  const isToday = selectedDate === today;
  // Calendar dates are YYYY-MM-DD, so a plain string comparison is a date comparison.
  const isPast = selectedDate < today;
  const { appointments, resources, error, loaded } = useDayAgenda(selectedDate);
  const [includeCancelled, setIncludeCancelled] = useState(false);
  const timeFormat = useTimeFormat();

  // The strip can page through weeks independently of which day is selected, so moving
  // a week does not itself change the day being shown.
  const [weekAnchor, setWeekAnchor] = useState(selectedDate);
  const strip = useMemo(() => weekDays(weekAnchor, today), [weekAnchor, today]);

  // Which days of the visible week have bookings, for the strip's dots. The API's `to` is
  // exclusive, so the range runs one day past the last tile.
  const [weekAppointments, setWeekAppointments] = useState<Appointment[]>([]);
  const weekFrom = strip[0].date;
  const weekToExclusive = addDays(strip[strip.length - 1].date, 1);
  useEffect(() => {
    let cancelled = false;
    api.listAppointments({ from: weekFrom, to: weekToExclusive }).then((result) => {
      if (!cancelled && result.ok) setWeekAppointments(result.value);
    });
    return () => {
      cancelled = true;
    };
  }, [weekFrom, weekToExclusive]);

  const daysWithEntries = useMemo(() => {
    const set = new Set<string>();
    for (const a of weekAppointments) {
      if (a.status !== "cancelled") set.add(seattleDateOf(a.startAtLocal));
    }
    return set;
  }, [weekAppointments]);

  if (!loaded) return <p className="text-sm text-zinc-500">Loading…</p>;

  return (
    <div className="space-y-5">
      {/* Which day this is, stated plainly. Selecting another day moves the strip and the
          list, but without a heading nothing on the page says which date you are looking
          at — so the selection looks like it did nothing even when it worked. */}
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        {formatLongDate(selectedDate)}
        {isToday && <span className="ml-2 text-zinc-400 dark:text-zinc-500">Today</span>}
      </p>

      <WeekStrip
        days={strip.map((d) => ({ ...d, hasEntries: daysWithEntries.has(d.date) }))}
        selected={selectedDate}
        onSelect={onSelectDate}
        onPrevWeek={() => setWeekAnchor((d) => addDays(d, -7))}
        onNextWeek={() => setWeekAnchor((d) => addDays(d, 7))}
        onToday={() => {
          setWeekAnchor(today);
          onSelectDate(today);
        }}
        isOnToday={isToday}
      />

      <AgendaBody
        now={now}
        isToday={isToday}
        isPast={isPast}
        appointments={appointments}
        resources={resources}
        error={error}
        showCancelled={includeCancelled}
        onToggleCancelled={() => setIncludeCancelled((prev) => !prev)}
        timeFormat={timeFormat ?? "24h"}
      />
    </div>
  );
}
