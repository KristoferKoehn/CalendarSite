"use client";

import { useEffect, useState } from "react";
import type { UpdateUserInput, User } from "@/contract";
import { getApiClient, type ApiError } from "@/lib/api";
import { adminPath } from "@/lib/paths";
import { useSession } from "@/lib/session/session-context";
import { ErrorBanner } from "@/components/error-banner";
import { UserTable } from "@/components/user-table";

const api = getApiClient();

export default function AdminUsersPage() {
  const { user, status } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  async function reload() {
    setLoading(true);
    setError(null);
    const result = await api.listUsers();
    setLoading(false);
    if (result.ok) setUsers(result.value);
    else setError(result.error);
  }

  useEffect(() => {
    if (status !== "authenticated" || user?.role !== "admin") return;
    let cancelled = false;
    api.listUsers().then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (result.ok) setUsers(result.value);
      else setError(result.error);
    });
    return () => {
      cancelled = true;
    };
  }, [status, user]);

  async function handleUpdate(
    id: string,
    input: UpdateUserInput,
  ): Promise<ApiError | null> {
    setError(null);
    const result = await api.updateUser(id, input);
    if (result.ok) {
      await reload();
      return null;
    }
    return result.error;
  }

  async function handleDelete(id: string): Promise<ApiError | null> {
    setError(null);
    const result = await api.deleteUser(id);
    if (result.ok) {
      await reload();
      return null;
    }
    return result.error;
  }

  if (loading) {
    return <div className="text-sm text-zinc-500">Loading users...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-xl font-semibold">Users</h1>
        {/* The two administrative surfaces link to each other, so neither is reachable only by
            remembering its address. */}
        <a
          href={adminPath("/projects")}
          className="text-sm text-zinc-500 underline-offset-2 hover:underline dark:text-zinc-400"
        >
          Projects →
        </a>
      </div>
      <ErrorBanner error={error} />
      <UserTable
        users={users}
        currentUserId={user?.id}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />
    </div>
  );
}
