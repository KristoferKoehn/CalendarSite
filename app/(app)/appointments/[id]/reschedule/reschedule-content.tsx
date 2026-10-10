"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Appointment } from "@/contract";
import { getApiClient, type ApiError } from "@/lib/api";
import { useSession } from "@/lib/session/session-context";
import {
  AppointmentForm,
  type SubmitResult,
} from "@/components/appointment-form";

const api = getApiClient();

export function RescheduleContent() {
  const router = useRouter();
  const { status } = useSession();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [resourceName, setResourceName] = useState("");
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") return;
    void (async () => {
      const [appointmentsResult, resourcesResult] = await Promise.all([
        api.listAppointments(),
        api.listResources(),
      ]);

      const found = appointmentsResult.ok
        ? appointmentsResult.value.find((item) => item.id === id)
        : undefined;

      if (!found) {
        setNotFound(true);
        return;
      }

      setAppointment(found);
      const resource = resourcesResult.ok
        ? resourcesResult.value.find((item) => item.id === found.resourceId)
        : undefined;
      setResourceName(resource?.name ?? "Unknown resource");
    })();
  }, [id, status]);

  async function handleSubmit(payload: SubmitResult): Promise<ApiError | null> {
    if (payload.kind !== "reschedule") return null;
    const result = await api.rescheduleAppointment(id, payload.value);
    if (result.ok) {
      router.replace("/appointments");
      return null;
    }
    return result.error;
  }

  if (notFound) {
    return <p className="text-sm text-zinc-500">Appointment not found.</p>;
  }
  if (!appointment) {
    return <div className="text-sm text-zinc-500">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Reschedule appointment</h1>
      <AppointmentForm
        mode="reschedule"
        resources={[]}
        resourceName={resourceName}
        initial={{
          date: appointment.startAtLocal.slice(0, 10),
          startTime: appointment.startAtLocal.slice(11, 16),
          endTime: appointment.endAtLocal.slice(11, 16),
        }}
        submitLabel="Save"
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
      />
    </div>
  );
}
