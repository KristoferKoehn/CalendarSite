"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type {
  Appointment,
  AppointmentListQuery,
  Resource,
  User,
} from "@/contract";
import { getApiClient, type ApiError } from "@/lib/api";
import { useSession } from "@/lib/session/session-context";
import { ErrorBanner } from "@/components/error-banner";
import { formatSeattleRange } from "@/lib/time";

const api = getApiClient();

export default function AppointmentsPage() {
  const { user, status } = useSession();
  const isAdmin = user?.role === "admin";

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [filters, setFilters] = useState<AppointmentListQuery>({});

  const userEmailById = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of users) map.set(item.id, item.email);
    return map;
  }, [users]);

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
    if (!isAdmin) return;
    void api.listResources().then((result) => {
      if (result.ok) setResources(result.value);
    });
    void api.listUsers().then((result) => {
      if (result.ok) setUsers(result.value);
    });
  }, [isAdmin]);

  async function handleCancel(id: string) {
    setError(null);
    const result = await api.cancelAppointment(id);
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

      {isAdmin && (
        <div className="flex flex-wrap items-end gap-3">
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
      )}

      <ErrorBanner error={error} />

      {appointments.length === 0 ? (
        <p className="text-sm text-zinc-500">No appointments.</p>
      ) : (
        <ul className="divide-y rounded border border-zinc-200">
          {appointments.map((appointment) => (
            <li key={appointment.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1">
                <div className="font-medium">
                  {formatSeattleRange(appointment.startAtLocal, appointment.endAtLocal)}
                </div>
                {isAdmin && (
                  <div className="text-sm text-zinc-500">
                    {userEmailById.get(appointment.userId) ?? appointment.userId}
                  </div>
                )}
                <div className="text-sm text-zinc-500">{appointment.status}</div>
              </div>
              {appointment.status === "booked" && (
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
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
