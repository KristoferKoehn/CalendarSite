"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { profileUpdateInputSchema } from "@/contract";
import { getApiClient } from "@/lib/api";
import { useSession } from "@/lib/session/session-context";
import {
  birthdayIsPartial,
  draftToProfile,
  emptyProfileDraft,
  ProfileFields,
  type ProfileDraft,
} from "@/components/profile-fields";
import { firstZodMessage } from "@/lib/validation";

/**
 * The screen a confirmation link leads to: who are you?
 *
 * Outside the app shell on purpose. This is the last step of joining, not a page inside a site
 * that has already let you in, and showing the calendar navigation here would say the opposite
 * of what the guard enforces.
 *
 * Skippable. Confirmation is what opens the site; a display name is asked for because it is
 * what makes a shared calendar readable, not because it should stand between somebody and
 * their bookings. The confirmation link is already behind us, so there is no link to resend
 * and no way back to this screen except by asking — which means a required field here would be
 * a dead end for anybody who did not want to give a name.
 */
export default function WelcomePage() {
  const { status, user, setUser, logout } = useSession();
  const router = useRouter();
  const [draft, setDraft] = useState<ProfileDraft>(emptyProfileDraft);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Arriving here without a session is either a stale bookmark or a hand-typed URL. There is
  // no recovery from this page itself: the details belong to an account.
  useEffect(() => {
    if (status === "anonymous") router.replace("/login");
  }, [status, router]);

  // Already confirmed and already named. Sending somebody back through a form they have
  // completed would be a worse greeting than the calendar.
  useEffect(() => {
    if (status === "authenticated" && user?.displayName?.trim()) {
      router.replace("/today");
    }
  }, [status, user, router]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (birthdayIsPartial(draft)) {
      setError("Please give both a birth month and a day, or neither.");
      return;
    }

    const parsed = profileUpdateInputSchema.safeParse(
      draftToProfile(draft, { clearWhenEmpty: true }),
    );
    if (!parsed.success) {
      setError(firstZodMessage(parsed.error));
      return;
    }

    setPending(true);
    const result = await getApiClient().updateProfile(parsed.data);
    setPending(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    // Update the session first, then navigate. Not strictly needed now that the gate only
    // checks confirmation, but leaving a stale user in context would make the rest of the app
    // render as though nothing had been saved.
    setUser(result.value);
    router.replace("/today");
  }

  if (status === "loading") {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>;
  }
  if (!user) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Your details</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          <span className="font-medium">{user.email}</span> is confirmed. Add as much or as
          little as you like — you can change all of it later in Settings.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <ProfileFields
          draft={draft}
          onChange={setDraft}
          emailForPlaceholder={user.email}
          showDisplayNameHint={false}
        />

        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Everyone signed in can see these. A display name is what shows on the calendar
          instead of your email address.
        </p>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded bg-zinc-900 px-3 py-2 text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {pending ? "Saving…" : "Continue"}
        </button>

        <Link
          href="/today"
          className="block text-center text-sm text-zinc-500 underline underline-offset-2 dark:text-zinc-400"
        >
          Skip for now
        </Link>
      </form>

      <button
        type="button"
        onClick={() => {
          logout();
          router.replace("/login");
        }}
        className="text-sm text-zinc-500 underline underline-offset-2 dark:text-zinc-400"
      >
        Sign out
      </button>
    </div>
  );
}
