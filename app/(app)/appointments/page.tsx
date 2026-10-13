"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import type { Appointment, Resource } from "@/contract";
import { getApiClient, type ApiError } from "@/lib/api";
import { sortResources } from "@/lib/resources";
import { sortAppointments } from "@/lib/appointment-sort";
import { ownerOptions } from "@/lib/appointment-owners";
import { useAppointmentView } from "@/lib/use-appointment-view";
import { useSession } from "@/lib/session/session-context";
import { ErrorBanner } from "@/components/error-banner";
import { AppointmentCard } from "@/components/appointment-card";
import { AppointmentFilters } from "@/components/appointment-filters";
import { CARD_LIST, PAGE_TITLE } from "@/lib/card";

const api = getApiClient();

/**
 * Suspended because the filters live in the URL and reading them needs `useSearchParams`,
 * which Next.js will not prerender without a boundary.
 */
export default function AppointmentsPage() {
  return (
    <Suspense fallback={<div className="text-sm text-zinc-500">Loading appointments…</div>}>
      <Appointments />
    </Suspense>
  );
}

function Appointments() {
  const { user, status } = useSession();
  const { view, titleRef } = useAppointmentView();
  const { query, sort, owner } = view;

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  /** Bumped to re-run the fetch after a mutation. */
  const [reloadToken, setReloadToken] = useState(0);

  // Keyed on the query rather than on an object, so this re-runs when a filter value
  // actually changes instead of on every render that rebuilds the object.
  const queryKey = JSON.stringify(query);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    api.listAppointments(JSON.parse(queryKey)).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (result.ok) setAppointments(result.value);
      else setError(result.error);
    });
    return () => {
      cancelled = true;
    };
  }, [status, queryKey, reloadToken]);

  useEffect(() => {
    // Resources are readable by any signed-in user, so every user gets the room filter —
    // not just admins. Sorted on arrival so the dropdown reads alphabetically.
    void api.listResources().then((result) => {
      if (result.ok) setResources(sortResources(result.value));
    });
  }, []);

  const roomNameById = new Map(resources.map((room) => [room.id, room.name]));

  // The owner filter is applied here rather than at the API: `GET /users` is admin-only,
  // and `userId` on an appointment is a historical reference that may match no user, so the
  // durable identity is the denormalised address.
  const narrowed = owner
    ? appointments.filter((a) => a.ownerEmail === owner)
    : appointments;
  const ordered = sortAppointments(narrowed, sort);
  const owners = ownerOptions(appointments);

  async function refresh() {
    setReloadToken((token) => token + 1);
  }

  async function handleCancel(id: string) {
    setError(null);
    const result = await api.cancelAppointment(id);
    if (result.ok) await refresh();
    else setError(result.error);
  }

  async function handleDelete(id: string) {
    setError(null);
    setConfirmingDeleteId(null);
    const result = await api.deleteAppointment(id);
    if (result.ok) await refresh();
    else setError(result.error);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className={PAGE_TITLE}>Appointments</h1>
        <Link href="/appointments/new" className="rounded bg-zinc-900 px-3 py-1 text-white">
          New
        </Link>
      </div>

      <AppointmentFilters
        view={view}
        titleRef={titleRef}
        resources={resources}
        owners={owners}
        resultCount={ordered.length}
      />

      <ErrorBanner error={error} />

      {loading ? (
        <p className="text-sm text-zinc-500">Loading appointments…</p>
      ) : ordered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 px-6 py-10 text-center dark:border-zinc-700">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {view.isFiltered
              ? "No appointments match these filters."
              : "No appointments yet."}
          </p>
          {view.isFiltered && (
            <button
              type="button"
              onClick={view.clearAll}
              className="mt-3 rounded border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <ul className={CARD_LIST}>
          {ordered.map((appointment) => (
            <AppointmentCard
              key={appointment.id}
              appointment={appointment}
              roomName={roomNameById.get(appointment.resourceId) ?? "Room"}
              user={user}
              isConfirming={confirmingDeleteId === appointment.id}
              onCancel={() => handleCancel(appointment.id)}
              onAskDelete={() => setConfirmingDeleteId(appointment.id)}
              onConfirmDelete={() => handleDelete(appointment.id)}
              onKeep={() => setConfirmingDeleteId(null)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
