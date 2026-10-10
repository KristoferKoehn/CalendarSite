"use client";

import { useEffect, useState } from "react";
import type { UpdateUserInput, User } from "@/contract";
import { getApiClient, type ApiError } from "@/lib/api";
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

  if (loading) {
    return <div className="text-sm text-zinc-500">Loading users...</div>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Users</h1>
      <ErrorBanner error={error} />
      <UserTable users={users} currentUserId={user?.id} onUpdate={handleUpdate} />
    </div>
  );
}
