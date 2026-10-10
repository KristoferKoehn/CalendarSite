"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CreateResourceInput, Resource } from "@/contract";
import { getApiClient, type ApiError } from "@/lib/api";
import { useSession } from "@/lib/session/session-context";
import { ErrorBanner } from "@/components/error-banner";
import { ResourceForm } from "@/components/resource-form";

const api = getApiClient();

export default function ResourcesPage() {
  const { user, status } = useSession();
  const isAdmin = user?.role === "admin";

  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Resource | null>(null);

  async function reload() {
    setLoading(true);
    setError(null);
    const result = await api.listResources();
    setLoading(false);
    if (result.ok) setResources(result.value);
    else setError(result.error);
  }

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    api.listResources().then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (result.ok) setResources(result.value);
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
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Resources</h1>
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
        <p className="text-sm text-zinc-500">No resources yet.</p>
      ) : (
        <ul className="divide-y rounded border border-zinc-200">
          {resources.map((resource) => (
            <li key={resource.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1">
                <div className="font-medium">{resource.name}</div>
                {resource.description && (
                  <div className="text-sm text-zinc-500">{resource.description}</div>
                )}
              </div>
              <Link
                href={`/appointments/new?resourceId=${resource.id}`}
                className="rounded border px-2 py-1 text-sm"
              >
                Book
              </Link>
              {isAdmin && (
                <>
                  <button
                    onClick={() => {
                      setCreating(false);
                      setEditing(resource);
                    }}
                    className="rounded border px-2 py-1 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeactivate(resource.id)}
                    className="rounded border px-2 py-1 text-sm"
                  >
                    Deactivate
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
