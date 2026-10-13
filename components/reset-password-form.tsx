"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { resetPasswordInputSchema } from "@/contract";
import { getApiClient } from "@/lib/api";
import { firstZodMessage } from "@/lib/validation";

/**
 * The token arrives in the query string, so this component reads URL state and must
 * sit inside a Suspense boundary — see the note in the page that renders it.
 */
export function ResetPasswordForm() {
  const api = getApiClient();
  const searchParams = useSearchParams();

  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  // A link with no token cannot work, so say so immediately rather than letting
  // someone fill in a form that is guaranteed to fail.
  if (!token) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Reset link incomplete</h1>
        <p className="text-sm text-zinc-600">
          This page needs the link from your email. It looks like the token is missing.
        </p>
        <p className="text-sm text-zinc-600">
          <Link href="/forgot-password" className="underline">
            Request a new link
          </Link>
        </p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Password changed</h1>
        <p className="text-sm text-zinc-600">
          Your password has been updated, and any other signed-in sessions have been
          ended.
        </p>
        <Link
          href="/login"
          className="block w-full rounded bg-zinc-900 px-3 py-2 text-center text-white"
        >
          Sign in
        </Link>
      </div>
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const parsed = resetPasswordInputSchema.safeParse({ token, newPassword: password });
    if (!parsed.success) {
      setError(firstZodMessage(parsed.error));
      return;
    }
    if (password !== confirm) {
      setError("The two passwords do not match.");
      return;
    }

    setPending(true);
    const result = await api.resetPassword(parsed.data);
    setPending(false);

    if (!result.ok) {
      // The link is single-use and expires, so a failure here usually means it was
      // already used or has timed out.
      setError(result.error.message);
      return;
    }
    setDone(true);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Choose a new password</h1>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="password" className="block text-sm font-medium">
            New password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded border px-2 py-1"
          />
          <p className="mt-1 text-xs text-zinc-500">At least 8 characters.</p>
        </div>
        <div>
          <label htmlFor="confirm" className="block text-sm font-medium">
            Confirm new password
          </label>
          <input
            id="confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            className="w-full rounded border px-2 py-1"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded bg-zinc-900 px-3 py-2 text-white disabled:opacity-50"
        >
          {pending ? "Saving..." : "Set new password"}
        </button>
      </form>
      <p className="text-sm text-zinc-600">
        <Link href="/forgot-password" className="underline">
          Need a new link?
        </Link>
      </p>
    </div>
  );
}
