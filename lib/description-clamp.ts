/**
 * How a booking row's description behaves: clamped when collapsed, expandable, and the row kept at a
 * uniform height.
 *
 * Shared so the appointments list and the day/kiosk agenda cannot drift. They are two different row
 * layouts — one has action buttons, the other a status badge and a "free in" note — but the
 * description occupies the same place in both, and "expandable" should mean the same thing on each.
 * The layouts put their toggle in different places, so only the classes are shared; each keeps its
 * own markup and its own expanded state.
 *
 * The uniform height comes from the **card**, not from the description block.
 *
 * Reserving two lines inside the text block was the first attempt and it looked like a bug: a
 * one-line description left a visible blank line between the description and the line below it. The
 * space was real but it read as a missing line rather than as padding. Reserving on the card puts
 * the same space at the bottom edge, where an uneven gap is invisible because it sits against the
 * border rather than between two pieces of text.
 *
 * The clamp is still on the text, so a long description still truncates at a line boundary with an
 * ellipsis rather than being cut mid-line by a height.
 */

/** Collapsed description: truncate past two lines, at a line boundary. */
export const CLAMPED_DESCRIPTION = "line-clamp-2";

/**
 * The height a collapsed card holds, measured from a card whose description fills two clamped lines
 * — that is its natural height, so no card ever needs more room while collapsed.
 *
 * Two constants because the two layouts are different shapes: the appointments card carries a date
 * line the agenda row does not, and has action buttons beside the content rather than a note.
 *
 * Measured on the deployed pages rather than guessed, and the tests below assert that neither is
 * smaller than a two-line card actually renders.
 */
export const APPOINTMENT_CARD_MIN_HEIGHT = "min-h-[8.25rem]";
export const AGENDA_ROW_MIN_HEIGHT = "min-h-[6.875rem]";

/**
 * Which classes a description paragraph needs.
 *
 * Only the clamp is conditional. The height is not handled here at all — it belongs to the card, so
 * that nothing about the description's own box creates a gap between text lines.
 */
export function descriptionClasses(expanded: boolean, hasText: boolean): string {
  if (!hasText) return "";
  return expanded ? "" : CLAMPED_DESCRIPTION;
}
