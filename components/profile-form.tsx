"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@/contract";
import { profileUpdateInputSchema, userLabel } from "@/contract";
import { getApiClient, type ApiError } from "@/lib/api";
import { useSession } from "@/lib/session/session-context";
import { ErrorBanner } from "@/components/error-banner";
import {
  birthdayIsPartial,
  draftToProfile,
  ProfileFields,
  profileDraft,
} from "@/components/profile-fields";
import { firstZodMessage } from "@/lib/validation";

const api = getApiClient();

export function ProfileForm({ user }: { user: User }) {
  const { setUser } = useSession();
  const [draft, setDraft] = useState(() => profileDraft(user));
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<ApiError | string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);

    if (birthdayIsPartial(draft)) {
      setError("Please provide both a birth month and a day, or neither.");
      return;
    }

    // clearWhenEmpty: on an existing profile a blank birthday means "remove it", which the
    // API is told with an explicit null pair.
    const payload = draftToProfile(draft, { clearWhenEmpty: true });
    const parsed = profileUpdateInputSchema.safeParse(payload);
    if (!parsed.success) {
      setError(firstZodMessage(parsed.error));
      return;
    }

    setPending(true);
    const result = await api.updateProfile(parsed.data);
    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    setUser(result.value);
    setSaved(true);
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
      <div>
        <p className="text-lg font-medium">Your details</p>
        <p className="text-sm text-zinc-500">
          Everyone signed in can see these, alongside your bookings. Saving shows
          your name on the calendar instead of your email address.
        </p>
      </div>

      <ProfileFields
        draft={draft}
        onChange={setDraft}
        emailForPlaceholder={user.email}
      />

      <ErrorBanner error={error} />
      {saved && <p className="text-sm text-green-700">Saved.</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-zinc-900 px-3 py-1 text-white disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}

export function DangerZone({ user }: { user: User }) {
  const { logout } = useSession();
  const router = useRouter();
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const armed = confirmation.trim().toLowerCase() === user.email.toLowerCase();

  async function handleDelete() {
    setError(null);
    setPending(true);
    const result = await api.deleteAccount();
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    logout();
    router.replace("/login");
  }

  return (
    <section className="max-w-xl space-y-3 rounded border border-red-300 p-4">
      <div>
        <p className="text-lg font-medium text-red-700">Delete account</p>
        <p className="text-sm text-zinc-600">
          This permanently deletes your account and cannot be undone.
        </p>
        <p className="mt-2 text-sm text-zinc-600">
          <strong>Your bookings are kept.</strong> They stay on the calendar,
          labelled with your email address, because they are part of the shared
          schedule rather than personal property. Deleting your account does not
          remove them.
        </p>
        <p className="mt-2 text-sm text-zinc-600">
          You will be signed out immediately. Anything you booked remains visible
          to everyone else.
        </p>
      </div>

      <label className="block text-sm">
        Type <span className="font-mono">{user.email}</span> to confirm
        <input
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          className="mt-1 block w-full rounded border px-2 py-1"
          autoComplete="off"
        />
      </label>

      <ErrorBanner error={error} />

      <button
        type="button"
        onClick={handleDelete}
        disabled={!armed || pending}
        className="rounded bg-red-700 px-3 py-1 text-white disabled:opacity-40"
      >
        {pending ? "Deleting…" : "Delete my account"}
      </button>
    </section>
  );
}

export function AccountSummary({ user }: { user: User }) {
  return (
    <section className="max-w-xl space-y-1 rounded border border-zinc-200 p-4 text-sm">
      <p className="text-lg font-medium">Account</p>
      <p>
        <span className="text-zinc-500">Email: </span>
        {user.email}
      </p>
      <p>
        <span className="text-zinc-500">Shown as: </span>
        {userLabel(user)}
      </p>
      <p>
        <span className="text-zinc-500">Role: </span>
        {user.role}
      </p>
      {user.isAgent && (
        <p>
          <span className="text-zinc-500">Agent account: </span>
          yes
        </p>
      )}
      <p className="text-xs text-zinc-500">
        Your email address cannot be changed here.
      </p>
    </section>
  );
}
