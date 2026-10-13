"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { forgotPasswordInputSchema } from "@/contract";
import { getApiClient } from "@/lib/api";
import { firstZodMessage } from "@/lib/validation";

export default function ForgotPasswordPage() {
  const api = getApiClient();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const parsed = forgotPasswordInputSchema.safeParse({ email });
    if (!parsed.success) {
      setError(firstZodMessage(parsed.error));
      return;
    }

    setPending(true);
    const result = await api.forgotPassword(parsed.data);
    setPending(false);

    if (!result.ok) {
      // Only a transport or server fault lands here. A missing account does not:
      // the server answers the same way for every address.
      setError(result.error.message);
      return;
    }

    setSent(true);
  }

  // Deliberately shown for every address, including ones with no account. Saying
  // "no account with that email" would turn this page into a way to check who has
  // signed up, and it would be wrong about accounts the sender mistyped.
  if (sent) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Check your email</h1>
        <p className="text-sm text-zinc-600">
          If an account exists for <span className="font-medium">{email}</span>, a
          reset link is on its way. It can only be used once.
        </p>
        <p className="text-sm text-zinc-500">
          Nothing after a few minutes? Check your spam folder, then try again.
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
      <h1 className="text-xl font-semibold">Reset your password</h1>
      <p className="text-sm text-zinc-600">
        Enter your email address and we will send you a link to choose a new password.
      </p>
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
          {pending ? "Sending..." : "Send reset link"}
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
