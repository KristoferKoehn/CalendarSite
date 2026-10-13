"use client";

import { useState, type FormEvent } from "react";
import type { Resource } from "@/contract";
import { createResourceInputSchema } from "@/contract";
import type { ApiError } from "@/lib/api";
import { errorMessage } from "@/lib/api/error-message";
import { firstZodMessage } from "@/lib/validation";

/**
 * Rename a room in place.
 *
 * The full edit form can already change a name, but it asks for a description and a timezone
 * to do it, and renaming is the common case — a room called "Room A" that everyone knows as
 * something else. A partial PATCH means the name can be sent on its own, so this asks for one
 * field and nothing else.
 */
export function ResourceRename({
  resource,
  onSubmit,
  onCancel,
}: {
  resource: Resource;
  onSubmit: (name: string) => Promise<ApiError | null>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(resource.name);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const trimmed = name.trim();
    if (trimmed === resource.name) {
      // Nothing changed, so there is nothing to send. Closing is the honest response.
      onCancel();
      return;
    }

    // The same bounds the server enforces, checked here so a message appears without a round
    // trip. A name-only object is valid because the update schema is partial.
    const parsed = createResourceInputSchema.pick({ name: true }).safeParse({ name: trimmed });
    if (!parsed.success) {
      setError(firstZodMessage(parsed.error));
      return;
    }

    setPending(true);
    const result = await onSubmit(parsed.data.name);
    setPending(false);
    if (result) setError(errorMessage(result));
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor={`rename-${resource.id}`}>
        New name for {resource.name}
      </label>
      <input
        id={`rename-${resource.id}`}
        // Focused on open, because somebody who clicked Rename has already decided to type.
        autoFocus
        value={name}
        onChange={(event) => setName(event.target.value)}
        maxLength={200}
        className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-zinc-900 px-2 py-1 text-sm text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? "Saving…" : "Save"}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="rounded border border-zinc-300 px-2 py-1 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
      >
        Cancel
      </button>
      {error && <span className="text-sm text-red-600 dark:text-red-400">{error}</span>}
    </form>
  );
}
