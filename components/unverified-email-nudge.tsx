"use client";

import { useState } from "react";
import { getApiClient } from "@/lib/api";
import { useSession } from "@/lib/session/session-context";

/**
 * A quiet reminder that an address is unconfirmed.
 *
 * Confirming is a nudge, not a gate: the account works either way. Making it a gate would
 * lock out everyone who signed up before the feature existed, which is a support incident
 * rather than a security win. So this sits above the page, says what is true, and offers
 * the one action worth taking.
 */
export function UnverifiedEmailNudge() {
  const { user } = useSession();
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  // Nothing to say when the address is confirmed, or when the field is absent because the
  // API predates it.
  if (!user || user.emailVerifiedAt) return null;

  async function handleResend() {
    if (!user) return;
    setState("sending");
    setMessage(null);
    const result = await getApiClient().resendVerification({ email: user.email });
    if (result.ok) {
      setState("sent");
      return;
    }
    setState("error");
    setMessage(result.error.message);
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm dark:border-amber-900 dark:bg-amber-950/40 sm:px-6">
      <span className="text-amber-900 dark:text-amber-200">
        {state === "sent"
          ? `Confirmation link sent to ${user.email}.`
          : "Your email address is not confirmed yet."}
      </span>

      {state === "sent" ? (
        <span className="text-amber-800/80 dark:text-amber-300/80">
          Check your inbox — it can only be used once.
        </span>
      ) : (
        <button
          type="button"
          onClick={handleResend}
          disabled={state === "sending"}
          className="rounded border border-amber-300 px-2 py-0.5 text-xs text-amber-900 hover:bg-amber-100 disabled:opacity-50 dark:border-amber-800 dark:text-amber-200 dark:hover:bg-amber-900/40"
        >
          {state === "sending" ? "Sending…" : "Send confirmation link"}
        </button>
      )}

      {message && <span className="text-red-700 dark:text-red-300">{message}</span>}
    </div>
  );
}
