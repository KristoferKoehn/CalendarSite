"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { emailSchema } from "@/contract";
import { getApiClient } from "@/lib/api";
import { firstZodMessage } from "@/lib/validation";

/**
 * Ask for a new verification link.
 *
 * Signed out on purpose, because the common case is a link that expired or was opened on
 * another device. The page confirms for every address rather than reporting whether one
 * has an account.
 */
export function ResendVerification() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setError(firstZodMessage(parsed.error));
      return;
    }

    setPending(true);
    const result = await getApiClient().resendVerification({ email: parsed.data });
    setPending(false);

    if (!result.ok) {
      // "Already verified" is the one useful failure: it saves waiting for a link that
      // will not be sent. Everything else is reported generically.
      setError(result.error.message);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Check your email</h1>
        <p className="text-sm text-zinc-600">
          If <span className="font-medium">{email}</span> needs confirming, a new link is on
          its way. It can only be used once.
        </p>
        <p className="text-sm text-zinc-600">
          <Link href="/login" className="underline">
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Send a new confirmation link</h1>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="email" className="block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded border px-2 py-1"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded bg-zinc-900 px-3 py-2 text-white disabled:opacity-50"
        >
          {pending ? "Sending..." : "Send new link"}
        </button>
      </form>
      <p className="text-sm text-zinc-600">
        <Link href="/login" className="underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
