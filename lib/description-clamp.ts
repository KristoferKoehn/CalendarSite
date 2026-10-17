/**
 * How a booking row's description behaves: clamped when collapsed, expandable, and always the same
 * height so a list of rows lines up.
 *
 * Shared so the appointments list and the day/kiosk agenda cannot drift. They are two different row
 * layouts — one has action buttons, the other a status badge and a "free in" note — but the
 * description occupies the same place in both, and "expandable" should mean the same thing on each.
 * The layouts put their toggle in different places, so only the classes are shared; each keeps its
 * own markup and its own expanded state.
 *
 * Three rules, each of which came from getting it wrong first:
 *
 * **A fixed height, not a maximum.** `line-clamp-2` alone leaves a one-line description at one line,
 * so rows stayed ragged. Two lines of `text-sm` is 2.5rem — measured from the tall rows on the live
 * list, not assumed.
 *
 * **The space is reserved even when there is no description.** Skipping the block made those rows
 * short in exactly the same way.
 *
 * **Expanding must never make a row shorter.** With the block always rendered, expanding a row with
 * no description dropped the `min-h` and the row contracted — which is the bug this fixes.
 */

/** Two lines of `text-sm`, measured rather than computed. */
export const CLAMPED_DESCRIPTION_HEIGHT = "min-h-[2.5rem]";

/** Collapsed: reserve the height and truncate past two lines. */
export const CLAMPED_DESCRIPTION = `line-clamp-2 ${CLAMPED_DESCRIPTION_HEIGHT}`;

/** Expanded with nothing to reveal: keep the height, drop the clamp. */
export const RESERVED_DESCRIPTION = CLAMPED_DESCRIPTION_HEIGHT;

/**
 * Which classes a description paragraph needs.
 *
 * `expanded` alone is not enough to decide: a row with no text has nothing to expand into, so it
 * keeps the reserve. Expressed as a function because the rule has a case, and both layouts need
 * exactly the same answer.
 */
export function descriptionClasses(expanded: boolean, hasText: boolean): string {
  if (!hasText) return RESERVED_DESCRIPTION;
  return expanded ? "" : CLAMPED_DESCRIPTION;
}
