"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getApiClient } from "@/lib/api";
import { useSession } from "@/lib/session/session-context";

/**
 * Redeems a verification link.
 *
 * The token is consumed automatically rather than behind a button: the person clicked a
 * link in their email, so asking them to click again would be asking them to confirm that
 * they confirmed.
 *
 * The outer component only reads the query string, which is what needs the Suspense
 * boundary. The inner one owns the request, keyed on the token so a different link would
 * start a fresh attempt.
 */
export function VerifyEmail() {
  const token = useSearchParams().get("token") ?? "";
  return <VerifyEmailToken token={token} />;
}

function VerifyEmailToken({ token }: { token: string }) {
  const { status, refresh } = useSession();
  const [outcome, setOutcome] = useState<"working" | "verified" | "failed">("working");
  const [message, setMessage] = useState<string | null>(null);
  // React runs effects twice in development. The token is single-use, so a second call
  // would fail and overwrite a success with an error.
  const attempted = useRef(false);

  useEffect(() => {
    // A missing token is handled by rendering rather than in the effect: deriving it avoids
    // a state update during an effect for something that never needed to be asynchronous.
    if (!token || attempted.current) return;
    attempted.current = true;

    getApiClient()
      .verifyEmail({ token })
      .then((result) => {
        if (result.ok) {
          setOutcome("verified");
          // Re-read the user so the "unconfirmed" nudge disappears without a reload.
          void refresh();
          return;
        }
        setOutcome("failed");
        setMessage(result.error.message);
      });
  }, [token, refresh]);

  if (!token) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">That link did not work</h1>
        <p className="text-sm text-zinc-600">
          This page needs the link from your email. It looks like the token is missing.
        </p>
        <p className="text-sm text-zinc-600">
          <Link href="/resend-verification" className="underline">
            Send a new link
          </Link>
        </p>
      </div>
    );
  }

  if (outcome === "working") {
    return <p className="text-sm text-zinc-500">Confirming your address…</p>;
  }

  if (outcome === "verified") {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Address confirmed</h1>
        <p className="text-sm text-zinc-600">
          Thanks — your address is confirmed. You can carry on as normal.
        </p>
        <Link
          href={status === "authenticated" ? "/today" : "/login"}
          className="block w-full rounded bg-zinc-900 px-3 py-2 text-center text-white"
        >
          {status === "authenticated" ? "Go to the calendar" : "Sign in"}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">That link did not work</h1>
      <p className="text-sm text-zinc-600">{message}</p>
      <p className="text-sm text-zinc-600">
        <Link href="/resend-verification" className="underline">
          Send a new link
        </Link>
      </p>
    </div>
  );
}
