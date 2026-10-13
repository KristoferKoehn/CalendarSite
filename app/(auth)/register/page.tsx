"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { registerInputSchema } from "@/contract";
import { getApiClient } from "@/lib/api";
import { LANDING } from "@/lib/landing";
import { useSession } from "@/lib/session/session-context";
import { firstZodMessage } from "@/lib/validation";

/**
 * Signing up is two fields and one instruction.
 *
 * The account is created but not entered: confirmation gates access, so the only useful thing
 * to say next is to check the inbox. Details are collected on the screen the link leads to,
 * where the address has been proven and the account is worth describing.
 *
 * It deliberately does not sign the person in. A session here would mean an unconfirmed
 * account sitting inside the app, and the gate would have to explain itself on every screen
 * rather than once, here.
 */
export default function RegisterPage() {
  const { status } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  // Somebody already signed in has no business here.
  useEffect(() => {
    if (status === "authenticated") {
      window.location.replace(LANDING);
    }
  }, [status]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const parsed = registerInputSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(firstZodMessage(parsed.error));
      return;
    }

    setPending(true);
    const result = await getApiClient().register(parsed.data);
    setPending(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    // Nowhere else: telling somebody their account exists is only true if they can get into
    // it, and they cannot until they follow the link.
    setSent(true);
  }

  if (sent) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Check your email</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          We sent a confirmation link to <span className="font-medium">{email}</span>.
          Follow it to finish setting up your account — the link works once, and expires in
          24 hours.
        </p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Nothing there? Look in spam before asking for another.
        </p>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          <Link href="/resend-verification" className="underline">
            Send a new link
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Create account</h1>
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
            className="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400">8+ characters</p>
        </div>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded bg-zinc-900 px-3 py-2 text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {pending ? "Creating..." : "Create account"}
        </button>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          You will add your name and the rest after confirming your address.
        </p>
      </form>
      <p className="text-sm text-zinc-600 dark:text-zinc-300">
        Have an account?{" "}
        <Link href="/login" className="underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
