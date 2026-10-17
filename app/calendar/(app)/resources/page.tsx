"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CreateResourceInput, Resource } from "@/contract";
import { getApiClient, type ApiError } from "@/lib/api";
import { sortResources } from "@/lib/resources";
import { cal } from "@/lib/paths";
import { CARD_LIST, PAGE_TITLE, ROW_PADDING } from "@/lib/card";
import { useSession } from "@/lib/session/session-context";
import { ErrorBanner } from "@/components/error-banner";
import { ResourceForm } from "@/components/resource-form";
import { ResourceRename } from "@/components/resource-rename";

const api = getApiClient();

export default function ResourcesPage() {
  const { user, status } = useSession();
  const isAdmin = user?.role === "admin";

  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Resource | null>(null);
  /** The resource currently being renamed in place, if any. */
  const [renaming, setRenaming] = useState<Resource | null>(null);

  async function reload() {
    setLoading(true);
    setError(null);
    const result = await api.listResources();
    setLoading(false);
    if (result.ok) setResources(sortResources(result.value));
    else setError(result.error);
  }

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    api.listResources().then((result) => {
      if (cancelled) return;
      setLoading(false);
      // Sorted at the point the data is stored, so the list is alphabetical however it
      // arrived and stays that way after a create or an edit.
      if (result.ok) setResources(sortResources(result.value));
      else setError(result.error);
    });
    return () => {
      cancelled = true;
    };
  }, [status]);

  async function handleCreate(input: CreateResourceInput): Promise<ApiError | null> {
    const result = await api.createResource(input);
    if (result.ok) {
      setCreating(false);
      await reload();
      return null;
    }
    return result.error;
  }

  async function handleUpdate(input: CreateResourceInput): Promise<ApiError | null> {
    if (!editing) return null;
    const result = await api.updateResource(editing.id, input);
    if (result.ok) {
      setEditing(null);
      await reload();
      return null;
    }
    return result.error;
  }

  /**
   * Rename a room, sending only the name.
   *
   * A partial PATCH, so the description and timezone are left exactly as they were rather than
   * being echoed back from a form that never showed them.
   */
  async function handleRename(resource: Resource, name: string): Promise<ApiError | null> {
    setError(null);
    const result = await api.updateResource(resource.id, { name });
    if (result.ok) {
      setRenaming(null);
      await reload();
      return null;
    }
    return result.error;
  }

  async function handleDeactivate(id: string) {
    setError(null);
    const result = await api.deactivateResource(id);
    if (result.ok) await reload();
    else setError(result.error);
  }

  if (loading) {
    return <div className="text-sm text-zinc-500">Loading resources...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className={PAGE_TITLE}>Resources</h1>
        {isAdmin && (
          <button
            onClick={() => {
              setEditing(null);
              setCreating(true);
            }}
            className="rounded bg-zinc-900 px-3 py-1 text-white"
          >
            New
          </button>
        )}
      </div>

      <ErrorBanner error={error} />

      {creating && <ResourceForm onSubmit={handleCreate} onCancel={() => setCreating(false)} />}
      {editing && (
        <ResourceForm
          initial={editing}
          onSubmit={handleUpdate}
          onCancel={() => setEditing(null)}
        />
      )}

      {resources.length === 0 && !creating ? (
        <div className="rounded-lg border border-dashed border-zinc-300 px-6 py-10 text-center dark:border-zinc-700">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {isAdmin ? "No resources yet. Add one to start taking bookings." : "No resources yet."}
          </p>
        </div>
      ) : (
        <ul className={CARD_LIST}>
          {resources.map((resource) => {
            const isRenaming = renaming?.id === resource.id;
            return (
              <li key={resource.id} className={`flex flex-wrap items-center gap-x-3 gap-y-2 ${ROW_PADDING}`}>
                {isRenaming ? (
                  <ResourceRename
                    resource={resource}
                    onSubmit={(name) => handleRename(resource, name)}
                    onCancel={() => setRenaming(null)}
                  />
                ) : (
                  <>
                    {/* min-w-0 so a long name or description wraps instead of widening the row. */}
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-zinc-900 dark:text-zinc-50">{resource.name}</div>
                      {resource.description && (
                        <div className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                          {resource.description}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={cal(`/appointments/new?resourceId=${resource.id}`)}
                        className="rounded border border-zinc-300 px-2 py-1 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                      >
                        Book
                      </Link>
                      {isAdmin && (
                        <>
                          {/* Named for what it does, rather than Edit opening a form where
                              renaming is one field among three. */}
                          <button
                            onClick={() => {
                              setCreating(false);
                              setEditing(null);
                              setRenaming(resource);
                            }}
                            className="rounded border border-zinc-300 px-2 py-1 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                          >
                            Rename
                          </button>
                          <button
                            onClick={() => {
                              setCreating(false);
                              setRenaming(null);
                              setEditing(resource);
                            }}
                            className="rounded border border-zinc-300 px-2 py-1 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                          >
                            Details
                          </button>
                          <button
                            onClick={() => handleDeactivate(resource.id)}
                            className="rounded border border-zinc-300 px-2 py-1 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                          >
                            Deactivate
                          </button>
                        </>
                      )}
                    </div>
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
