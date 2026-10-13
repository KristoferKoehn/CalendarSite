"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Appointment, Resource } from "@/contract";
import { appointmentOwnerLabel } from "@/contract";
import { getApiClient, type ApiError } from "@/lib/api";
import { ErrorBanner } from "@/components/error-banner";
import { WeekStrip } from "@/components/week-strip";
import { useNow } from "@/lib/use-now";
import { weekDays } from "@/lib/calendar";
import {
  addDays,
  describeSlot,
  formatDuration,
  formatRelative,
  localClock,
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
}: {
  appointment: Appointment;
  roomName: string;
  now: Date;
}) {
  const cancelled = appointment.status === "cancelled";
  const status = describeSlot(appointment, now);
  const style = PHASE_STYLES[status.phase];

  // One "why it matters" line, and only when there is something worth saying. A later
  // booking already shows its start time in the gutter, so repeating it as "starts in
  // 3 hours" would be noise. Restraint here is what keeps a full day scannable.
  let note: string | null = null;
  if (!cancelled) {
    if (status.phase === "active") {
      note = `Free in ${formatDuration(status.minutesUntilEnd)}`;
    } else if (status.phase === "approaching") {
      note = `Starting in ${formatDuration(status.minutesUntilStart)}`;
    }
  }

  return (
    <li className="flex gap-3 px-4 py-2.5 sm:gap-4 sm:px-5">
      {/* Time gutter: fixed width, so the cards form a clean column. */}
      <div className={`w-12 shrink-0 pt-0.5 text-right text-sm tabular-nums ${style.time}`}>
        {localClock(appointment.startAtLocal)}
        <div className="text-xs text-zinc-400 dark:text-zinc-500">
          {localClock(appointment.endAtLocal)}
        </div>
      </div>

      <div
        className={`relative flex flex-1 flex-wrap items-start gap-x-3 gap-y-1 overflow-hidden rounded-md border py-2.5 pl-4 pr-3 ${
          cancelled ? "border-dashed border-zinc-200 bg-transparent dark:border-zinc-800" : style.card
        }`}
      >
        <span
          className={`absolute inset-y-0 left-0 w-1 ${
            cancelled ? "bg-zinc-200 dark:bg-zinc-800" : style.accent
          }`}
          aria-hidden="true"
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`font-medium ${
                cancelled ? "text-zinc-400 line-through dark:text-zinc-500" : style.title
              }`}
            >
              {appointment.title}
            </span>
            {cancelled ? (
              <span className="rounded-full border border-zinc-300 px-2 py-0.5 text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                Cancelled
              </span>
            ) : (
              <StatusBadge phase={status.phase} minutesUntilStart={status.minutesUntilStart} />
            )}
          </div>

          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            <span>{roomName}</span>
            <span className="text-zinc-300 dark:text-zinc-600">·</span>
            <span className="truncate">{appointmentOwnerLabel(appointment)}</span>
            <span className="text-zinc-300 dark:text-zinc-600">·</span>
            <span className="tabular-nums">{formatDuration(status.durationMinutes)}</span>
          </div>

          {appointment.description && (
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {appointment.description}
            </p>
          )}
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
  appointments,
  resources,
  error,
  includeCancelled,
  onToggleCancelled,
  showEmptyAction = true,
}: {
  now: Date;
  appointments: Appointment[];
  resources: Resource[];
  error: ApiError | null;
  includeCancelled: boolean;
  onToggleCancelled: () => void;
  /** The kiosk hides "Book a room": it is a display, not a console. */
  showEmptyAction?: boolean;
}) {
  const roomNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const room of resources) map.set(room.id, room.name);
    return map;
  }, [resources]);

  const visible = useMemo(
    () =>
      appointments
        .filter((a) => includeCancelled || a.status !== "cancelled")
        .slice()
        .sort((a, b) => {
          const byStart = a.startAtLocal.localeCompare(b.startAtLocal);
          return byStart !== 0 ? byStart : a.title.localeCompare(b.title);
        }),
    [appointments, includeCancelled],
  );

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
      const phase = describeSlot(a, now).phase;
      if (phase === "active") active++;
      else if (phase === "approaching") approaching++;
      else if (phase === "upcoming") upcoming++;
    }
    return { active, approaching, upcoming, cancelled };
  }, [appointments, now]);

  return (
    <div className="space-y-4">
      <ErrorBanner error={error} />

      {/* Phrased as a sentence rather than a row of tiles, to match the restraint of
          the rest of the site. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
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
      </div>

      {visible.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 px-6 py-10 text-center dark:border-zinc-700">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Nothing booked for today.</p>
          {showEmptyAction && (
            <Link
              href="/appointments/new"
              className="mt-3 inline-block rounded bg-zinc-900 px-3 py-1 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              Book a room
            </Link>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white py-1 dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950">
          {visible.map((appointment) => (
            <AgendaRow
              key={appointment.id}
              appointment={appointment}
              roomName={roomNameById.get(appointment.resourceId) ?? "Room"}
              now={now}
            />
          ))}
        </ul>
      )}

      {summary.cancelled > 0 && (
        <button
          type="button"
          onClick={onToggleCancelled}
          className="text-xs text-zinc-500 underline-offset-2 hover:underline dark:text-zinc-400"
        >
          {includeCancelled
            ? `Hide ${summary.cancelled} cancelled`
            : `Show ${summary.cancelled} cancelled`}
        </button>
      )}
    </div>
  );
}

/**
 * Loads today's bookings and the room list.
 *
 * One hook rather than one per view: the day view and the kiosk need exactly the same
 * data, so fetching it in two places would be two chances for them to disagree.
 *
 * `today` comes from the ticking clock rather than being held, so the data follows the
 * Seattle date across midnight instead of showing yesterday's bookings.
 */
export function useTodayAgenda(today: string): {
  appointments: Appointment[];
  resources: Resource[];
  error: ApiError | null;
  loaded: boolean;
} {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [error, setError] = useState<ApiError | null>(null);
  // Which day's data has arrived. Recording the day rather than a boolean means moving
  // to a new day reports "loading" again on its own, with nothing set in the effect body.
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.listAppointments({ from: today, to: today }).then((result) => {
      if (cancelled) return;
      setLoadedFor(today);
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
  }, [today]);

  useEffect(() => {
    let cancelled = false;
    api.listResources().then((result) => {
      if (!cancelled && result.ok) setResources(result.value);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Refresh on an interval so a display left open for days does not go stale.
  useEffect(() => {
    const id = window.setInterval(() => {
      api.listAppointments({ from: today, to: today }).then((result) => {
        if (result.ok) setAppointments(result.value);
      });
    }, 5 * 60_000);
    return () => window.clearInterval(id);
  }, [today]);

  return { appointments, resources, error, loaded: loadedFor === today };
}

/**
 * Gate for the live clock. `useNow` is null until the browser has taken over, so the
 * time-dependent views never contribute anything to the prerendered HTML.
 */
export function DayAgenda() {
  const now = useNow();
  if (!now) return <p className="text-sm text-zinc-500">Loading…</p>;
  return <Agenda now={now} />;
}

function Agenda({ now }: { now: Date }) {
  const today = seattleToday(now);
  const { appointments, resources, error, loaded } = useTodayAgenda(today);
  const [includeCancelled, setIncludeCancelled] = useState(false);

  // The strip pages independently of the agenda, which always shows today.
  const [weekAnchor, setWeekAnchor] = useState(today);
  const strip = useMemo(() => weekDays(weekAnchor, today), [weekAnchor, today]);

  // Which days of the visible week have bookings, for the strip's dots.
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
      <WeekStrip
        days={strip.map((d) => ({ ...d, hasEntries: daysWithEntries.has(d.date) }))}
        selected={today}
        onSelect={setWeekAnchor}
        onPrevWeek={() => setWeekAnchor((d) => addDays(d, -7))}
        onNextWeek={() => setWeekAnchor((d) => addDays(d, 7))}
        onToday={() => setWeekAnchor(today)}
        isOnToday={weekAnchor === today}
      />

      {/* The list, live summary and cancelled toggle are shared with the kiosk view, so
          they live in one place rather than being written twice and drifting. The error
          banner is inside it too, which keeps a failure from being reported twice. */}
      <AgendaBody
        now={now}
        appointments={appointments}
        resources={resources}
        error={error}
        includeCancelled={includeCancelled}
        onToggleCancelled={() => setIncludeCancelled((prev) => !prev)}
      />
    </div>
  );
}
