"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { registerInputSchema } from "@/contract";
import { useSession } from "@/lib/session/session-context";
import { firstZodMessage } from "@/lib/validation";
import {
  birthdayIsPartial,
  draftToProfile,
  emptyProfileDraft,
  ProfileFields,
  type ProfileDraft,
} from "@/components/profile-fields";

export default function RegisterPage() {
  const { status, register } = useSession();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [profile, setProfile] = useState<ProfileDraft>(emptyProfileDraft);
  const [showProfile, setShowProfile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (status === "authenticated") router.replace("/appointments");
  }, [status, router]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const parsed = registerInputSchema.safeParse({
      email,
      password,
      ...draftToProfile(profile),
    });
    if (!parsed.success) {
      // A half-filled birthday is the likely failure here, and it is only reachable from the
      // optional section, so open it rather than reporting an error against a hidden field.
      if (birthdayIsPartial(profile)) setShowProfile(true);
      setError(firstZodMessage(parsed.error));
      return;
    }

    setPending(true);
    const result = await register(parsed.data);
    setPending(false);
    if (result) {
      setError(result.message);
      return;
    }
    router.replace("/appointments");
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Create account</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-3">
          <label className="block text-sm">
            Email
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 block w-full rounded border border-zinc-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <label className="block text-sm">
            Password
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 block w-full rounded border border-zinc-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
            />
            <span className="text-xs text-zinc-500 dark:text-zinc-400">8+ characters</span>
          </label>
        </div>

        {/* Optional, and folded away by default: two fields is a sign-up, and a wall of
            questions is a reason not to finish one. Anyone who wants to say who they are can,
            and everyone else can do it later in Settings. */}
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => setShowProfile((value) => !value)}
            aria-expanded={showProfile}
            className="flex w-full items-center gap-1.5 px-3 py-2 text-left text-sm"
          >
            <span aria-hidden="true" className="text-xs text-zinc-400">
              {showProfile ? "▾" : "▸"}
            </span>
            Add your details
            <span className="text-zinc-500 dark:text-zinc-400">(optional)</span>
          </button>

          {showProfile && (
            <div className="space-y-3 border-t border-zinc-100 p-3 dark:border-zinc-800">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Everyone signed in can see these. Adding a name shows it on the calendar
                instead of your email address.
              </p>
              <ProfileFields
                draft={profile}
                onChange={setProfile}
                emailForPlaceholder={email || undefined}
              />
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded bg-zinc-900 px-3 py-2 text-white disabled:opacity-50"
        >
          {pending ? "Creating..." : "Create account"}
        </button>
      </form>
      <p className="text-sm text-zinc-600">
        Have an account?{" "}
        <Link href="/login" className="underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
