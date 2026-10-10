"use client";

import { useState, type FormEvent } from "react";
import {
  appointmentCreateInputSchema,
  appointmentRescheduleInputSchema,
  type AppointmentCreateInput,
  type AppointmentRescheduleInput,
  type Resource,
} from "@/contract";
import type { ApiError } from "@/lib/api";
import { errorMessage } from "@/lib/api/error-message";
import { firstZodMessage } from "@/lib/validation";

export type SubmitResult =
  | { kind: "create"; value: AppointmentCreateInput }
  | { kind: "reschedule"; value: AppointmentRescheduleInput };

type Props = {
  mode: "create" | "reschedule";
  resources: Resource[];
  initial?: {
    date?: string;
    startTime?: string;
    endTime?: string;
    resourceId?: string;
  };
  resourceName?: string;
  submitLabel: string;
  onSubmit: (payload: SubmitResult) => Promise<ApiError | null>;
  onCancel: () => void;
};

export function AppointmentForm({
  mode,
  resources,
  initial,
  resourceName,
  submitLabel,
  onSubmit,
  onCancel,
}: Props) {
  const [resourceId, setResourceId] = useState(initial?.resourceId ?? "");
  const [date, setDate] = useState(initial?.date ?? "");
  const [startTime, setStartTime] = useState(initial?.startTime ?? "");
  const [endTime, setEndTime] = useState(initial?.endTime ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (mode === "create") {
      const parsed = appointmentCreateInputSchema.safeParse({
        resourceId,
        date,
        startTime,
        endTime,
      });
      if (!parsed.success) {
        setError(firstZodMessage(parsed.error));
        return;
      }
      setPending(true);
      const result = await onSubmit({ kind: "create", value: parsed.data });
      setPending(false);
      if (result) setError(errorMessage(result));
      return;
    }

    const parsed = appointmentRescheduleInputSchema.safeParse({
      date,
      startTime,
      endTime,
    });
    if (!parsed.success) {
      setError(firstZodMessage(parsed.error));
      return;
    }
    setPending(true);
    const result = await onSubmit({ kind: "reschedule", value: parsed.data });
    setPending(false);
    if (result) setError(errorMessage(result));
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-md space-y-3 rounded border border-zinc-200 p-4"
    >
      {mode === "create" ? (
        <div>
          <label className="block text-sm font-medium">Resource</label>
          <select
            value={resourceId}
            onChange={(event) => setResourceId(event.target.value)}
            className="w-full rounded border px-2 py-1"
          >
            <option value="" disabled>
              Select a resource
            </option>
            {resources.map((resource) => (
              <option key={resource.id} value={resource.id}>
                {resource.name}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <p className="text-sm text-zinc-600">
          Resource: {resourceName ?? "Unknown"}
        </p>
      )}

      <div>
        <label className="block text-sm font-medium">Date</label>
        <input
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          className="w-full rounded border px-2 py-1"
        />
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-sm font-medium">Start time</label>
          <input
            type="time"
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
            className="w-full rounded border px-2 py-1"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium">End time</label>
          <input
            type="time"
            value={endTime}
            onChange={(event) => setEndTime(event.target.value)}
            className="w-full rounded border px-2 py-1"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-zinc-900 px-3 py-1 text-white disabled:opacity-50"
        >
          {pending ? "Saving..." : submitLabel}
        </button>
        <button type="button" onClick={onCancel} className="rounded border px-3 py-1">
          Cancel
        </button>
      </div>
    </form>
  );
}
