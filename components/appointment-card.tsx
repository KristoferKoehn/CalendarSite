"use client";

import Link from "next/link";
import type { Appointment } from "@/contract";
import { appointmentOwnerLabel } from "@/contract";
import { CARD_ACCENT, CARD_SURFACE, CARD_SURFACE_MUTED, ROW_PADDING } from "@/lib/card";
import { canDeleteAppointment, canModifyAppointment } from "@/lib/permissions";
import { useTimeFormat } from "@/lib/time-format";
import { formatClock, formatDuration, formatSeattleRange } from "@/lib/time";
import type { User } from "@/contract";

type Props = {
  appointment: Appointment;
  roomName: string;
  /** The signed-in user, for deciding which controls to offer. */
  user: User | null;
  /** True while this row is asking to confirm a permanent delete. */
  isConfirming?: boolean;
  onCancel?: () => void;
  onAskDelete?: () => void;
  onConfirmDelete?: () => void;
  onKeep?: () => void;
};

/**
 * One appointment, as a card.
 *
 * Shares the day agenda's shape — a fixed time gutter beside a bordered card with an accent
 * stripe — so the two read as the same object in two contexts rather than two designs. The
 * gutter is fixed width and the times are tabular, so a list of cards forms a clean column
 * instead of a ragged one.
 */
export function AppointmentCard({
  appointment,
  roomName,
  user,
  isConfirming = false,
  onCancel,
  onAskDelete,
  onConfirmDelete,
  onKeep,
}: Props) {
  // Both checks mirror the server: the owner or an admin may cancel or reschedule, but only
  // an admin may delete. Hiding a control is a convenience, not a boundary — the API
  // enforces the rule either way.
  const canModify = canModifyAppointment(appointment, user);
  const canDelete = canDeleteAppointment(user);
  const cancelled = appointment.status === "cancelled";
  const showActions = Boolean(onCancel || onAskDelete);
  // Null before hydration; 24-hour is what the prerendered markup already shows.
  const timeFormat = useTimeFormat() ?? "24h";

  return (
    <li className={`flex gap-3 ${ROW_PADDING} sm:gap-4`}>
      {/* Fixed width, sized for the longest either setting produces, so switching to 12-hour
          time cannot reflow every row. */}
      <div className="w-[4.75rem] shrink-0 pt-0.5 text-right text-sm tabular-nums text-zinc-500 dark:text-zinc-400">
        {formatClock(appointment.startAtLocal, timeFormat)}
        <div className="text-xs text-zinc-400 dark:text-zinc-500">
          {formatClock(appointment.endAtLocal, timeFormat)}
        </div>
      </div>

      <div
        className={`relative flex flex-1 flex-wrap items-start gap-x-3 gap-y-2 overflow-hidden py-2.5 pl-4 pr-3 ${
          cancelled ? CARD_SURFACE_MUTED : CARD_SURFACE
        }`}
      >
        <span
          className={`${CARD_ACCENT} ${
            cancelled ? "bg-zinc-200 dark:bg-zinc-800" : "bg-zinc-300 dark:bg-zinc-700"
          }`}
        />

        {/* min-w-0 is load-bearing: a flex child defaults to min-width:auto and so refuses
            to shrink below its content, which would let a long title or email push the row
            wider than the viewport. */}
        <div className="min-w-0 flex-1">
          <div
            className={`font-medium ${
              cancelled
                ? "text-zinc-500 line-through dark:text-zinc-400"
                : "text-zinc-900 dark:text-zinc-50"
            }`}
          >
            {appointment.title}
          </div>

          {appointment.description && (
            <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
              {appointment.description}
            </p>
          )}

          {/* Secondary line: where, who, how long. Separated by middots rather than stacked
              on separate rows, so a card stays compact enough to scan a long list. */}
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            <span>{roomName}</span>
            <span aria-hidden="true">·</span>
            <span className="truncate">{appointmentOwnerLabel(appointment)}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">
              {formatDuration(
                Math.max(
                  0,
                  Math.round(
                    (Date.parse(appointment.endAtLocal) -
                      Date.parse(appointment.startAtLocal)) /
                      60000,
                  ),
                ),
              )}
            </span>
          </div>

          <div className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
            {formatSeattleRange(appointment.startAtLocal, appointment.endAtLocal, timeFormat)}
          </div>

          {cancelled && (
            <span className="mt-1.5 inline-block rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
              Cancelled
            </span>
          )}
        </div>

        {/* Deleting erases the record rather than cancelling it, so it asks first. The title
            is repeated in the prompt because by the time you are confirming, the row you
            clicked may no longer be the one you had in mind. */}
        {isConfirming ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              Delete “{appointment.title}” permanently?
            </span>
            <button
              onClick={onConfirmDelete}
              className="rounded bg-red-600 px-2 py-1 text-sm text-white hover:bg-red-700"
            >
              Delete
            </button>
            <button
              onClick={onKeep}
              className="rounded border border-zinc-300 px-2 py-1 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Keep
            </button>
          </div>
        ) : (
          showActions && (
            <div className="flex flex-wrap items-center gap-2">
              {!cancelled && canModify && (
                <>
                  <Link
                    href={`/appointments/${appointment.id}/reschedule`}
                    className="rounded border border-zinc-300 px-2 py-1 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                  >
                    Reschedule
                  </Link>
                  <button
                    onClick={onCancel}
                    className="rounded border border-zinc-300 px-2 py-1 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                  >
                    Cancel
                  </button>
                </>
              )}
              {/* Offered for cancelled appointments too: an admin clearing up needs to
                  remove the leftovers, which is what delete exists for. */}
              {canDelete && (
                <button
                  onClick={onAskDelete}
                  className="rounded border border-red-200 px-2 py-1 text-sm text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950"
                >
                  Delete
                </button>
              )}
            </div>
          )
        )}
      </div>
    </li>
  );
}
