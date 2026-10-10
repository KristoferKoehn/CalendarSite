"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Resource } from "@/contract";
import { getApiClient, type ApiError } from "@/lib/api";
import { useSession } from "@/lib/session/session-context";
import {
  AppointmentForm,
  type SubmitResult,
} from "@/components/appointment-form";

const api = getApiClient();

export function NewAppointmentContent() {
  const router = useRouter();
  const { status } = useSession();
  const searchParams = useSearchParams();
  const resourceId = searchParams.get("resourceId") ?? "";

  const [resources, setResources] = useState<Resource[]>([]);

  useEffect(() => {
    if (status !== "authenticated") return;
    void api.listResources().then((result) => {
      if (result.ok) setResources(result.value);
    });
  }, [status]);

  async function handleSubmit(payload: SubmitResult): Promise<ApiError | null> {
    if (payload.kind !== "create") return null;
    const result = await api.createAppointment(payload.value);
    if (result.ok) {
      router.replace("/appointments");
      return null;
    }
    return result.error;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">New appointment</h1>
      <AppointmentForm
        mode="create"
        resources={resources}
        initial={{ resourceId }}
        submitLabel="Create"
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
      />
    </div>
  );
}
