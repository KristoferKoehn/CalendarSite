"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Appointment, Resource } from "@/contract";
import { appointmentOwnerLabel } from "@/contract";
import { getApiClient, type ApiError } from "@/lib/api";
import { ErrorBanner } from "@/components/error-banner";
import { useNow } from "@/lib/use-now";
import {
  describeSlot,
  formatDuration,
  formatLongDate,
  formatRelative,
  localClock,
  seattleToday,
  type EventPhase,
} from "@/lib/time";

const api = getApiClient();

/**
 * Visual treatment per phase, in one place so the agenda reads as a single
 * system rather than a set of ad-hoc styles.
 *
 * `accent` is the left rule: solid for something happening now, lighter for
 * something about to start, a hairline for everything else. The background tint
 * is deliberately faint — the accent bar and the badge carry the meaning, so the
 * list stays calm at a glance.
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
  const isCancelled = appointment.status === "cancelled";
  const status = describeSlot(appointment, now);
  const style = PHASE_STYLES[status.phase];

  // One "why it matters" line, and only when there is something worth saying.
  // Any later booking already shows its start time in the gutter, so repeating it
  // as "starts in 3 hours" would be noise. Restraint here is what keeps a full day
  // scannable.
  let note: string | null = null;
  if (!isCancelled) {
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
          isCancelled
            ? "border-dashed border-zinc-200 bg-transparent dark:border-zinc-800"
            : style.card
        }`}
      >
        <span
          className={`absolute inset-y-0 left-0 w-1 ${
            isCancelled ? "bg-zinc-200 dark:bg-zinc-800" : style.accent
          }`}
          aria-hidden="true"
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`font-medium ${
                isCancelled
                  ? "text-zinc-400 line-through dark:text-zinc-500"
                  : style.title
              }`}
            >
              {appointment.title}
            </span>
            {isCancelled ? (
              <span className="rounded-full border border-zinc-300 px-2 py-0.5 text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                Cancelled
              </span>
            ) : (
              <StatusBadge
                phase={status.phase}
                minutesUntilStart={status.minutesUntilStart}
              />
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

        {note && (
          <span className={`self-center text-xs tabular-nums ${style.time}`}>{note}</span>
        )}
      </div>
    </li>
  );
}

/**
 * Gate for the live clock. `useNow` is null until the browser has taken over, so
 * the time-dependent view below only ever renders with a real clock and never
 * contributes anything to the prerendered HTML.
 */
export function DayAgenda() {
  const now = useNow();
  if (!now) {
    return <p className="text-sm text-zinc-500">Loading today…</p>;
  }
  return <Agenda now={now} />;
}

function Agenda({ now }: { now: Date }) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [includeCancelled, setIncludeCancelled] = useState(false);

  const day = seattleToday(now);

  // The initial load uses promise callbacks with a cancellation flag, matching
  // the rest of the app: setting state synchronously inside an effect is
  // disallowed by the lint config, and a late response after unmount must not
  // write state.
  useEffect(() => {
    let cancelled = false;
    api.listAppointments({ from: day, to: day }).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (result.ok) setAppointments(result.value);
      else setError(result.error);
    });
    api.listResources().then((result) => {
      if (!cancelled && result.ok) setResources(result.value);
    });
    return () => {
      cancelled = true;
    };
  }, [day]);

  // Live state must not go stale: re-read on an interval in case somebody else
  // books, which also picks up the new day after a rollover.
  useEffect(() => {
    const id = window.setInterval(() => {
      api.listAppointments({ from: day, to: day }).then((result) => {
        if (result.ok) setAppointments(result.value);
      });
    }, 5 * 60_000);
    return () => window.clearInterval(id);
  }, [day]);

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

  if (loading) {
    return <p className="text-sm text-zinc-500">Loading today…</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="space-y-1">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-xl font-semibold">Today</h1>
          <Link
            href="/appointments"
            className="text-sm text-zinc-500 underline-offset-2 hover:underline dark:text-zinc-400"
          >
            All appointments →
          </Link>
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{formatLongDate(day)}</p>
      </header>

      {/* Live summary, phrased as a sentence rather than a row of tiles, to match
          the restraint of the rest of the site. */}
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

      <ErrorBanner error={error} />

      {visible.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 px-6 py-10 text-center dark:border-zinc-700">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Nothing booked for today.
          </p>
          <Link
            href="/appointments/new"
            className="mt-3 inline-block rounded bg-zinc-900 px-3 py-1 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Book a room
          </Link>
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
          onClick={() => setIncludeCancelled((prev) => !prev)}
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
