"use client";

import { useEffect, useState } from "react";
import { formatBirthday, userLabel, type User } from "@/contract";
import { getApiClient, type ApiError } from "@/lib/api";
import { ErrorBanner } from "@/components/error-banner";

const api = getApiClient();

export default function PeoplePage() {
  const [people, setPeople] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    let cancelled = false;
    void api.listUsers().then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (result.ok) setPeople(result.value);
      else setError(result.error);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <p className="text-sm text-zinc-500">Loading people…</p>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">People</h1>
      <p className="text-sm text-zinc-500">
        Everyone with an account. Each person controls their own details in
        Settings.
      </p>

      <ErrorBanner error={error} />

      {people.length === 0 ? (
        <p className="text-sm text-zinc-500">Nobody here yet.</p>
      ) : (
        <ul className="max-w-2xl divide-y divide-zinc-200 rounded border border-zinc-200">
          {people.map((person) => {
            const birthday = formatBirthday(person.birthMonth, person.birthDay);
            return (
              <li key={person.id} className="space-y-1 px-4 py-3">
                <div className="flex items-baseline gap-2">
                  <span className="font-medium">{userLabel(person)}</span>
                  {person.pronouns && (
                    <span className="text-sm text-zinc-500">
                      ({person.pronouns})
                    </span>
                  )}
                  {person.role === "admin" && (
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600">
                      admin
                    </span>
                  )}
                  {person.isAgent && (
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600">
                      agent
                    </span>
                  )}
                </div>
                {person.jobTitle && (
                  <div className="text-sm text-zinc-600">{person.jobTitle}</div>
                )}
                <div className="text-sm text-zinc-500">{person.email}</div>
                {birthday && (
                  <div className="text-sm text-zinc-500">
                    Birthday: {birthday}
                  </div>
                )}
                {person.bio && (
                  <div className="text-sm text-zinc-600">{person.bio}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
