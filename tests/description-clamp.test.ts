import { describe, expect, it } from "vitest";
import {
  AGENDA_ROW_MIN_HEIGHT,
  APPOINTMENT_CARD_MIN_HEIGHT,
  CLAMPED_DESCRIPTION,
  descriptionClasses,
} from "@/lib/description-clamp";

/**
 * The description block's rules, shared by the appointments list and the day/kiosk agenda.
 *
 * Each rule exists because the version before it was visibly wrong on the deployed site:
 *
 * 1. Clamping alone left rows ragged (one-line vs two-line descriptions).
 * 2. Reserving two lines *inside* the text block made rows uniform but put a blank line between the
 *    description and the line below it — it read as a missing line, not as padding.
 *
 * So the height belongs to the card and the clamp belongs to the text.
 */

describe("descriptionClasses", () => {
  it("clamps when collapsed so long text truncates at a line boundary", () => {
    expect(descriptionClasses(false, true)).toBe(CLAMPED_DESCRIPTION);
    expect(CLAMPED_DESCRIPTION).toContain("line-clamp-2");
  });

  it("releases the clamp when expanded", () => {
    expect(descriptionClasses(true, true)).toBe("");
  });

  it("carries no height of its own", () => {
    // The whole point of moving the reserve to the card. A `min-h` here would put the blank line
    // back between the description and the line below it.
    for (const [expanded, hasText] of [
      [false, true],
      [true, true],
      [false, false],
      [true, false],
    ] as const) {
      const classes = descriptionClasses(expanded, hasText);
      expect(classes).not.toContain("min-h");
      expect(classes).not.toContain("h-[");
      expect(classes).not.toContain("max-h");
    }
  });

  it("adds nothing for a row with no description", () => {
    expect(descriptionClasses(false, false)).toBe("");
    expect(descriptionClasses(true, false)).toBe("");
  });

  it("uses a clamp rather than a height, so truncation is at a line boundary", () => {
    expect(CLAMPED_DESCRIPTION).not.toContain("max-h-");
    expect(CLAMPED_DESCRIPTION).not.toContain("overflow-hidden");
  });
});

describe("the card heights", () => {
  it("are expressed in rem, not pixels", () => {
    // So the reserve follows the reader's font size rather than pinning a pixel value.
    for (const h of [APPOINTMENT_CARD_MIN_HEIGHT, AGENDA_ROW_MIN_HEIGHT]) {
      expect(h).toMatch(/^min-h-\[[\d.]+rem\]$/);
    }
  });

  it("are a minimum, never a fixed height", () => {
    // A fixed height would clip an expanded row instead of letting it grow.
    for (const h of [APPOINTMENT_CARD_MIN_HEIGHT, AGENDA_ROW_MIN_HEIGHT]) {
      expect(h).toContain("min-h-");
      expect(h).not.toMatch(/^h-/);
    }
  });

  it("are different for the two layouts, which are different shapes", () => {
    // The appointments card carries a date line the agenda row does not, and puts its actions
    // beside the content rather than a note. One shared value would be wrong for one of them.
    expect(APPOINTMENT_CARD_MIN_HEIGHT).not.toBe(AGENDA_ROW_MIN_HEIGHT);
  });

  it("are tall enough for a two-line description", () => {
    // Two lines of text-sm (2.5rem) plus the card's own padding and the rest of its content. Both
    // values were read off a card whose description fills two lines, so neither may be shorter.
    const rem = (c: string) => parseFloat(c.replace(/[^\d.]/g, ""));
    expect(rem(APPOINTMENT_CARD_MIN_HEIGHT)).toBeGreaterThanOrEqual(8);
    expect(rem(AGENDA_ROW_MIN_HEIGHT)).toBeGreaterThanOrEqual(6.5);
  });
});
