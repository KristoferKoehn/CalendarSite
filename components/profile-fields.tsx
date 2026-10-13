"use client";

import type { ProfileUpdateInput } from "@/contract";
import { formatBirthday } from "@/contract";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const FIELD = "mt-1 block w-full rounded border border-zinc-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900";
const HINT = "text-xs text-zinc-500 dark:text-zinc-400";

/**
 * A profile as the form holds it, which is not quite as the API takes it.
 *
 * The birthday parts are strings because that is what a `<select>` and a number input give
 * back, and an empty string is a real state — "they have not said" — that a number cannot
 * represent. `profileDraft` and `draftToProfile` are the only two places that convert.
 */
export type ProfileDraft = {
  displayName: string;
  birthMonth: string;
  birthDay: string;
  pronouns: string;
  jobTitle: string;
  bio: string;
};

export const emptyProfileDraft: ProfileDraft = {
  displayName: "",
  birthMonth: "",
  birthDay: "",
  pronouns: "",
  jobTitle: "",
  bio: "",
};

/** Read a draft out of a stored profile, or an empty draft when there is none. */
export function profileDraft(profile?: {
  displayName: string | null;
  birthMonth: number | null;
  birthDay: number | null;
  pronouns: string | null;
  jobTitle: string | null;
  bio: string | null;
} | null): ProfileDraft {
  if (!profile) return emptyProfileDraft;
  return {
    displayName: profile.displayName ?? "",
    birthMonth: profile.birthMonth == null ? "" : String(profile.birthMonth),
    birthDay: profile.birthDay == null ? "" : String(profile.birthDay),
    pronouns: profile.pronouns ?? "",
    jobTitle: profile.jobTitle ?? "",
    bio: profile.bio ?? "",
  };
}

/** True when the birthday is genuinely half-filled, which is the one invalid draft state. */
export function birthdayIsPartial(draft: ProfileDraft): boolean {
  return (draft.birthMonth === "") !== (draft.birthDay === "");
}

/**
 * Convert a draft into what the API takes.
 *
 * Text is sent as `null` when blank rather than omitted, because the API reads `null` as
 * "clear this" — and blanking your own job title should clear it. That is also why nothing
 * here is `undefined`: an omitted field would leave the old value in place, so deleting your
 * display name would silently do nothing.
 *
 * The birthday needs a choice, which is what `clearWhenEmpty` is for.
 *
 * - Editing an existing profile (`clearWhenEmpty: true`) sends an explicit null pair, which
 *   is how the API is told to remove a birthday you no longer want stored.
 * - Registering (the default) omits it instead. A new account has no birthday to clear, and
 *   an explicit pair of nulls would be a request to clear something that was never set.
 */
export function draftToProfile(
  draft: ProfileDraft,
  { clearWhenEmpty = false }: { clearWhenEmpty?: boolean } = {},
): ProfileUpdateInput {
  // Refuse a half-filled birthday rather than dropping it. Dropping it produces a perfectly
  // valid payload that quietly means "no birthday", so a caller that forgot to check would
  // save the wrong thing and report success. Throwing cannot be ignored the way a silent
  // omission can; both callers check first and show the reason inline.
  if (birthdayIsPartial(draft)) {
    throw new Error("birthdayIsPartial: check before converting to a profile");
  }

  const complete = draft.birthMonth !== "" && draft.birthDay !== "";
  const birthday = complete
    ? { birthMonth: Number(draft.birthMonth), birthDay: Number(draft.birthDay) }
    : clearWhenEmpty
      ? { birthMonth: null, birthDay: null }
      : {};

  return {
    displayName: draft.displayName.trim() || null,
    pronouns: draft.pronouns.trim() || null,
    jobTitle: draft.jobTitle.trim() || null,
    bio: draft.bio.trim() || null,
    // Spread so the pair is present together or absent together, which is what both the
    // schema refinement and the server's validation require.
    ...birthday,
  };
}

/**
 * The profile fields, shared by sign-up and Settings.
 *
 * One component so the two cannot drift: the same limits, the same wording, and the same
 * promise that a birth year is not collected.
 */
export function ProfileFields({
  draft,
  onChange,
  emailForPlaceholder,
  showDisplayNameHint = true,
}: {
  draft: ProfileDraft;
  onChange: (next: ProfileDraft) => void;
  /** Used as the display-name placeholder, mirroring what will be shown when it is blank. */
  emailForPlaceholder?: string;
  showDisplayNameHint?: boolean;
}) {
  const set = <K extends keyof ProfileDraft>(key: K, value: string) =>
    onChange({ ...draft, [key]: value });

  const partial = birthdayIsPartial(draft);

  return (
    <>
      <label className="block text-sm">
        Display name
        <input
          value={draft.displayName}
          onChange={(event) => set("displayName", event.target.value)}
          placeholder={emailForPlaceholder}
          maxLength={100}
          className={FIELD}
        />
        {showDisplayNameHint && (
          <span className={HINT}>
            Leave blank to show your email address instead.
          </span>
        )}
      </label>

      <fieldset className="text-sm">
        <legend>Birthday</legend>
        <div className="mt-1 flex items-center gap-2">
          <select
            value={draft.birthMonth}
            onChange={(event) => set("birthMonth", event.target.value)}
            aria-label="Birth month"
            className="rounded border border-zinc-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="">Month</option>
            {MONTHS.map((name, index) => (
              <option key={name} value={index + 1}>
                {name}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            max={31}
            value={draft.birthDay}
            onChange={(event) => set("birthDay", event.target.value)}
            placeholder="Day"
            aria-label="Birth day"
            className="w-20 rounded border border-zinc-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        {/* Said before it is a problem, since a half-filled birthday is refused. */}
        <span className={partial ? "text-xs text-red-600 dark:text-red-400" : HINT}>
          {partial
            ? "Give both a month and a day, or leave both blank"
            : "Month and day only — no year is stored."}
        </span>
      </fieldset>

      <label className="block text-sm">
        Pronouns
        <input
          value={draft.pronouns}
          onChange={(event) => set("pronouns", event.target.value)}
          maxLength={50}
          className={FIELD}
        />
      </label>

      <label className="block text-sm">
        Job title / team
        <input
          value={draft.jobTitle}
          onChange={(event) => set("jobTitle", event.target.value)}
          maxLength={100}
          className={FIELD}
        />
      </label>

      <label className="block text-sm">
        About
        <textarea
          value={draft.bio}
          onChange={(event) => set("bio", event.target.value)}
          maxLength={500}
          rows={3}
          className={FIELD}
        />
        <span className={HINT}>{draft.bio.length}/500</span>
      </label>
    </>
  );
}

/** Re-exported so the two forms agree on how a saved birthday is described. */
export { formatBirthday };
