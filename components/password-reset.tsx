"use client";

import { useState } from "react";
import type { User } from "@/contract";
import { getApiClient, type ApiError } from "@/lib/api";
import { ErrorBanner } from "@/components/error-banner";
import { CARD_SURFACE } from "@/lib/card";

const api = getApiClient();

/**
 * Ask for a password reset link, from Settings.
 *
 * Sends the link rather than collecting a new password here, because there is only one way
 * to change a password and it is the reset flow. A second, in-page form would need its own
 * rules for the current password, its own idea of what makes a password acceptable, and its
 * own decision about whether other sessions survive — three chances to disagree with the
 * flow that already exists. It would also be the only place in the product where a password
 * is typed into a page reached by a session that might not be the owner's.
 *
 * The link goes to the address on the account, not to anything typed here, so this cannot
 * be used to send mail to somebody else.
 */
export function PasswordReset({ user }: { user: User }) {
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<ApiError | null>(null);

  async function handleSend() {
    setError(null);
    setState("sending");
    const result = await api.forgotPassword({ email: user.email });
    if (result.ok) {
      setState("sent");
      return;
    }
    setState("idle");
    setError(result.error);
  }

  return (
    <section className={`max-w-xl space-y-3 p-4 ${CARD_SURFACE}`}>
      <div>
        <p className="text-lg font-medium">Password</p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          We will email a link to <span className="font-medium">{user.email}</span>.
          Opening it lets you choose a new password. The link works once and expires, and
          using it signs out every other session.
        </p>
      </div>

      <ErrorBanner error={error} />

      {state === "sent" ? (
        <p className="text-sm text-green-700 dark:text-green-400">
          Sent. Check your inbox — if it does not arrive, look in spam before trying again.
        </p>
      ) : (
        <button
          type="button"
          onClick={handleSend}
          disabled={state === "sending"}
          className="rounded border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          {state === "sending" ? "Sending…" : "Send password reset link"}
        </button>
      )}
    </section>
  );
}
