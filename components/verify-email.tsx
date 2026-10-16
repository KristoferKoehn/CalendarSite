"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { emailSchema } from "@/contract";
import { getApiClient } from "@/lib/api";
import { useSession } from "@/lib/session/session-context";
import { firstZodMessage } from "@/lib/validation";

/**
 * One route, two jobs.
 *
 * With a `token` it redeems the confirmation link: that is where the emailed link points. The
 * token is consumed automatically rather than behind a button, because the person already
 * clicked a link in their email and asking them to click again would be asking them to confirm
 * that they confirmed.
 *
 * With no token it is the screen an unconfirmed account is sent to. That is deliberately the
 * same route: the guard sends people here, so this is the page that has to be useful to
 * somebody who has not got a link — it says what to do and offers to send another. Showing
 * them "that link did not work" for following the redirect would be blaming them for our
 * routing.
 */
export function VerifyEmail() {
  const token = useSearchParams().get("token") ?? "";
  return token ? <RedeemLink token={token} /> : <AwaitingConfirmation />;
}

/** Where a confirmed account goes next. */
const DETAILS_PATH = "/calendar/welcome";

function RedeemLink({ token }: { token: string }) {
  const { adoptSession } = useSession();
  const router = useRouter();
  const [outcome, setOutcome] = useState<"working" | "verified" | "failed">("working");
  const [message, setMessage] = useState<string | null>(null);
  // React runs effects twice in development. The token is single-use, so a second call would
  // fail and overwrite a success with an error.
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    getApiClient()
      .verifyEmail({ token })
      .then(async (result) => {
        if (!result.ok) {
          setOutcome("failed");
          setMessage(result.error.message);
          return;
        }
        // The response carries a session, so the details screen is already signed in. If it
        // could not be issued the address is still confirmed, so send them to sign in rather
        // than stranding them on a confirmation screen.
        if (result.value.token && (await adoptSession(result.value.token))) {
          router.replace(DETAILS_PATH);
          return;
        }
        setOutcome("verified");
      });
  }, [token, adoptSession, router]);

  if (outcome === "working") {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">Confirming your address…</p>;
  }

  if (outcome === "verified") {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Address confirmed</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Thanks — your address is confirmed. Sign in to carry on.
        </p>
        <Link
          href="/calendar/login"
          className="block w-full rounded bg-zinc-900 px-3 py-2 text-center text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">That link did not work</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-300">
        {message ??
          "Your address is confirmed, but we could not sign you in. Sign in with your password to continue."}
      </p>
      <p className="text-sm text-zinc-600 dark:text-zinc-300">
        <Link href="/calendar/resend-verification" className="underline">
          Send a new link
        </Link>
      </p>
    </div>
  );
}

/**
 * For somebody who is signed in but unconfirmed, or who has arrived here without a session.
 *
 * The address is prefilled from the session when there is one, so the common case is a single
 * button. When there is no session it asks, because there is nothing to infer it from.
 */
function AwaitingConfirmation() {
  const { user } = useSession();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  const address = user?.email ?? email;

  async function handleSend() {
    setError(null);

    const parsed = emailSchema.safeParse(address);
    if (!parsed.success) {
      setError(firstZodMessage(parsed.error));
      return;
    }

    setPending(true);
    const result = await getApiClient().resendVerification({ email: parsed.data });
    setPending(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setSent(true);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Confirm your email</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-300">
        {user
          ? "Your account is not open until you follow the link we emailed you."
          : "Follow the link we emailed you to finish setting up your account."}{" "}
        The link works once, and expires in 24 hours.
      </p>

      <div className="space-y-3">
        {!user && (
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
        )}

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        {sent ? (
          <p className="text-sm text-green-700 dark:text-green-400">
            Sent. Check <span className="font-medium">{address}</span> — and spam, before
            asking again.
          </p>
        ) : (
          <button
            type="button"
            onClick={handleSend}
            disabled={pending}
            className="w-full rounded bg-zinc-900 px-3 py-2 text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {pending ? "Sending…" : "Send a new link"}
          </button>
        )}

        {user && (
          <Link
            href="/calendar/login"
            className="block text-center text-sm text-zinc-500 underline underline-offset-2 dark:text-zinc-400"
          >
            Use a different account
          </Link>
        )}
      </div>
    </div>
  );
}
