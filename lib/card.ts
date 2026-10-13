/**
 * The card surfaces, in one place.
 *
 * These were being written out by hand wherever a list appeared, which is how the calendar,
 * the appointment list and the resource list drifted into three slightly different looks.
 * Anything that renders as a card should use one of these rather than its own combination of
 * border and background classes.
 */

/** The outer container for a list of cards. */
export const CARD_LIST =
  "divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950";

/** The surface of a single item inside a list, as used by the day agenda. */
export const CARD_SURFACE =
  "rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900";

/** A card that is no longer active, shown recessed rather than hidden. */
export const CARD_SURFACE_MUTED =
  "rounded-md border border-dashed border-zinc-200 bg-transparent dark:border-zinc-800";

/**
 * The same recessed treatment, without the radius.
 *
 * Both calendar views set their own radius and padding around this, so the shape lives with
 * the caller rather than here.
 */
export const CARD_SURFACE_CANCELLED =
  "border-dashed border-zinc-200 bg-transparent dark:border-zinc-800";

/** The vertical accent stripe down the leading edge of a card. */
export const CARD_ACCENT = "absolute inset-y-0 left-0 w-1";

/** Page heading, matching the calendar views. */
export const PAGE_TITLE = "text-xl font-semibold";

/** Column and row padding shared by every list row. */
export const ROW_PADDING = "px-4 py-2.5 sm:px-5";
