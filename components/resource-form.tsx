"use client";

import { useState, type FormEvent } from "react";
import {
  createResourceInputSchema,
  type CreateResourceInput,
  type Resource,
} from "@/contract";
import type { ApiError } from "@/lib/api";
import { errorMessage } from "@/lib/api/error-message";
import { firstZodMessage } from "@/lib/validation";

type Props = {
  initial?: Resource;
  submitLabel?: string;
  onSubmit: (input: CreateResourceInput) => Promise<ApiError | null>;
  onCancel: () => void;
};

export function ResourceForm({ initial, submitLabel, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [timezone, setTimezone] = useState(initial?.timezone ?? "America/Los_Angeles");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const input = { name, description, timezone };
    const parsed = createResourceInputSchema.safeParse(input);
    if (!parsed.success) {
      setError(firstZodMessage(parsed.error));
      return;
    }

    setPending(true);
    const result = await onSubmit(parsed.data);
    setPending(false);
    if (result) setError(errorMessage(result));
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded border border-zinc-200 p-4"
    >
      <div>
        <label className="block text-sm font-medium">Name</label>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="w-full rounded border px-2 py-1"
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Description</label>
        <input
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="w-full rounded border px-2 py-1"
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Timezone</label>
        <input
          value={timezone}
          onChange={(event) => setTimezone(event.target.value)}
          className="w-full rounded border px-2 py-1"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-zinc-900 px-3 py-1 text-white disabled:opacity-50"
        >
          {pending ? "Saving..." : (submitLabel ?? (initial ? "Save" : "Create"))}
        </button>
        <button type="button" onClick={onCancel} className="rounded border px-3 py-1">
          Cancel
        </button>
      </div>
    </form>
  );
}
