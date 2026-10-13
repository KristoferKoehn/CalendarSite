"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Appointment, AppointmentListQuery, Resource } from "@/contract";
import { appointmentOwnerLabel } from "@/contract";
import { getApiClient, type ApiError } from "@/lib/api";
import { useSession } from "@/lib/session/session-context";
import { ErrorBanner } from "@/components/error-banner";
import { canDeleteAppointment, canModifyAppointment } from "@/lib/permissions";
import { formatSeattleRange } from "@/lib/time";

const api = getApiClient();

export default function AppointmentsPage() {
  const { user, status } = useSession();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [filters, setFilters] = useState<AppointmentListQuery>({});
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  async function reload(query: AppointmentListQuery = filters) {
    setLoading(true);
    setError(null);
    const result = await api.listAppointments(query);
    setLoading(false);
    if (result.ok) setAppointments(result.value);
    else setError(result.error);
  }

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    api.listAppointments(filters).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (result.ok) setAppointments(result.value);
      else setError(result.error);
    });
    return () => {
      cancelled = true;
    };
  }, [status, filters]);

  useEffect(() => {
    // Resources are readable by any signed-in user, so every user gets the
    // room filter — not just admins.
    void api.listResources().then((result) => {
      if (result.ok) setResources(result.value);
    });
  }, []);

  async function handleCancel(id: string) {
    setError(null);
    const result = await api.cancelAppointment(id);
    if (result.ok) await reload();
    else setError(result.error);
  }

  async function handleDelete(id: string) {
    setError(null);
    setConfirmingDeleteId(null);
    const result = await api.deleteAppointment(id);
    if (result.ok) await reload();
    else setError(result.error);
  }

  if (loading) {
    return <div className="text-sm text-zinc-500">Loading appointments...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Appointments</h1>
        <Link
          href="/appointments/new"
          className="rounded bg-zinc-900 px-3 py-1 text-white"
        >
          New
        </Link>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          Title
          <input
            type="text"
            value={filters.title ?? ""}
            onChange={(event) =>
              setFilters((prev) => ({
                ...prev,
                title: event.target.value || undefined,
              }))
            }
            className="ml-1 rounded border px-2 py-1"
          />
        </label>
        <label className="text-sm">
          Resource
          <select
            value={filters.resourceId ?? ""}
            onChange={(event) =>
              setFilters((prev) => ({
                ...prev,
                resourceId: event.target.value || undefined,
              }))
            }
            className="ml-1 rounded border px-2 py-1"
          >
            <option value="">All</option>
            {resources.map((resource) => (
              <option key={resource.id} value={resource.id}>
                {resource.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Status
          <select
            value={filters.status ?? ""}
            onChange={(event) => {
              const value = event.target.value;
              setFilters((prev) => ({
                ...prev,
                status:
                  value === "booked" || value === "cancelled" ? value : undefined,
              }));
            }}
            className="ml-1 rounded border px-2 py-1"
          >
            <option value="">All</option>
            <option value="booked">Booked</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
      </div>

      <ErrorBanner error={error} />

      {appointments.length === 0 ? (
        <p className="text-sm text-zinc-500">No appointments.</p>
      ) : (
        <ul className="divide-y rounded border border-zinc-200">
          {appointments.map((appointment) => {
            // Both checks mirror the server: the owner or an admin may cancel or
            // reschedule, but only an admin may delete. Hiding a control is a
            // convenience, not a boundary — the API enforces the rule either way.
            const canModify = canModifyAppointment(appointment, user);
            const canDelete = canDeleteAppointment(user);
            const isConfirming = confirmingDeleteId === appointment.id;

            return (
              // Wraps so the row's controls drop below the details on a narrow screen
              // instead of pushing the page into horizontal scroll.
              <li
                key={appointment.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3"
              >
                {/* min-w-0 is load-bearing: a flex child defaults to min-width:auto and
                    so refuses to shrink below its content, which would let a long title
                    or email push the row wider than the viewport. */}
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{appointment.title}</div>
                  {appointment.description && (
                    <div className="text-sm text-zinc-600">{appointment.description}</div>
                  )}
                  <div className="text-sm text-zinc-500">
                    {formatSeattleRange(appointment.startAtLocal, appointment.endAtLocal)}
                  </div>
                  {/* Name captured at booking time, falling back to the email label.
                      Both live on the appointment, so this still renders for an
                      owner whose account has been deleted. */}
                  <div className="text-sm text-zinc-500">
                    {appointmentOwnerLabel(appointment)}
                  </div>
                  <div className="text-sm text-zinc-500">{appointment.status}</div>
                </div>

                {/* Deleting erases the record rather than cancelling it, so it asks
                    first. The appointment title is repeated in the prompt because by
                    the time you are confirming, the row you clicked may no longer be
                    the one you had in mind. */}
                {isConfirming ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-zinc-600">
                      Delete “{appointment.title}” permanently?
                    </span>
                    <button
                      onClick={() => handleDelete(appointment.id)}
                      className="rounded bg-red-600 px-2 py-1 text-sm text-white"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setConfirmingDeleteId(null)}
                      className="rounded border px-2 py-1 text-sm"
                    >
                      Keep
                    </button>
                  </div>
                ) : (
                  <>
                    {appointment.status === "booked" && canModify && (
                      <>
                        <Link
                          href={`/appointments/${appointment.id}/reschedule`}
                          className="rounded border px-2 py-1 text-sm"
                        >
                          Reschedule
                        </Link>
                        <button
                          onClick={() => handleCancel(appointment.id)}
                          className="rounded border px-2 py-1 text-sm"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                    {/* Offered for cancelled appointments too: an admin clearing up
                        needs to remove the leftovers, which is the case delete exists
                        for. */}
                    {canDelete && (
                      <button
                        onClick={() => setConfirmingDeleteId(appointment.id)}
                        className="rounded border border-red-200 px-2 py-1 text-sm text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950"
                      >
                        Delete
                      </button>
                    )}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
