"use client";

import { useState } from "react";
import type { UpdateUserInput, User } from "@/contract";
import type { ApiError } from "@/lib/api";
import { errorMessage } from "@/lib/api/error-message";

type Props = {
  users: User[];
  currentUserId: string | undefined;
  onUpdate: (id: string, input: UpdateUserInput) => Promise<ApiError | null>;
  onDelete: (id: string) => Promise<ApiError | null>;
};

export function UserTable({ users, currentUserId, onUpdate, onDelete }: Props) {
  const [error, setError] = useState<string | null>(null);

  async function update(id: string, input: UpdateUserInput) {
    setError(null);
    const result = await onUpdate(id, input);
    if (result) setError(errorMessage(result));
  }

  async function remove(id: string) {
    setError(null);
    const result = await onDelete(id);
    if (result) setError(errorMessage(result));
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-2">Email</th>
            <th>Role</th>
            <th>Agent</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            const isSelf = user.id === currentUserId;
            return (
              <tr key={user.id} className="border-b">
                <td className="py-2">{user.email}</td>
                <td>{user.role}</td>
                <td>
                  <input
                    type="checkbox"
                    checked={user.isAgent}
                    disabled={isSelf}
                    onChange={(event) => update(user.id, { isAgent: event.target.checked })}
                  />
                </td>
                <td className="space-x-2">
                  {!isSelf && (
                    <button
                      onClick={() =>
                        update(user.id, {
                          role: user.role === "admin" ? "user" : "admin",
                        })
                      }
                      className="rounded border px-2 py-1"
                    >
                      {user.role === "admin" ? "Remove admin" : "Make admin"}
                    </button>
                  )}
                  {!isSelf && (
                    <button
                      onClick={() => {
                        if (window.confirm("Delete this user?")) {
                          void remove(user.id);
                        }
                      }}
                      className="rounded border px-2 py-1 text-red-600"
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
